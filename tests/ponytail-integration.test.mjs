import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadCatalog, selectSkills, selectResources } from '../src/catalog/manifest.mjs';
import { lintCatalog } from '../src/catalog/lint.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';
import { buildHandoff } from '../src/orchestration/handoff.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = await loadCatalog(root);
const guide = 'catalog/skills/pegatus-execute/skill-evidence-guide.md';
const raw = 'vendor/ponytail/skills/ponytail/SKILL.md';
const license = 'vendor/ponytail/LICENSE';
const expected = {
  LICENSE: 'sha256:fb1bc6909ac3ef82d5c22106e32ef682b0cff66788fa915fb9b53b15c9d2f3ab',
  'skills/ponytail/SKILL.md': 'sha256:9badd22a32e19cb884e46dfa8d3aae82bb81dfa5484105b8b4f0262df823a509',
};
const consumers = ['pegatus-start', 'pegatus-design', 'pegatus-plan', 'pegatus-execute',
  'pegatus-review', 'pegatus-review-feedback', 'pegatus-verify', 'pegatus-resume',
  'code-reviewer', 'verifier', 'build-test-repairer'];
const links = (file, bytes) => [...bytes.toString().replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '')
  .replace(/`[^`\n]+`/g, '').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
  .map(match => match[1].split('#')[0]).filter(ref => ref && !/^[a-z]+:/i.test(ref))
  .map(ref => path.posix.normalize(path.posix.join(path.posix.dirname(file), ref)));

test('ponytail source retains exact core bytes and MIT notice', () => {
  const source = catalog.sourceLock.sources.find(item => item.id === 'ponytail');
  assert.ok(source, 'pinned source');
  assert.equal(source.revision, '96608e078b2d5ea607c5c3b8b5a54d1c1fba6846');
  assert.equal(source.repository, 'https://github.com/dietrichgebert/ponytail');
  assert.equal(source.license, 'MIT');
  assert.deepEqual([...source.paths].sort(), Object.keys(expected).sort());
  assert.deepEqual(source.contentHashes, expected);
  for (const [file, hash] of Object.entries(expected)) {
    const target = `vendor/ponytail/${file}`;
    assert.equal(`sha256:${createHash('sha256').update(catalog.files[target]).digest('hex')}`, hash);
    assert.ok(catalog.vendoredFiles.some(item => item.path === target && item.sourceId === 'ponytail' && item.sourcePath === file));
  }
  assert.match(catalog.files[license].toString(), /Copyright \(c\) 2026 DietrichGebert/);
  assert.match(catalog.files[license].toString(), /Permission is hereby granted, free of charge/);
  const altered = {...catalog, documents: {...catalog.documents, [raw]: catalog.documents[raw] + '\nchanged'}};
  assert.ok(lintCatalog(altered).some(item => item.code === 'source-hash-mismatch' && item.location === raw));
});

test('all host scopes retain reachable evidence guidance and passive upstream resources', () => {
  const entries = consumers.map(id => [...catalog.skills, ...catalog.agents].find(item => item.id === id));
  for (const entry of entries) {
    const resources = selectResources(entry, {task: 'execute'});
    for (const ref of [guide, raw, license]) assert.ok(resources.includes(ref), `${entry.id}: ${ref}`);
    assert.ok(links(entry.path, catalog.files[entry.path]).includes(guide), `${entry.id}: linked guide`);
  }
  assert.ok(![...catalog.skills, ...catalog.agents, ...catalog.commands].some(item => /ponytail/.test(item.id)));
  assert.equal(catalog.skills.length, 57);
  assert.equal(catalog.agents.length, 9);
  assert.equal(catalog.commands.length, 20);
  for (const host of ['claude', 'codex', 'antigravity']) for (const scope of ['project', 'user']) {
    const generated = generateHost(catalog, {host, scope, root});
    const files = new Map(generated.operations.map(op => [op.relativePath, Buffer.from(op.content)]));
    const prefix = `.pegatus/runtime/${host}/`;
    for (const ref of [guide, raw, license]) assert.deepEqual(files.get(prefix + ref), catalog.files[ref]);
    for (const file of [guide, ...entries.map(entry => entry.path)]) {
      for (const target of links(prefix + file, files.get(prefix + file))) assert.ok(files.has(target), `${host}/${scope}: ${target}`);
    }
    assert.ok(!generated.operations.some(op => !op.relativePath.startsWith('.pegatus/') && /ponytail/.test(op.relativePath)));
  }
});

test('handoff carries evidence references without changing state contracts', () => {
  const target = {stack: 'dotnet', framework: '.net', version: 10, testFramework: 'xunit', task: 'test-generation'};
  const skill = selectSkills(catalog, target).find(item => item.id === 'dotnet-code-testing');
  assert.ok(skill);
  assert.ok(!selectSkills(catalog, {...target, stack: 'react'}).some(item => item.id === skill.id));
  const execute = catalog.skills.find(item => item.id === 'pegatus-execute');
  const resources = [...new Set([execute, skill, ...skill.dependencies.map(id => catalog.skills.find(item => item.id === id))]
    .flatMap(item => selectResources(item, target)))];
  const record = '.pegatus/work/feature/evidence/skill-use.md';
  const context = {instructionPaths: ['AGENTS.md'], resolution: {readInstructions: ['AGENTS.md']},
    approvedScopeHash: 'approved-feature', approvals: [{kind: 'design', scopeHash: 'approved-feature', evidence: 'chat:approval'}],
    resources, evidenceRefs: [record]};
  const task = {id: 'tests', scope: 'Approved regression', paths: ['tests/FeatureTests.cs'], dependsOn: [], checks: ['target-unit']};
  const result = buildHandoff(task, context);
  assert.equal(result.status, 'passed');
  assert.equal(result.schemaVersion, 1);
  const refs = result.contextManifest.dynamic;
  assert.ok(refs.some(item => item.kind === 'evidence' && item.ref === record));
  for (const ref of [guide, raw, license, 'catalog/stack-overlays/dotnet-code-testing.md']) {
    assert.ok(refs.some(item => item.kind === 'resource' && item.ref === ref), ref);
  }
  assert.equal(buildHandoff(task, {...context, tokenControls: {maxContextRefs: 1}}).status, 'blocked');
  assert.deepEqual(lintCatalog(catalog).filter(item => item.severity === 'error'), []);
});
