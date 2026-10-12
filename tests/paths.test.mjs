import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { assertContained } from '../src/paths.mjs';

test('existing and not-yet-created paths under a root with spaces are accepted', async t => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'pegatus root '));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'project files');
  await mkdir(root);
  assert.equal(await assertContained(root, path.join(root, 'new folder', 'report.md')),
    path.join(await realpath(root), 'new folder', 'report.md'));
});

test('parent traversal outside the root is rejected', async t => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'pegatus paths '));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'project');
  await mkdir(root);
  await assert.rejects(assertContained(root, path.join(root, '..', 'outside')), /outside|contain/i);
});

test('an existing root reached with different casing follows filesystem identity', async t => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'pegatus case '));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'MixedCase');
  await mkdir(root);
  const alternate = path.join(fixture, 'mixedcase');
  try {
    const resolved = await realpath(alternate);
    assert.equal(await assertContained(root, path.join(alternate, 'new.txt')), path.join(resolved, 'new.txt'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await assert.rejects(assertContained(root, path.join(alternate, 'new.txt')), /outside|contain/i);
  }
});

test('an escaping symlink or junction is rejected', async t => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'pegatus links '));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, 'project');
  const outside = path.join(fixture, 'outside');
  await mkdir(root);
  await mkdir(outside);
  const link = path.join(root, 'linked');
  try {
    await symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
      t.skip(`link fixture unavailable (${error.code}); required in platform qualification`);
      return;
    }
    throw error;
  }
  await assert.rejects(assertContained(root, path.join(link, 'new.txt')), /outside|contain/i);
});
