import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { indexMemory, selectMemory } from '../src/memory/index.mjs';
import { dispatchEvent } from '../src/hooks/dispatch.mjs';
import { saveProgress, loadProgress } from '../src/state/store.mjs';
import { loadCatalog } from '../src/catalog/manifest.mjs';

const learning = await import('../src/memory/learning.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const { proposeLesson, saveCandidate, listCandidates, reviewLesson, recordReview, promoteLesson, retireLesson, collectLearning, validateReusableProposal } = learning;
const input = (extra = {}) => ({ projectId: 'project-a', sourceTask: 'TASK-1', title: 'Contact transaction',
  content: 'Commit contact changes in one transaction.', paths: ['src/'], keywords: ['contact'],
  evidence: [{ path: '.pegatus/work/TASK-1/evidence/unit.json', outcome: 'passed' }],
  freshness: { status: 'current', branch: 'main' }, ...extra });
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-learning-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const target = root => ({ root, projectId: 'project-a', path: '.pegatus/memory/contact.md',
  config: { knowledge: null }, context: { instructions: [], resolution: { readInstructions: [] } } });
const approval = (candidate, destination, extra = {}) => ({ schemaVersion: 1, decision: 'approve',
  candidateId: candidate.id, candidateHash: candidate.contentHash, destination: destination.path,
  projectId: candidate.projectId, userEvidence: 'conversation:user:approve-contact',
  reviewedBy: 'human-user', reviewedAt: '2026-10-13T00:00:00.000Z', ...extra });
const promote = (candidate, destination, extra = {}) => promoteLesson(candidate, {
  target: destination, approval: approval(candidate, destination), trustedCoordinator: true, ...extra,
});

test('learning proposal is available and never grants authority', () => {
  assert.equal(typeof proposeLesson, 'function');
  const candidate = proposeLesson(input({ approvalState: 'approved', active: true }));
  assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.approvalState, 'candidate');
  assert.equal(candidate.active, false);
  assert.equal(candidate.status, 'proposed');
});

test('proposal requires scoped outcome evidence and drops excluded references and redacts content', () => {
  assert.throws(() => proposeLesson(input({ evidence: [] })), /evidence/i);
  assert.throws(() => proposeLesson(input({ paths: ['../other'] })), /scope/i);
  assert.throws(() => proposeLesson(input({ evidence: [{ path: 'unit.json', outcome: 'unknown' }] })), /evidence/i);
  const candidate = proposeLesson(input({ content: 'Use token=top-secret and password: hidden-value.',
    evidence: [...input().evidence, { path: 'private/secrets.json', outcome: 'failed' }],
    evidenceExclusions: ['private/**'], redactions: ['top-secret'] }));
  assert.doesNotMatch(JSON.stringify(candidate), /top-secret|hidden-value|private\/secrets/);
  assert.equal(candidate.evidence.length, 1);
  assert.equal(candidate.redacted, true);
  assert.throws(() => proposeLesson(input({ evidenceExclusions: ['**'] })), /evidence/i);
});

test('deduplication compares approved knowledge in the same project and scope only', () => {
  const existing = proposeLesson(input());
  const duplicate = proposeLesson(input({ sourceTask: 'TASK-2' }), { existing: [{ ...existing, approvalState: 'approved' }] });
  assert.equal(duplicate.duplicateOf, existing.id);
  assert.equal(proposeLesson(input(), { existing: [{ ...existing, projectId: 'other' }] }).duplicateOf, null);
  assert.equal(proposeLesson(input({ paths: ['backend'] }), { existing: [existing] }).duplicateOf, null);
});

test('candidate storage deduplicates observations and stays outside fallback index', async t => {
  const root = await fixture(t);
  const candidate = proposeLesson(input());
  await saveCandidate(root, candidate);
  const again = await saveCandidate(root, candidate);
  assert.equal(again.contentHash, candidate.contentHash);
  assert.equal((await listCandidates(root, { taskId: 'TASK-1', projectId: 'project-a' })).length, 1);
  assert.deepEqual(await listCandidates(root, { taskId: 'TASK-1', projectId: 'other' }), []);
  assert.deepEqual((await indexMemory({ root, projectId: 'project-a' })).entries, []);
});

