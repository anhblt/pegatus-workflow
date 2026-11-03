import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {detectHosts,runSetup} from '../src/install/setup.mjs';
import {runAdministration} from '../src/install/admin.mjs';

async function fixture(t) {
 const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-setup-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const home=path.join(root,'home'),bin=path.join(root,'bin'),project=path.join(root,'project');
 for(const dir of [home,bin,project])await mkdir(dir);
 return {root,home,bin,project};
}
test('Windows detection distinguishes command, application, stale config and absent host without executing files',async t=>{
 const {home,bin}=await fixture(t),local=path.join(home,'AppData','Local');
 await writeFile(path.join(bin,'claude.cmd'),'must never execute');
 await mkdir(path.join(home,'.codex'));
 const app=path.join(local,'Programs','Antigravity','Antigravity.exe');
 await mkdir(path.dirname(app),{recursive:true});await writeFile(app,'not executable');
 const hosts=await detectHosts({home,platform:'win32',env:{PATH:bin,LOCALAPPDATA:local}});
 assert.equal(hosts.find(h=>h.id==='claude').status,'cli');
 assert.equal(hosts.find(h=>h.id==='codex').status,'configuration');
 assert.equal(hosts.find(h=>h.id==='antigravity').status,'application');
 const absent=await detectHosts({home:bin,platform:'linux',env:{PATH:''}});
 assert.ok(absent.every(h=>h.status==='not-detected'));
});
test('Linux detection ignores non-executable files and relative PATH entries',async t=>{
 const {home,bin}=await fixture(t);
 await writeFile(path.join(bin,'codex'),'not executable',{mode:0o644});
 const hosts=await detectHosts({home,platform:'linux',env:{PATH:`.:${bin}`}});
 assert.equal(hosts.find(h=>h.id==='codex').status,'not-detected');
});
const detected=async()=>[{id:'claude',label:'Claude Code',status:'cli',evidence:['fixture']},{id:'codex',label:'Codex',status:'not-detected',evidence:[]},{id:'antigravity',label:'Antigravity',status:'not-detected',evidence:[]}];
test('setup manual multi-selection previews all hosts and cancellation writes nothing',async t=>{
 const {home,project}=await fixture(t),answers=['2,3','1','','','no'],calls=[],output=[];
 const code=await runSetup({cwd:project,home,detect:detected,ask:async()=>answers.shift(),write:s=>output.push(s),admin:async(args,options)=>{calls.push({args,options});return {status:'passed',preview:{writes:['a'],removes:[],conflicts:[]}};}});
 assert.equal(code,0);assert.equal(calls.length,2);assert.ok(calls.every(c=>c.options.dryRun));
 assert.deepEqual(await readdir(project),[]);assert.match(output.join('\n'),/not detected/i);
});
test('setup confirmation uses selected root and existing safe installer, stopping on a failed host',async t=>{
 const {home,project}=await fixture(t),answers=['1,2','2',home,'yes'],calls=[];
 const code=await runSetup({cwd:project,home,detect:detected,ask:async()=>answers.shift(),write:()=>{},admin:async(args,options)=>{
  calls.push({args,options});return options.dryRun?{status:'passed',preview:{writes:['a'],removes:[],conflicts:[]}}:{status:'blocked',reasons:['scanner unavailable']};
 }});
 assert.equal(code,3);assert.equal(calls.length,3);assert.ok(calls[2].args.includes(home));assert.ok(calls[2].args.includes('user'));
});
test('conflicts or interrupted input cannot reach apply',async t=>{
 const {home,project}=await fixture(t),answers=['1','1','',''],calls=[];
 assert.equal(await runSetup({cwd:project,home,detect:detected,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{calls.push(opts);return {status:'blocked',preview:{writes:[],removes:[],conflicts:[{path:'edited',reason:'edited'}]}};}}),3);
 assert.ok(calls.every(c=>c.dryRun));
 assert.equal(await runSetup({cwd:project,home,detect:detected,ask:async()=>{throw Object.assign(new Error('aborted'),{code:'ABORT_ERR'});},write:()=>{}}),0);
});
test('cancellation during one host apply lets its transaction settle but prevents subsequent hosts',async t=>{
 const {home,project}=await fixture(t),answers=['1,2','1','','','yes'],controller=new AbortController(),applied=[];
 const code=await runSetup({cwd:project,home,signal:controller.signal,detect:detected,ask:async()=>answers.shift(),write:()=>{},admin:async(args,opts)=>{
  if(opts.dryRun)return {status:'passed',preview:{writes:['a'],removes:[],conflicts:[]}};
  applied.push(args);controller.abort();return {status:'passed'};
 }});
 assert.equal(code,0);assert.equal(applied.length,1);assert.equal(applied[0][0],'install');
});
test('real dry-run neither scans nor writes, reports foreign files and pending recovery',async t=>{
 const {project}=await fixture(t),args=['install','--host','codex','--scope','project','--root',project];
 const options={cwd:project,dryRun:true,securityPreflight:()=>{throw Error('must not scan');}};
 const result=await runAdministration(args,options);
 assert.equal(result.status,'passed');assert.ok(result.preview.writes.length>0);assert.deepEqual(await readdir(project),[]);
 await mkdir(path.join(project,'.codex','agents'),{recursive:true});
 await writeFile(path.join(project,'.codex','agents','pegatus-context-explorer.toml'),'foreign');
 assert.equal((await runAdministration(args,options)).status,'blocked');
 await mkdir(path.join(project,'.pegatus'));await writeFile(path.join(project,'.pegatus','install-journal-codex.json'),'{}');
 const pending=await runAdministration(args,options);assert.equal(pending.status,'blocked');assert.match(pending.reasons.join(),/recovery/i);
});
test('noninteractive bare install and setup terminate with actionable usage',()=>{
 const cli=fileURLToPath(new URL('../bin/pegatus.mjs',import.meta.url));
 for(const args of [['install'],['setup']]){
  const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000});
  assert.equal(result.status,2);assert.match(result.stderr,/interactive terminal|--host/i);
 }
 const help=spawnSync(process.execPath,[cli,'--help'],{encoding:'utf8'});assert.equal(help.status,0);
});
