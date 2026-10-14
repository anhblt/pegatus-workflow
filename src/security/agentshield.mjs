import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assertContained} from '../paths.mjs';
import {hashBytes} from '../install/ownership.mjs';
import {redactEvidence} from '../verify/runner.mjs';
import {normalizeFindings,applyExceptions,redactSecurity,redactFinding} from './findings.mjs';
const require=createRequire(import.meta.url);
const packageRoot=fileURLToPath(new URL('../../',import.meta.url));
const integrity='sha512-lpeHG96DtEn7ofq7Iiyvq29piQOwParaiZOdDB206i4ZeCL4yjwT6xN5BSGI4yhCEAN0eO0f9F9hxHLBuRqf/g==';
const direct=new Set(['CLAUDE.md','CLAUDE.local.md','.claude/CLAUDE.md','AGENTS.md','AGENTS.override.md','.codex/AGENTS.md','GEMINI.md','.gemini/GEMINI.md','settings.json','settings.local.json','.claude/settings.json','.claude/settings.local.json','mcp.json','.mcp.json','.claude/mcp.json','.claude.json','config.toml','.codex/config.toml','.codex/hooks.json','.gemini/settings.json','mcp_config.json','.gemini/antigravity/mcp_config.json']);
function scannerSupported(file) {
  return direct.has(file) && file!=='.gemini/antigravity/mcp_config.json' || /^(?:\.claude\/)?(?:agents|subagents|rules|commands|contexts)\/[^/]+\.md$/.test(file) || /^\.codex\/agents\/[^/]+\.toml$/.test(file) || /^(?:\.claude\/)?hooks\/[^/]+\.(?:json|js|cjs|mjs|sh|bash|zsh|py)$/.test(file);
}
function staticSupported(file) {
  return /^(?:\.agents\/(?:skills|workflows|rules)\/|\.gemini\/config\/global_workflows\/|\.claude\/skills\/|\.pegatus\/runtime\/).+\.md$/.test(file) || file==='.gemini/antigravity/mcp_config.json';
}
function relative(file) {
  if(typeof file!=='string' || !file || file.includes('\\') || file.includes(':') || file.includes('\0') || path.posix.isAbsolute(file) || file.split('/').some(p=>!p || p==='.' || p==='..')) throw new TypeError('Security files must be explicit safe relative paths');
  return file;
}
async function execute(request) {
  return new Promise(resolve=>{
    let stdout='',stderr='',error,truncated=false;
    const child=spawn(request.command,request.args,{cwd:request.cwd,shell:false,windowsHide:true,signal:request.signal,stdio:['ignore','pipe','pipe']});
    const append=(old,chunk)=>{const next=old+chunk.toString('utf8');if(next.length>request.captureLimit){truncated=true;child.kill();}return next.slice(0,request.captureLimit);};
    child.stdout.on('data',chunk=>{stdout=append(stdout,chunk);});child.stderr.on('data',chunk=>{stderr=append(stderr,chunk);});
    child.on('error',cause=>{error=cause;});child.on('close',(exitCode,signal)=>resolve({exitCode,signal,stdout,stderr,error,truncated}));
  });
}
async function executable() {
  const cli=fileURLToPath(import.meta.resolve('ecc-agentshield'));
  const manifest=JSON.parse(await readFile(path.resolve(path.dirname(cli),'../package.json'),'utf8'));
  let bytes;
  try { bytes=await readFile(path.join(packageRoot,'package-lock.json'),'utf8'); }
  catch(error) { if(error.code!=='ENOENT') throw error; bytes=await readFile(path.join(packageRoot,'npm-shrinkwrap.json'),'utf8'); }
  const lock=JSON.parse(bytes);
  const node=lock.packages?.['node_modules/ecc-agentshield'];
  if(manifest.version!=='1.6.0' || node?.version!=='1.6.0' || node.integrity!==integrity) throw new Error('Pinned AgentShield dependency unavailable or mismatched');
  return cli;
}
function supplemental(file,content) {
  const patterns=[
    ['pegatus-secret','critical',/\b(?:api[_-]?key|password|secret|access[_-]?token)\s*[=:]\s*["']?([A-Za-z0-9_./+\-]{12,})/gi,'Embedded credential'],
    ['pegatus-instruction-override','critical',/\bignore\s+all\s+previous\s+instructions\b/gi,'Instruction override'],
    ['pegatus-command-interpolation','high',/\bcommand\s*[=:][^\n]*\$\{(?:user|input|prompt)[^}]*\}/gi,'Untrusted command interpolation'],
    ['pegatus-unsafe-permission','critical',/\b(?:bypassPermissions|dangerously[_-]skip[_-]permissions|danger-full-access)\b/g,'Unsafe permission configuration'],
  ];
  return patterns.flatMap(([id,severity,pattern,title])=>[...content.matchAll(pattern)].map(match=>({id,severity,file,title,description:'Pegatus static content check; review configuration in context.',evidence:match[0],line:content.slice(0,match.index).split('\n').length,source:'pegatus-static@1'})));
}
/** Explicit file scope only. run({command,args,cwd,shell:false,signal,captureLimit})
 * -> {exitCode,stdout,stderr?,error?,signal?,truncated?}. No provider/online/hooks flags.
 * Coverage distinguishes measured AgentShield discovery from Pegatus content checks.
 */
export async function scanAgentConfig({root,files,run=execute,timeoutMs=30_000,exceptions=[],redactions=[]}={}) {
  const coverage={requested:[],agentShield:[],pegatusStatic:[],uncovered:[],filesScanned:0,limits:['Discovery is not proof of native semantic completeness.','Pegatus static checks cover literal secrets, instruction overrides, command interpolation and unsafe permission tokens only.']};
  const result={schemaVersion:1,status:'failed',findings:[],coverage,evidence:[],reasons:[]};
  let stage;
  try {
    if(!path.isAbsolute(root??'') || !Array.isArray(files) || !files.length || !Number.isSafeInteger(timeoutMs) || timeoutMs<1 || timeoutMs>300_000) throw new TypeError('Explicit absolute root, nonempty files and bounded timeout required');
    await assertContained(root,root);
    coverage.requested=[...new Set(files.map(relative))];
    const contents=new Map(),fileHashes={},native=[];
    for(const file of coverage.requested) {
      const target=path.resolve(root,file);await assertContained(root,target);
      const bytes=await readFile(target);contents.set(file,bytes);fileHashes[file]=hashBytes(bytes);
      if(file.endsWith('.json')) JSON.parse(bytes.toString('utf8'));
      if(file.endsWith('.toml')) {
        // Parser supplied by the same locked AgentShield dependency graph.
        const {parse}=await import(pathToFileURL(require.resolve('smol-toml')).href);parse(bytes.toString('utf8'));
      }
      if(scannerSupported(file)) native.push(file);
      else if(staticSupported(file)) coverage.pegatusStatic.push(file);
      else coverage.uncovered.push(file);
    }
    const raw=[];
    for(const file of coverage.pegatusStatic) raw.push(...supplemental(file,contents.get(file).toString('utf8')));
    if(native.length) {
      const cli=await executable();
      stage=await mkdtemp(path.join(os.tmpdir(),'pegatus-agentshield-'));
      for(const file of native) {const target=path.join(stage,file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,contents.get(file),{mode:0o600});}
      const controller=new AbortController(),startedAt=new Date().toISOString();
      const request={command:process.execPath,args:[cli,'scan','--path',stage,'--format','json'],cwd:stage,shell:false,signal:controller.signal,captureLimit:2_097_152};
      let timer;
      const response=await Promise.race([Promise.resolve().then(()=>run(request)),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('AgentShield timeout'));},timeoutMs);})]).finally(()=>clearTimeout(timer));
      result.evidence.push({command:request.command,args:request.args,cwd:stage,exitCode:response?.exitCode??null,startedAt,finishedAt:new Date().toISOString(),codeState:hashBytes(JSON.stringify(fileHashes)),outputPath:null});
      if(!response || response.error || response.signal || response.truncated || ![0,2].includes(response.exitCode)) throw new Error('AgentShield execution failed');
      const report=JSON.parse(response.stdout);
      if(!report?.summary || !Number.isSafeInteger(report.summary.filesScanned) || !Array.isArray(report.findings) || report.summary.totalFindings!==report.findings.length || report.summary.critical!==report.findings.filter(f=>f.severity==='critical').length || (response.exitCode===2)!==(report.summary.critical>0)) throw new Error('Invalid AgentShield report');
      coverage.filesScanned=report.summary.filesScanned;
      if(coverage.filesScanned!==native.length) {
        coverage.uncovered.push(...native);
        result.reasons.push('AgentShield discovery count does not match explicit file scope');
      } else coverage.agentShield=[...native];
      for(const finding of report.findings) {
        const file=relative(finding?.file?.replaceAll('\\','/'));
        if(!contents.has(file)) throw new Error('Finding outside explicit file scope');
        raw.push({...finding,file});
      }
    }
    result.findings=applyExceptions(normalizeFindings({findings:raw},{fileHashes,redactions}),exceptions);
    result.codeState=hashBytes(JSON.stringify(fileHashes));
    for(const file of coverage.requested) {
      const target=path.resolve(root,file);await assertContained(root,target);
      if(hashBytes(await readFile(target))!==fileHashes[file]) result.reasons.push(`Agent configuration changed during scan: ${file}`);
    }
    if(coverage.uncovered.length) result.reasons.push('Uncovered agent configuration files');
    if(result.findings.some(f=>f.severity==='critical' && !f.suppression)) result.reasons.push('Unresolved critical security findings');
    result.status=result.reasons.length?'blocked':'passed';
  } catch(error) {result.status='failed';result.reasons.push(error.code==='MODULE_NOT_FOUND'?'Pinned AgentShield executable missing':error.message);}
  finally {if(stage) await rm(stage,{recursive:true,force:true}).catch(()=>{result.status='failed';result.reasons.push('Scanner temporary-directory cleanup failed');});}
  // Raw reports/output never leave the scanner boundary. Redact error strings too.
  return {...result,findings:result.findings.map(f=>redactFinding(f,{redactions,maxOutput:4096})),reasons:redactSecurity(result.reasons,{redactions})};
}
/** Scan the desired configuration bytes, never an obsolete destination snapshot.
 * Removal-only safety is ownership/CAS checked by applyInstall; no fabricated scan.
 */
