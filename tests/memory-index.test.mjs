import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { indexMemory, selectMemory } from '../src/memory/index.mjs';
import { discoverInstructions } from '../src/context/instructions.mjs';
import { retrieveContext } from '../src/context/retrieve.mjs';

const approved = { projectId: 'here', paths: ['src/'], keywords: ['contact'], approvalState: 'approved', sourceTask: 'task-1', evidence: ['tests/contact.txt'], freshness: { status: 'current', branch: 'main' } };
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-memory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, '.pegatus/memory'), { recursive: true });
  return root;
}
async function entry(root, name, metadata = approved) {
  const file = path.join(root, '.pegatus/memory', name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, 'Contact convention');
  if (metadata) await writeFile(`${file}.json`, JSON.stringify(metadata));
}

test('memory never crosses project scope implicitly', () => {
  assert.deepEqual(selectMemory([{ ...approved, projectId: 'other' }], { projectId: 'here', paths: ['src/a.cs'], query: 'contact' }), []);
});

test('selection filters path boundaries, keywords, retired entries and lesson candidates', () => {
  const entries = [
    { ...approved, id: 'valid' }, { ...approved, id: 'candidate', approvalState: 'candidate' },
    { ...approved, id: 'retired', status: 'retired' }, { ...approved, id: 'other-path', paths: ['src-other/'] },
    { ...approved, id: 'other-topic', keywords: ['billing'] },
  ];
  assert.deepEqual(selectMemory(entries, { projectId: 'here', paths: ['src/a.cs'], query: 'contact flow' }).map(item => item.id), ['valid']);
});

test('approved Markdown index excludes unapproved, candidate directories and other projects', async t => {
  const root = await fixture(t);
  await entry(root, 'contact.md');
  await entry(root, 'unreviewed.md', null);
  await entry(root, 'candidate.md', { ...approved, approvalState: 'candidate' });
  await entry(root, 'lessons/fake.md');
  await entry(root, 'other.md', { ...approved, projectId: 'other' });
  const index = await indexMemory({ root, projectId: 'here' });
  assert.deepEqual(index.entries.map(item => path.basename(item.path)), ['contact.md']);
  assert.equal(index.entries[0].content, undefined);
  assert.equal(index.entries[0].sourceTask, 'task-1');
  assert.equal(index.uncertainties.length, 0);
});

test('stale and branch-sensitive memory is retained with confirmation signals', () => {
  const [selected] = selectMemory([{ ...approved, freshness: { status: 'stale', branch: 'main' } }], { projectId: 'here', paths: ['src/a.cs'], query: 'contact', branch: 'feature' });
  assert.equal(selected.requiresSourceConfirmation, true);
  assert.equal(selected.freshness.branch, 'main');
  assert.equal(selected.confirmation, 'agent-review-required');
});

test('no-vault retrieval uses only approved relevant fallback memory', async t => {
  const root = await fixture(t);
  await entry(root, 'contact.md');
  await entry(root, 'billing.md', { ...approved, keywords: ['billing'] });
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/a.cs'), 'current contact');
  const context = await discoverInstructions({ root, targetPaths: ['src/a.cs'], host: { name: 'codex', home: path.join(root, 'home') } });
  context.projectId = 'here';
  context.branch = 'feature';
  const result = await retrieveContext({ config: { knowledge: null }, context, query: 'contact', run: async () => assert.fail('no instructed query') });
  assert.equal(result.refs.length, 1);
  assert.equal(result.refs[0].requiresSourceConfirmation, true);
  assert.equal(result.refs[0].content, 'Contact convention');
  assert.equal(result.fallbackAllowed, false);
  assert.deepEqual(result.trace.map(item => item.operation), ['memory-index', 'memory-read']);
  assert.equal(path.basename(result.trace[1].path), 'contact.md');
});

test('authoritative knowledge prevents competing fallback index', async t => {
  const root = await fixture(t);
  await entry(root, 'contact.md');
  const context = await discoverInstructions({ root, targetPaths: [], host: { name: 'codex', home: path.join(root, 'home') } });
  context.projectId = 'here';
  const result = await retrieveContext({ config: { knowledge: { paths: ['.vault'] } }, context, query: 'contact', run: async () => assert.fail('no command') });
  assert.equal(result.refs.length, 1);
  assert.equal(result.refs[0].path, path.join(root, '.vault'));
  assert.ok(!result.trace.some(item => item.operation === 'memory-index'));
});

test('invalid sidecars remain visible without becoming approved memory', async t => {
  const root = await fixture(t);
  await entry(root, 'bad.md');
  await writeFile(path.join(root, '.pegatus/memory/bad.md.json'), '{broken');
  const result = await indexMemory({ root, projectId: 'here' });
  assert.deepEqual(result.entries, []);
  assert.equal(result.uncertainties[0].code, 'memory-metadata-invalid');
});

test('an absent project identity and candidate-kind entries cannot activate memory', () => {
  assert.deepEqual(selectMemory([{ ...approved, projectId: undefined }], { paths: ['src/a.cs'], query: 'contact' }), []);
  assert.deepEqual(selectMemory([{ ...approved, kind: 'lesson-candidate' }], { projectId: 'here', paths: ['src/a.cs'], query: 'contact' }), []);
});

test('approved metadata cannot index an escaping path scope', async t => {
  const root = await fixture(t);
  await entry(root, 'unsafe.md', { ...approved, paths: ['../other'] });
  const result = await indexMemory({ root, projectId: 'here' });
  assert.deepEqual(result.entries, []);
  assert.equal(result.uncertainties[0].code, 'memory-metadata-invalid');
});

test('relative dot and separator normalization retains exact project path boundaries', async t => {
  const root = await fixture(t);
  await entry(root, 'contact.md', { ...approved, paths: ['./src/'] });
  const index = await indexMemory({ root, projectId: 'here' });
  assert.deepEqual(index.uncertainties, []);
  assert.equal(selectMemory(index.entries, { projectId: 'here', paths: ['src/a.cs'], query: 'contact' }).length, 1);
  assert.equal(selectMemory(index.entries, { projectId: 'here', paths: ['.\\src\\a.cs'], query: 'contact' }).length, 1);
  assert.deepEqual(selectMemory(index.entries, { projectId: 'here', paths: ['src-other/a.cs'], query: 'contact' }), []);
  assert.deepEqual(selectMemory(index.entries, { projectId: 'here', paths: ['src/../other/a.cs'], query: 'contact' }), []);
  assert.deepEqual(selectMemory([{ ...approved, paths: ['./src/../other/'] }], { projectId: 'here', paths: ['other/a.cs'], query: 'contact' }), []);
});
