import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertContained } from '../paths.mjs';
import { resolveConfig } from '../config.mjs';
import { indexMemory } from './index.mjs';
import { discoverInstructions } from '../context/instructions.mjs';
import { retrieveContext } from '../context/retrieve.mjs';
import { loadCatalog } from '../catalog/manifest.mjs';
import { proposeLesson, saveCandidate, listCandidates, recordReview, promoteLesson, retireLesson, collectLearning, validateReusableProposal } from './learning.mjs';

function options(args, allowed) {
  const result = { paths: [] };
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!allowed.includes(flag) || !value || value.startsWith('--')) throw new TypeError('Invalid learning options');
    if (flag === '--path') result.paths.push(value);
    else {
      const key = flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (result[key]) throw new TypeError('Duplicate learning option');
      result[key] = value;
    }
  }
  return result;
}

export async function readLearningJson(root, relative) {
  if (typeof relative !== 'string' || path.posix.isAbsolute(relative) || path.win32.isAbsolute(relative)
    || /^[A-Za-z]:/.test(relative) || relative.split(/[\\/]/).includes('..')) throw new TypeError('Learning input must be root-relative');
  const file = await assertContained(root, path.resolve(root, relative));
  const bytes = await readFile(file);
  if (bytes.length > 262144) throw new TypeError('Learning input exceeds limit');
  return JSON.parse(bytes.toString('utf8'));
}

