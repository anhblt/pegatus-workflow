import { mkdir, writeFile, rename, unlink, open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertContained } from '../paths.mjs';
import { fileBytes, hashBytes, hostName, lockPath, safeRelative } from './ownership.mjs';
import {assertRuntimeTree} from './runtime.mjs';

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
async function assertOwned(root,op) {
  safeRelative(op.path);
  await rejectCaseCollision(root,op.path);
  const actual=await fileBytes(root,op.path);
  if((actual===null?null:hashBytes(actual))!==op.hash) throw new Error(`Owned destination changed before ownership commit: ${op.path}`);
}
async function replace(root,file,bytes,assertUnchanged) {
  const target=path.resolve(root,file);
  await assertContained(root,target);
  await mkdir(path.dirname(target),{recursive:true});
  await assertContained(root,target);
  const temporary=`${target}.${randomUUID()}.tmp`;
  try { await writeFile(temporary,bytes,{flag:'wx'}); await assertContained(root,target); await assertUnchanged?.(); await rename(temporary,target); }
  finally { await unlink(temporary).catch(error=>{if(error.code!=='ENOENT') throw error;}); }
}
async function remove(root,file,assertUnchanged) {
  const target=path.resolve(root,file); await assertContained(root,target);
  await assertUnchanged?.();
  await unlink(target).catch(error=>{if(error.code!=='ENOENT') throw error;});
}
async function recoveryMatches(root,host,entry) {
  safeRelative(entry.path,{internal:entry.path===lockPath(host)});
  const actual=await fileBytes(root,entry.path,{internal:entry.path===lockPath(host)});
  const actualHash=actual===null?null:hashBytes(actual),beforeHash=entry.before===null?null:hashBytes(Buffer.from(entry.before,'base64'));
  return actualHash===beforeHash || actualHash===entry.afterHash;
}
async function recover(root,host,{afterRestore}={}) {
  const bytes=await fileBytes(root,journalPath(host),{internal:true});
  if(!bytes) return result('skipped', ['No interrupted installation']);
  const journal=JSON.parse(bytes.toString('utf8'));
  if(journal.schemaVersion!==1 || journal.host!==host || !Array.isArray(journal.entries)) return result('blocked',['Invalid recovery journal']);
  // Inspect every file before restoring any of them; user edits after interruption win.
  for(const entry of journal.entries) {
    if(!await recoveryMatches(root,host,entry)) return result('blocked',[`Recovery conflict: ${entry.path}`]);
  }
  try {
    for(const entry of [...journal.entries].reverse()) {
      const assertUnchanged=async()=>{if(!await recoveryMatches(root,host,entry)) throw new Error(`Recovery conflict: ${entry.path}`);};
      await assertUnchanged();
      if(entry.before===null) await remove(root,entry.path,assertUnchanged);
      else await replace(root,entry.path,Buffer.from(entry.before,'base64'),assertUnchanged);
      await afterRestore?.(entry);
    }
  } catch(error) {
    return result('blocked',[error.message]);
  }
  await remove(root,journalPath(host));
  return result('passed',[],{recovered:true});
}
async function mutex(root,name,action) {
  const relative=`.pegatus/install-busy-${name}.json`,target=path.resolve(root,relative);
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
async function exclusive(root,host,action) {
  hostName(host);
  const names=['claude','codex','antigravity'];
  const enter=index=>index===names.length?action():mutex(root,names[index],()=>enter(index+1));
  return mutex(root,'shared',async()=>{
    for(const name of names) if(name!==host && await fileBytes(root,journalPath(name),{internal:true})) return result('blocked',[`Pending installation recovery for ${name}; recover before shared administration`]);
    return enter(0);
  });
}
/** Restore an interrupted apply only when every destination still matches the journal. */
export async function recoverInstall(root,host,options={}) {
  try {
    if(!await fileBytes(root,journalPath(host),{internal:true})) return result('skipped',['No interrupted installation']);
    return await exclusive(root,host,()=>recover(root,host,options));
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
    if(plan.expectedLockHash!==null && !/^[a-f0-9]{64}$/.test(plan.expectedLockHash??'')) throw new TypeError('Planning ownership snapshot expectedLockHash is required');
    return await exclusive(plan.root,plan.host,async()=>{
      const recovered=await recover(plan.root,plan.host); if(recovered.status==='blocked') return recovered;
      const previous=await fileBytes(plan.root,lockPath(plan.host),{internal:true});
      if((previous===null?null:hashBytes(previous))!==plan.expectedLockHash) return result('blocked',['Ownership lock changed after planning; replan from the current snapshot']);
      for(const [host,expected] of Object.entries(plan.expectedLocks??{})) {
        const bytes=await fileBytes(plan.root,lockPath(host),{internal:true});
        if((bytes===null?null:hashBytes(bytes))!==expected) return result('blocked',['Host ownership changed after shared-runtime planning; replan']);
      }
      for(const check of plan.runtimeChecks??[]) {
        try {await assertRuntimeTree(plan.root,check.descriptor,check.creating?[]:check.files);}
        catch(error){if(!check.creating || error.code!=='ENOENT')throw error;}
      }
      const entries=[];
      for(const op of [...plan.writes,...plan.removes]) {
        safeRelative(op.path);
        await rejectCaseCollision(plan.root,op.path);
        const before=await fileBytes(plan.root,op.path),actual=before===null?null:hashBytes(before);
        if(actual!==op.expectedHash) return result('blocked',[`Destination changed after planning: ${op.path}`]);
        if(plan.writes.includes(op) && (op.content===undefined || hashBytes(op.content)!==op.hash)) return result('blocked',[`Invalid staged bytes: ${op.path}`]);
        entries.push({path:op.path,before:before===null?null:before.toString('base64'),afterHash:plan.writes.includes(op)?op.hash:null});
      }
      const writePaths=new Set(plan.writes.map(op=>op.path));
      for(const op of plan.owned) {
        if(op.content===undefined || hashBytes(op.content)!==op.hash) return result('blocked',[`Invalid staged bytes: ${op.path}`]);
        if(!writePaths.has(op.path)) {
          try {await assertOwned(plan.root,op);} catch(error) {return result('blocked',[error.message]);}
        }
      }
      const hostOwned=plan.hostOwned??plan.owned;
      const lock={schemaVersion:plan.runtime?2:1,host:plan.host,scope:plan.scope,version:plan.version,sourceRevisions:plan.sourceRevisions??[],
        ...(plan.runtime?{runtime:plan.runtime}:{}),files:hostOwned.map(op=>({path:op.path,installedHash:op.hash,sourceHash:op.sourceHash??op.hash}))};
      const bytes=hostOwned.length || plan.runtime?Buffer.from(JSON.stringify(lock,null,2)+'\n'):null;
      const lockEntry={path:lockPath(plan.host),before:previous===null?null:previous.toString('base64'),afterHash:bytes===null?null:hashBytes(bytes)};
      // Recovery reverses actual mutation order: restore obsolete snapshot bytes
      // before reverting the host reference, then retire the new snapshot last.
      if(plan.expectedLocks)entries.splice(plan.writes.length,0,lockEntry);
      else entries.push(lockEntry);
      await replace(plan.root,journalPath(plan.host),JSON.stringify({schemaVersion:1,host:plan.host,entries}));
      try {
        // Journal contains all rollback bytes before the first managed mutation.
        for(const op of plan.writes) {await assertExpected(plan.root,op);await replace(plan.root,op.path,op.content);await afterWrite?.(op);}
        for(const check of plan.runtimeChecks??[]) if(!check.removing) await assertRuntimeTree(plan.root,check.descriptor,check.files);
        const publish=async()=>{
          for(const op of plan.owned) await assertOwned(plan.root,op);
          const currentLock=await fileBytes(plan.root,lockPath(plan.host),{internal:true});
          if((currentLock===null?null:hashBytes(currentLock))!==(previous===null?null:hashBytes(previous))) throw new Error('Ownership lock changed during installation');
          if(bytes===null) await remove(plan.root,lockPath(plan.host));
          else await replace(plan.root,lockPath(plan.host),bytes);
        };
        if(plan.expectedLocks)await publish();
        for(const op of plan.removes) {await assertExpected(plan.root,op);await remove(plan.root,op.path);await afterWrite?.(op);}
        for(const check of plan.runtimeChecks??[]) await assertRuntimeTree(plan.root,check.descriptor,check.files);
        for(const op of plan.owned) await assertOwned(plan.root,op);
        if(plan.expectedLocks){
          const published=await fileBytes(plan.root,lockPath(plan.host),{internal:true});
          if((published===null?null:hashBytes(published))!==(bytes===null?null:hashBytes(bytes))) throw new Error('Ownership lock changed after activation');
        } else await publish();
        await remove(plan.root,journalPath(plan.host));
        return result('passed',[],{lock:bytes===null?null:lock,written:plan.writes.length,removed:plan.removes.length});
      } catch(error) {
        const rollback=await recover(plan.root,plan.host);
        return result(rollback.status==='blocked' || error.message.startsWith('Owned destination changed before ownership commit:')?'blocked':'failed',[error.message,...rollback.reasons],{rollback});
      }
    });
  } catch(error) {return result('blocked',[error.message]);}
}
