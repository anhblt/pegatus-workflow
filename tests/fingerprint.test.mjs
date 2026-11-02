import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rename, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fingerprintRepository, repositoryDirty } from '../src/state/fingerprint.mjs';

function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

test('fingerprint changes for edited, renamed, deleted and untracked source but ignores session state', async () => {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'pegatus-fingerprint-'));
  try {
    git(repo, 'init', '-b', 'main');
    await writeFile(path.join(repo, 'source.txt'), 'base\n');
    git(repo, 'add', 'source.txt');
    git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'initial');
    const original = await fingerprintRepository(repo);
    await writeFile(path.join(repo, 'source.txt'), 'edit\n');
    const edited = await fingerprintRepository(repo);
    assert.notEqual(edited, original);
    await rename(path.join(repo, 'source.txt'), path.join(repo, 'renamed.txt'));
    const renamed = await fingerprintRepository(repo);
    assert.notEqual(renamed, edited);
    await unlink(path.join(repo, 'renamed.txt'));
    const deleted = await fingerprintRepository(repo);
    assert.notEqual(deleted, renamed);
    await writeFile(path.join(repo, 'untracked.txt'), 'new\n');
    const untracked = await fingerprintRepository(repo);
    assert.notEqual(untracked, deleted);
    await mkdir(path.join(repo, '.pegatus', 'work', 'TASK-1'), { recursive: true });
    await writeFile(path.join(repo, '.pegatus', 'work', 'TASK-1', 'progress.json'), 'session state');
    await mkdir(path.join(repo, '.superpowers'), { recursive: true });
    await writeFile(path.join(repo, '.superpowers', 'scratch.md'), 'session scratch');
    assert.equal(await fingerprintRepository(repo), untracked);
    await mkdir(path.join(repo, '.claude'), { recursive: true });
    await writeFile(path.join(repo, '.claude', 'settings.json'), '{}');
    assert.notEqual(await fingerprintRepository(repo), untracked);
  } finally { await rm(repo, { recursive: true, force: true }); }
});

test('task state and scratch do not make a clean repository dirty', async () => {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'pegatus-fingerprint-'));
  try {
    git(repo, 'init', '-b', 'main');
    await writeFile(path.join(repo, 'source.txt'), 'base\n');
    git(repo, 'add', 'source.txt');
    git(repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', 'initial');
    await mkdir(path.join(repo, '.pegatus', 'work', 'TASK-1'), { recursive: true });
    await writeFile(path.join(repo, '.pegatus', 'work', 'TASK-1', 'progress.json'), '{}');
    await mkdir(path.join(repo, '.superpowers'), { recursive: true });
    await writeFile(path.join(repo, '.superpowers', 'scratch.md'), 'scratch');
    assert.equal(await repositoryDirty(repo), false);
    await mkdir(path.join(repo, '.codex'), { recursive: true });
    await writeFile(path.join(repo, '.codex', 'config.json'), '{}');
    assert.equal(await repositoryDirty(repo), true);
  } finally { await rm(repo, { recursive: true, force: true }); }
});
