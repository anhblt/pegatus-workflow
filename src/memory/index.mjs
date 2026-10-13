import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertContained } from '../paths.mjs';

const normalize = value => path.posix.normalize(value.replaceAll('\\', '/')).replace(/\/$/, '');
const scoped = (target, scope) => scope === '.' || target === scope || target.startsWith(`${scope}/`);
const words = value => String(value).toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
const validScope = value => typeof value === 'string' && value.length > 0 &&
  !value.includes('\0') && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value) && !/^[A-Za-z]:/.test(value) &&
  !value.replaceAll('\\', '/').split('/').includes('..');

/** Approved fallback only. No task lessons or vault documents are indexed here.
 * Each <entry>.md.json sidecar holds projectId, paths, keywords, approvalState,
 * sourceTask, evidence and freshness. Promotion/approval is a separate workflow.
 */
export async function indexMemory({ root, projectId }) {
  if (typeof projectId !== 'string' || !projectId.trim()) throw new TypeError('Memory index requires a projectId');
  const directory = await assertContained(root, path.join(root, '.pegatus/memory'));
  const result = { entries: [], uncertainties: [] };
  async function visit(folder) {
    const files = await readdir(folder, { withFileTypes: true }).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return [];
    });
    for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
      if (file.isSymbolicLink()) continue;
      if (file.isDirectory()) {
        if (!['lessons', 'candidates'].includes(file.name)) await visit(await assertContained(directory, path.join(folder, file.name)));
        continue;
      }
      if (!file.name.endsWith('.md')) continue;
      const entryPath = await assertContained(directory, path.join(folder, file.name));
      let metadata;
      try {
        const sidecar = await assertContained(directory, `${entryPath}.json`);
        metadata = JSON.parse(await readFile(sidecar, 'utf8'));
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new TypeError('Metadata must be an object');
        if (metadata.approvalState !== 'approved' || metadata.projectId !== projectId || metadata.kind === 'lesson-candidate' || ['retired', 'superseded'].includes(metadata.status)) continue;
        if (!Array.isArray(metadata.paths) || !metadata.paths.length || !metadata.paths.every(validScope) ||
            !Array.isArray(metadata.keywords) || !metadata.keywords.every(word => typeof word === 'string') ||
            typeof metadata.sourceTask !== 'string' || !metadata.sourceTask ||
            !Array.isArray(metadata.evidence) || !metadata.evidence.length || !metadata.evidence.every(item => typeof item === 'string' && item)) {
          throw new TypeError('Approved memory needs valid scope, keywords, source task and evidence');
        }
      } catch (error) {
        if (error.code !== 'ENOENT') result.uncertainties.push({ code: 'memory-metadata-invalid', path: entryPath, message: error.message });
        continue;
      }
      result.entries.push({ ...metadata, path: entryPath });
    }
  }
  await visit(directory);
  return result;
}

/** Pure project/path/keyword selection; stale claims remain visible for source review. */
export function selectMemory(entries, { projectId, paths = [], query = '', branch }) {
  if (typeof projectId !== 'string' || !projectId.trim()) return [];
  const terms = new Set(words(query));
  return entries.filter(entry => entry.projectId === projectId && entry.approvalState === 'approved' &&
    entry.kind !== 'lesson-candidate' &&
    !['retired', 'superseded'].includes(entry.status) &&
    Array.isArray(entry.paths) && entry.paths.every(validScope) &&
    paths.some(target => validScope(target) && entry.paths.some(scope => scoped(normalize(target), normalize(scope)))) &&
    Array.isArray(entry.keywords) && entry.keywords.some(keyword => words(keyword).some(term => terms.has(term)))
  ).map(entry => {
    const requiresSourceConfirmation = entry.freshness?.status !== 'current' ||
      Boolean(entry.freshness?.branch && entry.freshness.branch !== branch);
    return { ...entry, requiresSourceConfirmation, confirmation: requiresSourceConfirmation ? 'agent-review-required' : 'not-requested' };
  });
}
