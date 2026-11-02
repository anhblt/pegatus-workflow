import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('scripts/setup-windows-command.ps1');

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'pegatus-command-'));
  const checkout = join(root, 'checkout with spaces');
  const prefix = join(root, 'npm-prefix');
  await mkdir(join(checkout, 'scripts'), { recursive: true });
  await mkdir(join(checkout, 'bin'), { recursive: true });
  await mkdir(prefix, { recursive: true });
  const pkg = { name: '@galliker/pegatus', version: '1.0.0', bin: { pegatus: 'bin/pegatus.mjs' } };
  await writeFile(join(checkout, 'package.json'), JSON.stringify(pkg));
  await writeFile(join(checkout, 'package-lock.json'), JSON.stringify({ name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages: { '': pkg } }));
  await writeFile(join(checkout, 'bin/pegatus.mjs'), '#!/usr/bin/env node\nconsole.log("fixture-cli", process.argv.slice(2).join(" "));\n');
  try { await copyFile(script, join(checkout, 'scripts/setup-windows-command.ps1')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return { root, checkout, prefix };
}

function setup(f) {
  const cleanPath = (process.env.PATH ?? '').split(';').filter((dir) => !['pegatus', 'pegatus.cmd', 'pegatus.ps1', 'pegatus.exe'].some((name) => existsSync(join(dir, name)))).join(';');
  return spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(f.checkout, 'scripts/setup-windows-command.ps1')], {
    cwd: f.checkout, env: { ...process.env, npm_config_prefix: f.prefix, PATH: f.extraPath ? `${f.extraPath};${cleanPath}` : cleanPath }, encoding: 'utf8', timeout: 120000,
  });
}

test('Windows setup registers a command that forwards arguments from a different directory', { skip: process.platform !== 'win32' }, async () => {
  const f = await fixture();
  try {
    const result = setup(f);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const call = spawnSync('cmd.exe', ['/d', '/s', '/c', `""${join(f.prefix, 'pegatus.cmd')}" hello world"`], { cwd: f.root, encoding: 'utf8', windowsVerbatimArguments: true });
    assert.equal(call.status, 0, call.stdout + call.stderr);
    assert.match(call.stdout, /fixture-cli hello world/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('Windows setup preserves an existing global command', { skip: process.platform !== 'win32' }, async () => {
  const f = await fixture();
  try {
    const target = join(f.prefix, 'pegatus.cmd');
    await writeFile(target, 'foreign command');
    const result = setup(f);
    assert.notEqual(result.status, 0);
    assert.equal(await readFile(target, 'utf8'), 'foreign command');
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('Windows setup refuses a command already on PATH', { skip: process.platform !== 'win32' }, async () => {
  const f = await fixture();
  try {
    f.extraPath = join(f.root, 'other-bin');
    await mkdir(f.extraPath);
    const target = join(f.extraPath, 'pegatus.cmd');
    await writeFile(target, 'foreign command');
    const result = setup(f);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Existing pegatus command/);
    assert.equal(await readFile(target, 'utf8'), 'foreign command');
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
