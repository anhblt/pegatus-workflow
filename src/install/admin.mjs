import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveConfig} from '../config.mjs';
import {assertContained} from '../paths.mjs';
import {loadCatalog} from '../catalog/manifest.mjs';
import {lintCatalog} from '../catalog/lint.mjs';
import {generateHost} from '../adapters/capabilities.mjs';
import {readOwnership,fileBytes,hashBytes,hostName} from './ownership.mjs';
import {planInstall} from './plan.mjs';
import {applyInstall,recoverInstall} from './apply.mjs';

const packageRoot=fileURLToPath(new URL('../../',import.meta.url));
function argumentsFor(argv,cwd) {
  const [operation,...args]=argv,options={operation};
  if(!['install','update','doctor','uninstall'].includes(operation)) throw new TypeError('Unsupported administration operation');
  for(let i=0;i<args.length;i+=2) {
    const key={'--host':'host','--scope':'scope','--root':'root','--user-root':'userRoot'}[args[i]];
    if(!key || !args[i+1] || args[i+1].startsWith('--') || options[key]) throw new TypeError('Usage: pegatus install|update|doctor|uninstall --host <host> --scope user|project --root <explicit-root> [--user-root <explicit-defaults-root>]');
    options[key]=args[i+1];
  }
  if(!options.root) throw new TypeError('Explicit --root is required');
  hostName(options.host);
  if(!['project','user'].includes(options.scope)) throw new TypeError('Explicit --scope user|project is required');
  options.root=path.resolve(cwd,options.root);
  if(options.userRoot) options.userRoot=path.resolve(cwd,options.userRoot);
  return options;
}
async function configuration(root) {
  if(!root) return {};
  const bytes=await fileBytes(root,'.pegatus/config.json');
  return bytes?JSON.parse(bytes.toString('utf8')):{};
}
async function runtimeCatalog() {
  const catalog=await loadCatalog(packageRoot);
  const findings=lintCatalog(catalog);
  if(findings.some(f=>f.severity==='error')) throw new Error('Catalog validation failed: '+findings.filter(f=>f.severity==='error').map(f=>f.code).join(', '));
  // The portable CLI and modules are a whole dependency tree, just like vendor resources.
  async function visit(directory) {
    for(const entry of await readdir(path.join(packageRoot,directory),{withFileTypes:true})) {
      const file=`${directory}/${entry.name}`;
      await assertContained(packageRoot,path.join(packageRoot,file));
      if(entry.isDirectory()) await visit(file);
      else catalog.files[file]=await readFile(path.join(packageRoot,file));
    }
  }
  await visit('src');await visit('bin');
  for(const file of ['package.json','sources.lock.json']) catalog.files[file]=await readFile(path.join(packageRoot,file));
  return catalog;
}
/** Explicit roots are the only filesystem scopes inspected. project overrides user config.
 * securityPreflight is a Result or async (plan)=>Result supplied by the security adapter.
 */
export async function runAdministration(argv,{cwd,securityPreflight}={}) {
  const options=argumentsFor(argv,cwd),{operation,root,host,scope,userRoot}=options;
  await assertContained(root,root);
  const user=await configuration(scope==='user'?root:userRoot),project=scope==='project'?await configuration(root):{};
  const config=resolveConfig({user,project}),catalog=await runtimeCatalog();
  const generated=generateHost(catalog,{host,scope,root,models:config.hostModels[host]??{}});
  const current=await readOwnership(root,host),userLock=scope==='project' && userRoot && userRoot!==root?await readOwnership(userRoot,host):null;
  const version=JSON.parse(catalog.files['package.json'].toString('utf8')).version;
  const details={capabilities:generated.capabilities,warnings:generated.warnings,snippets:generated.snippets};
  if(operation==='doctor') {
    const inherited=!current.files.length && Boolean(userLock?.files.length),effective=inherited?userLock:current,effectiveRoot=inherited?userRoot:root;
    const adapted=inherited?generateHost(catalog,{host,scope:'user',root:userRoot,models:resolveConfig({user}).hostModels[host]??{}}):generated;
    return {status:'passed',evidence:[],reasons:[],capabilities:adapted.capabilities,warnings:adapted.warnings,snippets:adapted.snippets,
      installedVersion:effective.version??null,configuration:config,inherited,...(inherited?{inheritedRoot:userRoot}:{}),
      locations:effective.files.map(f=>({path:path.join(effectiveRoot,f.path),state:f.actualHash===null?'missing':f.actualHash===f.installedHash?'unchanged':'edited',inherited})),
      commandLocations:effective.files.filter(f=>/\/(?:skills\/pegatus-|commands\/pegatus-|workflows\/pegatus-|global_workflows\/pegatus-)/.test(f.path)).map(f=>path.join(effectiveRoot,f.path)),
      userInstalledVersion:userLock?.version??null};
  }
  const recovery=await recoverInstall(root,host);
  if(recovery.status==='blocked') return {...recovery,...details};
  // Re-read after recovery; a journal can restore a previous ownership snapshot.
  const owned=await readOwnership(root,host);
  if(operation!=='uninstall' && userLock?.files.length) {
    const byPath=new Map(userLock.files.map(f=>[f.path,f]));
    const same=generated.operations.every(op=>byPath.get(op.path)?.installedHash===op.hash && byPath.get(op.path)?.actualHash===op.hash);
    if(same && !owned.files.length) return {status:'skipped',evidence:[],reasons:['Matching user installation supplies this scope'],inheritedRoot:userRoot,...details};
    return {status:'blocked',evidence:[],reasons:['Duplicate user/project scope differs; update or uninstall the explicit user scope before installing project overrides'],...details};
  }
  const desired=operation==='uninstall'?[]:generated.operations;
  const currentFiles=[...owned.files],ownedPaths=new Set(currentFiles.map(f=>f.path));
  for(const op of desired) {
    if(ownedPaths.has(op.path)) continue;
    const bytes=await fileBytes(root,op.path);
    if(bytes!==null) currentFiles.push({path:op.path,actualHash:hashBytes(bytes)});
  }
  const plan=planInstall(currentFiles,desired,{root,host,scope,version,expectedLockHash:owned.lockHash,sourceRevisions:catalog.sourceLock.sources.map(s=>({id:s.id,revision:s.revision}))});
  const security=typeof securityPreflight==='function'?await securityPreflight(plan):securityPreflight;
  return {...await applyInstall(plan,{securityPreflight:security}),...details};
}
