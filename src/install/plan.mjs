import { safeRelative } from './ownership.mjs';

/** Pure ownership diff; any conflict blocks the entire apply, including removals.
 * Applying callers supply options.expectedLockHash from readOwnership().lockHash.
 */
export function planInstall(current,desired,options={}) {
  const conflicts=[],writes=[],removes=[],owned=[],seen=new Set(),existing=new Map();
  for(const entry of current) {
    try {safeRelative(entry.path);} catch(error) {conflicts.push({path:entry.path,reason:error.message});continue;}
    const key=entry.path.toLowerCase();
    if(existing.has(key)) conflicts.push({path:entry.path,reason:'Case-insensitive ownership collision'});
    existing.set(key,entry);
  }
  for(const operation of desired) {
    const file=operation.path??operation.relativePath;
    try {safeRelative(file);} catch(error) {conflicts.push({path:file,reason:error.message});continue;}
    const key=file.toLowerCase();
    if(seen.has(key)) {conflicts.push({path:file,reason:'Case-insensitive filename collision'});continue;}
    seen.add(key);
    const previous=existing.get(key);
    if(previous && previous.path!==file) {conflicts.push({path:file,reason:'Case-only path replacement'});continue;}
    if(previous?.actualHash!=null && (!previous.installedHash || previous.actualHash!==previous.installedHash)) {conflicts.push({path:file,reason:'Destination is edited or not owned'});continue;}
    const entry={...operation,path:file,expectedHash:previous?.actualHash??null};
    owned.push(entry);
    if(previous?.actualHash!==operation.hash) writes.push(entry);
  }
  for(const entry of current) {
    if(seen.has(entry.path.toLowerCase())) continue;
    if(entry.actualHash==null) continue;
    if(!entry.installedHash || entry.actualHash!==entry.installedHash) conflicts.push({path:entry.path,reason:'Edited or unrelated file is preserved'});
    else removes.push({...entry,expectedHash:entry.actualHash});
  }
  return {...options,writes:conflicts.length?[]:writes,removes:conflicts.length?[]:removes,conflicts,owned:conflicts.length?[]:owned};
}
