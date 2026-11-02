import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertContained } from '../paths.mjs';
import {readRuntime} from './runtime.mjs';

export const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
export function hostName(host) {
  if (!['claude','codex','antigravity'].includes(host)) throw new TypeError('Unsupported host');
  return host;
}
export const lockPath = host => `.pegatus/install-lock-${hostName(host)}.json`;
export function safeRelative(file, {internal=false}={}) {
  if (typeof file!=='string' || !file || file.includes('\0') || file.includes('\\') || path.posix.isAbsolute(file) || path.win32.isAbsolute(file) || /[:]/.test(file) || file.split('/').some(p=>!p || p==='.' || p==='..')) throw new TypeError(`Unsafe install path: ${file}`);
  if (!internal && /^\.pegatus\/install-(?:lock|journal|busy)-/.test(file)) throw new TypeError(`Reserved install path: ${file}`);
  if (!file.startsWith('.pegatus/runtime/') && ['AGENTS.md','CLAUDE.md','GEMINI.md','sync.mjs'].includes(path.posix.basename(file))) throw new TypeError(`User instruction/generator is not managed: ${file}`);
  return file;
}
export async function fileBytes(root,file,{internal=false}={}) {
  safeRelative(file,{internal});
  const target=path.resolve(root,file);
  await assertContained(root,target);
  try { return await readFile(target); } catch(error) { if(error.code==='ENOENT') return null; throw error; }
}
/** Locks are local ownership evidence, never permission to overwrite modified files. */
export async function readOwnership(root,host,{expandRuntime=true}={}) {
  const bytes=await fileBytes(root,lockPath(host),{internal:true});
  if(!bytes) return {schemaVersion:1,host,files:[],lockHash:null};
  const lock=JSON.parse(bytes.toString('utf8'));
  if(![1,2].includes(lock.schemaVersion) || lock.host!==host || !Array.isArray(lock.files)) throw new TypeError('Invalid installation lock');
  if(lock.schemaVersion===2 && (!/^[a-f0-9]{64}$/.test(lock.runtime?.id??'') || !/^[a-f0-9]{64}$/.test(lock.runtime?.manifestHash??''))) throw new TypeError('Invalid runtime reference');
  const seen=new Set();
  const files=[];
  for(const entry of lock.files) {
    safeRelative(entry.path);
    if(lock.schemaVersion===2 && (entry.path.startsWith('.pegatus/runtime/shared/') || entry.path.startsWith('.pegatus/runtime-manifests/'))) throw new TypeError('Host-only ownership cannot claim shared runtime files');
    if(seen.has(entry.path.toLowerCase()) || !/^[a-f0-9]{64}$/.test(entry.installedHash??'')) throw new TypeError('Invalid ownership entry');
    seen.add(entry.path.toLowerCase());
    const content=await fileBytes(root,entry.path);
    files.push({...entry,actualHash:content===null?null:hashBytes(content)});
  }
  if(lock.schemaVersion===2 && expandRuntime) {
    const runtime=await readRuntime(root,lock.runtime);
    for(const entry of runtime.files) {
      if(seen.has(entry.path.toLowerCase())) throw new TypeError('Duplicate runtime ownership');
      seen.add(entry.path.toLowerCase());files.push(entry);
    }
  }
  return {...lock,files,lockHash:hashBytes(bytes)};
}
