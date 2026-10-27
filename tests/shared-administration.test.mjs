import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir,mkdir,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {fixture} from './helpers/runtime-fixture.mjs';
import {readOwnership,hashBytes} from '../src/install/ownership.mjs';
import {createRuntimeSnapshot,compatibilityOperations} from '../src/install/runtime.mjs';
import {createAdministrationSession} from '../src/install/admin.mjs';
import {runUninstall} from '../src/install/uninstall.mjs';
import {runSetup} from '../src/install/setup.mjs';
const passed={status:'passed',evidence:[],reasons:[]};
const args=(root,host)=>['--host',host,'--scope','project','--root',root];

test('one session prepares once but still rejects edited destinations',async t=>{
 const {project}=await fixture(t);let preparations=0;
 const files={'package.json':Buffer.from('{"version":"1"}'),'bin/pegatus.mjs':Buffer.from('export async function main(){return 0;}')};
 const session=createAdministrationSession({prepare:async()=>{preparations++;return {files,sourceLock:{sources:[]},skills:[],agents:[],commands:[],rules:[]};}});
 const options={cwd:project,securityPreflight:passed};
 await session(['install',...args(project,'claude')],{...options,dryRun:true});
 assert.deepEqual(await readdir(project),[]);
 assert.equal((await session(['install',...args(project,'claude')],options)).status,'passed');
 assert.equal((await session(['install',...args(project,'codex')],options)).status,'passed');assert.equal(preparations,1);
 await writeFile(path.join(project,'.pegatus/runtime/codex/bin/pegatus.mjs'),'user edit');
 assert.equal((await session(['update',...args(project,'codex')],options)).status,'blocked');
});
test('administration materializes the runtime before exposing host wrappers',async t=>{
 const {project}=await fixture(t);
 const catalog={files:{'package.json':Buffer.from('{"version":"1"}'),'catalog/procedure.md':Buffer.from('procedure')},sourceLock:{sources:[]},
  skills:[{id:'test',path:'catalog/procedure.md'}],agents:[],commands:[],rules:[]};
 const snapshot=createRuntimeSnapshot(catalog),session=createAdministrationSession({prepare:async()=>catalog});let observed=false;
 const result=await session(['install',...args(project,'codex')],{cwd:project,securityPreflight:passed,async afterWrite(op){
  if(op.path==='.agents/skills/pegatus-test/SKILL.md'){observed=true;await readFile(path.join(project,snapshot.path,'package.json'));}
 }});
 assert.equal(result.status,'passed',JSON.stringify(result.reasons));assert.equal(observed,true);
});
test('historical dispatcher blocks missing or inconsistent runtime manifest',async t=>{
 const {project}=await fixture(t);
 const catalog={files:{'package.json':Buffer.from('{"version":"1"}'),'bin/pegatus.mjs':Buffer.from('export async function main(){return 0;}')},sourceLock:{sources:[]},skills:[],agents:[],commands:[],rules:[]};
 const snapshot=createRuntimeSnapshot(catalog),session=createAdministrationSession({prepare:async()=>catalog});
 assert.equal((await session(['install',...args(project,'codex')],{cwd:project,securityPreflight:passed})).status,'passed');
 await rm(path.join(project,`.pegatus/runtime-manifests/${snapshot.id}.json`));
 const cli=spawnSync(process.execPath,[path.join(project,'.pegatus/runtime/codex/bin/pegatus.mjs'),'--help'],{cwd:project,encoding:'utf8'});
 assert.equal(cli.status,3);assert.ok(cli.stderr.length>0);
});
test('grouped uninstall previews last-consumer snapshot cleanup before confirmation',async t=>{
 const {project}=await fixture(t);
 const catalog={files:{'package.json':Buffer.from('{"version":"1"}'),'bin/pegatus.mjs':Buffer.from('export async function main(){return 0;}')},sourceLock:{sources:[]},skills:[],agents:[],commands:[],rules:[]};
 const session=createAdministrationSession({prepare:async()=>catalog}),options={cwd:project,securityPreflight:passed};
 for(const host of ['claude','codex'])assert.equal((await session(['install',...args(project,host)],options)).status,'passed');
 const previews=new Map(),actual=new Map();let answers=['1','','1,2','yes'];
 const result=await runUninstall({cwd:project,home:project,ask:async()=>answers.shift(),write:()=>{},admin:async(argv,settings)=>{
  const host=argv[argv.indexOf('--host')+1],removed=[];
  const result=await session(argv,{...settings,securityPreflight:passed,afterWrite:op=>removed.push(op.path)});
  if(settings.dryRun)previews.set(host,new Set(result.preview.removes));else actual.set(host,removed);
  return result;
 }});
 assert.equal(result,0);
 for(const [host,removed] of actual)for(const file of removed)assert.ok(previews.get(host).has(file),`Unpreviewed ${host} removal: ${file}`);
 assert.ok([...previews.get('codex')].some(file=>file.includes('/runtime/shared/')));
});
test('grouped setup previews cleanup after every selected host leaves an old snapshot',async t=>{
 const {project}=await fixture(t);
 const catalog={files:{'package.json':Buffer.from('{"version":"1"}'),'bin/pegatus.mjs':Buffer.from('export async function main(){return 0;}')},sourceLock:{sources:[]},skills:[],agents:[],commands:[],rules:[]};
 const initial=createAdministrationSession({prepare:async()=>catalog}),options={cwd:project,securityPreflight:passed};
 for(const host of ['claude','codex'])await initial(['install',...args(project,host)],options);
 const updated=createAdministrationSession({prepare:async()=>({...catalog,files:{...catalog.files,'src/new.mjs':Buffer.from('new')}})});
 const previews=new Map(),removed=new Map();let answers=['1,2','1','','','yes'];
 const result=await runSetup({cwd:project,home:project,ask:async()=>answers.shift(),write:()=>{},
  detect:async()=>['claude','codex'].map(id=>({id,label:id,status:'cli',evidence:[]})),admin:async(argv,settings)=>{
   const host=argv[argv.indexOf('--host')+1],paths=[];
   const result=await updated(argv,{...settings,securityPreflight:passed,afterWrite:op=>{if(op.content===undefined)paths.push(op.path);}});
   if(settings.dryRun)previews.set(host,new Set(result.preview.removes));else if(argv[0]==='install')removed.set(host,paths);
   return result;
  }});
 assert.equal(result,0);
 assert.ok([...previews.get('codex')].some(file=>file.includes('/runtime/shared/')));
 for(const [host,paths] of removed)for(const file of paths)assert.ok(previews.get(host).has(file),`Unpreviewed ${host} removal: ${file}`);
});
test('apply blocks cleanup newly required by a consumer change after preview',async t=>{
 const {project}=await fixture(t);
 const catalog={files:{'package.json':Buffer.from('{"version":"1"}'),'bin/pegatus.mjs':Buffer.from('export async function main(){return 0;}')},sourceLock:{sources:[]},skills:[],agents:[],commands:[],rules:[]};
 const session=createAdministrationSession({prepare:async()=>catalog}),options={cwd:project,securityPreflight:passed};
 for(const host of ['claude','codex'])await session(['install',...args(project,host)],options);
 const preview=await session(['uninstall',...args(project,'claude')],{...options,dryRun:true});
 assert.equal((await session(['uninstall',...args(project,'codex')],options)).status,'passed');
 const result=await session(['uninstall',...args(project,'claude')],{...options,approvedPreview:preview.preview});
 assert.equal(result.status,'blocked');assert.match(result.reasons.join(),/preview/i);assert.ok((await readOwnership(project,'claude')).runtime);
});

