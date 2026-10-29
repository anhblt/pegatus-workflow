import {lstat,readdir,rmdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {assertContained} from '../paths.mjs';
import {readOwnership,fileBytes} from './ownership.mjs';
import {withInstallationLock} from './apply.mjs';
import {createSetupTerminal} from './terminal.mjs';

const hosts=['claude','codex','antigravity'];
const display=value=>String(value).replace(/[\x00-\x1f\x7f-\x9f]/g,'?');
async function directory(root,relative) {
 let target=root;
 for(const part of relative.split('/')) {
  target=path.join(target,part);
  let info;
  try {info=await lstat(target);} catch(error){if(error.code==='ENOENT')return null;throw error;}
  if(info.isSymbolicLink() || !info.isDirectory())return null;
 }
 await assertContained(root,target);
 return lstat(target);
}

async function preview(root,{locked=false}={}) {
 for(const host of hosts) {
  if(await fileBytes(root,`.pegatus/install-journal-${host}.json`,{internal:true}))throw new Error('Pending installation recovery; resolve before cleanup');
 }
 if(!locked)for(const name of [...hosts,'shared']) {
  if(await fileBytes(root,`.pegatus/install-busy-${name}.json`,{internal:true}))throw new Error('Installation mutex found; inspect administration state before cleanup');
 }
 const protectedDirs=new Set(),snapshots=new Set(),candidates=[];
 for(const host of hosts) {
  const owned=await readOwnership(root,host,{expandRuntime:false});
  if(owned.runtime)snapshots.add(owned.runtime.id);
  for(const file of owned.files)for(let dir=path.posix.dirname(file.path);dir!=='.';dir=path.posix.dirname(dir))protectedDirs.add(dir.toLowerCase());
 }
 async function visit(relative) {
  const info=await directory(root,relative);
  if(!info)return false;
  let empty=true;
  for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})) {
   if(!entry.isDirectory() || entry.isSymbolicLink()){empty=false;continue;}
   if(!await visit(`${relative}/${entry.name}`))empty=false;
  }
  if(!empty || protectedDirs.has(relative.toLowerCase()))return false;
  candidates.push({path:relative,ino:info.ino,dev:info.dev});return true;
 }
 for(const host of hosts)await visit(`.pegatus/runtime/${host}`);
 const shared='.pegatus/runtime/shared';
 if(await directory(root,shared))for(const entry of await readdir(path.join(root,shared),{withFileTypes:true})) {
  if(/^[a-f0-9]{64}$/.test(entry.name) && !snapshots.has(entry.name))await visit(`${shared}/${entry.name}`);
 }
 for(const parent of ['.claude/skills','.agents/skills']) {
  if(!await directory(root,parent))continue;
  for(const entry of await readdir(path.join(root,parent),{withFileTypes:true})) {
   if(entry.name.startsWith('pegatus-'))await visit(`${parent}/${entry.name}`);
  }
 }
 return candidates;
}

/** Empty-directory maintenance only: no file deletion or ownership inference. */
export async function runCleanup(args,{cwd,ask,write=message=>process.stdout.write(message+'\n'),signal}={}) {
 let rootOption,dryRun=false,terminal,interrupt;
 for(let index=0;index<args.length;index++) {
  if(args[index]==='--dry-run' && !dryRun)dryRun=true;
  else if(args[index]==='--root' && !rootOption && args[index+1] && !args[index+1].startsWith('--'))rootOption=args[++index];
  else {write('Usage: pegatus cleanup [--root <existing-root>] [--dry-run]');return 2;}
 }
 if(!ask && !dryRun) {
  if(!process.stdin.isTTY || !process.stdout.isTTY){write('Cleanup needs an interactive terminal for confirmation. Use cleanup --root <existing-root> --dry-run for a read-only preview.');return 2;}
  terminal=createSetupTerminal();
  const controller=new AbortController();signal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
  interrupt=()=>controller.abort();process.on('SIGINT',interrupt);
  ask=prompt=>terminal.ask(prompt,{signal});write=terminal.line;
 }
 try {
  if(!rootOption && !dryRun){const answer=await ask(`Existing cleanup root [${display(cwd)}] (q to cancel): `);if(answer===undefined || /^q$/i.test(answer.trim()))return 0;rootOption=answer.trim();}
  const root=path.resolve(cwd,rootOption||cwd);
  try{if(!(await stat(root)).isDirectory())throw new Error();}catch{write('Cleanup root must be an existing directory.');return 2;}
  const candidates=await preview(root);
  write(`Cleanup preview: ${display(root)}`);
  write('Only empty Pegatus runtime and pegatus-* skill directories are eligible. Files, active snapshots, links and shared container directories are preserved.');
  for(const candidate of candidates)write(`  Remove empty directory: ${display(candidate.path)}`);
  if(!candidates.length){write('No obsolete empty Pegatus directories found.');return 0;}
  if(dryRun){write(`Preview only: ${candidates.length} empty directories; no changes applied.`);return 0;}
  const answer=terminal?(await terminal.select('Apply this cleanup?',[{label:'Yes',value:'yes'},{label:'No',value:'no'}],{initial:['no'],signal}))[0]:await ask('Apply this cleanup? [y/N]: ');
  if(!/^y(?:es)?$/i.test(answer?.trim()??'') || signal?.aborted){write('Cancelled; no cleanup applied.');return 0;}
  const approved=new Map(candidates.map(item=>[item.path,item]));
  const result=await withInstallationLock(root,async()=>{
   const current=await preview(root,{locked:true});let removed=0;
   for(const candidate of current) {
    if(signal?.aborted)break;
    const original=approved.get(candidate.path);
    if(!original || original.ino!==candidate.ino || original.dev!==candidate.dev)continue;
    const info=await directory(root,candidate.path);
    if(!info || info.ino!==original.ino || info.dev!==original.dev)continue;
    try{await rmdir(path.join(root,candidate.path));removed++;}
    catch(error){if(!['ENOENT','ENOTEMPTY','EEXIST'].includes(error.code))throw error;}
   }
   write(`Cleanup ${signal?.aborted?'cancelled':'complete'}: removed ${removed} empty directories.`);
   return {status:'passed'};
  });
  for(const reason of result.reasons??[])write(display(reason));
  return result.status==='blocked'?3:0;
 } catch(error) {
  if(signal?.aborted || error.code==='ABORT_ERR'){write('Cleanup cancelled. Completed directory removals are retained.');return 0;}
  write(`Cleanup blocked: ${display(error.message)}. Completed directory removals are retained.`);return 3;
 } finally {if(interrupt)process.removeListener('SIGINT',interrupt);}
}
