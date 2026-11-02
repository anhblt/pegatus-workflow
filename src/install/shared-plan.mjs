import {lstat} from 'node:fs/promises';
import path from 'node:path';
import {readOwnership,fileBytes,hashBytes} from './ownership.mjs';
import {readRuntime,runtimePath,runtimeManifestPath,assertRuntimeTree} from './runtime.mjs';
import {planInstall} from './plan.mjs';

export const hosts=['claude','codex','antigravity'];
const isShared=file=>file.startsWith('.pegatus/runtime/shared/') || file.startsWith('.pegatus/runtime-manifests/');
/** Build one host transition while retaining snapshots consumed by other hosts. */
export async function planSharedInstall({root,host,scope,version,owned,runtime,desired,sourceRevisions=[],projectedRuntimes}) {
 const peers=[],expectedLocks={};
 for(const name of hosts){
  const record=name===host?owned:await readOwnership(root,name,{expandRuntime:false});
  if(record.schemaVersion===1 && record.files.some(f=>isShared(f.path))) throw new Error('Legacy ownership cannot claim a shared runtime');
  expectedLocks[name]=record.lockHash;peers.push(record);
 }
 const otherConsumers=id=>peers.some(record=>record.host!==host &&
  (projectedRuntimes?.has(record.host)?projectedRuntimes.get(record.host):record.runtime)?.id===id);
 let current=[...owned.files];const runtimeChecks=[];
 if(owned.runtime){
  const previous=await readRuntime(root,owned.runtime);
  if(previous.files.some(f=>f.actualHash!==f.installedHash)) throw new Error('Installed runtime changed or missing; reconcile before administration');
  await assertRuntimeTree(root,owned.runtime,previous.files);
  const retained=otherConsumers(owned.runtime.id) && owned.runtime.id!==runtime?.id;
  if(retained)current=current.filter(f=>!previous.files.some(p=>p.path===f.path));
  else runtimeChecks.push({descriptor:owned.runtime,files:previous.files,removing:owned.runtime.id!==runtime?.id});
 }
 if(runtime && await fileBytes(root,runtimeManifestPath(runtime.id))!==null){
  if(!peers.some(record=>record.runtime?.id===runtime.id && record.runtime.manifestHash===runtime.descriptor.manifestHash)) throw new Error('Shared runtime has no matching host ownership; reconcile before adoption');
  const existing=await readRuntime(root,runtime.descriptor);
  if(existing.files.some(f=>f.actualHash!==f.installedHash)) throw new Error('Shared runtime changed or missing; reconcile before administration');
  await assertRuntimeTree(root,runtime.descriptor,existing.files);
  const seen=new Set(current.map(f=>f.path));current.push(...existing.files.filter(f=>!seen.has(f.path)));
  runtimeChecks.push({descriptor:runtime.descriptor,files:existing.files,removing:false});
 } else if(runtime) {
  try {await lstat(path.join(root,runtime.path));await assertRuntimeTree(root,runtime.descriptor,[]);}
  catch(error){if(error.code!=='ENOENT')throw error;}
  runtimeChecks.push({descriptor:runtime.descriptor,files:runtime.operations,creating:true,removing:false});
 }
 const seen=new Set(current.map(f=>f.path));
 for(const op of desired){if(seen.has(op.path))continue;const bytes=await fileBytes(root,op.path);if(bytes!==null)current.push({path:op.path,actualHash:hashBytes(bytes)});}
 const plan=planInstall(current,desired,{root,host,scope,version,sourceRevisions,expectedLockHash:owned.lockHash});
 return {...plan,runtime:runtime?.descriptor??null,hostOwned:plan.owned.filter(op=>!isShared(op.path)),expectedLocks,runtimeChecks};
}
