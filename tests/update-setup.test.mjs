import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as guided from '../src/install/setup.mjs';
import {runAdministration} from '../src/install/admin.mjs';
import {hashBytes} from '../src/install/ownership.mjs';

async function fixture(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-update-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const project=path.join(root,'project'),home=path.join(root,'home');
 for(const dir of [project,home])await mkdir(dir);
 return {project,home};
}
async function records(root,hosts=['claude','codex']) {
 await mkdir(path.join(root,'.pegatus'),{recursive:true});
 for(const host of hosts)await writeFile(path.join(root,`.pegatus/install-lock-${host}.json`),JSON.stringify({schemaVersion:1,host,scope:'project',files:[]}));
}
const preview={status:'passed',preview:{writes:['.agents/skills/pegatus-start/SKILL.md'],removes:[],conflicts:[]}};
const passed={status:'passed',evidence:[],reasons:[]};
const catalog=content=>({files:{'package.json':Buffer.from('{"version":"0.1.0-rc.1"}'),'bin/pegatus.mjs':Buffer.from(content)},sourceLock:{sources:[]},skills:[],commands:[],agents:[],rules:[]});

test('bare update requires an interactive terminal with explicit update usage',()=>{
 const result=spawnSync(process.execPath,['bin/pegatus.mjs','update'],{encoding:'utf8',timeout:5000});
 assert.equal(result.status,2);assert.match(result.stderr,/interactive terminal/);assert.match(result.stderr,/update --host/);
});

test('guided update preselects only recorded hosts and default confirmation writes nothing',async t=>{
 const {project,home}=await fixture(t);await records(project);
 await mkdir(path.join(home,'.gemini','antigravity'),{recursive:true});
 const answers=['1','','','',''],calls=[],output=[];
 const before=await readdir(path.join(project,'.pegatus'));
 assert.equal(await guided.runUpdate({cwd:project,home,ask:async()=>answers.shift(),write:s=>output.push(s),admin:async(args,opts)=>{calls.push({args,opts});return preview;}}),0);
 assert.deepEqual(calls.map(c=>c.args),[
  ['update','--host','claude','--scope','project','--root',project],
  ['update','--host','codex','--scope','project','--root',project],
 ]);
 assert.ok(calls.every(c=>c.opts.dryRun));assert.doesNotMatch(output.join('\n'),/Antigravity/);
 assert.deepEqual(await readdir(path.join(project,'.pegatus')),before);
});

test('guided update supports user scope, host subset and post-update doctor',async t=>{
 const {project,home}=await fixture(t);await records(home);
 const answers=['2','','2','yes'],calls=[];
 assert.equal(await guided.runUpdate({cwd:project,home,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{calls.push({args,opts});return opts.dryRun?preview:{status:'passed'};}}),0);
 assert.deepEqual(calls.map(c=>c.args),[
  ['update','--host','codex','--scope','user','--root',home],
  ['update','--host','codex','--scope','user','--root',home],
  ['doctor','--host','codex','--scope','user','--root',home],
 ]);
 assert.deepEqual(calls[1].opts.approvedPreview,preview.preview);
});

test('guided update with no installation does not install detected applications',async t=>{
 const {project,home}=await fixture(t),output=[],answers=['1','',''];
 assert.equal(await guided.runUpdate({cwd:project,home,ask:async()=>answers.shift(),write:s=>output.push(s),admin:()=>{throw Error('must not administer');}}),0);
 assert.match(output.join('\n'),/No Pegatus installation/);assert.deepEqual(await readdir(project),[]);
});

test('blocked preview and interruption prevent update apply',async t=>{
 const {project,home}=await fixture(t);await records(project);
 const answers=['1','','','','yes'],calls=[];
 assert.equal(await guided.runUpdate({cwd:project,home,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{calls.push(opts);return {status:'blocked',reasons:['edited managed file']};}}),3);
 assert.ok(calls.every(c=>c.dryRun));
 assert.equal(await guided.runUpdate({cwd:project,home,ask:async()=>{throw Object.assign(Error('cancelled'),{code:'ABORT_ERR'});},write:()=>{}}),0);
});

