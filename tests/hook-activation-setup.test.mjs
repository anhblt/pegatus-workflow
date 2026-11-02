import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runHookActivation,previewHookSetup,applyHookSetup} from '../src/hooks/setup.mjs';

test('guided hook setup preserves existing settings and is idempotent', async t => {
 const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-hook-setup-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'.pegatus'),{recursive:true});
 const wrapper='.pegatus/runtime/claude/bin/pegatus.mjs';
 await mkdir(path.join(root,path.dirname(wrapper)),{recursive:true});
 await writeFile(path.join(root,wrapper),'fixture');
 const hash=createHash('sha256').update('fixture').digest('hex');
 await writeFile(path.join(root,'.pegatus','install-lock-claude.json'),JSON.stringify({schemaVersion:1,host:'claude',files:[{path:wrapper,installedHash:hash}]}));
 await mkdir(path.join(root,'.claude'));
 const target=path.join(root,'.claude','settings.json');
 await writeFile(target,JSON.stringify({theme:'dark',hooks:{SessionStart:[{hooks:[{type:'command',command:'other'}]}]}}));
 for(let i=0;i<2;i++) {
  const answers=['1','yes'];
  const code=await runHookActivation({cwd:root,ask:async()=>answers.shift(),write:()=>{},scan:async()=>({status:'passed'})});
  assert.equal(code,0);
 }
 const result=JSON.parse(await readFile(target,'utf8'));
 assert.equal(result.theme,'dark');
 assert.equal(result.hooks.SessionStart.length,2);
 assert.equal(result.hooks.SessionStart[0].hooks[0].command,'other');
});

test('CLI preview is read-only and its token enables confirmed apply', async t => {
 const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-hook-cli-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const wrapper='.pegatus/runtime/codex/bin/pegatus.mjs';
 await mkdir(path.join(root,path.dirname(wrapper)),{recursive:true});
 await writeFile(path.join(root,wrapper),'fixture');
 const hash=createHash('sha256').update('fixture').digest('hex');
 await writeFile(path.join(root,'.pegatus','install-lock-codex.json'),JSON.stringify({schemaVersion:1,host:'codex',files:[{path:wrapper,installedHash:hash}]}));
 const cli=fileURLToPath(new URL('../bin/pegatus.mjs',import.meta.url));
 const run=(...args)=>spawnSync(process.execPath,[cli,'hook-activation','--host','codex','--root',root,...args],{encoding:'utf8'});
 const preview=run('--preview','yes');assert.equal(preview.status,0,preview.stderr);
 await assert.rejects(readFile(path.join(root,'.codex','hooks.json')),e=>e.code==='ENOENT');
 const apply=run('--apply',JSON.parse(preview.stdout).token);assert.equal(apply.status,0,apply.stderr);
 assert.equal(JSON.parse(apply.stdout).status,'passed');
});

test('a stale preview or blocked scan never overwrites host configuration', async t => {
 const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-hook-conflict-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const wrapper='.pegatus/runtime/codex/bin/pegatus.mjs';
 await mkdir(path.join(root,path.dirname(wrapper)),{recursive:true});
 await writeFile(path.join(root,wrapper),'fixture');
 const hash=createHash('sha256').update('fixture').digest('hex');
 await writeFile(path.join(root,'.pegatus','install-lock-codex.json'),JSON.stringify({schemaVersion:1,host:'codex',files:[{path:wrapper,installedHash:hash}]}));
 await mkdir(path.join(root,'.codex'));
 const target=path.join(root,'.codex','hooks.json');
 await writeFile(target,'{"other":true}');
 const preview=await previewHookSetup(root,'codex');
 await writeFile(target,'{"other":"changed"}');
 await assert.rejects(applyHookSetup(root,'codex',preview.token,{scan:async()=>({status:'passed'})}),/changed/);
 const next=await previewHookSetup(root,'codex');
 await assert.rejects(applyHookSetup(root,'codex',next.token,{scan:async()=>({status:'blocked',reasons:['fixture']})}),/Security scan blocked/);
 assert.equal(await readFile(target,'utf8'),'{"other":"changed"}');
});

test('real security preflight accepts generated Claude and Codex hook configurations', async t => {
 const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-hook-real-scan-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 for(const [host,target] of [['claude','.claude/settings.json'],['codex','.codex/hooks.json']]) {
  const wrapper=`.pegatus/runtime/${host}/bin/pegatus.mjs`;
  await mkdir(path.join(root,path.dirname(wrapper)),{recursive:true});
  await writeFile(path.join(root,wrapper),'fixture');
  const hash=createHash('sha256').update('fixture').digest('hex');
  await writeFile(path.join(root,'.pegatus',`install-lock-${host}.json`),JSON.stringify({schemaVersion:1,host,files:[{path:wrapper,installedHash:hash}]}));
  const preview=await previewHookSetup(root,host);
  const result=await applyHookSetup(root,host,preview.token);
  assert.equal(result.status,'passed');
  assert.ok(JSON.parse(await readFile(path.join(root,target),'utf8')).hooks.SessionStart);
 }
});