test('unapproved or self-approved candidate cannot write durable knowledge', async t => {
  const root = await fixture(t), destination = target(root), candidate = proposeLesson(input());
  const writes = [], write = async request => writes.push(request);
  await assert.rejects(promoteLesson(candidate, { approval: null, target: destination, write, trustedCoordinator: true }), /approval/i);
  await assert.rejects(promote(candidate, destination, { trustedCoordinator: false, write }), /coordinator/i);
  await assert.rejects(promote(candidate, destination, { approval: approval(candidate, destination, { userEvidence: '' }), write }), /user evidence/i);
  assert.equal(writes.length, 0);
});

test('review binds approval to exact content, project and destination', async t => {
  const root = await fixture(t), destination = target(root), candidate = proposeLesson(input());
  for (const altered of [{ content: 'Changed claim' }, { projectId: 'project-b' }]) {
    await assert.rejects(promote({ ...candidate, ...altered }, destination), /candidate|project/i);
  }
  await assert.rejects(promote(candidate, destination, {
    approval: approval(candidate, destination, { candidateHash: 'wrong' }),
  }), /approval/i);
  await assert.rejects(promote(candidate, destination, {
    approval: approval(candidate, destination, { destination: '.pegatus/memory/other.md' }),
  }), /destination/i);
  await assert.rejects(promote(candidate, { ...destination, projectId: 'other' }), /project/i);
});

test('fallback promotion creates approved sidecars usable by scoped and stale retrieval', async t => {
  const root = await fixture(t), candidate = proposeLesson(input({ freshness: { status: 'stale', branch: 'main' } }));
  const result = await promote(candidate, target(root));
  assert.equal(result.status, 'passed');
  const index = await indexMemory({ root, projectId: 'project-a' });
  assert.equal(index.entries.length, 1);
  assert.equal(index.entries[0].schemaVersion, 1);
  assert.equal(index.entries[0].sourceTask, 'TASK-1');
  assert.deepEqual(index.entries[0].evidence, ['.pegatus/work/TASK-1/evidence/unit.json']);
  const selected = selectMemory(index.entries, { projectId: 'project-a', paths: ['src/a.mjs'], query: 'contact', branch: 'feature' });
  assert.equal(selected[0].requiresSourceConfirmation, true);
  assert.deepEqual(selectMemory(index.entries, { projectId: 'project-b', paths: ['src/a.mjs'], query: 'contact' }), []);
});

test('vault promotion requires read instruction provenance and creates no competing memory', async t => {
  const root = await fixture(t), candidate = proposeLesson(input());
  const instruction = path.join(root, 'AGENTS.md');
  await writeFile(instruction, 'Knowledge belongs to .vault.');
  const destination = { root, projectId: 'project-a', path: '.vault/authored/contact.md',
    config: { knowledge: { paths: ['.vault'] } }, context: {
      instructions: [{ path: instruction }], resolution: { readInstructions: [instruction],
        promotion: { kind: 'vault', paths: ['.vault/authored'], instructionPaths: [instruction], generatedPaths: ['.vault/maps'] } },
    } };
  await assert.rejects(promote(candidate, { ...target(root), config: destination.config }), /authoritative|instruction/i);
  await assert.rejects(promote(candidate, { ...destination, context: { instructions: [{ path: instruction }], resolution: { readInstructions: [] } } }), /instruction/i);
  const result = await promote(candidate, destination);
  assert.equal(result.status, 'passed');
  assert.match(await readFile(path.join(root, destination.path), 'utf8'), /Commit contact/);
  assert.deepEqual((await indexMemory({ root, projectId: 'project-a' })).entries, []);
  await assert.rejects(promote(candidate, { ...destination, path: '.vault/maps/contact.md' }), /generated|destination/i);
});

test('promotion preserves existing authored files and prevents candidate-directory destinations', async t => {
  const root = await fixture(t), destination = target(root), candidate = proposeLesson(input());
  await mkdir(path.dirname(path.join(root, destination.path)), { recursive: true });
  await writeFile(path.join(root, destination.path), 'user edit');
  await assert.rejects(promote(candidate, destination), /exist/i);
  assert.equal(await readFile(path.join(root, destination.path), 'utf8'), 'user edit');
  for (const file of ['.pegatus/memory/candidates/a.md', '.pegatus/memory/lessons/a.md', '../other.md', 'C:\\outside.md']) {
    await assert.rejects(promote(candidate, { ...destination, path: file }), /destination|relative|scope/i);
  }
});

