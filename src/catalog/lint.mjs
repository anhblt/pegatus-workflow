import path from 'node:path';
import { createHash } from 'node:crypto';

const categories = ['agents','skills','commands','hooks','rules','memory','learning','verification','tokens','orchestration','security'];
const safePath = value => typeof value === 'string' && value.length > 0 && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value) && !/^[A-Za-z]:/.test(value) && !value.split(/[\\/]/).includes('..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Explicit subset for required string fields: plain (possibly indented), single
// quoted with doubled quotes, JSON-compatible double quoted, and |/> block text.
// This is not a general YAML parser; tags, aliases and collection fields are not
// supported for name/description. Other upstream metadata remains uninterpreted.
function requiredScalar(value, continuation) {
  if (/^[>|][-+]?$/.test(value)) return continuation.join(' ');
  if (value.startsWith('"')) {
    if (continuation.length) return null;
    try { const result=JSON.parse(value); return typeof result==='string'?result:null; }
    catch { return null; }
  }
  if (value.startsWith("'")) {
    if (continuation.length || !/^'(?:[^']|'')*'$/.test(value)) return null;
    return value.slice(1,-1).replaceAll("''", "'");
  }
  const parts = [value,...continuation].filter(Boolean);
  if (parts.some(part=>/^[\[\]{},&*!|>"'%@`]|^[?:-](?:\s|$)|:(?:\s|$)/.test(part))) return null;
  const plain = parts.map(part=>part.replace(/\s+#.*$/,'')).join(' ');
  return /^(?:null|true|false|~|\d+)$/i.test(plain)?null:plain;
}

function validFrontmatter(frontmatter) {
  if (!frontmatter) return false;
  const lines = frontmatter.split(/\r?\n/), keys = new Set(), values = {};
  for (let i=0;i<lines.length;i++) {
    if (!lines[i].trim() || /^\s*#/.test(lines[i]) || /^\s/.test(lines[i])) continue;
    const match=lines[i].match(/^([a-zA-Z][\w-]*):(?:\s+(.*))?$/);
    if (!match || keys.has(match[1])) return false;
    keys.add(match[1]);
    const value=match[2]??'';
    if (['name','description'].includes(match[1])) {
      const continuation=[];
      while (i+1<lines.length && /^\s+/.test(lines[i+1])) continuation.push(lines[++i].trim());
      values[match[1]]=requiredScalar(value,continuation);
      if (values[match[1]]===null) return false;
    }
  }
  return /^[a-z][a-z0-9-]*$/.test(values.name??'') && Boolean(values.description?.trim());
}

export function lintCatalog(catalog) {
  const findings = [];
  const add = (code,location,message,severity='error') => findings.push({code,location,message,severity});
  if (catalog.schemaVersion !== 1) add('invalid-manifest','catalog/manifest.json','Expected schemaVersion 1');
  for (const category of categories) if (!catalog.capabilities?.[category]?.owner) add('missing-capability',category,'Declare capability ownership');
  const entries = [], ids = new Set();
  for (const kind of ['agents','skills','commands','rules']) {
    if (!Array.isArray(catalog[kind])) { add('invalid-manifest',kind,'Expected entry array'); continue; }
    for (const entry of catalog[kind]) {
      entries.push(entry);
      if (!/^[a-z][a-z0-9-]*$/.test(entry.id??'')) add('invalid-id',entry.path,'Expected stable lowercase ID');
      if (ids.has(entry.id)) add('duplicate-id',entry.path,entry.id);
      ids.add(entry.id);
      if (!entry.activation || !Array.isArray(entry.dependencies) || !Array.isArray(entry.resources)) add('invalid-entry',entry.path,'Declare activation, dependencies and resources');
      if (entry.model !== undefined || entry.modelName !== undefined) add('hardcoded-model',entry.path,'Use hostModels configuration and a role tier');
      if (kind === 'agents' && !['fast','standard','deep'].includes(entry.modelTier)) add('invalid-model-tier',entry.path,'Expected configured model tier');
      const source = catalog.sourceLock?.sources.find(source=>source.id===entry.source?.id);
      if (entry.source?.id !== 'pegatus' && (!source || source.revision !== entry.source.revision || !source.paths.includes(entry.source.path))) add('invalid-provenance',entry.path,'Source must resolve to audited lock');
      if (entry.path?.startsWith('vendor/') && entry.source?.path?.endsWith('/SKILL.md') && source) {
        const directory = entry.source.path.slice(0,-8);
        for (const resource of source.paths.filter(resource=>resource.startsWith(directory))) {
          const packaged = `vendor/${source.id}/${resource}`;
          if (!entry.resources?.includes(packaged)) add('incomplete-resource-closure',entry.path,packaged);
        }
      }
      for (const resource of [entry.path,...(entry.resources??[])]) {
        if (!safePath(resource)) add('resource-escape',entry.path,String(resource));
        else if (!catalog.files?.[resource]) add('unresolved-resource',entry.path,resource);
      }
      const text = catalog.documents?.[entry.path]??'';
      const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
      if (!validFrontmatter(frontmatter)) add('invalid-frontmatter',entry.path,'Require unique YAML keys, a stable scalar name and nonempty scalar/folded description');
      if (frontmatter && /^(model|model_name):/m.test(frontmatter)) add('hardcoded-model',entry.path,'Native model names belong in per-host configuration');
    }
  }
  for (const command of catalog.commands??[]) if (!catalog.skills?.some(s=>s.id===command.skill)) add('unresolved-command',command.path,String(command.skill));
  for (const entry of entries) for (const dependency of entry.dependencies??[]) if (!ids.has(dependency)) add('unresolved-dependency',entry.path,dependency);
  const names = new Set();
  for (const skill of catalog.skills??[]) {
    const name = catalog.documents?.[skill.path]?.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    if (name && names.has(name)) add('duplicate-name',skill.path,name);
    if (name) names.add(name);
  }
  // Skip fenced and inline code: sample regexes and example links are not dependencies.
  for (const [file,text] of Object.entries(catalog.documents??{})) {
    if (catalog.auditOnly?.includes(file)) continue;
    const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm,'').replace(/`[^`\n]+`/g,'');
    for (const match of prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const ref = match[1].replace(/^<|>$/g,'').split(/\s+["']/)[0].split('#')[0];
      if (!ref || /^(https?:|mailto:)/i.test(ref)) continue;
      if (/^[a-z]+:/i.test(ref)) { add('unresolved-link',file,ref); continue; }
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file),ref));
      if (!safePath(target)) add('resource-escape',file,ref);
      else if (!catalog.files?.[target] && !Object.keys(catalog.files??{}).some(p=>p.startsWith(`${target.replace(/\/$/,'')}/`))) add('broken-link',file,ref);
    }
  }
  for (const item of catalog.vendoredFiles??[]) {
    const source = catalog.sourceLock?.sources.find(s=>s.id===item.sourceId);
    const expected = source?.contentHashes?.[item.sourcePath];
    const bytes = catalog.documents?.[item.path] ?? catalog.files?.[item.path];
    if (!expected || !bytes || `sha256:${hash(bytes)}` !== expected) add('source-hash-mismatch',item.path,'Vendored bytes must match sources.lock.json');
  }
  for (const notice of catalog.notices??[]) add(notice.code,notice.sourceId,notice.message,'warning');
  return findings;
}
