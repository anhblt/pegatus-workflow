import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,lstat,rm,symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {runCleanup} from '../src/install/cleanup.mjs';

async function fixture(t){const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-cleanup-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
const make=(root,file)=>mkdir(path.join(root,file),{recursive:true});

test('confirmed cleanup removes old empty trees after reinstall while preserving content and unrelated folders',async t=>{
 const root=await fixture(t);
 await make(root,'.pegatus/runtime/claude/catalog/old/deep');
 await make(root,'.pegatus/runtime/claude/bin');
 await writeFile(path.join(root,'.pegatus/runtime/claude/bin/pegatus.mjs'),'active dispatcher');
 await make(root,'.claude/skills/pegatus-obsolete/resources');
 await make(root,'.claude/skills/user-empty');
 await make(root,'.pegatus/work/history');
 await writeFile(path.join(root,'.pegatus/config.json'),'team config');
 assert.equal(await runCleanup(['--root',root],{cwd:root,ask:async()=> 'yes',write:()=>{}}),0);
 await assert.rejects(lstat(path.join(root,'.pegatus/runtime/claude/catalog')),{code:'ENOENT'});
 await assert.rejects(lstat(path.join(root,'.claude/skills/pegatus-obsolete')),{code:'ENOENT'});
 assert.equal(await readFile(path.join(root,'.pegatus/runtime/claude/bin/pegatus.mjs'),'utf8'),'active dispatcher');
 assert.ok((await lstat(path.join(root,'.claude/skills/user-empty'))).isDirectory());
 assert.ok((await lstat(path.join(root,'.pegatus/work/history'))).isDirectory());
 assert.equal(await readFile(path.join(root,'.pegatus/config.json'),'utf8'),'team config');
});

test('preview and default cancellation make no changes',async t=>{
 const root=await fixture(t),dir='.agents/skills/pegatus-old/sub';await make(root,dir);
 const output=[];
 assert.equal(await runCleanup(['--root',root,'--dry-run'],{cwd:root,write:s=>output.push(s)}),0);
 assert.match(output.join('\n'),/pegatus-old/);
 assert.equal(await runCleanup([],{cwd:root,ask:async prompt=>prompt.startsWith('Existing')?'':'',write:()=>{}}),0);
 assert.ok((await lstat(path.join(root,dir))).isDirectory());
});

test('cleanup skips links and folders that gain files after preview',async t=>{
 const root=await fixture(t),outside=await fixture(t),dir='.claude/skills/pegatus-old';
 await make(root,dir);await symlink(outside,path.join(root,'.claude/skills/pegatus-link'),process.platform==='win32'?'junction':'dir');
 assert.equal(await runCleanup(['--root',root],{cwd:root,ask:async()=>{await writeFile(path.join(root,dir,'new.txt'),'new');return 'yes';},write:()=>{}}),0);
 assert.equal(await readFile(path.join(root,dir,'new.txt'),'utf8'),'new');
 assert.ok((await lstat(path.join(root,'.claude/skills/pegatus-link'))).isSymbolicLink());
 assert.ok((await lstat(outside)).isDirectory());
});

test('cleanup preserves referenced empty runtime snapshots and owned file ancestors',async t=>{
 const root=await fixture(t),id='a'.repeat(64);
 await make(root,`.pegatus/runtime/shared/${id}/empty`);await make(root,'.agents/skills/pegatus-current/missing');
 await writeFile(path.join(root,'.pegatus/install-lock-codex.json'),JSON.stringify({schemaVersion:2,host:'codex',scope:'project',runtime:{id,manifestHash:'b'.repeat(64)},files:[{path:'.agents/skills/pegatus-current/missing/SKILL.md',installedHash:'c'.repeat(64)}]}));
 assert.equal(await runCleanup(['--root',root],{cwd:root,ask:async()=> 'yes',write:()=>{}}),0);
 assert.ok((await lstat(path.join(root,`.pegatus/runtime/shared/${id}/empty`))).isDirectory());
 assert.ok((await lstat(path.join(root,'.agents/skills/pegatus-current/missing'))).isDirectory());
});

test('pending recovery blocks cleanup without removing anything',async t=>{
 const root=await fixture(t);await make(root,'.pegatus/runtime/claude/empty');
 await writeFile(path.join(root,'.pegatus/install-journal-codex.json'),'{}');
 assert.equal(await runCleanup(['--root',root],{cwd:root,ask:async()=> 'yes',write:()=>{}}),3);
 assert.ok((await lstat(path.join(root,'.pegatus/runtime/claude/empty'))).isDirectory());
});

test('owned ancestor protection tolerates directory casing differences',async t=>{
 const root=await fixture(t);await make(root,'.agents/skills/pegatus-current/Missing');
 await make(root,'.pegatus');
 await writeFile(path.join(root,'.pegatus/install-lock-codex.json'),JSON.stringify({schemaVersion:1,host:'codex',scope:'project',files:[{path:'.agents/skills/pegatus-current/missing/SKILL.md',installedHash:'c'.repeat(64)}]}));
 assert.equal(await runCleanup(['--root',root],{cwd:root,ask:async()=> 'yes',write:()=>{}}),0);
 assert.ok((await lstat(path.join(root,'.agents/skills/pegatus-current/Missing'))).isDirectory());
});

test('CLI dry-run supports an explicit root without a terminal and rejects invalid flags',async t=>{
 const root=await fixture(t);await make(root,'.pegatus/runtime/claude/empty');
 const preview=spawnSync(process.execPath,['bin/pegatus.mjs','cleanup','--root',root,'--dry-run'],{encoding:'utf8'});
 assert.equal(preview.status,0,preview.stderr);assert.match(preview.stdout,/runtime\/claude\/empty/);
 const invalid=spawnSync(process.execPath,['bin/pegatus.mjs','cleanup','--force'],{encoding:'utf8'});
 assert.equal(invalid.status,2);
});