test('reject and supersede reviews preserve immutable history and cannot revive rejected candidates', async t => {
  const root = await fixture(t), candidate = proposeLesson(input()), destination = target(root);
  const rejected = reviewLesson(candidate, { ...approval(candidate, destination), decision: 'reject', reason: 'Insufficient generality' }, { trustedCoordinator: true });
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.reviews.length, 1);
  assert.equal(candidate.status, 'proposed');
  await assert.rejects(promote(rejected, destination), /rejected/i);
  assert.throws(() => reviewLesson(candidate, { ...approval(candidate, destination), decision: 'supersede' }, { trustedCoordinator: true }), /replacement/i);
  const superseded = reviewLesson(candidate, { ...approval(candidate, destination), decision: 'supersede', replacementId: 'replacement-claim' }, { trustedCoordinator: true });
  assert.equal(superseded.status, 'superseded');
  assert.equal(superseded.reviews[0].replacementId, 'replacement-claim');
});

test('skill and rule proposals stay inactive and need matching catalog validation to be reviewed', async t => {
  const root = await fixture(t), destination = target(root);
  for (const kind of ['skill', 'rule']) {
    const candidate = proposeLesson(input({ kind }));
    await assert.rejects(promote(candidate, destination), /catalog/i);
    await assert.rejects(promote(candidate, destination, { validateCatalog: async () => ({ status: 'failed' }) }), /catalog/i);
    const result = await promote(candidate, { ...destination, path: `.pegatus/memory/${kind}.md` }, {
      validateCatalog: async ({ candidate: checked }) => ({ schemaVersion: 1, status: 'passed', candidateHash: checked.contentHash, evidence: ['catalog-lint.txt'] }),
    });
    assert.equal(result.entry.active, false);
    assert.deepEqual((await indexMemory({ root, projectId: 'project-a' })).entries, []);
  }
});

test('lifecycle observation callback stores only scoped candidates and never promotes', async t => {
  const root = await fixture(t);
  await saveProgress(root, { schemaVersion: 1, taskId: 'TASK-1', revision: 0, classification: 'small', phase: 'implement',
    approvedScopeHash: null, approvals: [], tasks: [], repos: [], context: {}, verification: {}, nextAction: 'verify' }, { expectedRevision: 0 });
  const event = { root, taskId: 'TASK-1', id: 'compact-1', type: 'pre-compact' };
  const callback = collectLearning({ root, projectId: 'project-a', observations: [input()], evidenceExclusions: [] });
  assert.equal((await dispatchEvent(event, { collectLearning: callback })).status, 'passed');
  assert.equal((await dispatchEvent(event, { collectLearning: callback })).status, 'skipped');
  assert.equal((await listCandidates(root, { taskId: 'TASK-1', projectId: 'project-a' })).length, 1);
  assert.deepEqual((await indexMemory({ root, projectId: 'project-a' })).entries, []);
  assert.equal((await loadProgress(root, 'TASK-1')).revision, 2);
});

const cli = fileURLToPath(new URL('../bin/pegatus.mjs', import.meta.url));
const invoke = (root, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
test('learn CLI proposes lists reviews rejects and promotes with explicit review input', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'observation.json'), JSON.stringify(input()));
  const proposed = invoke(root, 'learn', 'propose', '--root', '.', '--file', 'observation.json');
  assert.equal(proposed.status, 0, proposed.stderr);
  const candidate = JSON.parse(proposed.stdout).candidate;
  const listed = invoke(root, 'learn', 'list', '--root', '.', '--task', 'TASK-1', '--project', 'project-a');
  assert.equal(JSON.parse(listed.stdout).candidates.length, 1);
  const reviewed = invoke(root, 'learn', 'review', '--root', '.', '--task', 'TASK-1', '--project', 'project-a', '--candidate', candidate.id);
  assert.equal(JSON.parse(reviewed.stdout).candidate.approvalState, 'candidate');
  const destination = target(root);
  await writeFile(path.join(root, 'review.json'), JSON.stringify(approval(candidate, destination)));
  await writeFile(path.join(root, 'destination.json'), JSON.stringify({ ...destination, root: undefined }));
  const promoted = invoke(root, 'learn', 'approve', '--root', '.', '--task', 'TASK-1', '--project', 'project-a', '--candidate', candidate.id,
    '--review-file', 'review.json', '--target-file', 'destination.json');
  assert.equal(promoted.status, 0, promoted.stderr);
  const memory = invoke(root, 'memory', '--root', '.', '--project', 'project-a', '--path', 'src/a.mjs', '--query', 'contact', '--branch', 'main');
  assert.equal(memory.status, 0, memory.stderr);
  assert.equal(JSON.parse(memory.stdout).entries.length, 1);
  assert.equal(JSON.parse(invoke(root, 'learn', 'list', '--root', '.', '--task', 'TASK-1', '--project', 'project-a').stdout).candidates[0].status, 'approved');
});

