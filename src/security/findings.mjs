import {createHash} from 'node:crypto';
import {redactEvidence} from '../verify/runner.mjs';
const digest=value=>createHash('sha256').update(value).digest('hex');
const severities=new Set(['critical','high','medium','low','info']);
export function redactSecurity(value,options={}) {
  const scrub=item=>typeof item==='string'?item.replace(/\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b/g,'[REDACTED]'):Array.isArray(item)?item.map(scrub):item && typeof item==='object'?Object.fromEntries(Object.entries(item).map(([key,child])=>[key,scrub(child)])):item;
  return scrub(redactEvidence(value,options));
}
/** Observed AgentShield 1.6.0 JSON only. Fingerprint raw content before redaction. */
export function normalizeFindings(raw,{fileHashes={},redactions=[]}={}) {
  if(!raw || !Array.isArray(raw.findings)) throw new TypeError('Invalid scanner findings');
  return raw.findings.map(f=>{
    if(!f || !['id','severity','file','title','description'].every(k=>typeof f[k]==='string' && f[k].length) || !severities.has(f.severity) || (f.evidence!==undefined && typeof f.evidence!=='string') || (f.line!==undefined && (!Number.isSafeInteger(f.line) || f.line<1))) throw new TypeError('Malformed scanner finding');
    const location=f.file.replaceAll('\\','/');
    const fingerprint=digest(JSON.stringify([f.id,f.severity,location,f.title,f.description,f.evidence??'',f.line??null,fileHashes[location]??null]));
    return redactSecurity({id:f.id,severity:f.severity,path:location,message:`${f.title}: ${f.description}`,evidence:f.evidence??'',source:f.source??'agentshield@1.6.0',fingerprint,...(f.line?{line:f.line}:{}),...(f.fix?{remediation:f.fix}:{} )},{redactions});
  });
}
/** Exceptions are explicit caller-supplied human review records, never scanner output. */
export function applyExceptions(findings,exceptions=[]) {
  return findings.map(f=>{
    const review=exceptions.find(e=>e?.fingerprint===f.fingerprint && e.disposition==='accepted-risk' && ['reviewedBy','reviewedAt','reason'].every(k=>typeof e[k]==='string' && e[k].trim()) && Number.isFinite(Date.parse(e.reviewedAt)));
    return review?{...f,suppression:redactSecurity({fingerprint:review.fingerprint,disposition:review.disposition,reviewedBy:review.reviewedBy,reviewedAt:review.reviewedAt,reason:review.reason})}:f;
  });
}
