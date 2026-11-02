import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, unlink, lstat } from 'node:fs/promises';
import path from 'node:path';
import { assertContained } from '../paths.mjs';
import { indexMemory } from './index.mjs';
import { lintCatalog } from '../catalog/lint.mjs';
import { redactCredentials } from '../security/credentials.mjs';

const nonempty = value => typeof value === 'string' && Boolean(value.trim()) && !value.includes('\0');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => path.posix.normalize(value.replaceAll('\\', '/')).replace(/\/$/, '');
const within = (file, directory) => directory === '.' || file === directory || file.startsWith(`${directory}/`);
const safeRelative = value => nonempty(value) && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value)
  && !/^[A-Za-z]:/.test(value) && !value.split(/[\\/]/).includes('..') && !/[\r\n]/.test(value);
const safeTask = value => nonempty(value) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value);
const strings = value => Array.isArray(value) && value.every(nonempty);

function excluded(file, patterns) {
  return patterns.some(pattern => {
    const expression = pattern.replaceAll('\\', '/').split('**').map(part =>
      part.split('*').map(piece => piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
    return new RegExp(`^${expression}(?:/.*)?$`).test(file);
  });
}

function redact(value, secrets) {
  return redactCredentials(value, secrets);
}

function payload(candidate) {
  return { schemaVersion: 1, kind: candidate.kind, projectId: candidate.projectId, sourceTask: candidate.sourceTask,
    title: candidate.title, content: candidate.content, paths: candidate.paths, keywords: candidate.keywords,
    evidence: candidate.evidence, freshness: candidate.freshness, redacted: candidate.redacted };
}

/** Pure observation. Evidence consists of relative references with passed/failed
 * outcomes, never raw logs. Exclusions apply before persistence. Explicit secret
 * redactions supplement conservative credential assignment/Bearer redaction.
 * existing can include candidates or source-reviewed authoritative entry metadata.
 */
export function proposeLesson(input, { existing = [] } = {}) {
  if (!object(input) || !nonempty(input.projectId) || !safeTask(input.sourceTask)
    || !nonempty(input.title) || !nonempty(input.content)) throw new TypeError('Candidate needs project, source task, title and content');
  if (!Array.isArray(input.paths) || !input.paths.length || !input.paths.every(safeRelative)
    || !strings(input.keywords) || !input.keywords.length) throw new TypeError('Candidate needs relative path scope and keywords');
  const kind = input.kind ?? 'lesson';
  if (!['lesson', 'skill', 'rule'].includes(kind)) throw new TypeError('Unsupported candidate kind');
  const exclusions = input.evidenceExclusions ?? [], secrets = input.redactions ?? [];
  if (!strings(exclusions) || !strings(secrets)) throw new TypeError('Invalid evidence exclusions or redactions');
  if (!Array.isArray(input.evidence) || !input.evidence.length || input.evidence.some(item =>
    !object(item) || !safeRelative(item.path) || !['passed', 'failed'].includes(item.outcome)))
    throw new TypeError('Candidate needs scoped outcome evidence');
  const evidence = input.evidence.filter(item => !excluded(normalize(item.path), exclusions)).map(item => {
    const reference = { path: normalize(item.path), outcome: item.outcome };
    if (item.codeState !== undefined) {
      if (!/^[a-f0-9]{64}$/.test(item.codeState)) throw new TypeError('Invalid evidence code state');
      reference.codeState = item.codeState;
    }
    if (redact(reference.path, secrets) !== reference.path) throw new TypeError('Evidence reference contains sensitive data; exclude it');
    return reference;
  });
  if (!evidence.length) throw new TypeError('No evidence remains after exclusions');
  const freshness = input.freshness ?? { status: 'unknown' };
  if (!object(freshness) || !['current', 'stale', 'unknown'].includes(freshness.status)
    || (freshness.branch !== undefined && !nonempty(freshness.branch))) throw new TypeError('Invalid freshness');
  const candidate = { schemaVersion: 1, kind, projectId: input.projectId, sourceTask: input.sourceTask,
    title: redact(input.title, secrets), content: redact(input.content, secrets),
    paths: [...new Set(input.paths.map(normalize))].sort(),
    keywords: [...new Set(input.keywords.map(value => redact(value, secrets).toLowerCase().trim()))].sort(),
    evidence, freshness: { status: freshness.status, ...(freshness.branch ? { branch: freshness.branch } : {}) },
    redacted: false, approvalState: 'candidate', status: 'proposed', active: false, reviews: [], duplicateOf: null };
  if ([candidate.projectId, candidate.sourceTask, ...candidate.paths, candidate.freshness.branch ?? ''].some(value => redact(value, secrets) !== value))
    throw new TypeError('Sensitive scope identifier; use a redacted identifier');
  candidate.redacted = candidate.title !== input.title || candidate.content !== input.content ||
    input.keywords.some(value => redact(value, secrets) !== value);
  candidate.dedupKey = hash(JSON.stringify([kind, candidate.projectId, candidate.paths, candidate.title.trim().toLowerCase(),
    candidate.content.replace(/\s+/g, ' ').trim().toLowerCase()]));
  candidate.contentHash = hash(JSON.stringify(payload(candidate)));
  candidate.id = candidate.contentHash;
  candidate.duplicateOf = existing.find(entry => entry.projectId === candidate.projectId
    && entry.dedupKey === candidate.dedupKey && !['rejected', 'superseded', 'retired'].includes(entry.status))?.id ?? null;
  return candidate;
}

function validateCandidate(candidate) {
  if (!object(candidate) || candidate.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(candidate.id ?? '')
    || hash(JSON.stringify(payload(candidate))) !== candidate.contentHash || candidate.id !== candidate.contentHash)
    throw new TypeError('Candidate content or identity changed after proposal');
  // Revalidate scopes and evidence even for serialized candidates.
  if (proposeLesson(payload(candidate)).dedupKey !== candidate.dedupKey) throw new TypeError('Candidate deduplication identity changed');
  return candidate;
}

/** Validate a staged catalog snapshot containing this exact reusable proposal.
 * This is review evidence only; activation/installation remains catalog-owned.
 */
export function validateReusableProposal(candidate, catalog) {
  validateCandidate(candidate);
  const findings = lintCatalog(catalog);
  const result = { schemaVersion: 1, candidateHash: candidate.contentHash, evidence: [], reasons: [], findings };
  if (findings.some(finding => finding.severity === 'error')) return { ...result, status: 'failed', reasons: ['catalog-validation-failed'] };
  const entries = catalog[candidate.kind === 'skill' ? 'skills' : 'rules'];
  const entry = entries.find(item => catalog.documents[item.path]?.trim() === candidate.content.trim());
  if (candidate.kind === 'lesson' || !entry) return { ...result, status: 'blocked', reasons: ['proposal-missing-from-reviewed-catalog'] };
  return { ...result, status: 'passed', evidence: ['catalog/manifest.json', entry.path] };
}

/** Local review protocol, not authentication. The caller must be the coordinator
 * that read actual user approval. Neither candidate content nor tool output may
 * set trustedCoordinator. Review records bind exact claim and destination.
 */
export function reviewLesson(candidate, review, { trustedCoordinator = false } = {}) {
  validateCandidate(candidate);
  if (!trustedCoordinator) throw new Error('Review requires trusted coordinator input');
  if (!object(review) || review.schemaVersion !== 1 || !['approve', 'reject', 'supersede', 'retire'].includes(review.decision)
    || review.candidateId !== candidate.id || review.candidateHash !== candidate.contentHash
    || review.projectId !== candidate.projectId) throw new TypeError('Approval must bind candidate content and project');
  if (!nonempty(review.userEvidence)) throw new TypeError('Review requires actual user evidence');
  if (!nonempty(review.reviewedBy) || !nonempty(review.reviewedAt) || Number.isNaN(Date.parse(review.reviewedAt))
    || new Date(review.reviewedAt).toISOString() !== review.reviewedAt) throw new TypeError('Review requires reviewer and ISO timestamp');
  if (!safeRelative(review.destination)) throw new TypeError('Review requires relative destination');
  if (review.decision === 'supersede' && (!nonempty(review.replacementId) || review.replacementId === candidate.id))
    throw new TypeError('Supersede requires a different replacement ID');
  if (['reject', 'retire'].includes(review.decision) && !nonempty(review.reason)) throw new TypeError('Review requires reason');
  if (['rejected', 'superseded', 'retired'].includes(candidate.status)) throw new Error(`Candidate is ${candidate.status}; propose a new claim`);
  if (candidate.status === 'approved' && !['supersede', 'retire'].includes(review.decision))
    throw new Error('Approved knowledge requires explicit supersede or retire review');
  if (candidate.reviews?.length && review.reviewedAt <= candidate.reviews.at(-1).reviewedAt)
    throw new Error('Review chronology requires a later decision timestamp');
  const record = { schemaVersion: 1, decision: review.decision, candidateId: candidate.id, candidateHash: candidate.contentHash,
    projectId: candidate.projectId, destination: normalize(review.destination), userEvidence: review.userEvidence,
    reviewedBy: review.reviewedBy, reviewedAt: review.reviewedAt,
    ...(review.reason ? { reason: review.reason } : {}), ...(review.replacementId ? { replacementId: review.replacementId } : {}) };
  const status = { approve: 'approved', reject: 'rejected', supersede: 'superseded', retire: 'retired' }[review.decision];
  return { ...structuredClone(candidate), status, approvalState: status === 'approved' ? 'approved' : 'candidate',
    active: false, reviews: [...(candidate.reviews ?? []), record] };
}

async function candidateDirectory(root, taskId) {
  if (!safeTask(taskId)) throw new TypeError('Invalid source task');
  return assertContained(root, path.resolve(root, '.pegatus/work', taskId, 'lessons'));
}
async function absent(file) {
  try { await lstat(file); throw new Error(`Destination already exists: ${file}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
async function exclusive(root, file, content) {
  await assertContained(root, file);
  await mkdir(path.dirname(file), { recursive: true });
  await assertContained(root, file);
  const descriptor = await open(file, 'wx');
  try { await descriptor.writeFile(content); await descriptor.sync(); }
  finally { await descriptor.close(); }
}

/** Immutable proposal files and append-only review events. Existing proposals
 * are deduplicated by content hash; no candidate-supplied review is persisted.
 */
export async function saveCandidate(root, candidate) {
  validateCandidate(candidate);
  if (candidate.status !== 'proposed' || candidate.approvalState !== 'candidate' || candidate.reviews?.length)
    throw new Error('Candidate persistence cannot grant review approval');
  const directory = await candidateDirectory(root, candidate.sourceTask);
  const file = await assertContained(root, path.join(directory, `${candidate.id}.json`));
  try { await exclusive(root, file, JSON.stringify(candidate, null, 2) + '\n'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = validateCandidate(JSON.parse(await readFile(file, 'utf8')));
    if (existing.projectId !== candidate.projectId) throw new Error('Candidate project mismatch');
    return existing;
  }
  return candidate;
}

async function currentCandidate(root, candidate) {
  validateCandidate(candidate);
  const current = (await listCandidates(root, { taskId: candidate.sourceTask, projectId: candidate.projectId }))
    .find(item => item.id === candidate.id);
  if (!current || current.contentHash !== candidate.contentHash) throw new Error('Candidate persistence mismatch');
  if (candidate.status !== current.status || candidate.approvalState !== current.approvalState
    || JSON.stringify(candidate.reviews ?? []) !== JSON.stringify(current.reviews))
    throw new Error('Stale candidate review history; reload the current persisted candidate');
  return current;
}
async function appendReview(root, directory, candidate, event) {
  const file = path.join(directory, `${candidate.id}.reviews`, `${hash(JSON.stringify(event))}.json`);
  try { await exclusive(root, file, JSON.stringify(event, null, 2) + '\n'); }
  catch (error) {
    if (error.code !== 'EEXIST' || JSON.stringify(JSON.parse(await readFile(file, 'utf8'))) !== JSON.stringify(event)) throw error;
  }
}
async function snapshot(root, files) {
  return Promise.all(files.map(async file => {
    const target = await assertContained(root, path.resolve(root, file));
    const bytes = await readFile(target).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    return {path:file, hash:bytes === null ? null : hash(bytes)};
  }));
}

/** Serialize persisted validation, destination mutation and immutable append.
 * An interruption retains the intent lock; recovery requires stopped-writer
 * confirmation and the inspected lock digest, never an age-based takeover. */
export async function commitReview(root, candidate, review, options = {}) {
  validateCandidate(candidate);
  const directory = await candidateDirectory(root, candidate.sourceTask);
  const lockPath = await assertContained(root, path.join(directory, `${candidate.id}.review-lock`));
  await mkdir(directory, {recursive:true});
  const lock = await open(lockPath, 'wx');
  let prepared = false, committed = false;
  try {
  const current = await currentCandidate(root, candidate);
  const next = reviewLesson(current, review, options);
  const event = next.reviews.at(-1);
  const destination = options.target ? normalize(options.target.path) : null;
  if (options.target && path.resolve(options.target.root) !== path.resolve(root)) throw new Error('Transactional review requires the explicit project root');
  if (options.target) await authorizeDestination(current, options.target);
  const before = await snapshot(root, destination ? [destination, `${destination}.json`] : []);
  const intent = {schemaVersion:1,pid:process.pid,candidateId:candidate.id,sourceTask:candidate.sourceTask,projectId:candidate.projectId,event,destination,before};
  await lock.writeFile(JSON.stringify(intent, null, 2)+'\n'); await lock.sync(); prepared = true;
  let outcome;
  if (options.target) outcome = review.decision === 'approve'
    ? await promoteLesson(current, {...options, approval:review})
    : await retireLesson(current, {...options, review});
  await appendReview(root, directory, candidate, event); committed = true;
  return outcome ?? {status:'passed',candidate:next,evidence:[],reasons:[]};
  } finally {
    await lock.close();
    if (!prepared || committed) await unlink(lockPath);
  }
}
export async function recordReview(root, candidate, review, options) {
  return (await commitReview(root, candidate, review, options)).candidate;
}

/** Only complete an exact destination/event, or abort when destination bytes
 * still equal the pre-mutation snapshot. Never delete uncertain authored files. */
export async function recoverReview(root, request, {trustedCoordinator = false} = {}) {
  if (!trustedCoordinator || request.stoppedWriter !== true || !['complete','abort'].includes(request.decision)
    || !/^[a-f0-9]{64}$/.test(request.candidateId ?? '') || !/^[a-f0-9]{64}$/.test(request.expectedLockHash ?? ''))
    throw new Error('Recovery requires trusted stopped-writer confirmation and inspected lock hash');
  const directory = await candidateDirectory(root, request.taskId);
  const lockPath = await assertContained(root, path.join(directory, `${request.candidateId}.review-lock`));
  const recoveryPath = `${lockPath}.recovery`, recovery = await open(recoveryPath, 'wx');
  try {
    const bytes = await readFile(lockPath);
    if (bytes.length > 262144 || hash(bytes) !== request.expectedLockHash) throw new Error('Review recovery lock changed');
    const intent = JSON.parse(bytes);
    if (intent.schemaVersion !== 1 || intent.candidateId !== request.candidateId || intent.sourceTask !== request.taskId || intent.projectId !== request.projectId)
      throw new Error('Review recovery scope mismatch');
    const current = (await listCandidates(root, {taskId:request.taskId,projectId:request.projectId})).find(item=>item.id===request.candidateId);
    if (!current) throw new Error('Recovery candidate missing');
    const already = current.reviews.some(event=>JSON.stringify(event)===JSON.stringify(intent.event));
    if (!already) {
      const next = reviewLesson(current, intent.event, {trustedCoordinator:true});
      if (request.decision === 'abort') {
        const observed = await snapshot(root, intent.before.map(item=>item.path));
        if (JSON.stringify(observed) !== JSON.stringify(intent.before)) throw new Error('Destination changed; preserve files and reconcile before recovery');
      } else {
        if (intent.destination) {
          const file = await assertContained(root, path.resolve(root, intent.destination));
          const content = await readFile(file), metadata = JSON.parse(await readFile(await assertContained(root, `${file}.json`), 'utf8'));
          if (metadata.candidateHash !== current.contentHash || metadata.projectId !== current.projectId
            || metadata.documentHash !== hash(content) || hash(content) !== hash(`# ${current.title}\n\n${current.content}\n`)
            || metadata.status !== next.status || JSON.stringify(metadata.reviews) !== JSON.stringify(next.reviews))
            throw new Error('Destination does not match interrupted reviewed claim');
        }
        await appendReview(root, directory, current, intent.event);
      }
    } else if (request.decision === 'abort') throw new Error('Review already committed; cannot abort history');
    if (hash(await readFile(lockPath)) !== request.expectedLockHash) throw new Error('Review recovery lock changed');
    await unlink(lockPath);
    return {status:'passed',evidence:[],reasons:[already?'review-already-committed':`review-recovery-${request.decision}`]};
  } finally { await recovery.close(); await unlink(recoveryPath); }
}

