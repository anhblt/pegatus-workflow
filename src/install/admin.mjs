import {readFile,readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveConfig} from '../config.mjs';
import {assertContained} from '../paths.mjs';
import {loadCatalog} from '../catalog/manifest.mjs';
import {lintCatalog} from '../catalog/lint.mjs';
import {generateHost} from '../adapters/capabilities.mjs';
import {readOwnership,fileBytes,hashBytes,hostName} from './ownership.mjs';
import {applyInstall,recoverInstall} from './apply.mjs';
import {scanInstallPlan} from '../security/agentshield.mjs';
import {activationFor} from '../hooks/operations.mjs';
import {createRuntimeSnapshot,compatibilityOperations,runtimePath} from './runtime.mjs';
import {planSharedInstall,hosts} from './shared-plan.mjs';

const packageRoot=fileURLToPath(new URL('../../',import.meta.url));
function argumentsFor(argv,cwd) {
  const [operation,...args]=argv,options={operation};
  if(!['install','update','doctor','uninstall','role'].includes(operation)) throw new TypeError('Unsupported administration operation');
  for(let i=0;i<args.length;i+=2) {
    const key={'--host':'host','--scope':'scope','--root':'root','--user-root':'userRoot','--role':'role'}[args[i]];
    if(!key || !args[i+1] || args[i+1].startsWith('--') || options[key]) throw new TypeError('Usage: pegatus install|update|doctor|uninstall --host <host> --scope user|project --root <explicit-root> [--user-root <explicit-defaults-root>]');
    options[key]=args[i+1];
  }
  if(!options.root) throw new TypeError('Explicit --root is required');
  hostName(options.host);
  if(!['project','user'].includes(options.scope)) throw new TypeError('Explicit --scope user|project is required');
  options.root=path.resolve(cwd,options.root);
  if(options.userRoot) options.userRoot=path.resolve(cwd,options.userRoot);
  if(operation==='role' && !options.role) throw new TypeError('Portable role requires --role <catalog-role-id>');
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
  async function visit(directory,dependencyFiles=false) {
    for(const entry of await readdir(path.join(packageRoot,directory),{withFileTypes:true})) {
      const file=`${directory}/${entry.name}`;
      await assertContained(packageRoot,path.join(packageRoot,file));
      if(entry.isSymbolicLink()) throw new Error('Runtime resources cannot be symbolic links');
      if(entry.isDirectory()) {
        if(entry.name.toLowerCase()==='node_modules') {
          if(!dependencyFiles || entry.name!=='node_modules') throw new Error(`Unlocked runtime dependency tree: ${file}`);
          await nestedDependencies(file);
        } else await visit(file,dependencyFiles);
      }
      else catalog.files[file]=await readFile(path.join(packageRoot,file));
    }
  }
  await visit('src');await visit('bin');
  for(const file of ['package.json','sources.lock.json','release.json','npm-shrinkwrap.json']) catalog.files[file]=await readFile(path.join(packageRoot,file));
  // npm omits package-lock.json from tarballs. The byte-identical shrinkwrap is
  // shipped and becomes the detached runtime's package-lock.json.
  try { catalog.files['package-lock.json']=await readFile(path.join(packageRoot,'package-lock.json')); }
  catch(error) {
    if(error.code!=='ENOENT') throw error;
    catalog.files['package-lock.json']=await readFile(path.join(packageRoot,'npm-shrinkwrap.json'));
  }
  // Copy only the prepared, locked dependency graph. Installation never fetches
  // packages, and a detached runtime must not resolve through the kit checkout.
  const lock=JSON.parse(catalog.files['package-lock.json'].toString('utf8'));
  const locked=new Set(Object.keys(lock.packages).filter(Boolean)),materialized=new Set();
  for(const [directory,dependency] of Object.entries(lock.packages)) {
    if(!directory) continue;
    if(!/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(directory)
      || !dependency.integrity || dependency.link) throw new Error('Invalid pinned runtime dependency');
    const target=path.join(packageRoot,directory),manifestPath=path.join(target,'package.json');
    await assertContained(packageRoot,target);await assertContained(packageRoot,manifestPath);
    if(!(await lstat(target)).isDirectory() || (await lstat(manifestPath)).isSymbolicLink()) throw new Error(`Invalid pinned runtime dependency: ${directory}`);
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    if(manifest.version!==dependency.version) throw new Error(`Pinned runtime dependency mismatch: ${directory}`);
  }
  async function dependencyPackage(directory) {
    if(!locked.has(directory)) throw new Error(`Unlocked runtime dependency: ${directory}`);
    materialized.add(directory);
    await visit(directory,true);
  }
  async function nestedDependencies(directory) {
    for(const entry of await readdir(path.join(packageRoot,directory),{withFileTypes:true})) {
      // npm-generated executable links/cache metadata are not dependency packages.
      if(entry.name==='.bin' || entry.name==='.package-lock.json') continue;
      const file=`${directory}/${entry.name}`;
      await assertContained(packageRoot,path.join(packageRoot,file));
      if(entry.isSymbolicLink() || !entry.isDirectory()) throw new Error(`Unlocked runtime dependency: ${file}`);
      if(entry.name.startsWith('@')) {
        for(const scoped of await readdir(path.join(packageRoot,file),{withFileTypes:true})) {
          const scopedFile=`${file}/${scoped.name}`;
          await assertContained(packageRoot,path.join(packageRoot,scopedFile));
          if(scoped.isSymbolicLink() || !scoped.isDirectory()) throw new Error(`Unlocked runtime dependency: ${scopedFile}`);
          await dependencyPackage(scopedFile);
        }
      } else await dependencyPackage(file);
    }
  }
  const packageDirectories=Object.keys(lock.packages).filter(directory=>directory && !directory.includes('/node_modules/'));
  for(const directory of packageDirectories) await dependencyPackage(directory);
  if(materialized.size!==locked.size) throw new Error('Pinned runtime dependency graph was not fully materialized');
  return catalog;
}
function hookActivation(host,root) {
  try {return activationFor(host,root);} catch {return null;}
}
/** Explicit roots are the only filesystem scopes inspected. project overrides user config.
 * securityPreflight is a Result or async (plan)=>Result supplied by the security adapter.
 */
