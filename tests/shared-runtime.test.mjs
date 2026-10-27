import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRuntimeSnapshot,readRuntime} from '../src/install/runtime.mjs';
import {hashBytes,readOwnership} from '../src/install/ownership.mjs';
import {generateHost} from '../src/adapters/capabilities.mjs';
import {planInstall} from '../src/install/plan.mjs';
import {applyInstall,recoverInstall} from '../src/install/apply.mjs';
import {planSharedInstall} from '../src/install/shared-plan.mjs';

const passed={status:'passed',evidence:[],reasons:[]};
const catalog=(extra={})=>({files:{'package.json':Buffer.from('{"version":"1"}'),'bin/pegatus.mjs':Buffer.from('console.log("detached")'),...extra},sourceLock:{sources:[]},skills:[],commands:[],agents:[],rules:[]});
async function root(t){const r=await mkdtemp(path.join(os.tmpdir(),'pegatus-shared-test-'));t.after(()=>rm(r,{recursive:true,force:true}));return r;}
async function materialize(root,operations){for(const op of operations){await mkdir(path.dirname(path.join(root,op.path)),{recursive:true});await writeFile(path.join(root,op.path),op.content);}}

test('runtime identity depends on sorted file bytes, not host or insertion order',()=>{
 const a=createRuntimeSnapshot(catalog({'src/a.mjs':Buffer.from('a')}));
 const b=createRuntimeSnapshot({...catalog(),files:Object.fromEntries(Object.entries(catalog({'src/a.mjs':Buffer.from('a')}).files).reverse())});
 assert.equal(a.id,b.id);assert.match(a.path,/^\.pegatus\/runtime\/shared\/[a-f0-9]{64}$/);
 assert.notEqual(a.id,createRuntimeSnapshot(catalog({'src/a.mjs':Buffer.from('b')})).id);
});

test('runtime manifest rejects forged identity, paths and changed metadata',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());await materialize(r,s.operations);
 const owned=await readRuntime(r,s.descriptor);assert.equal(owned.files.length,s.operations.length);
 await assert.rejects(readRuntime(r,{...s.descriptor,id:'../escape'}),/runtime/i);
 const manifest=s.operations.find(op=>op.path.endsWith('.json') && op.path.includes('runtime-manifests'));
 const forged=JSON.parse(manifest.content);forged.files[0].path='.pegatus/config.json';
 const bytes=JSON.stringify(forged);await writeFile(path.join(r,manifest.path),bytes);
 await assert.rejects(readRuntime(r,{...s.descriptor,manifestHash:hashBytes(bytes)}),/runtime/i);
});

test('schema-2 host ownership expands its separately owned runtime',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());await materialize(r,s.operations);
 await writeFile(path.join(r,'.pegatus/install-lock-codex.json'),JSON.stringify({schemaVersion:2,host:'codex',scope:'project',version:'1',files:[],runtime:s.descriptor}));
 const owned=await readOwnership(r,'codex');assert.equal(owned.files.length,s.operations.length);assert.equal(owned.runtime.id,s.id);
});

