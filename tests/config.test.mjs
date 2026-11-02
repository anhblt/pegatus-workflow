import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfig } from '../src/config.mjs';

test('project overrides leave unrelated defaults intact', () => {
  const config = resolveConfig({ user: { concurrency: 2, repairLimit: 4 }, project: { concurrency: 1 } });
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.concurrency, 1);
  assert.equal(config.repairLimit, 4);
});

test('nested host models merge and verification arrays replace', () => {
  const config = resolveConfig({
    user: {
      hostModels: { codex: { fast: 'fast-v1', deep: 'deep-v1' } },
      repositories: [{ id: 'api', path: 'api', verify: [{ command: 'dotnet', args: ['test'], cwd: '.', requires: [] }] }],
    },
    project: {
      hostModels: { codex: { fast: 'fast-v2' } },
      repositories: [{ id: 'web', path: 'web', verify: [{ command: 'npm', args: ['test'], cwd: '.', requires: [] }] }],
    },
  });
  assert.deepEqual(config.hostModels.codex, { fast: 'fast-v2', deep: 'deep-v1' });
  assert.deepEqual(config.repositories.map(repository => repository.id), ['web']);
});

test('resolved defaults do not share mutable arrays with later calls', () => {
  const first = resolveConfig();
  first.repositories.push({ id: 'injected', path: 'outside', verify: [] });
  first.evidenceExclusions.push('all');
  const second = resolveConfig();
  assert.deepEqual(second.repositories, []);
  assert.deepEqual(second.evidenceExclusions, []);
});

test('invalid schema and limits are rejected', () => {
  for (const project of [{ concurrency: 0 }, { repairLimit: -1 }, { schemaVersion: 2 }]) {
    assert.throws(() => resolveConfig({ project }), /concurrency|repairLimit|schemaVersion/);
  }
});

test('duplicate repository IDs and invalid roots are rejected', () => {
  assert.throws(() => resolveConfig({ project: { repositories: [
    { id: 'api', path: 'api', verify: [] }, { id: 'api', path: 'other', verify: [] },
  ] } }), /duplicate repository/i);
  for (const path of ['', '../outside', '/absolute', 'C:\\outside', 'C:outside']) {
    assert.throws(() => resolveConfig({ project: { repositories: [{ id: 'api', path, verify: [] }] } }), /path/i);
  }
});

test('verification commands require executable and argument arrays', () => {
  const repository = verify => ({ repositories: [{ id: 'api', path: 'api', verify }] });
  for (const command of [
    { command: 'dotnet test', args: [], cwd: '.', requires: [] },
    { command: 'dotnet', args: 'test', cwd: '.', requires: [] },
    { command: 'dotnet', args: ['test'], cwd: '../outside', requires: [] },
    { command: 'bash', args: ['-lc', 'echo ok'], cwd: '.', requires: [] },
  ]) {
    assert.throws(() => resolveConfig({ project: repository([command]) }), /command|args|cwd|shell/i);
  }
  assert.doesNotThrow(() => resolveConfig({ project: repository([
    { command: 'bash', args: ['-lc', 'echo ok'], cwd: '.', requires: [], shell: 'bash' },
  ]) }));
});

test('shell executables with exe suffix require an explicit matching shell', () => {
  const repository = command => ({ repositories: [{ id: 'api', path: 'api', verify: [{
    command, args: ['-c', 'echo ok'], cwd: '.', requires: [],
  }] }] });
  for (const executable of ['pwsh.exe', 'powershell.exe', 'bash.exe', 'sh.exe', 'zsh.exe', 'cmd.exe']) {
    assert.throws(() => resolveConfig({ project: repository(executable) }), /shell/i, executable);
    const project = repository(executable);
    project.repositories[0].verify[0].shell = executable.slice(0, -4);
    assert.doesNotThrow(() => resolveConfig({ project }), executable);
  }
});

test('sparse argument arrays are rejected as malformed commands', () => {
  const args = new Array(1);
  const project = { repositories: [{ id: 'api', path: 'api', verify: [
    { command: 'dotnet', args, cwd: '.', requires: [] },
  ] }] };
  assert.throws(() => resolveConfig({ project }), /args/i);
});

test('sparse prerequisites and verification entries are rejected', () => {
  const command = { command: 'dotnet', args: ['test'], cwd: '.', requires: new Array(1) };
  assert.throws(() => resolveConfig({ project: { repositories: [
    { id: 'api', path: 'api', verify: [command] },
  ] } }), /requires/i);
  assert.throws(() => resolveConfig({ project: { repositories: [
    { id: 'api', path: 'api', verify: new Array(1) },
  ] } }), /command/i);
});
