import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const commit = /^[a-f0-9]{40}$/;
const digest = /^sha256:[a-f0-9]{64}$/;
const npmIntegrity = /^sha512-[A-Za-z0-9+/]+={0,2}$/;

test('all upstream sources are immutable and identify their selected content', async () => {
  const lock = JSON.parse(await readFile(new URL('../sources.lock.json', import.meta.url)));
  assert.ok(Array.isArray(lock.sources) && lock.sources.length > 0);
  assert.equal(new Set(lock.sources.map(source => source.id)).size, lock.sources.length);
  for (const source of lock.sources) {
    assert.ok(source.id);
    assert.match(source.repository, /^https:\/\//);
    assert.match(source.revision, commit);
    assert.ok(Array.isArray(source.paths) && source.paths.length > 0);
    assert.ok(source.license);
    assert.ok(source.contentHashes && typeof source.contentHashes === 'object');
    for (const path of source.paths) {
      assert.ok(!path.startsWith('/') && !path.includes('..'));
      assert.match(source.contentHashes[path], digest, `${source.id}: ${path}`);
    }
    assert.deepEqual(Object.keys(source.contentHashes).sort(), [...source.paths].sort());
  }
  const shield = lock.packages.find(pkg => pkg.name === 'ecc-agentshield');
  assert.match(shield.version, /^\d+\.\d+\.\d+$/);
  assert.match(shield.integrity, npmIntegrity);
  assert.ok(lock.sources.some(source => source.id === shield.sourceId));
  assert.ok(Object.keys(shield.dependencyGraph).length > 0);
  for (const dependency of Object.values(shield.dependencyGraph)) {
    assert.match(dependency.version, /^\d+\.\d+\.\d+/);
    assert.match(dependency.integrity, npmIntegrity);
  }
});