export function createAdministrationSession({prepare=runtimeCatalog}={}) {
  let snapshot;
  return (argv,options={})=>runAdministration(argv,{...options,prepareCatalog:()=>snapshot??=prepare()});
}
export async function runAdministration(argv,{cwd,securityPreflight=scanInstallPlan,dryRun=false,prepareCatalog=runtimeCatalog,afterWrite,projectedRuntimes,onPreviewPlan,approvedPreview}={}) {
  const options=argumentsFor(argv,cwd),{operation,root,host,scope,userRoot}=options;
  await assertContained(root,root);
  let pending=false;
  for(const name of [...hosts,'shared']) if(await fileBytes(root,`.pegatus/install-journal-${name}.json`,{internal:true})
    || await fileBytes(root,`.pegatus/install-busy-${name}.json`,{internal:true})) pending=true;
  if(dryRun && pending)
    return {status:'blocked',evidence:[],reasons:['Pending installation recovery or active writer; inspect before setup'],preview:{writes:[],removes:[],conflicts:[]}};
  const user=await configuration(scope==='user'?root:userRoot),project=scope==='project'?await configuration(root):{};
  const config=resolveConfig({user,project}),inspection=['doctor','role'].includes(operation);
  // Inspection uses installed ownership for runtime integrity, not source dependencies.
  const catalog=inspection?await loadCatalog(packageRoot):await prepareCatalog();
  if(!inspection && !dryRun){const recovery=await recoverInstall(root,host);if(recovery.status==='blocked')return recovery;}
  let current,userLock;
  try {
    current=await readOwnership(root,host);
    userLock=scope==='project' && userRoot && userRoot!==root?await readOwnership(userRoot,host):null;
  } catch(error){return {status:'blocked',evidence:[],reasons:[error.message]};}
  const snapshot=inspection?null:createRuntimeSnapshot(catalog);
  function generate(record,configuration,destination,destinationScope){
    const descriptor=inspection?record?.runtime:snapshot.descriptor;
    const runtime=descriptor?runtimePath(descriptor.id):`.pegatus/runtime/${host}`;
    const generated=generateHost(catalog,{host,scope:destinationScope,root:destination,models:configuration.hostModels[host]??{},
      modelCapabilities:configuration.hostModelCapabilities[host],tokenControls:configuration.tokenControls,runtimePath:runtime,includeRuntime:false});
    const runtimeOperations=inspection?(record?.files??[]).filter(f=>descriptor?
      f.path.startsWith(runtime+'/') || f.path===`.pegatus/runtime-manifests/${descriptor.id}.json`:f.path.startsWith(runtime+'/'))
      .map(f=>({path:f.path,hash:f.installedHash,sourceHash:f.sourceHash})):snapshot.operations;
    generated.operations=[...runtimeOperations,...(descriptor?compatibilityOperations(host,descriptor):[]),...generated.operations];
    return generated;
  }
  const generated=generate(current.runtime || !userLock?current:userLock,config,root,scope);
  const version=JSON.parse((catalog.files['package.json']??await readFile(path.join(packageRoot,'package.json'))).toString('utf8')).version;
  const details={capabilities:{...generated.capabilities,security:'explicit-call'},warnings:generated.warnings.filter(w=>!w.startsWith('Security scanner unavailable')),snippets:generated.snippets,
    hookActivation:hookActivation(host,root),roleModels:generated.roleModels,tokenControls:generated.tokenControls};
  const overridePath=`.pegatus/overrides/${host}.json`;
  const overrideOwned=current.files.find(file=>file.path===overridePath);
  const userConfig=resolveConfig({user});
  const userGenerated=userLock?.files.length?generate(userLock,userConfig,userRoot,'user'):null;
  const inheritedClean=Boolean(userGenerated && userLock.version===version && userLock.files.length===userGenerated.operations.length
    && userGenerated.operations.every(op=>userLock.files.some(file=>file.path===op.path && file.installedHash===op.hash && file.actualHash===op.hash)));
  const packet={schemaVersion:1,host,version,userRoot:userRoot??null,userLockHash:userLock?.lockHash??null,
    roleModels:generated.roleModels,tokenControls:generated.tokenControls};
  const packetContent=JSON.stringify(packet,null,2)+'\n';
  let installedPacket=null;
  if(overrideOwned?.actualHash===overrideOwned?.installedHash && overrideOwned) installedPacket=JSON.parse((await fileBytes(root,overridePath)).toString('utf8'));
  const portableReady=Boolean(installedPacket && inheritedClean && installedPacket.userRoot===userRoot && installedPacket.userLockHash===userLock.lockHash);
  const activation={mode:'explicit-portable',qualified:false,required:'Invoke role and consume its returned procedure, fixed model/effort and token controls in the trusted coordinator; native same-name precedence is not assumed.',
    command:process.execPath,args:[path.join(userRoot??root,`.pegatus/runtime/${host}/bin/pegatus.mjs`),'role','--host',host,'--scope','project','--root',root,'--user-root',userRoot??root,'--role','<role-id>']};
  if(operation==='role') {
    if(!portableReady) return {status:'blocked',evidence:[],reasons:['Owned portable project override and unchanged matching user runtime required; install/update or reconcile first']};
    const role=catalog.agents.find(role=>role.id===options.role),selection=installedPacket.roleModels.find(role=>role.role===options.role);
    if(!role || !selection) throw new Error('Unknown portable role');
    return {status:'passed',evidence:[],reasons:[],activation,selection,tokenControls:installedPacket.tokenControls,
      procedure:path.join(userRoot,userLock.runtime?runtimePath(userLock.runtime.id):`.pegatus/runtime/${host}`,role.path),
      instructions:'Read applicable solution instructions and the referenced procedure. Preserve authorized scope, ownership and required checks. Honor the returned configured selection; when selectionPolicy is present, the trusted coordinator follows it and records both model and effort before spawning within the assigned tier. Unsupported configured pairs retain host defaults. Native execution remains unqualified.'};
  }
  if(operation==='doctor') {
    const inherited=!current.files.length && Boolean(userLock?.files.length),effective=inherited?userLock:current,effectiveRoot=inherited?userRoot:root;
    const adapted=(inherited || overrideOwned) && userGenerated?userGenerated:generated;
    const locations=effective.files.map(f=>({path:path.join(effectiveRoot,f.path),state:f.actualHash===null?'missing':f.actualHash===f.installedHash?'unchanged':'edited',inherited}));
    if(overrideOwned && userLock) locations.push(...userLock.files.map(f=>({path:path.join(userRoot,f.path),state:f.actualHash===null?'missing':f.actualHash===f.installedHash?'unchanged':'edited',inherited:true})));
    const broken=effective.files.some(f=>f.actualHash!==f.installedHash);
    return {status:broken || overrideOwned && !portableReady?'blocked':'passed',evidence:[],reasons:broken?['Installed owned files changed or missing; reconcile before activation']:overrideOwned && !portableReady?['Portable override or inherited runtime changed; reconcile before activation']:[],capabilities:{...adapted.capabilities,security:'explicit-call'},warnings:adapted.warnings.filter(w=>!w.startsWith('Security scanner unavailable')),snippets:adapted.snippets,
      hookActivation:hookActivation(host,overrideOwned?userRoot??root:effectiveRoot),roleModels:adapted.roleModels,tokenControls:adapted.tokenControls,
      installedVersion:effective.version??null,configuration:config,inherited,...(inherited?{inheritedRoot:userRoot}:{}),
      requestedRoleModels:generated.roleModels,
      ...(overrideOwned?{activation,roleModels:portableReady?installedPacket.roleModels:[],tokenControls:portableReady?installedPacket.tokenControls:null,nativeRoleModels:userGenerated?.roleModels??[],configurationUpdateRequired:overrideOwned.installedHash!==hashBytes(packetContent)}:{}),
      locations,
      commandLocations:locations.filter(f=>/[\\/](?:skills[\\/]pegatus-|commands[\\/]pegatus-|workflows[\\/]pegatus-|global_workflows[\\/]pegatus-)/.test(f.path)).map(f=>f.path),
      userInstalledVersion:userLock?.version??null};
  }
  const owned=current;
  let desired=operation==='uninstall'?[]:generated.operations;
  if(operation!=='uninstall' && userLock?.files.length) {
    if(!inheritedClean) return {status:'blocked',evidence:[],reasons:['User installation version, owned bytes or resource closure differs; reconcile explicit user runtime'],...details};
    const byPath=new Map(userLock.files.map(f=>[f.path,f]));
    const same=generated.operations.every(op=>byPath.get(op.path)?.installedHash===op.hash && byPath.get(op.path)?.actualHash===op.hash);
    if(same && !owned.files.length) return {status:'skipped',evidence:[],reasons:['Matching user installation supplies this scope'],inheritedRoot:userRoot,...details};
    if(owned.files.some(file=>file.path!==overridePath)) return {status:'blocked',evidence:[],reasons:['Existing project native installation requires explicit reconciliation before portable override'],...details};
    desired=[{path:overridePath,relativePath:overridePath,content:packetContent,hash:hashBytes(packetContent),sourceHash:hashBytes(packetContent)}];
    details.activation=activation;
    details.snippets=userGenerated.snippets;
    details.hookActivation=hookActivation(host,userRoot);
  }
  let plan;
  try {plan=await planSharedInstall({root,host,scope,version,owned,desired,
    runtime:operation==='uninstall' || desired.length===1 && desired[0].path===overridePath?null:snapshot,
    projectedRuntimes:dryRun?projectedRuntimes:undefined,
    sourceRevisions:catalog.sourceLock.sources.map(s=>({id:s.id,revision:s.revision}))});}
  catch(error){return {status:'blocked',evidence:[],reasons:[error.message],...details,...(dryRun?{preview:{writes:[],removes:[],conflicts:[{reason:error.message}]}}:{})};}
  if(dryRun) {
    if(!plan.conflicts.length)onPreviewPlan?.(plan.runtime);
    return {status:plan.conflicts.length?'blocked':'passed',evidence:[],reasons:plan.conflicts.map(c=>`${c.path}: ${c.reason}`),
      preview:{writes:plan.writes.map(f=>f.path),removes:plan.removes.map(f=>f.path),conflicts:plan.conflicts},...details};
  }
  if(approvedPreview){
    const writes=new Set(approvedPreview.writes),removes=new Set(approvedPreview.removes);
    if(plan.writes.some(op=>!writes.has(op.path)) || plan.removes.some(op=>!removes.has(op.path)))
      return {status:'blocked',evidence:[],reasons:['Installation plan changed after preview; review the new writes/removals before applying'],...details};
  }
  const security=typeof securityPreflight==='function'?await securityPreflight(plan):securityPreflight;
  return {...await applyInstall(plan,{securityPreflight:security,afterWrite,pruneEmptyDirectories:operation==='uninstall'}),security,...details};
}