export async function listCandidates(root, { taskId, projectId }) {
  if (!nonempty(projectId)) throw new TypeError('Candidate listing requires project');
  const directory = await candidateDirectory(root, taskId);
  const files = await readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return [];
  });
  const candidates = [];
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!file.isFile() || !/^[a-f0-9]{64}\.json$/.test(file.name)) continue;
    let candidate = validateCandidate(JSON.parse(await readFile(await assertContained(root, path.join(directory, file.name)), 'utf8')));
    if (candidate.projectId !== projectId) continue;
    if (candidate.sourceTask !== taskId || file.name !== `${candidate.id}.json`) throw new Error('Candidate source task mismatch');
    const reviewDirectory = await assertContained(root, path.join(directory, `${candidate.id}.reviews`));
    const events = await readdir(reviewDirectory, { withFileTypes: true }).catch(error => { if (error.code !== 'ENOENT') throw error; return []; });
    const reviews = [];
    for (const event of events) {
      if (!event.isFile() || !/^[a-f0-9]{64}\.json$/.test(event.name)) continue;
      const review = JSON.parse(await readFile(await assertContained(root, path.join(reviewDirectory, event.name)), 'utf8'));
      if (event.name !== `${hash(JSON.stringify(review))}.json`) throw new Error('Review event integrity mismatch');
      reviews.push(review);
    }
    for (const review of reviews.sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt)))
      candidate = reviewLesson(candidate, review, { trustedCoordinator: true });
    candidates.push(candidate);
  }
  return candidates;
}

