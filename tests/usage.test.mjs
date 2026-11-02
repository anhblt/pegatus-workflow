import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { recordUsage, resolveRoleTier, buildContextManifest, limitOutput, checkpointSummary } from '../src/telemetry/usage.mjs';
import { resolveConfig } from '../src/config.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';
import { retrieveContext } from '../src/context/retrieve.mjs';
import { runLearningCommand } from '../src/memory/cli.mjs';

const capability = { source: 'team tested host/version; see acceptance.json', models: [{ model: 'team-model', efforts: ['high'] }] };
test('missing host usage is unavailable, not zero', () => {
  const u = recordUsage({ source: 'host', values: null });
  assert.equal(u.available, false); assert.equal(u.values, null);
  assert.equal(recordUsage({ source: 'host' }).values, null);
  assert.equal(recordUsage({ source: 'host', values: {} }).available, false);
});
test('usage preserves partial unavailable metrics and observed zero without inventing totals', () => {
  const u = recordUsage({ source: 'host-session', values: { inputTokens: 0, outputTokens: 17, cachedInputTokens: null } });
  assert.deepEqual(u.values, { inputTokens: 0, outputTokens: 17, cachedInputTokens: null });
  assert.equal(u.available, true); assert.equal(u.schemaVersion, 1);
  for (const values of [{ inputTokens: -1 }, { cost: NaN }, { inputTokens: '3' }, { requests: Infinity }])
    assert.throws(() => recordUsage({ source: 'host', values }), /metric/);
  assert.throws(() => recordUsage({ source: '', values: null }), /source/);
});
test('role tiers use only the fixed mapping and explicitly declared support', () => {
  const r = resolveRoleTier({ modelTier: 'deep' }, { host: 'codex', models: { deep: { model: 'team-model', effort: 'high' } }, modelCapabilities: capability });
  assert.equal(r.model, 'team-model'); assert.equal(r.effort, 'high'); assert.equal(r.mode, 'configured');
  assert.equal(r.support, 'team-declared'); assert.equal(r.qualified, false);
  const legacy = resolveRoleTier({ modelTier: 'fast' }, { host: 'claude', models: { fast: 'team-model' }, modelCapabilities: capability });
  assert.equal(legacy.model, 'team-model'); assert.equal(legacy.effort, null);
});
test('unknown models, effort support and tiers retain host defaults with explicit warnings', () => {
  for (const options of [
    { models: { deep: 'team-model' } },
    { models: { deep: 'unknown-model' }, modelCapabilities: capability },
    { models: { deep: { model: 'team-model', effort: 'low' } }, modelCapabilities: capability },
  ]) {
    const r = resolveRoleTier({ modelTier: 'deep' }, { host: 'codex', ...options });
    assert.equal(r.model, null); assert.equal(r.effort, null); assert.equal(r.mode, 'host-default');
    assert.ok(r.warnings.length);
  }
  assert.match(resolveRoleTier({ modelTier: 'magic' }, { host: 'codex' }).warnings[0], /tier/);
  const ag = resolveRoleTier({ modelTier: 'deep' }, { host: 'antigravity', models: { deep: 'team-model' }, modelCapabilities: capability });
  assert.equal(ag.mode, 'instruction-only'); assert.equal(ag.model, null);
});
test('missing mappings request coordinator selection within the existing role tier', () => {
  for (const tier of ['fast', 'standard', 'deep']) {
    const result = resolveRoleTier({ modelTier: tier }, { host: 'codex' });
    assert.equal(result.tier, tier);
    assert.equal(result.mode, 'coordinator-selection');
    assert.equal(result.model, null);
    assert.equal(result.effort, null);
    assert.equal(result.selectionPolicy.tier, tier);
    assert.equal(result.selectionPolicy.owner, 'coordinator');
    assert.equal(result.selectionPolicy.requireExplicitPair, true);
    assert.equal(result.qualified, false);
  }
  const partial = resolveRoleTier({ modelTier: 'fast' }, { host: 'codex', models: { deep: 'another-tier' } });
  assert.equal(partial.mode, 'coordinator-selection');
  const configured = resolveRoleTier({ modelTier: 'deep' }, { host: 'codex',
    models: { deep: { model: 'team-model', effort: 'high' } }, modelCapabilities: capability });
  assert.equal(configured.mode, 'configured');
  assert.equal(configured.selectionPolicy, undefined);
  const invalid = resolveRoleTier({ modelTier: 'deep' }, { host: 'codex', models: { deep: 'unsupported' } });
  assert.equal(invalid.mode, 'host-default');
  assert.equal(invalid.selectionPolicy, undefined);
});

