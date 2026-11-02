import {mkdir,readFile,writeFile,rename,unlink,lstat} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {assertContained} from '../paths.mjs';
import {fileBytes,hashBytes,readOwnership} from '../install/ownership.mjs';
import {scanInstallPlan} from '../security/agentshield.mjs';
import {createSetupTerminal} from '../install/terminal.mjs';
import {withInstallationLock} from '../install/apply.mjs';
import {activationFor} from './operations.mjs';

const object=value=>value && typeof value==='object' && !Array.isArray(value);
const hosts=[{id:'claude',label:'Claude Code'},{id:'codex',label:'Codex'},{id:'antigravity',label:'Antigravity (native hooks unavailable)'}];

export async function previewHookSetup(root,host,{locked=false}={}) {
 const proposal=activationFor(host,root);
 for(const file of ['.pegatus/install-journal-'+host+'.json',...locked?[]:['.pegatus/install-busy-'+host+'.json','.pegatus/install-busy-shared.json']])
  if(await fileBytes(root,file,{internal:true}))throw new Error('Installation recovery or administration is pending');
 const ownership=await readOwnership(root,host);
 const wrapper=`.pegatus/runtime/${host}/bin/pegatus.mjs`;
 if(!ownership.lockHash || !ownership.files.some(f=>f.path===wrapper && f.actualHash===f.installedHash))throw new Error('Installed host runtime missing or changed');
 if(ownership.files.some(f=>f.actualHash!==f.installedHash))throw new Error('Installed files have changed; run doctor first');
 if(ownership.files.some(f=>f.path.toLowerCase()===proposal.target.toLowerCase()))throw new Error('Hook configuration is managed by an installation; reconcile ownership first');
 const target=path.join(root,proposal.target);
 await assertContained(root,target);
 try {if((await lstat(target)).isSymbolicLink())throw new Error('Hook configuration is a symbolic link');} catch(e){if(e.code!=='ENOENT')throw e;}
 const original=await fileBytes(root,proposal.target);
 const config=original===null?{}:JSON.parse(original.toString('utf8'));
 if(!object(config) || config.hooks!==undefined&&!object(config.hooks))throw new Error('Invalid existing hook configuration');
 config.hooks??={};
 for(const [event,entries] of Object.entries(proposal.merge.hooks)) {
  if(config.hooks[event]!==undefined&&!Array.isArray(config.hooks[event]))throw new Error(`Invalid ${event} hooks`);
  config.hooks[event]??=[];
  for(const entry of entries) if(!config.hooks[event].some(existing=>isDeepStrictEqual(existing,entry)))config.hooks[event].push(entry);
 }
 const content=JSON.stringify(config,null,2)+'\n';
 const token=hashBytes(JSON.stringify({host,root,target:proposal.target,original:original===null?null:hashBytes(original),lock:ownership.lockHash,content}));
 return {host,root,target:proposal.target,content,token,changed:original===null || !original.equals(Buffer.from(content))};
}

export async function applyHookSetup(root,host,token,{scan=scanInstallPlan}={}) {
 const outcome=await withInstallationLock(root,async()=>applyLocked(root,host,token,scan));
 if(outcome.status==='blocked')throw new Error((outcome.reasons??['Installation is busy']).join(', '));
 return outcome;
}

async function applyLocked(root,host,token,scan) {
 let preview=await previewHookSetup(root,host,{locked:true});
 if(preview.token!==token)throw new Error('Configuration or installation changed since preview');
 if(!preview.changed)return {status:'skipped',target:preview.target};
 const op={path:preview.target,content:preview.content,hash:hashBytes(preview.content)};
 const result=await scan({root,owned:[op],conflicts:[]});
 if(result.status!=='passed')throw new Error(`Security scan ${result.status}: ${(result.reasons??[]).join(', ')}`);
 preview=await previewHookSetup(root,host,{locked:true});
 if(preview.token!==token)throw new Error('Configuration or installation changed since preview');
 const target=path.join(root,preview.target),dir=path.dirname(target),temp=path.join(dir,`.pegatus-hook-${randomUUID()}.tmp`);
 await assertContained(root,dir);await mkdir(dir,{recursive:true});await assertContained(root,target);
 try {
  await writeFile(temp,preview.content,{flag:'wx',mode:0o600});
  const check=await previewHookSetup(root,host,{locked:true});
  if(check.token!==token)throw new Error('Configuration or installation changed since preview');
  await rename(temp,target);
 } finally {await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 return {status:'passed',target:preview.target};
}

export async function runHookActivation({cwd,ask,write=message=>process.stdout.write(message+'\n'),scan}={}) {
 let terminal;
 if(!ask) {
  if(!process.stdin.isTTY || !process.stdout.isTTY){process.stderr.write('Hook setup needs an interactive terminal; use --host and --root for a proposal.\n');return 2;}
  terminal=createSetupTerminal();write=terminal.line;
 }
 try {
  const installed=[];
  for(const host of hosts)if(await fileBytes(cwd,`.pegatus/install-lock-${host.id}.json`,{internal:true}))installed.push(host);
  if(!installed.length){write('No project installation found in this directory.');return 0;}
  let selected;
  if(terminal)[selected]=await terminal.select('Choose a host for hook setup',installed.map(h=>({label:h.label,value:h.id})));
  else {
   installed.forEach((h,i)=>write(`${i+1}. ${h.label}`));
   const answer=await ask('Choose a host (q to cancel): ');
   if(!answer || /^q$/i.test(answer.trim()))return 0;
   selected=installed[Number(answer.trim())-1]?.id;
  }
  if(!selected){write('Invalid host selection.');return 2;}
  if(selected==='antigravity'){write('Antigravity native hooks are unsupported or unverified. Use explicit lifecycle calls.');return 0;}
  const preview=await previewHookSetup(cwd,selected);
  write(`Preview ${preview.target}: ${preview.changed?'merge Pegatus hooks':'already configured'}.`);
  write(preview.content);
  const answer=terminal?(await terminal.select('Apply this hook configuration?',[{label:'Yes',value:'yes'},{label:'No',value:'no'}],{initial:['no']}))[0]:await ask('Apply this hook configuration? [y/N]: ');
  if(!/^y(?:es)?$/i.test(answer?.trim()??'')){write('Cancelled; no changes applied.');return 0;}
  const result=await applyHookSetup(cwd,selected,preview.token,{scan});
  write(`${result.status}: ${result.target}. Restart ${selected} to load changes.`);
  write('Bind PEGATUS_ROOT and an existing PEGATUS_TASK_ID before starting the host; callbacks are advisory.');return 0;
 } catch(error) {
  if(error.code==='ABORT_ERR'){write('Cancelled.');return 0;}
  write(`Hook setup blocked: ${error.message}`);return 3;
 }
}