async function authorizeDestination(candidate, target) {
  if (!object(target) || typeof target.root !== 'string' || !path.isAbsolute(target.root) || !safeRelative(target.path)
    || !target.path.endsWith('.md')) throw new TypeError('Promotion destination must be a relative Markdown path under an explicit root');
  if (candidate.projectId !== target.projectId) throw new Error('Destination project differs from candidate');
  const location = normalize(target.path);
  const context = target.context ?? {}, resolution = context.resolution ?? {};
  const instructions = context.instructions ?? [], read = new Set(resolution.readInstructions ?? []);
  if (instructions.some(item => !read.has(item.path))) throw new Error('Read and resolve applicable instructions before promotion');
  const declared = resolution.knowledgePaths ?? target.config?.knowledge?.paths ?? [];
  const external = Boolean(target.config?.knowledge || resolution.externalKnowledge || declared.length || resolution.discovery?.length);
  const promotion = resolution.promotion;
  if (instructions.length && (!promotion || !strings(promotion.instructionPaths) || !promotion.instructionPaths.length
    || promotion.instructionPaths.some(ref => !read.has(ref) || !instructions.some(item => item.path === ref))))
    throw new Error('Destination requires agent-resolved instruction provenance');
  if (external) {
    if (!promotion || promotion.kind !== 'vault' || !strings(promotion.paths) || !promotion.paths.length
      || !promotion.paths.every(safeRelative) || !strings(promotion.instructionPaths) || !promotion.instructionPaths.length
      || promotion.instructionPaths.some(ref => !read.has(ref) || !instructions.some(item => item.path === ref)))
      throw new Error('Authoritative destination requires agent-resolved read instruction provenance');
    if (!declared.length || !declared.every(safeRelative) || !declared.some(scope => within(location, normalize(scope)))
      || !promotion.paths.some(scope => within(location, normalize(scope)))) throw new Error('Destination is outside instructed authoritative knowledge');
    if (within(location, '.pegatus/memory')) throw new Error('Authoritative knowledge cannot create competing fallback memory');
    if (!Array.isArray(promotion.generatedPaths) || !promotion.generatedPaths.every(safeRelative))
      throw new Error('Destination resolution must declare generated paths');
    if (promotion.generatedPaths.some(scope => within(location, normalize(scope)))) throw new Error('Generated destination must use its owning tool');
  } else if ((instructions.length && promotion.kind !== 'fallback') || !within(location, '.pegatus/memory') || location.split('/').some(part => ['candidates', 'lessons'].includes(part))) {
    throw new Error('Fallback destination must be approved memory outside candidate directories');
  }
  return assertContained(target.root, path.resolve(target.root, location));
}

