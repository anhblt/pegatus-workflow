import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {runCheck} from '../src/verify/runner.mjs';
import {scanAgentConfig} from '../src/security/agentshield.mjs';
import * as learning from '../src/memory/learning.mjs';
import {retrieveContext} from '../src/context/retrieve.mjs';
import {runLearningCommand} from '../src/memory/cli.mjs';

async function fixture(t) { const root=await mkdtemp(path.join(os.tmpdir(),'pegatus-final-'));t.after(()=>rm(root,{recursive:true,force:true}));return root; }
const input=(extra={})=>({projectId:'p',sourceTask:'T1',title:'Contact',content:'Contact knowledge',paths:['src'],keywords:['contact'],evidence:[{path:'checks.json',outcome:'passed'}],freshness:{status:'current',branch:'main'},...extra});
const target=root=>({root,projectId:'p',path:'.pegatus/memory/contact.md',context:{instructions:[]}});
const review=(c,extra={})=>({schemaVersion:1,decision:'approve',candidateId:c.id,candidateHash:c.contentHash,projectId:'p',destination:'.pegatus/memory/contact.md',userEvidence:'user:yes',reviewedBy:'user',reviewedAt:'2026-10-14T00:00:00.000Z',...extra});
const promote=(root,c)=>learning.promoteLesson(c,{target:target(root),approval:review(c),trustedCoordinator:true});
const retrieve=root=>retrieveContext({config:{},context:{root,projectId:'p',branch:'main',instructions:[],targetPaths:[{path:path.join(root,'src/a.mjs')}]},query:'contact'});

test('JSON and escaped credentials disappear from persisted check and learning output',async t=>{
 const root=await fixture(t),marker='SyntheticCredential12345',secret=`${marker}\\tail"${marker}`;
 const content=JSON.stringify({api_key:secret,password:secret},null,2)+'\n'+JSON.stringify(JSON.stringify({token:secret}));
 const result=await runCheck({id:'json',command:process.execPath,args:['-e','process.stdout.write(process.env.PEGATUS_TEST_OUTPUT)'],cwd:root,requires:[]},
  {codeState:'a',evidenceRoot:root,run:async()=>({exitCode:0,stdout:content,stderr:content})});
 assert.ok(!JSON.stringify(result).includes(marker));
 assert.ok(result.evidence[0].outputPath);
 for(const e of result.evidence) if(e.outputPath) assert.ok(!(await readFile(e.outputPath,'utf8')).includes(marker));
 const collected=await learning.collectLearning({root,projectId:'p',observations:[input({content})]})({taskId:'T1'});
 assert.ok(!JSON.stringify(collected).includes(marker));
 assert.ok(!(await readFile(path.join(root,'.pegatus/work/T1/lessons',`${collected[0].id}.json`),'utf8')).includes(marker));
});