test('cancellation during apply settles one host and prevents remaining updates',async t=>{
 const {project,home}=await fixture(t);await records(project);
 const answers=['1','','','','yes'],controller=new AbortController(),applied=[];
 assert.equal(await guided.runUpdate({cwd:project,home,signal:controller.signal,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{
  if(opts.dryRun)return preview;applied.push(args);controller.abort();return {status:'passed'};
 }}),0);
 assert.equal(applied.length,1);assert.equal(applied[0][0],'update');
});

test('project update preserves explicit inherited defaults and stops after a blocked apply',async t=>{
 const {project,home}=await fixture(t);await records(project);
 const answers=['1','',home,'','yes'],calls=[];
 assert.equal(await guided.runUpdate({cwd:project,home,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{
  calls.push({args,opts});return opts.dryRun?preview:{status:'blocked',reasons:['scanner unavailable']};
 }}),3);
 assert.equal(calls.length,3);
 assert.deepEqual(calls[2].args,['update','--host','claude','--scope','project','--root',project,'--user-root',home]);
});

test('real update preview blocks edited managed files and pending recovery without scanning or writes',async t=>{
 const {project,home}=await fixture(t);await records(project,['codex']);
 const file='.agents/skills/pegatus-start/SKILL.md';
 await mkdir(path.dirname(path.join(project,file)),{recursive:true});await writeFile(path.join(project,file),'edited');
 const lock=JSON.stringify({schemaVersion:1,host:'codex',scope:'project',files:[{path:file,installedHash:hashBytes('original')}]});
 await writeFile(path.join(project,'.pegatus/install-lock-codex.json'),lock);
 const admin=(args,options)=>runAdministration(args,{...options,prepareCatalog:async()=>catalog('new runtime'),securityPreflight:()=>{throw Error('must not scan blocked preview');}});
 const run=async()=>{
  const answers=['1','','','','yes'],output=[];
  assert.equal(await guided.runUpdate({cwd:project,home,ask:async()=>answers.shift(),write:s=>output.push(s),admin}),3,output.join('\n'));
  assert.equal(await readFile(path.join(project,file),'utf8'),'edited');
  assert.equal(await readFile(path.join(project,'.pegatus/install-lock-codex.json'),'utf8'),lock);
  return output.join('\n');
 };
 assert.match(await run(),/edited|changed/i);
 const journal=path.join(project,'.pegatus/install-journal-codex.json');await writeFile(journal,'{}');
 assert.match(await run(),/recovery/i);assert.equal(await readFile(journal,'utf8'),'{}');
});

test('real guided update changes runtime bytes while preserving task progress, config and instructions',async t=>{
 const {project,home}=await fixture(t);
 const args=['--host','codex','--scope','project','--root',project];
 assert.equal((await runAdministration(['install',...args],{cwd:project,prepareCatalog:async()=>catalog('old runtime'),securityPreflight:passed})).status,'passed');
 const oldLock=JSON.parse(await readFile(path.join(project,'.pegatus/install-lock-codex.json')));
 const retained={
  '.pegatus/work/existing-task/progress.json':'{"phase":"execute","revision":7,"completed":["step-1"]}\n',
  '.pegatus/work/existing-task/artifacts/plan.md':'Approved task plan\r\n',
  '.pegatus/config.json':'{"knowledge":{"paths":[".vault"]}}\n',
  'AGENTS.md':'Existing project instructions\n',
  'CLAUDE.md':'Existing Claude instructions\n',
 };
 for(const [file,content] of Object.entries(retained)){await mkdir(path.dirname(path.join(project,file)),{recursive:true});await writeFile(path.join(project,file),content);}
 const answers=['1','','','','yes'],output=[];let scans=0;
 const admin=(argv,options)=>runAdministration(argv,{...options,prepareCatalog:async()=>catalog('new runtime'),securityPreflight:()=>{scans++;return passed;}});
 assert.equal(await guided.runUpdate({cwd:project,home,ask:async()=>answers.shift(),write:s=>output.push(s),admin}),0,output.join('\n'));
 const lock=JSON.parse(await readFile(path.join(project,'.pegatus/install-lock-codex.json')));
 assert.notEqual(lock.runtime.id,oldLock.runtime.id);assert.equal(scans,1);
 assert.equal(await readFile(path.join(project,`.pegatus/runtime/shared/${lock.runtime.id}/bin/pegatus.mjs`),'utf8'),'new runtime');
 for(const [file,content] of Object.entries(retained))assert.deepEqual(await readFile(path.join(project,file)),Buffer.from(content),file);
});