test('memory CLI honors instructed knowledge ownership instead of exposing fallback', async t => {
  const root = await fixture(t);
  await promote(proposeLesson(input()), target(root));
  await mkdir(path.join(root, '.pegatus'), { recursive: true });
  await writeFile(path.join(root, '.pegatus/config.json'), JSON.stringify({ knowledge: { paths: ['.vault'] } }));
  const memory = invoke(root, 'memory', '--root', '.', '--project', 'project-a', '--path', 'src/a.mjs', '--query', 'contact');
  assert.equal(memory.status, 3, memory.stderr);
  assert.equal(JSON.parse(memory.stdout).entries.length, 0);
  assert.match(JSON.parse(memory.stdout).reasons.join(), /authoritative/);
});

test('superseding approved fallback knowledge retains content and retires it from retrieval', async t => {
  const root = await fixture(t), candidate = proposeLesson(input()), destination = target(root);
  const promoted = await promote(candidate, destination);
  const before = await readFile(path.join(root, destination.path), 'utf8');
  const review = approval(candidate, destination, { decision: 'supersede', replacementId: 'new-reviewed-claim', reviewedAt: '2026-10-13T01:00:00.000Z' });
  const result = await retireLesson(promoted.candidate, { review, target: destination, trustedCoordinator: true });
  assert.equal(result.status, 'passed');
  assert.equal(await readFile(path.join(root, destination.path), 'utf8'), before);
  assert.deepEqual((await indexMemory({ root, projectId: 'project-a' })).entries, []);
  const metadata = JSON.parse(await readFile(path.join(root, `${destination.path}.json`), 'utf8'));
  assert.equal(metadata.reviews.length, 2);
  assert.equal(metadata.reviews[1].replacementId, 'new-reviewed-claim');
});

test('retirement preserves authored edits and rejects cross-project and unapproved requests', async t => {
  const root = await fixture(t), candidate = proposeLesson(input()), destination = target(root);
  await promote(candidate, destination);
  const review = approval(candidate, destination, { decision: 'retire', reason: 'Outdated claim' });
  await assert.rejects(retireLesson(candidate, { review, target: destination }), /coordinator/i);
  await assert.rejects(retireLesson(candidate, { review, target: { ...destination, projectId: 'other' }, trustedCoordinator: true }), /project/i);
  await writeFile(path.join(root, destination.path), 'edited knowledge');
  await assert.rejects(retireLesson(candidate, { review, target: destination, trustedCoordinator: true }), /changed/i);
  assert.equal(JSON.parse(await readFile(path.join(root, `${destination.path}.json`), 'utf8')).status, 'approved');
});

test('CLI lifecycle observation collection respects project exclusions and does not store raw envelope', async t => {
  const root = await fixture(t);
  await saveProgress(root, { schemaVersion: 1, taskId: 'TASK-1', revision: 0, classification: 'small', phase: 'implement',
    approvedScopeHash: null, approvals: [], tasks: [], repos: [], context: {}, verification: {}, nextAction: 'verify' }, { expectedRevision: 0 });
  await writeFile(path.join(root, '.pegatus/config.json'), JSON.stringify({ evidenceExclusions: ['private/**'] }));
  await writeFile(path.join(root, 'observations.json'), JSON.stringify({ projectId: 'project-a', observations: [input({
    content: 'Use token=private-value in contact tests.', evidence: [...input().evidence, { path: 'private/secret.json', outcome: 'failed' }],
  })] }));
  const result = invoke(root, 'lifecycle', '--root', '.', '--task', 'TASK-1', '--event-id', 'end-1', '--type', 'session-end', '--learning-file', 'observations.json');
  assert.equal(result.status, 0, result.stderr);
  const candidates = await listCandidates(root, { taskId: 'TASK-1', projectId: 'project-a' });
  assert.equal(candidates.length, 1);
  assert.doesNotMatch(JSON.stringify(candidates), /private-value|private\/secret/);
  assert.deepEqual((await indexMemory({ root, projectId: 'project-a' })).entries, []);
});