/** Write receives {root,path,content,metadata,mode:'create-only'}. An instructed
 * vault writer must honor exclusive creation and its owning tool's procedures,
 * returning {status:'passed', evidence: nonemptyReferences[]} as its receipt.
 * Default writing preserves all existing Markdown and metadata files.
 */
export async function promoteLesson(candidate, { approval, target, write, trustedCoordinator = false, validateCatalog } = {}) {
  const reviewed = reviewLesson(candidate, approval, { trustedCoordinator });
  if (approval.decision !== 'approve') throw new Error('Promotion requires approve decision');
  if (normalize(approval.destination) !== normalize(target?.path ?? '')) throw new Error('Approval destination mismatch');
  if (candidate.duplicateOf) throw new Error('Duplicate claim must be reviewed against existing knowledge before promotion');
  const file = await authorizeDestination(candidate, target);
  if (within(normalize(target.path), '.pegatus/memory')) {
    const known = await indexMemory({ root: target.root, projectId: candidate.projectId });
    if (known.entries.some(entry => entry.dedupKey === candidate.dedupKey)) throw new Error('Duplicate approved knowledge claim');
  }
  let validation;
  if (candidate.kind !== 'lesson') {
    if (typeof validateCatalog !== 'function') throw new Error('Reusable proposals require catalog validation');
    validation = await validateCatalog({ candidate: structuredClone(candidate), target: structuredClone(target) });
    if (validation?.schemaVersion !== 1 || validation.status !== 'passed' || validation.candidateHash !== candidate.contentHash
      || !strings(validation.evidence) || !validation.evidence.length) throw new Error('Catalog validation failed or does not bind proposal');
  }
  await absent(file);
  await absent(await assertContained(target.root, `${file}.json`));
  const content = `# ${candidate.title}\n\n${candidate.content}\n`;
  const metadata = { schemaVersion: 1, id: candidate.id, kind: candidate.kind === 'lesson' ? 'approved-knowledge' : `${candidate.kind}-proposal`,
    projectId: candidate.projectId, paths: candidate.paths, keywords: candidate.keywords, approvalState: 'approved',
    status: 'approved', active: false, sourceTask: candidate.sourceTask, evidence: candidate.evidence.map(item => item.path),
    freshness: candidate.freshness, dedupKey: candidate.dedupKey, candidateHash: candidate.contentHash,
    documentHash: hash(content), reviews: reviewed.reviews,
    ...(validation ? { catalogValidation: validation } : {}) };
  const request = { root: target.root, path: file, content, metadata, mode: 'create-only' };
  if (write) {
    const receipt = await write(request);
    if (receipt?.status !== 'passed' || !strings(receipt.evidence) || !receipt.evidence.length)
      throw new Error('Knowledge writer did not return a successful evidence receipt');
  }
  else {
    // Content first: a failed metadata write leaves an unindexed authored file
    // for explicit recovery. It cannot become approved fallback knowledge.
    await exclusive(target.root, file, content);
    await exclusive(target.root, `${file}.json`, JSON.stringify(metadata, null, 2) + '\n');
  }
  return { status: 'passed', evidence: metadata.evidence, reasons: [], candidate: reviewed, entry: { ...metadata, path: file } };
}

