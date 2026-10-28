import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileBytes,lockPath} from './ownership.mjs';
import {createSetupTerminal} from './terminal.mjs';
import {createAdministrationSession} from './admin.mjs';

const hosts=[{id:'claude',label:'Claude Code'},{id:'codex',label:'Codex'},{id:'antigravity',label:'Antigravity'}];
const display=value=>String(value).replace(/[\x00-\x1f\x7f-\x9f]/g,'?');

/** Guided presentation only; ownership, recovery and mutation stay in administration. */
export async function runUninstall({cwd,home,ask,signal,write=message=>process.stdout.write(message+'\n'),admin=createAdministrationSession()}={}) {
 let terminal,interrupt;
 if(!ask) {
  if(!process.stdin.isTTY || !process.stdout.isTTY) {
   process.stderr.write('Uninstall needs an interactive terminal. For scripts use uninstall --host <host> --scope project|user --root <existing-root>.\n');return 2;
  }
  terminal=createSetupTerminal();
  const controller=new AbortController();
  signal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
  interrupt=()=>controller.abort();process.on('SIGINT',interrupt);
  ask=prompt=>terminal.ask(prompt,{signal});write=terminal.line;
 }
 try {
  write('Pegatus uninstall');
  let scope;
  if(terminal)[scope]=await terminal.select('Where should Pegatus be removed?',[{label:'Current project',value:'project'},{label:'User-wide defaults',value:'user'}],{initial:['project'],signal});
  else for(;;) {
   const answer=await ask('Scope: 1 current project, 2 user-wide defaults [1] (q to cancel): ');
   if(answer===undefined || /^q$/i.test(answer.trim()))return 0;
   if(['','1','2'].includes(answer.trim())){scope=answer.trim()==='2'?'user':'project';break;}
   write('Choose 1 or 2.');
  }
  const defaultRoot=scope==='user'?home:cwd;
  const chosen=await ask(`Existing ${scope} root [${display(defaultRoot)}] (q to cancel): `);
  if(chosen===undefined || /^q$/i.test(chosen.trim()))return 0;
  const root=path.resolve(cwd,chosen.trim()||defaultRoot);
  try {if(!(await stat(root)).isDirectory()){write('Blocked: selected root must be an existing directory.');return 2;}}
  catch(error){if(error.code!=='ENOENT' && error.code!=='ENOTDIR')throw error;write('Blocked: selected root must be an existing directory.');return 2;}
  const installed=[];
  for(const host of hosts) {
   // Presence is only a menu hint. Administration validates the records and paths.
   if(await fileBytes(root,lockPath(host.id),{internal:true})!==null
    || await fileBytes(root,`.pegatus/install-journal-${host.id}.json`,{internal:true})!==null
    || await fileBytes(root,`.pegatus/install-busy-${host.id}.json`,{internal:true})!==null)installed.push(host);
  }
  if(!installed.length){write('No Pegatus installation records found at this destination. Inherited user defaults must be removed from their user root.');return 0;}
  let selected;
  if(terminal)selected=await terminal.select('Which agents should have Pegatus removed?',installed.map((host,index)=>({value:index,label:`${host.label} (ownership or recovery record found)`})),{multiple:true,initial:[],signal});
  else {
   installed.forEach((host,index)=>write(`${index+1}. ${host.label}: ownership or recovery record found`));
   for(;;) {
    const answer=await ask('Hosts to uninstall (comma-separated numbers, q to cancel): ');
    if(answer===undefined || /^q$/i.test(answer.trim()))return 0;
    if(/^\d+(?:\s*,\s*\d+)*$/.test(answer.trim())) {
     selected=[...new Set(answer.split(',').map(value=>Number(value)-1))];
     if(selected.every(index=>index>=0&&index<installed.length))break;
    }
    write('Select at least one listed host number.');
   }
  }
  write(`◇ Review uninstall: ${scope} at ${display(root)}`);
  write('Task history, team configuration, unrelated settings and instructions are preserved. Edited managed files block removal.');
  if(scope==='user')write('Removing user-wide defaults affects projects that inherit this installation.');
  write('Hosts are removed sequentially; earlier removals remain if a later host blocks.');
  const requests=[],projectedRuntimes=new Map();
  for(const index of selected) {
   if(signal?.aborted){write('Cancelled; no uninstall applied.');return 0;}
   const host=installed[index],args=['uninstall','--host',host.id,'--scope',scope,'--root',root];
   const preview=await admin(args,{cwd,dryRun:true,projectedRuntimes,onPreviewPlan:runtime=>projectedRuntimes.set(host.id,runtime)});
   write(`${host.label}: ${preview.status}; ${preview.preview?.removes.length??0} removals.`);
   for(const file of preview.preview?.removes??[])write(`  Remove owned file: ${display(file)}`);
   for(const reason of preview.reasons??[])write(`  ${display(reason)}`);
   if(!['passed','skipped'].includes(preview.status)){write('No uninstall applied. Resolve the reported conflict/recovery condition first.');return 3;}
   requests.push({host,args,preview:preview.preview});
  }
  const confirmation=terminal?(await terminal.select('Apply this uninstall?',[{label:'Yes',value:'yes'},{label:'No',value:'no'}],{initial:['no'],signal}))[0]:await ask('Apply this uninstall? [y/N]: ');
  if(!/^y(?:es)?$/i.test(confirmation?.trim()??'')){write('Cancelled; no uninstall applied.');return 0;}
  for(const {host,args,preview} of requests) {
   if(signal?.aborted){write('Cancelled. Completed removals are retained.');return 0;}
   write(`Uninstalling ${host.label}…`);
   const result=await admin(args,{cwd,approvedPreview:preview});
   write(`${host.label}: ${result.status}`);
   for(const reason of result.reasons??[])write(`  ${display(reason)}`);
   if(!['passed','skipped'].includes(result.status)){write('Stopped. Earlier removals are retained; inspect doctor before retrying.');return result.status==='blocked'?3:1;}
  }
  if(signal?.aborted){write('Cancelled after the active transaction settled. Completed removals are retained.');return 0;}
  write('◇ Uninstall complete. Empty owned-file parent directories were pruned where possible. Reload the selected hosts.');return 0;
 } catch(error) {
  if(signal?.aborted || ['ABORT_ERR','ERR_USE_AFTER_CLOSE'].includes(error.code)){write('Cancelled.');return 0;}
  write(`Uninstall failed: ${display(error.message)}. Inspect installation state with doctor before retrying.`);return 1;
 } finally {if(interrupt)process.removeListener('SIGINT',interrupt);}
}
