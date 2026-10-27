import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {runUninstall} from '../src/install/uninstall.mjs';
import {hashBytes} from '../src/install/ownership.mjs';
import {readFile} from 'node:fs/promises';

async function fixture(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-uninstall-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'.pegatus'));
 for(const host of ['claude','codex'])await writeFile(path.join(root,`.pegatus/install-lock-${host}.json`),JSON.stringify({schemaVersion:1,host,scope:'project',files:[]}));
 return root;
}
const preview={status:'passed',preview:{writes:[],removes:['.agents/skills/pegatus-test/SKILL.md'],conflicts:[]}};
test('uninstall previews all selected hosts and defaults to cancellation',async t=>{
 const root=await fixture(t),answers=['1','','1,2',''],calls=[],output=[];
 const before=await readdir(path.join(root,'.pegatus'));
 assert.equal(await runUninstall({cwd:root,home:root,ask:async()=>answers.shift(),write:s=>output.push(s),admin:async(args,opts)=>{calls.push({args,opts});return preview;}}),0);
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c.opts.dryRun&&c.args[0]==='uninstall'));
 assert.match(output.join('\n'),/Remove owned file/);
 assert.deepEqual(await readdir(path.join(root,'.pegatus')),before);
});
test('confirmed uninstall uses user scope and stops after a blocked host',async t=>{
 const root=await fixture(t),answers=['2','','1,2','yes'],calls=[];
 assert.equal(await runUninstall({cwd:root,home:root,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{calls.push({args,opts});return opts.dryRun?preview:{status:'blocked',reasons:['edited']};}}),3);
 assert.equal(calls.length,3);assert.deepEqual(calls[2].args,['uninstall','--host','claude','--scope','user','--root',root]);
});
test('blocked preview prevents every apply',async t=>{
 const root=await fixture(t),answers=['1','','1,2','yes'],calls=[];
 assert.equal(await runUninstall({cwd:root,home:root,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{calls.push(opts);return {status:'blocked',reasons:['edited file']};}}),3);
 assert.ok(calls.every(c=>c.dryRun));
});
test('cancellation during apply settles one host and prevents the next',async t=>{
 const root=await fixture(t),answers=['1','','1,2','yes'],controller=new AbortController(),applied=[];
 assert.equal(await runUninstall({cwd:root,home:root,signal:controller.signal,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{
  if(opts.dryRun)return preview;applied.push(args);controller.abort();return {status:'passed'};
 }}),0);
 assert.equal(applied.length,1);
});
test('no ownership records exits without administration',async t=>{
 const root=await fixture(t),empty=path.join(root,'empty');await mkdir(empty);
 const answers=['1',''],output=[];
 assert.equal(await runUninstall({cwd:empty,home:root,ask:async()=>answers.shift(),write:s=>output.push(s),admin:()=>{throw Error('must not administer');}}),0);
 assert.match(output.join('\n'),/No Pegatus installation/);
});
test('bare uninstall requires a terminal and prints actionable usage',()=>{
 const result=spawnSync(process.execPath,['bin/pegatus.mjs','uninstall'],{encoding:'utf8',timeout:5000});
 assert.equal(result.status,2);assert.match(result.stderr,/interactive terminal/);
});
test('guided uninstall removes real owned files and preserves task history and edits',async t=>{
 const root=await fixture(t),file='.agents/skills/pegatus-test/SKILL.md',content='owned';
 await mkdir(path.dirname(path.join(root,file)),{recursive:true});
 await writeFile(path.join(root,file),content);
 await writeFile(path.join(root,'AGENTS.md'),'user instructions');
 await writeFile(path.join(root,'.pegatus/history.json'),'history');
 const lock={schemaVersion:1,host:'claude',scope:'project',files:[{path:file,installedHash:hashBytes(content)}]};
 await writeFile(path.join(root,'.pegatus/install-lock-claude.json'),JSON.stringify(lock));
 // An edited file must block the real administration preview without changing it.
 await writeFile(path.join(root,file),'edited');
 let answers=['1','','1','yes'];
 assert.equal(await runUninstall({cwd:root,home:root,ask:async()=>answers.shift(),write:()=>{}}),3);
 assert.equal(await readFile(path.join(root,file),'utf8'),'edited');
 await writeFile(path.join(root,file),content);
 answers=['1','','1','yes'];
 assert.equal(await runUninstall({cwd:root,home:root,ask:async()=>answers.shift(),write:()=>{}}),0);
 await assert.rejects(readFile(path.join(root,file)),{code:'ENOENT'});
 assert.equal(await readFile(path.join(root,'AGENTS.md'),'utf8'),'user instructions');
 assert.equal(await readFile(path.join(root,'.pegatus/history.json'),'utf8'),'history');
});
