import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { assertContained } from '../paths.mjs';
import { resolveConfig } from '../config.mjs';
import { indexMemory, selectMemory } from '../memory/index.mjs';
import { buildContextManifest } from '../telemetry/usage.mjs';

/** The trusted workflow supplies resolution after reading instruction semantics:
 * {readInstructions: absolutePaths[], discovery: commandSpecs[], knowledgePaths: [],
 *  sourcePaths: targetScopedPaths[], fallback: {allowed, instructionPaths}}.
 * Instructed commands carry instructionPaths. [] discovery explicitly replaces config.
 * No Markdown hint, retrieved document or tool output can supply this resolution.
 * run accepts {command,args,cwd,requires[,shell]} and returns {exitCode,stdout,stderr}
 * with JSON stdout {refs:[{path,freshness,...}],uncertainties:[]} or those fields directly.
 */
export async function retrieveContext({ config, context, query, run }) {
  const result = await retrieve({ config, context, query, run });
  result.contextManifest = buildContextManifest({
    instructionPaths: [...new Set([...(context.instructionPaths ?? []), ...(context.instructions ?? []).map(item => item.path)])],
    knowledgeRefs: [...result.refs, ...result.sources],
  }, config?.tokenControls ?? {});
  if (result.contextManifest.status === 'blocked') result.uncertainties.push({ code: 'context-budget-exceeded',
    message: 'Required context exceeds configured limits. Narrow retrieval or update team configuration before dependent work.' });
  return result;
}

