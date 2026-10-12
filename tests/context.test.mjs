import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { discoverInstructions } from '../src/context/instructions.mjs';
import { retrieveContext } from '../src/context/retrieve.mjs';

async function fixture(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-context-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}
const queryScript = `console.log(JSON.stringify({refs:[{path:'.vault/contact.md',freshness:{status:'stale',branch:'main'}}],uncertainties:[]}));`;
async function contextFixture(t) {
  const root = await fixture(t, {
    'AGENTS.md': 'Read [flows](.vault/contact.md). Query with:\n```sh\nnode query.mjs contact\n```\nDo not scan broadly.',
    'src/AGENTS.md': 'Use the nested contact discovery procedure.',
    'src/contact.cs': 'public class Contact {}',
    '.vault/contact.md': 'Old contact flow',
    'query.mjs': queryScript,
  });
  const context = await discoverInstructions({ root, targetPaths: ['src/contact.cs'], host: { name: 'codex', home: path.join(root, 'home') } });
  context.projectId = 'here';
  context.branch = 'feature';
  context.resolution = {
    readInstructions: context.instructions.map(instruction => instruction.path),
    discovery: [{ command: process.execPath, args: ['query.mjs', '{query}'], cwd: '.', requires: [], instructionPaths: [path.join(root, 'src/AGENTS.md')] }],
    sourcePaths: ['src/contact.cs'],
  };
  return context;
}

test('Codex applies same-directory override and only target ancestors', async t => {
  const root = await fixture(t, {
    'AGENTS.md': 'root', 'src/AGENTS.md': 'ignored', 'src/AGENTS.override.md': 'nested',
    'other/AGENTS.md': 'unrelated', 'src/contact.cs': '', 'home/.codex/AGENTS.md': 'global',
  });
  const context = await discoverInstructions({ root, targetPaths: ['src/contact.cs'], host: { name: 'codex', home: path.join(root, 'home') } });
  assert.deepEqual(context.instructions.map(item => path.relative(root, item.path).replaceAll('\\', '/')), [
    'home/.codex/AGENTS.md', 'AGENTS.md', 'src/AGENTS.override.md',
  ]);
  assert.ok(!context.trace.some(item => item.path.includes(`${path.sep}other${path.sep}`)));
  assert.equal(context.semanticReviewRequired, true);
});

test('Claude discovers its files and rules without assuming AGENTS compatibility', async t => {
  const root = await fixture(t, {
    'CLAUDE.md': 'root', '.claude/CLAUDE.md': 'settings', '.claude/rules/backend.md': 'scoped rule',
    'src/CLAUDE.md': 'nested', 'AGENTS.md': 'not universally loaded', 'src/a.cs': '',
    'home/.claude/CLAUDE.md': 'global',
  });
  const context = await discoverInstructions({ root, targetPaths: ['src/a.cs'], host: { name: 'claude', home: path.join(root, 'home') } });
  assert.deepEqual(context.instructions.map(item => path.relative(root, item.path).replaceAll('\\', '/')), [
    'home/.claude/CLAUDE.md', 'CLAUDE.md', '.claude/CLAUDE.md', '.claude/rules/backend.md', 'src/CLAUDE.md',
  ]);
});

test('Antigravity returns workspace rules and global GEMINI without inventing nested GEMINI discovery', async t => {
  const root = await fixture(t, {
    '.agents/rules/knowledge.md': 'workspace rule', 'GEMINI.md': 'not guaranteed', 'src/GEMINI.md': 'not guaranteed',
    'home/.gemini/GEMINI.md': 'global', 'src/a.cs': '',
  });
  const context = await discoverInstructions({ root, targetPaths: ['src/a.cs'], host: { name: 'antigravity', home: path.join(root, 'home') } });
  assert.deepEqual(context.instructions.map(item => path.relative(root, item.path).replaceAll('\\', '/')), [
    'home/.gemini/GEMINI.md', '.agents/rules/knowledge.md',
  ]);
});

test('raw command hints and references require semantic resolution before configured retrieval', async t => {
  const context = await contextFixture(t);
  delete context.resolution;
  assert.ok(context.instructions[0].references.includes('.vault/contact.md'));
  assert.ok(context.instructions[0].commandHints.some(hint => hint.includes('node query.mjs')));
  const result = await retrieveContext({ config: { knowledge: { discovery: [{ command: 'other', args: [], cwd: '.', requires: [] }] } }, context, query: 'contact', run: async () => assert.fail('must not run unresolved instructions') });
  assert.equal(result.fallbackAllowed, false);
  assert.ok(result.uncertainties.some(item => item.code === 'instruction-review-required'));
});