test('real administration shares runtimes; compatibility and lint run after source move',async t=>{
 const {kit,project,runAdministration}=await fixture(t),options={cwd:project,securityPreflight:passed};
 for(const host of ['claude','codex','antigravity']){
  const result=await runAdministration(['install',...args(project,host)],options);assert.equal(result.status,'passed',JSON.stringify(result.reasons));
  if(host!=='claude')assert.ok(result.written<100,result.written);
 }
 assert.equal((await readdir(path.join(project,'.pegatus/runtime/shared'))).length,1);
 const runtime=(await readOwnership(project,'codex')).runtime;
 await rename(kit,kit+'-moved');
 for(const host of ['claude','codex','antigravity']){
  const cli=path.join(project,`.pegatus/runtime/${host}/bin/pegatus.mjs`);
  const help=spawnSync(process.execPath,[cli,'--help'],{cwd:project,encoding:'utf8'});assert.equal(help.status,0,help.stderr);
  const lint=spawnSync(process.execPath,[cli,'catalog','lint'],{cwd:project,encoding:'utf8'});assert.equal(lint.status,0,lint.stderr);
  const context=await readFile(path.join(project,`.pegatus/runtime/${host}/catalog/context-protocol.md`),'utf8');assert.ok(context.includes(runtime.id));
 }
});