test('generated workflows and role instructions carry host-aware fallback selection', () => {
  const catalog = { files: {}, skills: [{ id: 'execute', path: 'catalog/skills/pegatus-execute/SKILL.md' }],
    agents: [{ id: 'reviewer', path: 'catalog/agents/reviewer.md', modelTier: 'deep' }] };
  for (const host of ['codex', 'claude', 'antigravity']) {
    const generated = generateHost(catalog, { host, scope: 'project', root: path.resolve('.') });
    for (const operation of generated.operations) {
      assert.match(operation.content, /fast:.*mechanical/);
      assert.match(operation.content, /standard:.*integration/);
      assert.match(operation.content, /deep:.*architecture/);
      assert.match(operation.content, /both model and effort/);
      assert.match(operation.content, /actual host.*allowlist/);
    }
    assert.doesNotMatch(generated.operations.map(op => op.content).join('\n'), /^model(?:_reasoning_effort)?\s*[:=]/m);
  }
});
test('explicit model and effort config validates fields and replaces complete tier mappings', () => {
  const user = { hostModels: { codex: { deep: { model: 'old', effort: 'high' } } } };
  const config = resolveConfig({ user, project: { hostModels: { codex: { deep: { model: 'new' } } }, hostModelCapabilities: { codex: capability } } });
  assert.deepEqual(config.hostModels.codex.deep, { model: 'new' });
  for (const deep of [{ model: '' }, { model: 'x', effort: 2 }, { model: 'x', effort: 'bad\nvalue' }, { model: 'x', extra: true }, 'x\nvalue'])
    assert.throws(() => resolveConfig({ project: { hostModels: { codex: { deep } } } }), /model|effort/);
  for (const codex of [{ models: [] }, { source: 's', models: [{ model: 'x', efforts: 'high' }] }])
    assert.throws(() => resolveConfig({ project: { hostModelCapabilities: { codex } } }), /capabilit|source|effort/i);
});
test('generated roles use documented model and effort fields and disclose qualification', () => {
  const catalog = { files: {}, agents: [{ id: 'reviewer', path: 'catalog/agents/reviewer.md', modelTier: 'deep' }] };
  const options = { scope: 'project', root: path.resolve('.'), models: { deep: { model: 'team-model', effort: 'high' } }, modelCapabilities: capability };
  const c = generateHost(catalog, { host: 'codex', ...options });
  assert.match(c.operations[0].content, /^developer_instructions = /m);
  assert.match(c.operations[0].content, /^model_reasoning_effort = "high"/m);
  assert.doesNotMatch(c.operations[0].content, /^instructions = /m);
  assert.equal(c.roleModels[0].qualified, false);
  const cl = generateHost(catalog, { host: 'claude', ...options });
  assert.match(cl.operations[0].content, /^effort: "high"/m);
  const unknown = generateHost(catalog, { host: 'codex', ...options, modelCapabilities: undefined });
  assert.doesNotMatch(unknown.operations[0].content, /^model(?:_reasoning_effort)? = /m);
  assert.ok(unknown.warnings.some(w => /support.*unknown/i.test(w)));
});
test('context manifests separate stable instructions from dynamic references and omit bodies', () => {
  const manifest = buildContextManifest({ instructionPaths: ['AGENTS.md'], knowledgeRefs: [{ path: '.vault/flow.md', content: 'large body' }], resources: ['skill.md'] });
  assert.equal(manifest.status, 'passed'); assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.instructions, ['AGENTS.md']);
  assert.equal(manifest.dynamic.length, 2); assert.doesNotMatch(JSON.stringify(manifest), /large body/);
  assert.ok(JSON.stringify(manifest).length <= manifest.limits.maxContextChars);
});
test('context overflow blocks dependent work without silently dropping required references', () => {
  const manifest = buildContextManifest({ instructionPaths: ['AGENTS.md'], knowledgeRefs: ['required.md'] }, { maxContextRefs: 1 });
  assert.equal(manifest.status, 'blocked'); assert.equal(manifest.reason, 'required-context-exceeds-budget');
  assert.equal(manifest.requiredCount, 2);
  const huge = buildContextManifest({ instructionPaths: ['x'.repeat(2000)] }, { maxContextChars: 512 });
  assert.equal(huge.status, 'blocked'); assert.ok(JSON.stringify(huge).length <= 512);
});
test('output limits include a visible marker and reference the full retained log', () => {
  const text = '😀'.repeat(300);
  const r = limitOutput(text, { maxChars: 180, fullOutputRef: 'evidence/full.log' });
  assert.equal(r.truncated, true); assert.match(r.text, /TRUNCATED/); assert.match(r.text, /evidence\/full.log/);
  assert.ok(r.text.length <= 180); assert.equal(r.originalChars, text.length);
  assert.ok(!/[\uD800-\uDBFF]$/.test(r.text.split('\n')[0]));
  assert.throws(() => limitOutput(text, { maxChars: 180 }), /fullOutputRef/);
  assert.equal(limitOutput('short', { maxChars: 180 }).text, 'short');
});
test('checkpoint summaries reference logs and enforce configured summary limits', () => {
  const r = checkpointSummary({ summary: 'Passed checks. '.repeat(100), logs: [{ outputPath: 'evidence/test.json', stdout: 'do not embed', status: 'passed' }] }, { maxSummaryChars: 220 });
  assert.equal(r.schemaVersion, 1); assert.ok(r.summary.length <= 220); assert.match(r.summary, /TRUNCATED/);
  assert.match(r.summary, /supporting logs:/);
  assert.doesNotMatch(r.summary, /full output:/);
  assert.deepEqual(r.logs, ['evidence/test.json']); assert.doesNotMatch(JSON.stringify(r), /do not embed/);
  assert.throws(() => checkpointSummary({ summary: 'checked', logs: [{ stdout: 'lost' }] }), /outputPath/);
});
test('retrieval exposes configured context budget failure for required instructed knowledge', async () => {
  const context = { root: path.resolve('.'), instructions: [], instructionPaths: ['AGENTS.md'], resolution: { readInstructions: [] }, targetPaths: [] };
  const r = await retrieveContext({ config: { knowledge: { paths: ['docs'] }, tokenControls: { maxContextRefs: 1 } }, context, query: 'model' });
  assert.equal(r.contextManifest.status, 'blocked');
  assert.ok(r.uncertainties.some(u => u.code === 'context-budget-exceeded'));
});
test('token controls merge defaults and reject unusable limits', () => {
  const c = resolveConfig({ project: { tokenControls: { maxContextRefs: 3 } } });
  assert.equal(c.tokenControls.maxContextRefs, 3); assert.ok(c.tokenControls.maxOutputChars > 0);
  for (const tokenControls of [{ maxContextRefs: 0 }, { maxOutputChars: -1 }, { maxContextChars: 1 }, { maxSummaryChars: NaN }, { guessedTokens: 500 }])
    assert.throws(() => resolveConfig({ project: { tokenControls } }), /tokenControls|limit/);
});
test('memory CLI blocks a required context overflow and returns the manifest', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-token-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, '.pegatus/memory'), { recursive: true });
  await writeFile(path.join(root, '.pegatus/config.json'), JSON.stringify({ tokenControls: { maxContextRefs: 1 } }));
  for (const name of ['first', 'second']) {
    const file = path.join(root, `.pegatus/memory/${name}.md`);
    await writeFile(file, 'Contact knowledge');
    await writeFile(file + '.json', JSON.stringify({ schemaVersion: 1, projectId: 'a', approvalState: 'approved',
      paths: ['src/'], keywords: ['contact'], sourceTask: 'A', evidence: ['evidence/result.json'] }));
  }
  const r = await runLearningCommand(['memory', '--root', root, '--project', 'a', '--path', 'src/a.mjs', '--query', 'contact'], root);
  assert.equal(r.status, 'blocked'); assert.equal(r.contextManifest.status, 'blocked');
  assert.deepEqual(r.entries, []); assert.ok(r.reasons.includes('context-budget-exceeded'));
});
test('capability overrides cannot inherit unrelated support provenance', () => {
  assert.throws(() => resolveConfig({ user: { hostModelCapabilities: { codex: capability } },
    project: { hostModelCapabilities: { codex: { models: [{ model: 'other', efforts: [] }] } } } }), /source/);
});