/** Explicit supersede/retire updates only owned metadata. The authored document
 * remains intact; changed claims require a fresh proposal at a new destination.
 */
export async function retireLesson(candidate, { review, target, trustedCoordinator = false } = {}) {
  const reviewed = reviewLesson(candidate, review, { trustedCoordinator });
  if (!['supersede', 'retire'].includes(review.decision)) throw new Error('Retirement requires supersede or retire review');
  if (normalize(review.destination) !== normalize(target?.path ?? '')) throw new Error('Review destination mismatch');
  const file = await authorizeDestination(candidate, target), metadataPath = await assertContained(target.root, `${file}.json`);
  const lockPath = await assertContained(target.root, `${metadataPath}.lock`);
  const lock = await open(lockPath, 'wx');
  let temporary;
  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    if (metadata.candidateHash !== candidate.contentHash || metadata.projectId !== candidate.projectId
      || metadata.documentHash !== hash(await readFile(file)) || ['superseded', 'retired'].includes(metadata.status))
      throw new Error('Knowledge changed or is already retired; review source before retirement');
    const next = { ...metadata, status: reviewed.status, reviews: [...(metadata.reviews ?? []), reviewed.reviews.at(-1)] };
    temporary = `${metadataPath}.${randomUUID()}.tmp`;
    await exclusive(target.root, temporary, JSON.stringify(next, null, 2) + '\n');
    await rename(temporary, metadataPath);
    temporary = null;
    return { status: 'passed', evidence: next.evidence, reasons: [], candidate: reviewed, entry: { ...next, path: file } };
  } finally {
    if (temporary) await unlink(temporary).catch(() => {});
    await lock.close();
    await unlink(lockPath);
  }
}

/** Lifecycle callback factory: observations are already evidence-backed inputs.
 * Hooks never synthesize claims from conversation text or promote candidates.
 */
export function collectLearning({ root, projectId, observations = [], evidenceExclusions = [], redactions = [] }) {
  if (!nonempty(projectId) || !Array.isArray(observations)) throw new TypeError('Observation collection requires project and observation list');
  return async ({ taskId }) => {
    const existing = await listCandidates(root, { taskId, projectId });
    const collected = [];
    for (const observation of observations) {
      if (observation.projectId !== projectId || observation.sourceTask !== taskId) throw new Error('Observation crosses project or task scope');
      const candidate = proposeLesson({ ...observation,
        evidenceExclusions: [...evidenceExclusions, ...(observation.evidenceExclusions ?? [])],
        redactions: [...redactions, ...(observation.redactions ?? [])] }, { existing });
      if (candidate.duplicateOf) continue;
      collected.push(await saveCandidate(root, candidate));
      existing.push(candidate);
    }
    return collected;
  };
}
