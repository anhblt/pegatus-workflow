import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const source = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t, { nested, extra } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pegatus-runtime-deps-'));
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + 'pegatus-runtime-deps-'));
    await rm(root, { recursive: true, force: true });
  });
  const kit = path.join(root, 'kit'), project = path.join(root, 'project');
  await mkdir(kit); await mkdir(project);
  // Keep catalog-linked documentation in the isolated package resource closure.
  for (const directory of ['src', 'bin', 'catalog', 'vendor', 'audit', 'docs']) {
    await cp(path.join(source, directory), path.join(kit, directory), { recursive: true });
  }
  for (const file of ['package.json', 'sources.lock.json', 'release.json']) {
    await cp(path.join(source, file), path.join(kit, file));
  }
  const original = JSON.parse(await readFile(path.join(source, 'package-lock.json')));
  // Isolated graph fixtures exercise the real copied administration module and
  // filesystem/ownership contracts; no source node_modules or extracted code.
  const packages = { '': original.packages[''],
    'node_modules/ecc-agentshield': original.packages['node_modules/ecc-agentshield'],
    'node_modules/dep': { version: '1.0.0', integrity: 'sha512-fixture-dep' } };
  if (nested) packages['node_modules/ecc-agentshield/node_modules/dep'] = { version: '2.0.0', integrity: 'sha512-fixture-nested-dep' };
  const lock = JSON.stringify({ ...original, packages }, null, 2) + '\n';
  for (const file of ['package-lock.json', 'npm-shrinkwrap.json']) await writeFile(path.join(kit, file), lock);
  async function dependency(directory, name, version, code) {
    await mkdir(path.join(kit, directory), { recursive: true });
    await writeFile(path.join(kit, directory, 'package.json'), JSON.stringify({ name, version, main: 'index.cjs' }));
    await writeFile(path.join(kit, directory, 'index.cjs'), code);
  }
  await dependency('node_modules/ecc-agentshield', 'ecc-agentshield', '1.6.0', "module.exports = require('dep'); if (require.main === module) console.log(module.exports);\n");
  await dependency('node_modules/dep', 'dep', '1.0.0', "module.exports = 'locked-top-level';\n");
  if (nested) await dependency('node_modules/ecc-agentshield/node_modules/dep', 'dep', '2.0.0', "module.exports = 'locked-nested';\n");
  if (extra) await dependency('node_modules/ecc-agentshield/node_modules/' + extra, extra, '9.9.9', "module.exports = 'unlocked-shadow';\n");
  const { runAdministration } = await import(pathToFileURL(path.join(kit, 'src/install/admin.mjs')));
  const args = ['--host', 'codex', '--scope', 'project', '--root', project];
  return { kit, project, runAdministration, args };
}

for (const extra of ['dep', '@foreign/dep']) {
  test(`administration rejects unlocked nested runtime package ${extra} before preflight or writes`, async t => {
    const { project, runAdministration, args } = await fixture(t, { extra });
    let scans = 0;
    await assert.rejects(runAdministration(['install', ...args], { cwd: project,
      securityPreflight: async () => { scans++; return { status: 'passed', evidence: [], reasons: [] }; } }), /unlocked runtime dependency/i);
    assert.equal(scans, 0, 'Contaminated runtime cannot reach configuration preflight');
    await assert.rejects(readFile(path.join(project, '.pegatus/install-lock-codex.json')), { code: 'ENOENT' });
    await assert.rejects(readFile(path.join(project, '.pegatus/runtime/codex/node_modules/ecc-agentshield/node_modules', extra, 'index.cjs')), { code: 'ENOENT' });
  });
}

test('administration retains locked nested resolution and rejects a changed nested version on update', async t => {
  const { kit, project, runAdministration, args } = await fixture(t, { nested: true });
  const options = { cwd: project, securityPreflight: { status: 'passed', evidence: [], reasons: [] } };
  assert.equal((await runAdministration(['install', ...args], options)).status, 'passed');
  const runtime = path.join(project, '.pegatus/runtime/codex');
  // Execute normal Node resolution from the installed locked dependency tree.
  const resolved = spawnSync(process.execPath, [path.join(runtime, 'node_modules/ecc-agentshield/index.cjs')], { encoding: 'utf8', env: { ...process.env, NODE_PATH: '' } });
  assert.equal(resolved.status, 0, resolved.stderr);
  assert.equal(resolved.stdout.trim(), 'locked-nested');
  assert.equal(JSON.parse(await readFile(path.join(runtime, 'node_modules/dep/package.json'))).version, '1.0.0');
  assert.equal(JSON.parse(await readFile(path.join(runtime, 'node_modules/ecc-agentshield/node_modules/dep/package.json'))).version, '2.0.0');
  const ownership = await readFile(path.join(project, '.pegatus/install-lock-codex.json'));
  await writeFile(path.join(kit, 'node_modules/ecc-agentshield/node_modules/dep/package.json'), JSON.stringify({ name: 'dep', version: '9.9.9' }));
  await assert.rejects(runAdministration(['update', ...args], options), /pinned runtime dependency mismatch/i);
  assert.deepEqual(await readFile(path.join(project, '.pegatus/install-lock-codex.json')), ownership);
  assert.equal(JSON.parse(await readFile(path.join(runtime, 'node_modules/ecc-agentshield/node_modules/dep/package.json'))).version, '2.0.0');
});
