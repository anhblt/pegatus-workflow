import {readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileBytes,hashBytes,safeRelative,hostName} from './ownership.mjs';
import {assertContained} from '../paths.mjs';

const digest=/^[a-f0-9]{64}$/;
export const runtimePath=id=>{
 if(!digest.test(id??'')) throw new TypeError('Invalid runtime identity');
 return `.pegatus/runtime/shared/${id}`;
};
export const runtimeManifestPath=id=>{runtimePath(id);return `.pegatus/runtime-manifests/${id}.json`;};
const ordered=entries=>entries.sort(([a],[b])=>a<b?-1:a>b?1:0);
const identity=entries=>hashBytes(JSON.stringify(ordered(entries)));
const operation=(file,content)=>({path:file,relativePath:file,content,hash:hashBytes(content),sourceHash:hashBytes(content)});

/** Content identity deliberately excludes host choices and destination roots. */
export function createRuntimeSnapshot(catalog) {
 const entries=ordered(Object.entries(catalog.files).map(([file,bytes])=>{safeRelative(`.pegatus/runtime/source/${file}`);return [file,hashBytes(bytes)];}));
 const id=identity(entries),directory=runtimePath(id);
 const files=entries.map(([file,hash])=>({path:`${directory}/${file}`,installedHash:hash,sourceHash:hash}));
 const manifest={schemaVersion:1,id,version:JSON.parse(catalog.files['package.json'].toString('utf8')).version,
  sourceRevisions:catalog.sourceLock.sources.map(s=>({id:s.id,revision:s.revision})),files};
 const bytes=JSON.stringify(manifest,null,2)+'\n',descriptor={id,manifestHash:hashBytes(bytes)};
 return {id,path:directory,descriptor,operations:[...entries.map(([file])=>operation(`${directory}/${file}`,catalog.files[file])),operation(runtimeManifestPath(id),bytes)]};
}

/** A manifest is ownership evidence only when bound by a host's exact hash. */
export async function readRuntime(root,descriptor) {
 const directory=runtimePath(descriptor?.id),manifestPath=runtimeManifestPath(descriptor.id);
 if(!digest.test(descriptor.manifestHash??'')) throw new TypeError('Invalid runtime manifest reference');
 const bytes=await fileBytes(root,manifestPath);
 if(bytes===null || hashBytes(bytes)!==descriptor.manifestHash) throw new Error('Runtime manifest missing or changed; reconcile before administration');
 const manifest=JSON.parse(bytes.toString('utf8'));
 if(manifest.schemaVersion!==1 || manifest.id!==descriptor.id || !Array.isArray(manifest.files) || !manifest.files.length) throw new TypeError('Invalid runtime manifest');
 const seen=new Set(),entries=[],files=[];
 for(const entry of manifest.files){
  safeRelative(entry.path);
  if(!entry.path.startsWith(directory+'/') || seen.has(entry.path.toLowerCase()) || !digest.test(entry.installedHash??'')) throw new TypeError('Invalid runtime ownership entry');
  seen.add(entry.path.toLowerCase());entries.push([entry.path.slice(directory.length+1),entry.installedHash]);
  const content=await fileBytes(root,entry.path);
  if(content!==null && (await lstat(path.join(root,entry.path))).isSymbolicLink()) throw new Error(`Runtime symbolic link: ${entry.path}`);
  files.push({...entry,actualHash:content===null?null:hashBytes(content)});
 }
 if(identity(entries)!==descriptor.id) throw new TypeError('Invalid runtime content identity');
 files.push({path:manifestPath,installedHash:descriptor.manifestHash,sourceHash:descriptor.manifestHash,actualHash:hashBytes(bytes)});
 return {...manifest,files};
}

/** Never delete or reuse a snapshot containing foreign files or directory links. */
export async function assertRuntimeTree(root,descriptor,files) {
 const directory=runtimePath(descriptor.id),expected=new Set(files.map(f=>f.path));
 async function visit(relative){
  const target=path.join(root,relative);await assertContained(root,target);
  if((await lstat(target)).isSymbolicLink()) throw new Error(`Runtime symbolic link: ${relative}`);
  for(const entry of await readdir(target,{withFileTypes:true})){
   const file=`${relative}/${entry.name}`;
   if(entry.isSymbolicLink()) throw new Error(`Runtime symbolic link: ${file}`);
   if(entry.isDirectory()) await visit(file);
   else if(!expected.has(file)) throw new Error(`Foreign runtime file is preserved: ${file}`);
  }
 }
 await visit(directory);
}

export function compatibilityOperations(host,descriptor){
 hostName(host);runtimePath(descriptor.id);
 const cli=`import {readFile} from 'node:fs/promises';\nimport {createHash} from 'node:crypto';\nimport {homedir} from 'node:os';\ntry {\n const lock=JSON.parse(await readFile(new URL('../../../install-lock-${host}.json',import.meta.url),'utf8'));\n if(lock.schemaVersion!==2 || lock.host!=='${host}' || !/^[a-f0-9]{64}$/.test(lock.runtime?.id??'')) throw new Error('Missing or invalid host runtime ownership');\n const bytes=await readFile(new URL('../../../runtime-manifests/'+lock.runtime.id+'.json',import.meta.url));\n if(!/^[a-f0-9]{64}$/.test(lock.runtime.manifestHash??'') || createHash('sha256').update(bytes).digest('hex')!==lock.runtime.manifestHash) throw new Error('Runtime manifest missing or changed');\n const manifest=JSON.parse(bytes);\n if(manifest.schemaVersion!==1 || manifest.id!==lock.runtime.id || !Array.isArray(manifest.files)) throw new Error('Invalid runtime manifest');\n const {main}=await import(new URL('../../shared/'+lock.runtime.id+'/bin/pegatus.mjs',import.meta.url));\n process.exitCode=await main(process.argv.slice(2),{cwd:process.cwd(),home:homedir()});\n} catch(error) {process.stderr.write(error.message+'\\n');process.exitCode=3;}\n`;
 const context=`# Pegatus context protocol\n\nRead [the installed context protocol](../../shared/${descriptor.id}/catalog/context-protocol.md). Existing solution instructions and host authority apply.\n`;
 return [operation(`.pegatus/runtime/${host}/bin/pegatus.mjs`,cli),operation(`.pegatus/runtime/${host}/catalog/context-protocol.md`,context)];
}