test('doctor does not need prepared source dependencies',async t=>{
 const {kit,project,runAdministration,args:hostArgs}=await fixture(t),options={cwd:project,securityPreflight:passed};
 assert.equal((await runAdministration(['install',...hostArgs],options)).status,'passed');
 await rename(path.join(kit,'node_modules'),path.join(kit,'dependencies-unavailable'));
 const doctor=await runAdministration(['doctor',...hostArgs],options);assert.equal(doctor.status,'passed');assert.ok(doctor.locations.every(f=>f.state==='unchanged'));
});

test('legacy host migration preserves historical CLI and blocks edited legacy bytes',async t=>{
 const {project,runAdministration,args:hostArgs}=await fixture(t),options={cwd:project,securityPreflight:passed};
 await runAdministration(['install',...hostArgs],options);
 const owned=await readOwnership(project,'codex'),prefix=`.pegatus/runtime/shared/${owned.runtime.id}/`,legacy=[];
 for(const entry of owned.files){
  if(entry.path.includes('runtime-manifests/') || entry.path=== '.pegatus/runtime/codex/bin/pegatus.mjs' || entry.path=== '.pegatus/runtime/codex/catalog/context-protocol.md')continue;
  const target=entry.path.startsWith(prefix)?'.pegatus/runtime/codex/'+entry.path.slice(prefix.length):entry.path;
  let content=await readFile(path.join(project,entry.path));
  if(!entry.path.startsWith(prefix))content=Buffer.from(content.toString('utf8').replaceAll('runtime/shared/'+owned.runtime.id,'runtime/codex'));
  await mkdir(path.dirname(path.join(project,target)),{recursive:true});await writeFile(path.join(project,target),content);
  legacy.push({path:target,installedHash:hashBytes(content),sourceHash:hashBytes(content)});
 }
 await rm(path.join(project,`.pegatus/runtime/shared/${owned.runtime.id}`),{recursive:true});
 await rm(path.join(project,`.pegatus/runtime-manifests/${owned.runtime.id}.json`));
 await writeFile(path.join(project,'.pegatus/install-lock-codex.json'),JSON.stringify({schemaVersion:1,host:'codex',scope:'project',version:owned.version,sourceRevisions:owned.sourceRevisions,files:legacy}));
 const changed=path.join(project,'.pegatus/runtime/codex/package.json'),original=await readFile(changed);await writeFile(changed,'edited');
 assert.equal((await runAdministration(['update',...hostArgs],options)).status,'blocked');await writeFile(changed,original);
 const migrated=await runAdministration(['update',...hostArgs],options);assert.equal(migrated.status,'passed',JSON.stringify(migrated.reasons));
 await assert.rejects(readFile(changed),e=>e.code==='ENOENT');
 assert.equal((await readOwnership(project,'codex')).schemaVersion,2);
 const help=spawnSync(process.execPath,[path.join(project,'.pegatus/runtime/codex/bin/pegatus.mjs'),'--help'],{cwd:project,encoding:'utf8'});assert.equal(help.status,0,help.stderr);
});
