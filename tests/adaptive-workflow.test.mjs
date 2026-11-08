import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, workflowRoute, selectSkills, selectResources } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';
import { buildHandoff } from '../src/orchestration/handoff.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = await loadCatalog(root);
const guide = 'catalog/skills/pegatus-execute/execution-guide.md';
const consumers = ['pegatus-start', 'pegatus-design', 'pegatus-plan', 'pegatus-execute', 'pegatus-verify',
  'pegatus-review', 'pegatus-review-feedback', 'verifier', 'code-reviewer', 'build-test-repairer'];
const links = (file, bytes) => [...bytes.toString().matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
  .map(match => match[1].split('#')[0]).filter(ref => ref && !/^[a-z]+:/i.test(ref))
  .map(ref => path.posix.normalize(path.posix.join(path.posix.dirname(file), ref)));
const reachesProcedure = (files, file, target) => {
  // Antigravity wrappers reach the skill through the existing thin command alias.
  const direct = links(file, files.get(file));
  return direct.includes(target) || direct.some(ref => ref.includes('/catalog/commands/') &&
    files.has(ref) && links(ref, files.get(ref)).includes(target));
};

// Catches review preceding independent verification, missing final checks, and weakened approval gates.
test('feature routing brackets review with verification and retains adaptive approval gates', () => {
  for (const approved of [[], ['design'], ['scope'], ['design', 'scope']]) {
    const route = workflowRoute(catalog, {classification: 'feature', approved});
    assert.deepEqual(route.phases, ['context', 'design', 'plan', 'implement', 'verify', 'review', 'verify', 'report']);
    assert.equal(route.canImplement, approved.length === 2);
  }
  const small = workflowRoute(catalog, {classification: 'small'});
  assert.deepEqual(small.phases, ['context', 'implement', 'verify', 'report']);
  assert.deepEqual(small.artifacts, ['brief', 'progress', 'report', 'evidence']);
  assert.equal(small.canImplement, true);
  assert.equal(workflowRoute(catalog, {classification: 'investigation'}).canImplement, false);
});

// Catches a declared consumer losing the procedure or an adapter flattening/breaking resource links.
test('all host and scope packets preserve shared guide bytes and reachable consumer resources', () => {
  const entries = consumers.map(id => [...catalog.skills, ...catalog.agents].find(entry => entry.id === id));
  for (const entry of entries) {
    assert.ok(selectResources(entry, {task: 'execute'}).includes(guide), `${entry.id}: declared execution guide`);
    assert.ok(links(entry.path, catalog.files[entry.path]).includes(guide), `${entry.id}: linked execution guide`);
  }
  assert.ok(links('catalog/context-protocol.md', catalog.files['catalog/context-protocol.md']).includes(guide));
  for (const host of ['claude', 'codex', 'antigravity']) {
    for (const scope of ['project', 'user']) {
      const generated = generateHost(catalog, {host, scope, root});
      const files = new Map(generated.operations.map(op => [op.relativePath, Buffer.from(op.content)]));
      const prefix = `.pegatus/runtime/${host}/`;
      assert.deepEqual(files.get(prefix + guide), catalog.files[guide], `${host}/${scope}: guide bytes`);
      for (const entry of entries) {
        for (const resource of selectResources(entry, {task: 'execute'})) {
          assert.deepEqual(files.get(prefix + resource), catalog.files[resource], `${host}/${scope}: ${resource}`);
        }
        for (const target of links(prefix + entry.path, files.get(prefix + entry.path))) {
          assert.ok(files.has(target), `${host}/${scope}: ${entry.id} -> ${target}`);
        }
      }
      for (const target of links(prefix + guide, files.get(prefix + guide))) assert.ok(files.has(target), target);
      for (const id of consumers.filter(id => id.startsWith('pegatus-'))) {
        assert.ok(generated.operations.some(op => !op.relativePath.startsWith('.pegatus/') &&
          (op.relativePath.endsWith(`/${id}/SKILL.md`) || op.relativePath.endsWith(`/${id}.md`)) &&
          reachesProcedure(files, op.relativePath, prefix + `catalog/skills/${id}/SKILL.md`)),
        `${host}/${scope}: invocable ${id} reaches procedure`);
      }
    }
  }
});

function packetContext() {
  const target = {stack: 'dotnet', framework: '.net', version: 10, testFramework: 'xunit', task: 'test-generation'};
  const skill = selectSkills(catalog, target).find(entry => entry.id === 'dotnet-code-testing');
  assert.ok(skill);
  const dependencies = skill.dependencies.map(id => catalog.skills.find(entry => entry.id === id));
  const execute = selectSkills(catalog, {task: 'execute'}).find(entry => entry.id === 'pegatus-execute');
  const resources = [...new Set([execute, skill, ...dependencies].flatMap(entry => selectResources(entry, target)))];
  return {instructionPaths: ['AGENTS.md'], resolution: {readInstructions: ['AGENTS.md']},
    approvedScopeHash: 'approved-feature', approvals: [{kind: 'design', scopeHash: 'approved-feature', evidence: 'chat:approval'}],
    resources: ['.pegatus/work/feature/evidence/task-packet.md', ...resources],
    evidenceRefs: ['.pegatus/work/feature/spec.md', '.pegatus/work/feature/plan.md']};
}
const task = {id: 'tests', scope: 'Approved task-specific regression coverage', paths: ['tests/FeatureTests.cs'],
  dependsOn: [], checks: ['target-unit']};

// Catches guidance omitted from the actual dispatch manifest, including required dependency/overlay references.
test('task handoff transports a supplemental packet and selected stack closure without flattening', () => {
  const context = packetContext();
  const brief = buildHandoff(task, context);
  assert.equal(brief.status, 'passed');
  assert.equal(brief.schemaVersion, 1);
  assert.deepEqual(brief.ownedPaths, ['tests/FeatureTests.cs']);
  const resources = brief.contextManifest.dynamic.filter(entry => entry.kind === 'resource').map(entry => entry.ref);
  for (const ref of ['.pegatus/work/feature/evidence/task-packet.md', guide,
    'catalog/stack-overlays/dotnet-code-testing.md', 'catalog/stack-overlays/dotnet-code-testing-extensions.md',
    'vendor/dotnet-skills/plugins/dotnet-test/skills/code-testing/SKILL.md',
    'vendor/dotnet-skills/plugins/dotnet-test/skills/code-testing-extensions/extensions/dotnet.md',
    'vendor/dotnet-skills/plugins/dotnet-test/skills/code-testing-extensions/extensions/dotnet-examples.md']) {
    assert.ok(resources.includes(ref), ref);
  }
  assert.ok(!resources.some(ref => /\/extensions\/(cpp|go|java|python|typescript)\b/.test(ref)));
  assert.deepEqual(brief.contextManifest.dynamic.filter(entry => entry.kind === 'evidence').map(entry => entry.ref),
    ['.pegatus/work/feature/spec.md', '.pegatus/work/feature/plan.md']);
  for (const host of ['claude', 'codex', 'antigravity']) {
    const files = new Map(generateHost(catalog, {host, scope: 'project', root}).operations.map(op => [op.relativePath, op.content]));
    for (const ref of resources.filter(ref => !ref.startsWith('.pegatus/'))) {
      assert.deepEqual(Buffer.from(files.get(`.pegatus/runtime/${host}/${ref}`)), catalog.files[ref], `${host}: ${ref}`);
    }
  }
});

// Catches silently trimming the selected packet to fit an undersized handoff budget.
test('required task guidance blocks dispatch when reference or character budgets overflow', () => {
  const context = packetContext();
  const refs = buildHandoff(task, {...context, tokenControls: {maxContextRefs: 1}});
  assert.equal(refs.status, 'blocked');
  assert.equal(refs.reason, 'required-context-exceeds-budget');
  const chars = buildHandoff(task, {...context, tokenControls: {maxContextChars: 512}});
  assert.equal(chars.status, 'blocked');
  assert.equal(chars.reason, 'required-context-exceeds-budget');
  assert.equal(buildHandoff(task, context).status, 'passed');
});