async function retrieve({ config, context, query, run }) {
  const result = { refs: [], uncertainties: [], fallbackAllowed: false, sources: [], trace: [] };
  const instructions = context.instructions ?? [];
  const resolution = context.resolution ?? {};
  const readInstructions = new Set(resolution.readInstructions ?? []);
  if (instructions.some(item => !readInstructions.has(item.path))) {
    result.uncertainties.push({ code: 'instruction-review-required', message: 'Read and resolve all discovered instruction semantics before retrieval.' });
    return result;
  }
  const known = new Set(instructions.map(item => item.path));
  function provenance(refs) {
    if (!Array.isArray(refs) || !refs.length || refs.some(ref => !known.has(ref) || !readInstructions.has(ref))) {
      throw new TypeError('Resolution must cite read applicable instruction paths');
    }
  }
  if (resolution.fallback?.allowed === true) {
    provenance(resolution.fallback.instructionPaths);
    result.fallbackAllowed = true;
  }
  const knowledge = config?.knowledge;
  const commands = resolution.discovery ?? knowledge?.discovery ?? [];
  const knowledgePaths = resolution.knowledgePaths ?? knowledge?.paths ?? [];
  // Validate with the same platform-neutral command contract used for verification.
  resolveConfig({ project: { knowledge: { paths: knowledgePaths, discovery: commands } } });
  // Shell arguments can be program text. Do not interpolate untrusted query data
  // into them; callers must use a direct executable with argv placeholders.
  if (commands.some(command => command.shell && command.args.some(arg => arg.includes('{query}')))) {
    throw new TypeError('Query placeholders are not allowed in shell discovery commands');
  }
  for (const location of knowledgePaths) result.refs.push({ path: await assertContained(context.root, path.resolve(context.root, location)), kind: 'knowledge-location', confirmation: 'agent-review-required' });
  for (const command of commands) {
    if (resolution.discovery !== undefined) provenance(command.instructionPaths);
    const spec = { ...command, args: command.args.map(arg => arg.replaceAll('{query}', () => query)), cwd: await assertContained(context.root, path.resolve(context.root, command.cwd)) };
    delete spec.instructionPaths;
    result.trace.push({ operation: 'discovery-command', command: spec.command, args: spec.args, cwd: spec.cwd });
    let output;
    try {
      if (typeof run !== 'function') throw new TypeError('Discovery runner is unavailable');
      output = await run(spec);
    } catch (error) {
      result.uncertainties.push({ code: 'discovery-failed', command: spec.command, message: error.message });
      continue;
    }
    if (output?.exitCode !== 0) {
      result.uncertainties.push({ code: 'discovery-failed', command: spec.command, exitCode: output?.exitCode, message: output?.stderr ?? 'Discovery did not succeed' });
      continue;
    }
    try {
      const payload = output.refs !== undefined ? output : JSON.parse(output.stdout);
      if (!Array.isArray(payload.refs) || payload.refs.some(ref => !ref || typeof ref.path !== 'string') ||
          (payload.uncertainties !== undefined && !Array.isArray(payload.uncertainties))) throw new TypeError('Discovery must return refs and optional uncertainties arrays');
      const refs = [];
      for (const ref of payload.refs) {
        const file = await assertContained(context.root, path.resolve(spec.cwd, ref.path));
        const requiresSourceConfirmation = ref.freshness?.status !== 'current' || Boolean(ref.freshness?.branch && ref.freshness.branch !== context.branch);
        refs.push({ ...ref, path: file, requiresSourceConfirmation, confirmation: requiresSourceConfirmation ? 'agent-review-required' : 'not-requested' });
      }
      result.refs.push(...refs);
      result.uncertainties.push(...(payload.uncertainties ?? []));
    } catch (error) {
      result.uncertainties.push({ code: 'discovery-output-invalid', command: spec.command, message: error.message });
    }
  }
  if (!commands.length && !knowledgePaths.length && !knowledge && !resolution.externalKnowledge) {
    if (!context.projectId) result.uncertainties.push({ code: 'memory-project-required', message: 'Fallback memory requires an explicit projectId.' });
    else {
      result.trace.push({ operation: 'memory-index', path: path.join(context.root, '.pegatus/memory') });
      const index = await indexMemory({ root: context.root, projectId: context.projectId });
      result.uncertainties.push(...index.uncertainties);
      const selected = selectMemory(index.entries, { projectId: context.projectId, paths: context.targetPaths.map(target => path.relative(context.root, target.path)), query, branch: context.branch });
      for (const entry of selected) {
        const file = await assertContained(context.root, entry.path);
        result.trace.push({ operation: 'memory-read', path: file });
        try {
          const bytes = await readFile(file), content = bytes.toString('utf8');
          let pending = false;
          if (/^[a-f0-9]{64}$/.test(entry.id ?? '') && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.sourceTask)) {
            const lock = await assertContained(context.root, path.join(context.root,'.pegatus/work',entry.sourceTask,'lessons',`${entry.id}.review-lock`));
            pending = await lstat(lock).then(()=>true).catch(error=>{if(error.code!=='ENOENT') throw error;return false;});
          }
          const verified = !pending && entry.documentHash === createHash('sha256').update(bytes).digest('hex');
          if (!verified) result.uncertainties.push({ code: pending ? 'memory-review-pending' : entry.documentHash ? 'memory-content-changed' : 'memory-digest-missing', path: file,
            message: 'The current body is not bound to a verified approval; review source and propose the current claim before relying on it.' });
          result.refs.push({ ...entry, content, ...(!verified ? { approvalState: 'unverified', freshness: {status:'unknown'}, requiresSourceConfirmation:true, confirmation:'agent-review-required' } : {}) });
        } catch (error) {
          result.uncertainties.push({ code: 'memory-unavailable', path: file, message: error.message });
        }
      }
    }
  }
  for (const location of resolution.sourcePaths ?? []) {
    const file = await assertContained(context.root, path.resolve(context.root, location));
    if (!context.targetPaths.some(target => target.path === file || target.directory && file.startsWith(`${target.path}${path.sep}`))) throw new Error(`Source confirmation is outside target scope: ${location}`);
    result.trace.push({ operation: 'source-read', path: file });
    try {
      result.sources.push({ path: file, content: await readFile(file, 'utf8'), confirmation: 'agent-review-required' });
    } catch (error) {
      result.uncertainties.push({ code: 'source-unavailable', path: file, message: error.message });
    }
  }
  return result;
}