test('CLI approval and rejection race cannot leave a rejected destination',async t=>{
 const root=await fixture(t),c=await learning.saveCandidate(root,learning.proposeLesson(input()));
 await writeFile(path.join(root,'approve.json'),JSON.stringify(review(c)));await writeFile(path.join(root,'reject.json'),JSON.stringify(review(c,{decision:'reject',reason:'No'})));await writeFile(path.join(root,'target.json'),JSON.stringify(target(root)));
 const args=['--root',root,'--task','T1','--project','p','--candidate',c.id];
 const outcomes=await Promise.allSettled([runLearningCommand(['learn','approve',...args,'--review-file','approve.json','--target-file','target.json'],root),runLearningCommand(['learn','reject',...args,'--review-file','reject.json'],root)]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const listed=await learning.listCandidates(root,{taskId:'T1',projectId:'p'});assert.equal(listed[0].reviews.length,1);
 if(listed[0].status==='rejected') await assert.rejects(readFile(path.join(root,target(root).path)),{code:'ENOENT'});
 else assert.equal((await retrieve(root)).refs[0].approvalState,'approved');
});

test('interrupted review keeps an inspectable lock and explicit recovery completes exact mutation',async t=>{
 const root=await fixture(t),c=await learning.saveCandidate(root,learning.proposeLesson(input()));
 assert.equal(typeof learning.commitReview,'function');assert.equal(typeof learning.recoverReview,'function');
 await assert.rejects(learning.commitReview(root,c,review(c),{trustedCoordinator:true,target:target(root),write:async request=>{
   await mkdir(path.dirname(request.path),{recursive:true});await writeFile(request.path,request.content,{flag:'wx'});await writeFile(request.path+'.json',JSON.stringify(request.metadata),{flag:'wx'});throw new Error('simulated interruption');
 }}),/interruption/);
 const lockFile=path.join(root,'.pegatus/work/T1/lessons',`${c.id}.review-lock`),bytes=await readFile(lockFile),expectedLockHash=createHash('sha256').update(bytes).digest('hex');
 assert.equal((await retrieve(root)).refs[0].approvalState,'unverified');
 await assert.rejects(learning.recordReview(root,c,review(c,{decision:'reject',reason:'No'}),{trustedCoordinator:true}),{code:'EEXIST'});
 const request={taskId:'T1',projectId:'p',candidateId:c.id,expectedLockHash,stoppedWriter:true,decision:'complete'};
 await assert.rejects(learning.recoverReview(root,{...request,stoppedWriter:false},{trustedCoordinator:true}),/stopped/);
 await assert.rejects(learning.recoverReview(root,{...request,decision:'abort'},{trustedCoordinator:true}),/Destination changed/);
 await writeFile(path.join(root,'recover.json'),JSON.stringify(request));
 assert.equal((await runLearningCommand(['learn','recover','--root',root,'--recovery-file','recover.json'],root)).status,'passed');
 assert.equal((await learning.listCandidates(root,{taskId:'T1',projectId:'p'}))[0].reviews.length,1);
 await assert.rejects(readFile(lockFile),{code:'ENOENT'});
});

test('actual supplemental MCP JSON detects credentials and preserves environment references',async t=>{
 const root=await fixture(t),file='.gemini/antigravity/mcp_config.json';await mkdir(path.dirname(path.join(root,file)),{recursive:true});
 await writeFile(path.join(root,file),JSON.stringify({mcpServers:{fixture:{command:'node',env:{API_KEY:'SyntheticCredential12345'}}}}));
 const result=await scanAgentConfig({root,files:[file]});assert.equal(result.status,'blocked');
 assert.ok(result.findings.some(f=>f.severity==='critical' && f.id==='pegatus-secret'));assert.ok(!JSON.stringify(result).includes('SyntheticCredential12345'));
 await writeFile(path.join(root,file),JSON.stringify({mcpServers:{fixture:{command:'node',env:{API_KEY:'${ENV_API_KEY}'}}}}));
 assert.equal((await scanAgentConfig({root,files:[file]})).status,'passed');
});

test('selected memory validates exact approved bytes and treats legacy approval as unverified',async t=>{
 const root=await fixture(t),c=learning.proposeLesson(input());await promote(root,c);
 assert.equal((await retrieve(root)).refs[0].confirmation,'not-requested');
 await writeFile(path.join(root,target(root).path),'Changed contact claim');
 const changed=await retrieve(root);assert.equal(changed.refs[0].approvalState,'unverified');assert.equal(changed.refs[0].freshness.status,'unknown');assert.equal(changed.refs[0].confirmation,'agent-review-required');assert.ok(changed.uncertainties.length);
 const sidecar=path.join(root,target(root).path+'.json'),metadata=JSON.parse(await readFile(sidecar));delete metadata.documentHash;await writeFile(sidecar,JSON.stringify(metadata));
 assert.equal((await retrieve(root)).refs[0].approvalState,'unverified');
 await rm(path.join(root,target(root).path));assert.equal((await retrieve(root)).refs.length,0);
 const fresh=learning.proposeLesson(input({content:'Reviewed changed contact claim'}));await learning.promoteLesson(fresh,{target:{...target(root),path:'.pegatus/memory/reviewed.md'},approval:review(fresh,{destination:'.pegatus/memory/reviewed.md'}),trustedCoordinator:true});
 assert.equal((await retrieve(root)).refs[0].confirmation,'not-requested');
});

test('concurrent candidate decisions and duplicate approvals serialize immutable history',async t=>{
 for(const decision of ['reject','approve']) {
 const root=await fixture(t),c=await learning.saveCandidate(root,learning.proposeLesson(input()));
 const outcomes=await Promise.allSettled([learning.recordReview(root,c,review(c),{trustedCoordinator:true}),learning.recordReview(root,c,review(c,{decision,reason:'No',reviewedAt:'2026-10-14T00:00:01.000Z'}),{trustedCoordinator:true})]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal((await learning.listCandidates(root,{taskId:'T1',projectId:'p'}))[0].reviews.length,1);
 }
});

test('public memory command bounds aggregate output for large and many claims',async t=>{
 for(const count of [1,12]) {
 const root=await fixture(t);await mkdir(path.join(root,'.pegatus'),{recursive:true});await writeFile(path.join(root,'.pegatus/config.json'),JSON.stringify({tokenControls:{maxContextChars:1024,maxOutputChars:128}}));
 for(let i=0;i<count;i++){ const c=learning.proposeLesson(input({title:`Contact ${i}`,content:'Contact '+String(i)+'x'.repeat(count===1?50000:500)}));const p=`.pegatus/memory/${i}.md`;await learning.promoteLesson(c,{target:{...target(root),path:p},approval:review(c,{destination:p}),trustedCoordinator:true}); }
 const result=await runLearningCommand(['memory','--root',root,'--project','p','--path','src/a.mjs','--query','contact','--branch','main'],root);
 assert.ok(JSON.stringify(result).length<=128);assert.equal(result.status,'blocked');assert.match(JSON.stringify(result),/budget/);assert.match(JSON.stringify(result),/\.pegatus\/memory/);
 }
});

test('onboarding gates and CLI help distinguish host workflows from executable operations',async()=>{
 const readme=await readFile(new URL('../README.md',import.meta.url),'utf8');assert.doesNotMatch(readme,/Small tasks use a short design approval|features require approved spec, design, and plan/);
 const response=spawnSync(process.execPath,['bin/pegatus.mjs','--help'],{encoding:'utf8'});assert.equal(response.status,0);
 assert.match(response.stdout,/Host workflows/);assert.doesNotMatch(response.stdout.split('\n').find(line=>line.startsWith('Operations:'))??'',/\bstart\b|\bdesign\b|\bexecute\b/);
});