test('promotion deduplicates against already approved scoped fallback knowledge', async t => {
  const root = await fixture(t);
  await promote(proposeLesson(input()), target(root));
  const again = proposeLesson(input({ sourceTask: 'TASK-2' }));
  await assert.rejects(promote(again, { ...target(root), path: '.pegatus/memory/duplicate.md' }), /duplicate/i);
  assert.equal((await indexMemory({ root, projectId: 'project-a' })).entries.length, 1);
});

test('discovered instructions require explicit fallback destination resolution', async t => {
  const root = await fixture(t), instruction = path.join(root, 'AGENTS.md');
  await writeFile(instruction, 'Use local approved fallback knowledge.');
  const candidate = proposeLesson(input());
  const destination = { ...target(root), context: { instructions: [{ path: instruction }], resolution: { readInstructions: [instruction] } } };
  await assert.rejects(promote(candidate, destination), /resolution|instruction/i);
  destination.context.resolution.promotion = { kind: 'fallback', instructionPaths: [instruction] };
  assert.equal((await promote(candidate, destination)).status, 'passed');
});

test('promotion cannot follow a destination symlink outside the declared project', async t => {
  const root = await fixture(t), outside = await fixture(t), candidate = proposeLesson(input());
  await mkdir(path.join(root, '.pegatus'), { recursive: true });
  await symlink(outside, path.join(root, '.pegatus/memory'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(promote(candidate, target(root)), /outside root/i);
  await assert.rejects(readFile(path.join(outside, 'contact.md')), { code: 'ENOENT' });
});

test('an existing metadata sidecar prevents any authored content write', async t => {
  const root = await fixture(t), destination = target(root), candidate = proposeLesson(input());
  await mkdir(path.join(root, '.pegatus/memory'), { recursive: true });
  await writeFile(path.join(root, `${destination.path}.json`), 'user metadata');
  await assert.rejects(promote(candidate, destination), /exist/i);
  await assert.rejects(readFile(path.join(root, destination.path)), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(root, `${destination.path}.json`), 'utf8'), 'user metadata');
});

test('candidate identity validation rejects a forged deduplication key', async t => {
  const root = await fixture(t), candidate = proposeLesson(input());
  await assert.rejects(promote({ ...candidate, dedupKey: 'forged' }, target(root)), /candidate|dedup/i);
});

test('learn CLI rejection records survive listing and refuse later promotion', async t => {
  const root = await fixture(t), candidate = proposeLesson(input()), destination = target(root);
  await saveCandidate(root, candidate);
  const reject = approval(candidate, destination, { decision: 'reject', reason: 'Not generally applicable' });
  await writeFile(path.join(root, 'review.json'), JSON.stringify(reject));
  const rejected = invoke(root, 'learn', 'reject', '--root', '.', '--task', 'TASK-1', '--project', 'project-a', '--candidate', candidate.id, '--review-file', 'review.json');
  assert.equal(rejected.status, 0, rejected.stderr);
  const listed = await listCandidates(root, { taskId: 'TASK-1', projectId: 'project-a' });
  assert.equal(listed[0].status, 'rejected');
  assert.equal(listed[0].reviews[0].reason, 'Not generally applicable');
  await assert.rejects(promote(listed[0], destination), /rejected/i);
});

test('memory CLI blocks unresolved solution instructions even without configured vault', async t => {
  const root = await fixture(t);
  await promote(proposeLesson(input()), target(root));
  await writeFile(path.join(root, 'AGENTS.md'), 'This solution keeps knowledge in .vault.');
  const unresolved = invoke(root, 'memory', '--root', '.', '--project', 'project-a', '--path', 'src/a.mjs', '--query', 'contact');
  assert.equal(unresolved.status, 3, unresolved.stderr);
  assert.equal(JSON.parse(unresolved.stdout).entries.length, 0);
  assert.match(JSON.parse(unresolved.stdout).reasons.join(), /instruction/i);
});

test('failed instructed writer cannot report a successful knowledge promotion', async t => {
  const root = await fixture(t), candidate = proposeLesson(input());
  await assert.rejects(promote(candidate, target(root), { write: async () => ({ status: 'failed', evidence: [], reasons: ['tool-failed'] }) }), /writer/i);
  assert.deepEqual((await indexMemory({ root, projectId: 'project-a' })).entries, []);
});

test('approved knowledge cannot be rejected without explicit retirement', async t => {
  const root = await fixture(t), candidate = proposeLesson(input()), destination = target(root);
  const promoted = await promote(candidate, destination);
  assert.throws(() => reviewLesson(promoted.candidate, approval(candidate, destination, {
    decision: 'reject', reason: 'Now outdated', reviewedAt: '2026-10-13T01:00:00.000Z',
  }), { trustedCoordinator: true }), /retire|supersede/i);
});

test('review events require increasing chronology to preserve traceable decisions', () => {
  const candidate = proposeLesson(input()), destination = { path: '.pegatus/memory/contact.md' };
  const approved = reviewLesson(candidate, approval(candidate, destination), { trustedCoordinator: true });
  assert.throws(() => reviewLesson(approved, approval(candidate, destination, {
    decision: 'retire', reason: 'Old claim', reviewedAt: '2026-10-12T00:00:00.000Z',
  }), { trustedCoordinator: true }), /chronology|later/i);
});

test('reusable validation requires the actual proposal in a valid catalog', async () => {
  const catalog = await loadCatalog(fileURLToPath(new URL('../', import.meta.url)));
  const missing = proposeLesson(input({ kind: 'skill' }));
  assert.equal(validateReusableProposal(missing, catalog).status, 'blocked');
  const asset = catalog.skills[0];
  const present = proposeLesson(input({ kind: 'skill', content: catalog.documents[asset.path] }));
  assert.equal(validateReusableProposal(present, catalog).status, 'passed');
  assert.equal(validateReusableProposal(present, { ...catalog, schemaVersion: 2 }).status, 'failed');
});

test('mixed-case explicit secret is redacted before keyword normalization and persistence', async t => {
  const root = await fixture(t), destination = target(root);
  const candidate = proposeLesson(input({ keywords: ['Contact', 'MiXeDSecret'], redactions: ['MiXeDSecret'] }));
  assert.equal(candidate.redacted, true);
  assert.doesNotMatch(JSON.stringify(candidate), /mixedsecret/i);
  await saveCandidate(root, candidate);
  const saved = await readFile(path.join(root, '.pegatus/work/TASK-1/lessons', `${candidate.id}.json`), 'utf8');
  assert.doesNotMatch(saved, /mixedsecret/i);
  await promote(candidate, destination);
  const metadata = await readFile(path.join(root, `${destination.path}.json`), 'utf8');
  assert.doesNotMatch(metadata, /mixedsecret/i);
  assert.deepEqual(JSON.parse(metadata).keywords, ['[redacted]', 'contact']);
});

test('persisted rejection rejects approval through a stale candidate and keeps listing usable', async t => {
  const root = await fixture(t), candidate = proposeLesson(input()), destination = target(root);
  await saveCandidate(root, candidate);
  await recordReview(root, candidate, approval(candidate, destination, {
    decision: 'reject', reason: 'Not general enough',
  }), { trustedCoordinator: true });
  await assert.rejects(recordReview(root, candidate, approval(candidate, destination, {
    reviewedAt: '2026-10-13T01:00:00.000Z',
  }), { trustedCoordinator: true }), /stale|rejected/i);
  const listed = await listCandidates(root, { taskId: 'TASK-1', projectId: 'project-a' });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].status, 'rejected');
  assert.equal(listed[0].reviews.length, 1);
  await assert.rejects(recordReview(root, listed[0], approval(candidate, destination, {
    reviewedAt: '2026-10-13T01:00:00.000Z',
  }), { trustedCoordinator: true }), /rejected/i);
});

test('persisted approval requires current history for retirement and preserves review chronology', async t => {
  const root = await fixture(t), candidate = proposeLesson(input()), destination = target(root);
  await saveCandidate(root, candidate);
  await recordReview(root, candidate, approval(candidate, destination), { trustedCoordinator: true });
  const retire = approval(candidate, destination, {
    decision: 'retire', reason: 'Superseded guidance', reviewedAt: '2026-10-13T01:00:00.000Z',
  });
  await assert.rejects(recordReview(root, candidate, retire, { trustedCoordinator: true }), /stale/i);
  const [current] = await listCandidates(root, { taskId: 'TASK-1', projectId: 'project-a' });
  await assert.rejects(recordReview(root, current, { ...retire, reviewedAt: '2026-10-12T00:00:00.000Z' }, {
    trustedCoordinator: true,
  }), /chronology|later/i);
  const retired = await recordReview(root, current, retire, { trustedCoordinator: true });
  assert.equal(retired.status, 'retired');
  const listed = await listCandidates(root, { taskId: 'TASK-1', projectId: 'project-a' });
  assert.equal(listed[0].status, 'retired');
  assert.deepEqual(listed[0].reviews.map(review => review.decision), ['approve', 'retire']);
});