export async function scanInstallPlan(plan,options={}) {
  if(plan.conflicts?.length) return {status:'blocked',findings:[],coverage:{requested:[]},evidence:[],reasons:['Installation ownership conflicts']};
  if(!plan.owned.length) return {status:'passed',findings:[],coverage:{requested:[],operation:'removal-only'},evidence:[],reasons:[]};
  let stage;
  try {
    await assertContained(plan.root,plan.root);
    stage=await mkdtemp(path.join(os.tmpdir(),'pegatus-security-plan-'));
    const files=[];
    for(const op of plan.owned) {
      relative(op.path);
      if(op.content===undefined || hashBytes(op.content)!==op.hash) throw new Error('Invalid staged configuration bytes');
      // Locked library documentation is dependency content, not agent config.
      if(/^\.pegatus\/runtime\/[^/]+\/node_modules\//.test(op.path)) continue;
      if(!scannerSupported(op.path) && !staticSupported(op.path) && !/^\.(?:claude|codex|agents|gemini)\//.test(op.path)) continue;
      const target=path.join(stage,op.path);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,op.content,{mode:0o600});files.push(op.path);
    }
    if(!files.length) return {status:'blocked',findings:[],coverage:{requested:[],uncovered:['desired agent configuration']},evidence:[],reasons:['No supported agent configuration in desired installation']};
    return await scanAgentConfig({...options,root:stage,files});
  } catch(error) {return {status:'failed',findings:[],coverage:{requested:[]},evidence:[],reasons:[redactEvidence(error.message)]};}
  finally {if(stage) await rm(stage,{recursive:true,force:true});}
}