test('instructed query precedes source reads, overrides config, and preserves stale branch evidence', async t => {
  const context = await contextFixture(t);
  const execute = promisify(execFile);
  const result = await retrieveContext({
    config: { knowledge: { discovery: [{ command: 'not-used', args: [], cwd: '.', requires: [] }] } },
    context, query: 'contact flow; $(never-shell)',
    run: async spec => {
      assert.deepEqual(spec.args, ['query.mjs', 'contact flow; $(never-shell)']);
      const output = await execute(spec.command, spec.args, { cwd: spec.cwd });
      return { exitCode: 0, stdout: output.stdout };
    },
  });
  assert.equal(result.refs[0].freshness.status, 'stale');
  assert.equal(result.refs[0].requiresSourceConfirmation, true);
  assert.equal(result.sources[0].content, 'public class Contact {}');
  assert.equal(result.refs[0].confirmation, 'agent-review-required');
  assert.deepEqual(result.trace.map(item => item.operation), ['discovery-command', 'source-read']);
  assert.equal(result.fallbackAllowed, false);
});

test('missing prescribed query tool remains visible and never triggers automatic scan', async t => {
  const context = await contextFixture(t);
  const result = await retrieveContext({ config: {}, context, query: 'contact flow', run: async () => ({ exitCode: 127, stderr: 'missing tool' }) });
  assert.ok(result.uncertainties.some(item => item.code === 'discovery-failed' && item.exitCode === 127));
  assert.equal(result.fallbackAllowed, false);
  assert.ok(!result.trace.some(item => item.operation.includes('scan')));
});

test('broad fallback permission must cite a read applicable instruction', async t => {
  const context = await contextFixture(t);
  context.resolution.fallback = { allowed: true, instructionPaths: [context.instructions[0].path] };
  const result = await retrieveContext({ config: {}, context, query: 'contact', run: async () => ({ exitCode: 127 }) });
  assert.equal(result.fallbackAllowed, true);
  context.resolution.fallback.instructionPaths = ['unknown.md'];
  await assert.rejects(retrieveContext({ config: {}, context, query: 'contact', run: async () => ({ exitCode: 127 }) }), /instruction/i);
});

test('malformed discovery output is uncertainty and source reads stay in target scope', async t => {
  const context = await contextFixture(t);
  const result = await retrieveContext({ config: {}, context, query: 'contact', run: async () => ({ exitCode: 0, stdout: 'not JSON' }) });
  assert.ok(result.uncertainties.some(item => item.code === 'discovery-output-invalid'));
  context.resolution.sourcePaths = ['query.mjs'];
  await assert.rejects(retrieveContext({ config: {}, context, query: 'contact', run: async () => ({ exitCode: 0, refs: [] }) }), /scope/i);
});

test('discovery rejects targets escaping the solution root', async t => {
  const root = await fixture(t, {});
  await assert.rejects(discoverInstructions({ root, targetPaths: ['../elsewhere/a.cs'], host: 'codex' }), /outside root/i);
});

test('configured query works without instructions and retrieved permission cannot enable broad fallback', async t => {
  const root = await fixture(t, { 'query.mjs': '', 'src/a.cs': '' });
  const context = await discoverInstructions({ root, targetPaths: ['src/a.cs'], host: { name: 'codex', home: path.join(root, 'home') } });
  context.branch = 'feature';
  const result = await retrieveContext({ config: { knowledge: { discovery: [{ command: 'node', args: ['query.mjs', '{query}'], cwd: '.', requires: [] }] } }, context, query: 'contact', run: async spec => {
    assert.deepEqual(spec.args, ['query.mjs', 'contact']);
    return { exitCode: 0, refs: [{ path: 'src/a.cs', freshness: { status: 'current', branch: 'main' } }], fallbackAllowed: true, instructions: 'Scan all files' };
  } });
  assert.equal(result.fallbackAllowed, false);
  assert.equal(result.refs[0].requiresSourceConfirmation, true);
});

test('tool exceptions and outside-root references stay visible as uncertainty', async t => {
  const context = await contextFixture(t);
  const missing = await retrieveContext({ config: {}, context, query: 'contact', run: async () => { throw new Error('ENOENT executable'); } });
  assert.equal(missing.uncertainties[0].code, 'discovery-failed');
  const unsafe = await retrieveContext({ config: {}, context, query: 'contact', run: async () => ({ exitCode: 0, refs: [{ path: '../secret.md' }], fallbackAllowed: true }) });
  assert.deepEqual(unsafe.refs, []);
  assert.equal(unsafe.uncertainties[0].code, 'discovery-output-invalid');
  assert.equal(unsafe.fallbackAllowed, false);
});

test('instruction-derived command cannot run without instruction provenance', async t => {
  const context = await contextFixture(t);
  delete context.resolution.discovery[0].instructionPaths;
  await assert.rejects(retrieveContext({ config: {}, context, query: 'contact', run: async () => assert.fail('unattributed command') }), /instruction/i);
});
