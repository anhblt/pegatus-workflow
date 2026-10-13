import { mkdir, writeFile, rename, unlink, open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertContained } from '../paths.mjs';
import { fileBytes, hashBytes, hostName, lockPath, safeRelative } from './ownership.mjs';

const result=(status,reasons=[],details={})=>({status,evidence:[],reasons,...details});
const journalPath=host=>`.pegatus/install-journal-${hostName(host)}.json`;
async function rejectCaseCollision(root,file) {
  let parent=root;
  for(const component of file.split('/')) {
    await assertContained(root,parent);
    let names;
    try { names=await readdir(parent); } catch(error) {if(error.code==='ENOENT') return;throw error;}
    if(names.some(name=>name.toLowerCase()===component.toLowerCase() && name!==component)) throw new Error(`Case-insensitive filesystem collision: ${file}`);
    parent=path.join(parent,component);
  }
}
async function assertExpected(root,op) {
  await rejectCaseCollision(root,op.path);
  const actual=await fileBytes(root,op.path),actualHash=actual===null?null:hashBytes(actual);
  if(actualHash!==op.expectedHash) throw new Error(`Destination changed after planning: ${op.path}`);
}
async function replace(root,file,bytes) {
  const target=path.resolve(root,file);
  await assertContained(root,target);
  await mkdir(path.dirname(target),{recursive:true});
  await assertContained(root,target);
  const temporary=`${target}.${randomUUID()}.tmp`;
  try { await writeFile(temporary,bytes,{flag:'wx'}); await assertContained(root,target); await rename(temporary,target); }
  finally { await unlink(temporary).catch(error=>{if(error.code!=='ENOENT') throw error;}); }
}
async function remove(root,file) {
  const target=path.resolve(root,file); await assertContained(root,target);
  await unlink(target).catch(error=>{if(error.code!=='ENOENT') throw error;});
}
async function recover(root,host) {
  const bytes=await fileBytes(root,journalPath(host),{internal:true});
  if(!bytes) return result('skipped', ['No interrupted installation']);
  const journal=JSON.parse(bytes.toString('utf8'));
  if(journal.schemaVersion!==1 || journal.host!==host || !Array.isArray(journal.entries)) return result('blocked',['Invalid recovery journal']);
  // Inspect every file before restoring any of them; user edits after interruption win.
  for(const entry of journal.entries) {
    safeRelative(entry.path,{internal:entry.path===lockPath(host)});
    const actual=await fileBytes(root,entry.path,{internal:entry.path===lockPath(host)});
    const actualHash=actual===null?null:hashBytes(actual), beforeHash=entry.before===null?null:hashBytes(Buffer.from(entry.before,'base64'));
    if(actualHash!==beforeHash && actualHash!==entry.afterHash) return result('blocked',[`Recovery conflict: ${entry.path}`]);
  }
  for(const entry of [...journal.entries].reverse()) {
    if(entry.before===null) await remove(root,entry.path);
    else await replace(root,entry.path,Buffer.from(entry.before,'base64'));
  }
  await remove(root,journalPath(host));
  return result('passed',[],{recovered:true});
}
async function exclusive(root,host,action) {
  const relative=`.pegatus/install-busy-${hostName(host)}.json`,target=path.resolve(root,relative);
  await assertContained(root,target); await mkdir(path.dirname(target),{recursive:true});
  let handle;
  try { handle=await open(target,'wx'); }
  catch(error) {
    if(error.code!=='EEXIST') throw error;
    const bytes=await fileBytes(root,relative,{internal:true});
    const pid=JSON.parse(bytes.toString('utf8')).pid;
    if(!Number.isSafeInteger(pid) || pid<1) return result('blocked',['Invalid installation mutex; inspect before recovery']);
    try {process.kill(pid,0);return result('blocked',['Another installation is active']);}
    catch(probe) {if(probe.code!=='ESRCH') return result('blocked',['Cannot determine installer liveness']);}
    await remove(root,relative); handle=await open(target,'wx');
  }
  try {await handle.writeFile(JSON.stringify({schemaVersion:1,pid:process.pid}));return await action();}
  finally {await handle.close();await remove(root,relative);}
}
/** Restore an interrupted apply only when every destination still matches the journal. */
export async function recoverInstall(root,host) {
  try {
    if(!await fileBytes(root,journalPath(host),{internal:true})) return result('skipped',['No interrupted installation']);
    return await exclusive(root,host,()=>recover(root,host));
  } catch(error){return result('blocked',[error.message]);}
}
/** Security is injected by the scanner integration, not inferred from exit 0 or filenames.
 * afterWrite is an optional transaction observer; throwing from it rolls back the apply.
 */