async function install(root,host,snapshot,{uninstall=false,afterWrite}={}){
 const owned=await readOwnership(root,host);
 const plan=await planSharedInstall({root,host,scope:'project',version:'1',owned,
  runtime:uninstall?null:snapshot,desired:uninstall?[]:[...snapshot.operations,{path:`.${host}/entry.md`,content:snapshot.id,hash:hashBytes(snapshot.id)}]});
 return applyInstall(plan,{securityPreflight:passed,afterWrite});
}
test('hosts share one snapshot and only the last consumer removes it',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());
 assert.equal((await install(r,'claude',s)).status,'passed');
 const second=await install(r,'codex',s);assert.equal(second.status,'passed');assert.equal(second.written,1);
 const lock=JSON.parse(await readFile(path.join(r,'.pegatus/install-lock-codex.json')));
 assert.equal(lock.schemaVersion,2);assert.equal(lock.files.length,1);assert.equal(lock.runtime.id,s.id);
 assert.equal((await install(r,'claude',s,{uninstall:true})).status,'passed');await readFile(path.join(r,s.path,'package.json'));
 assert.equal((await install(r,'codex',s,{uninstall:true})).status,'passed');
 await assert.rejects(readFile(path.join(r,s.path,'package.json')),e=>e.code==='ENOENT');
});
test('independent same-version updates retain the other host snapshot and reject edits',async t=>{
 const r=await root(t),a=createRuntimeSnapshot(catalog()),b=createRuntimeSnapshot(catalog({'src/new.mjs':Buffer.from('new')}));
 await install(r,'claude',a);await install(r,'codex',a);
 assert.equal((await install(r,'claude',b)).status,'passed');await readFile(path.join(r,a.path,'package.json'));
 await writeFile(path.join(r,a.path,'package.json'),'edited');
 await assert.rejects(install(r,'codex',b),/runtime.*changed|edited/i);
});
test('shared changes roll back together and a changed peer lock blocks apply',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());
 const failed=await install(r,'codex',s,{afterWrite(){throw new Error('injected interruption');}});
 assert.equal(failed.status,'failed');assert.equal((await readOwnership(r,'codex')).files.length,0);
 const plan=await planSharedInstall({root:r,host:'codex',scope:'project',version:'1',owned:await readOwnership(r,'codex'),runtime:s,desired:s.operations});
 await writeFile(path.join(r,'.pegatus/install-lock-claude.json'),JSON.stringify({schemaVersion:1,host:'claude',files:[]}));
 assert.equal((await applyInstall(plan,{securityPreflight:passed})).status,'blocked');
});
test('foreign files and active legacy writers prevent shared cleanup or mutation',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());await install(r,'claude',s);
 await writeFile(path.join(r,s.path,'foreign.txt'),'user');
 await assert.rejects(install(r,'claude',s,{uninstall:true}),/Foreign runtime/);
 await writeFile(path.join(r,'.pegatus/install-busy-antigravity.json'),JSON.stringify({schemaVersion:1,pid:process.pid}));
 const plan=planInstall([],[],{root:r,host:'codex',scope:'project',version:'1',expectedLockHash:null});
 assert.equal((await applyInstall(plan,{securityPreflight:passed})).status,'blocked');
});
test('foreign files introduced during cleanup retain ownership through rollback',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());await install(r,'codex',s);
 let introduced=false;
 const result=await install(r,'codex',s,{uninstall:true,async afterWrite(op){
  if(!introduced && op.path.startsWith(s.path+'/')){introduced=true;await writeFile(path.join(r,s.path,'foreign.txt'),'user');}
 }});
 assert.equal(result.status,'failed');assert.equal((await readOwnership(r,'codex')).runtime.id,s.id);
 assert.equal(await readFile(path.join(r,s.path,'foreign.txt'),'utf8'),'user');
});
test('another host cannot write during a shared transaction or unresolved peer recovery',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());let competing;
 const result=await install(r,'claude',s,{async afterWrite(){
  if(competing)return;
  competing=await applyInstall(planInstall([],[],{root:r,host:'codex',scope:'project',version:'1',expectedLockHash:null}),{securityPreflight:passed});
 }});
 assert.equal(result.status,'passed');assert.equal(competing.status,'blocked');
 await writeFile(path.join(r,'.pegatus/install-journal-antigravity.json'),JSON.stringify({schemaVersion:1,host:'antigravity',entries:[]}));
 const plan=planInstall([],[],{root:r,host:'codex',scope:'project',version:'1',expectedLockHash:null});
 assert.equal((await applyInstall(plan,{securityPreflight:passed})).status,'blocked');
});
test('unregistered runtime trees and shared paths in host-only metadata are rejected',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());
 await mkdir(path.join(r,s.path),{recursive:true});await writeFile(path.join(r,s.path,'foreign.txt'),'user');
 await assert.rejects(install(r,'codex',s),/Foreign runtime|unregistered/i);
 await writeFile(path.join(r,'.pegatus/install-lock-claude.json'),JSON.stringify({schemaVersion:2,host:'claude',runtime:s.descriptor,files:[{path:s.path+'/package.json',installedHash:hashBytes('x')}]}));
 await assert.rejects(readOwnership(r,'claude',{expandRuntime:false}),/shared runtime/i);
});
test('host reference switches to a complete snapshot before old snapshot removal',async t=>{
 const r=await root(t),a=createRuntimeSnapshot(catalog()),b=createRuntimeSnapshot(catalog({'src/new.mjs':Buffer.from('new')}));
 await install(r,'codex',a);let observed=false;
 const result=await install(r,'codex',b,{async afterWrite(op){
  if(op.path.startsWith(a.path+'/')){observed=true;const lock=JSON.parse(await readFile(path.join(r,'.pegatus/install-lock-codex.json')));assert.equal(lock.runtime.id,b.id);await readFile(path.join(r,b.path,'package.json'));}
 }});
 assert.equal(result.status,'passed',JSON.stringify(result.reasons));assert.equal(observed,true);
});
test('foreign files introduced while creating a snapshot block ownership publication',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());let injected=false;
 const result=await install(r,'codex',s,{async afterWrite(op){
  if(!injected && op.path.startsWith(s.path+'/')){injected=true;await writeFile(path.join(r,s.path,'foreign.md'),'foreign instructions');}
 }});
 assert.equal(result.status,'failed');assert.equal((await readOwnership(r,'codex')).files.length,0);
 assert.equal(await readFile(path.join(r,s.path,'foreign.md'),'utf8'),'foreign instructions');
});
test('unreadable peer ownership blocks shared mutation without adopting its snapshot',async t=>{
 const r=await root(t),s=createRuntimeSnapshot(catalog());await mkdir(path.join(r,'.pegatus'));
 await writeFile(path.join(r,'.pegatus/install-lock-claude.json'),'{}');
 await assert.rejects(install(r,'codex',s),/Invalid installation lock/);
 await assert.rejects(readFile(path.join(r,s.path,'package.json')),e=>e.code==='ENOENT');
});
test('interrupted recovery restores the old snapshot before restoring its host reference',async t=>{
 const r=await root(t),a=createRuntimeSnapshot(catalog()),b=createRuntimeSnapshot(catalog({'src/new.mjs':Buffer.from('new')}));
 await install(r,'codex',a);let interrupted=false;
 const transition=await install(r,'codex',b,{async afterWrite(op){
  if(!interrupted && op.path.startsWith(a.path+'/')){interrupted=true;await writeFile(path.join(r,b.path,'src/new.mjs'),'concurrent edit');throw new Error('interrupted cleanup');}
 }});
 assert.equal(transition.status,'blocked');await writeFile(path.join(r,b.path,'src/new.mjs'),'new');
 let observed=false;
 const recovery=await recoverInstall(r,'codex',{async afterRestore(entry){
  if(entry.path==='.pegatus/install-lock-codex.json'){
   observed=true;assert.equal((await readOwnership(r,'codex')).runtime.id,a.id);
   for(const op of a.operations)assert.equal(hashBytes(await readFile(path.join(r,op.path))),op.hash);
   throw new Error('stop recovery after restored reference');
  }
 }});
 assert.equal(recovery.status,'blocked');assert.equal(observed,true);
 assert.equal((await recoverInstall(r,'codex')).status,'passed');
 assert.equal((await readOwnership(r,'codex')).runtime.id,a.id);
});