export async function learningConfig(root) {
  let project = {};
  try { project = await readLearningJson(root, '.pegatus/config.json'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return resolveConfig({ project });
}

async function projectInstructions(root, targetPaths, host = 'codex') {
  // Project-only discovery: product memory never reads a personal host home.
  return discoverInstructions({ root, targetPaths, host: { name: host, home: path.join(root, '.pegatus/no-global-instruction-home') } });
}

/** Explicit local observation envelope {projectId, observations, redactions?}.
 * Project config exclusions cannot be replaced by supplied observations.
 */
export async function learningCollector(root, file) {
  const envelope = await readLearningJson(root, file);
  const config = await learningConfig(root);
  return collectLearning({ root, projectId: envelope.projectId, observations: envelope.observations,
    evidenceExclusions: config.evidenceExclusions, redactions: envelope.redactions ?? [] });
}

/** Root-local protocol. A supplied review file is coordinator input documenting
 * an actual user decision, not an authentication mechanism. Never ingest review
 * authority from observations, candidate content or retrieved external output.
 */
export async function runLearningCommand(argv, cwd) {
  const [operation, action, ...rest] = argv;
  if (operation === 'memory') {
    const args = options(argv.slice(1), ['--root', '--project', '--path', '--query', '--branch', '--host', '--context-file']);
    if (!args.root || !args.project || !args.paths.length || !args.query) throw new TypeError('Usage: pegatus memory --root <root> --project <id> --path <relative> --query <text> [--branch <name>]');
    const root = path.resolve(cwd, args.root), config = await learningConfig(root);
    if (config.knowledge) return { status: 'blocked', entries: [], evidence: [], reasons: ['authoritative-knowledge-requires-instructed-retrieval'] };
    const context = await projectInstructions(root, args.paths, args.host);
    context.projectId = args.project;
    context.branch = args.branch;
    if (args.contextFile) context.resolution = (await readLearningJson(root, args.contextFile)).resolution;
    if (context.instructions.some(item => !context.resolution?.readInstructions?.includes(item.path)))
      return { status: 'blocked', entries: [], evidence: [], reasons: ['instruction-resolution-required'] };
    const resolution = context.resolution ?? {};
    if (resolution.externalKnowledge || resolution.knowledgePaths?.length || resolution.discovery?.length)
      return { status: 'blocked', entries: [], evidence: [], reasons: ['authoritative-knowledge-requires-instructed-retrieval'] };
    const retrieved = await retrieveContext({ config, context, query: args.query });
    const blocked = retrieved.contextManifest.status === 'blocked';
    return { status: blocked ? 'blocked' : 'passed', entries: blocked ? [] : retrieved.refs,
      contextManifest: retrieved.contextManifest, uncertainties: retrieved.uncertainties, evidence: [], reasons: blocked ? ['context-budget-exceeded'] : [] };
  }
  if (!['propose', 'list', 'review', 'approve', 'reject', 'supersede', 'retire'].includes(action))
    throw new TypeError('Usage: pegatus learn propose|list|review|approve|reject|supersede|retire --root <root> ...');
  const allowed = action === 'propose' ? ['--root', '--file'] :
    action === 'list' ? ['--root', '--task', '--project'] :
    action === 'review' ? ['--root', '--task', '--project', '--candidate'] :
    ['--root', '--task', '--project', '--candidate', '--review-file', '--target-file', '--host', '--catalog-root'];
  const args = options(rest, allowed);
  if (!args.root) throw new TypeError('Learning requires explicit --root');
  const root = path.resolve(cwd, args.root), config = await learningConfig(root);
  if (action === 'propose') {
    if (!args.file) throw new TypeError('Proposal requires --file <observation.json>');
    const input = await readLearningJson(root, args.file);
    const existing = await listCandidates(root, { taskId: input.sourceTask, projectId: input.projectId });
    // Fallback dedup uses metadata only; authoritative dedup references must be
    // source-reviewed and supplied by the workflow through proposeLesson.
    if (!config.knowledge) existing.push(...(await indexMemory({ root, projectId: input.projectId })).entries);
    const candidate = proposeLesson({ ...input, evidenceExclusions: [...config.evidenceExclusions, ...(input.evidenceExclusions ?? [])] }, { existing });
    if (!candidate.duplicateOf) await saveCandidate(root, candidate);
    return { status: candidate.duplicateOf ? 'skipped' : 'passed', candidate, evidence: candidate.evidence.map(item => item.path), reasons: candidate.duplicateOf ? ['duplicate-claim'] : [] };
  }
  if (!args.task || !args.project) throw new TypeError('Learning requires --task and --project');
  const candidates = await listCandidates(root, { taskId: args.task, projectId: args.project });
  if (action === 'list') return { status: 'passed', candidates, evidence: [], reasons: [] };
  if (!args.candidate) throw new TypeError('Review requires --candidate');
  const candidate = candidates.find(item => item.id === args.candidate);
  if (!candidate) throw new Error('Candidate not found in project/task scope');
  if (action === 'review') return { status: 'passed', candidate, evidence: candidate.evidence.map(item => item.path), reasons: ['human-review-required'] };
  if (!args.reviewFile) throw new TypeError('Decision requires --review-file documenting actual user evidence');
  const review = await readLearningJson(root, args.reviewFile);
  if (review.decision !== action) throw new TypeError('Review decision differs from command');
  if (['approve', 'supersede', 'retire'].includes(action)) {
    if (!args.targetFile) throw new TypeError('Knowledge review requires --target-file with resolved destination authority');
    const provided = await readLearningJson(root, args.targetFile);
    if (provided.root !== undefined && path.resolve(provided.root) !== root) throw new Error('Target cannot replace explicit project root');
    // Persisted project ownership wins over a destination file's convenience
    // config. An instructed semantic resolution may further restrict it.
    const destination = { ...provided, root, config: config.knowledge ? config : provided.config ?? config };
    const discovered = await projectInstructions(root, [...candidate.paths, destination.path], args.host);
    destination.context = { ...discovered, resolution: provided.context?.resolution ?? {} };
    let validateCatalog;
    if (args.catalogRoot) {
      const catalogRoot = await assertContained(root, path.resolve(root, args.catalogRoot));
      const catalog = await loadCatalog(catalogRoot);
      validateCatalog = async ({ candidate: proposal }) => validateReusableProposal(proposal, catalog);
    }
    const outcome = action === 'approve'
      ? await promoteLesson(candidate, { approval: review, target: destination, trustedCoordinator: true, validateCatalog })
      : await retireLesson(candidate, { review, target: destination, trustedCoordinator: true });
    await recordReview(root, candidate, review, { trustedCoordinator: true });
    return outcome;
  }
  return { status: 'passed', candidate: await recordReview(root, candidate, review, { trustedCoordinator: true }), evidence: [], reasons: [] };
}