export async function applyInstall(plan,{securityPreflight,afterWrite}={}) {
  if(plan.conflicts?.length) return result('blocked',['Installation ownership conflicts'],{conflicts:plan.conflicts});
  if(securityPreflight?.status!=='passed') return result('blocked',['Security preflight unavailable or not passed'],{security:securityPreflight??{status:'unavailable'}});
  try {
    if(!path.isAbsolute(plan.root) || !['project','user'].includes(plan.scope)) throw new TypeError('Explicit absolute root and scope are required');
    return await exclusive(plan.root,plan.host,async()=>{
      const recovered=await recover(plan.root,plan.host); if(recovered.status==='blocked') return recovered;
      const entries=[];
      for(const op of [...plan.writes,...plan.removes]) {
        safeRelative(op.path);
        await rejectCaseCollision(plan.root,op.path);
        const before=await fileBytes(plan.root,op.path),actual=before===null?null:hashBytes(before);
        if(actual!==op.expectedHash) return result('blocked',[`Destination changed after planning: ${op.path}`]);
        if(plan.writes.includes(op) && (op.content===undefined || hashBytes(op.content)!==op.hash)) return result('blocked',[`Invalid staged bytes: ${op.path}`]);
        entries.push({path:op.path,before:before===null?null:before.toString('base64'),afterHash:plan.writes.includes(op)?op.hash:null});
      }
      const lock={schemaVersion:1,host:plan.host,scope:plan.scope,version:plan.version,sourceRevisions:plan.sourceRevisions??[],files:plan.owned.map(op=>({path:op.path,installedHash:op.hash,sourceHash:op.sourceHash??op.hash}))};
      const bytes=plan.owned.length?Buffer.from(JSON.stringify(lock,null,2)+'\n'):null,previous=await fileBytes(plan.root,lockPath(plan.host),{internal:true});
      entries.push({path:lockPath(plan.host),before:previous===null?null:previous.toString('base64'),afterHash:bytes===null?null:hashBytes(bytes)});
      await replace(plan.root,journalPath(plan.host),JSON.stringify({schemaVersion:1,host:plan.host,entries}));
      try {
        // Journal contains all rollback bytes before the first managed mutation.
        for(const op of plan.writes) {await assertExpected(plan.root,op);await replace(plan.root,op.path,op.content);await afterWrite?.(op);}
        for(const op of plan.removes) {await assertExpected(plan.root,op);await remove(plan.root,op.path);await afterWrite?.(op);}
        const currentLock=await fileBytes(plan.root,lockPath(plan.host),{internal:true});
        if((currentLock===null?null:hashBytes(currentLock))!==(previous===null?null:hashBytes(previous))) throw new Error('Ownership lock changed during installation');
        if(bytes===null) await remove(plan.root,lockPath(plan.host));
        else await replace(plan.root,lockPath(plan.host),bytes);
        await remove(plan.root,journalPath(plan.host));
        return result('passed',[],{lock:bytes===null?null:lock,written:plan.writes.length,removed:plan.removes.length});
      } catch(error) {
        const rollback=await recover(plan.root,plan.host);
        return result(rollback.status==='blocked'?'blocked':'failed',[error.message,...rollback.reasons],{rollback});
      }
    });
  } catch(error) {return result('blocked',[error.message]);}
}
