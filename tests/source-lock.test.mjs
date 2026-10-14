import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const selected = {
  ecc: ['b92f181b3b748d1abbc2afd94af6aa7d8c8fca29', 133, '1883b305dda70cccf3bfc91a0848300208d6ae969c37200df29b14cfd3f91789', '42a138752f7a890163fcfb32f8c82e1aa471c9479751353f0844d5d0fbb22a4a', ['agents/planner.md', 'commands/plan.md', 'hooks/hooks.json', 'rules/common/agents.md', 'scripts/hooks/session-start.js', 'scripts/orchestrate-worktrees.js', 'skills/continuous-learning-v2/SKILL.md', 'skills/verification-loop/SKILL.md', 'skills/iterative-retrieval/SKILL.md', 'skills/security-scan/SKILL.md', 'docs/ANTIGRAVITY-GUIDE.md']],
  'dotnet-skills': ['9864ca798f9448ef954ad1f05baf0dfca6501d51', 138, '500b6d9c0665af17fdbe81faa0e44892e4bcb44beb305044b564b05850b3ace2', '1c476d35a4f400972e6ce87a1d720a49dd65aeae7420d248a0688ecb0997c792', ['plugins/dotnet/plugin.json', 'plugins/dotnet-advanced/plugin.json', 'plugins/dotnet-data/plugin.json', 'plugins/dotnet-test/plugin.json', 'plugins/dotnet-aspnetcore/plugin.json']],
  'vercel-agent-skills': ['063bee94c3f4df8453406c830b0a7df0f2860278', 91, '1bf61101d6d3643815c0a7abe692f5501625d4ad8e5de82b0dcc9ebb78885134', '6585b573716233a1bbbed5cbbe89013446645b511e8baf7e9cb350d572bdafba', ['skills/react-best-practices/SKILL.md', 'skills/composition-patterns/SKILL.md']],
  agentshield: ['b0891303bdcd6037376a94263d45cfd2ff3dfb98', 9, '43574e6702ef822c12f3a59d62230e16bcf121279923a5a79074928415b48513', '7cb720aa99bd57426f21b20e70d37129fd0825d5def0ea63fa71caded92f7e6f', ['LICENSE', 'package.json', 'src/index.ts', 'src/scanner/index.ts']],
};
const sha256 = value => createHash('sha256').update(value).digest('hex');

function validateSources(lock) {
  assert.deepEqual(lock.sources.map(source => source.id).sort(), Object.keys(selected).sort());
  for (const source of lock.sources) {
    const [revision, count, pathsDigest, contentDigest, anchors] = selected[source.id];
    assert.match(source.repository, /^https:\/\//);
    assert.equal(source.revision, revision);
    assert.ok(source.license);
    assert.equal(source.paths.length, count);
    assert.equal(new Set(source.paths).size, count);
    assert.deepEqual(Object.keys(source.contentHashes).sort(), [...source.paths].sort());
    for (const path of source.paths) {
      assert.ok(!path.startsWith('/') && !path.includes('..'));
      assert.match(source.contentHashes[path], /^sha256:[a-f0-9]{64}$/);
    }
    for (const path of anchors) assert.ok(source.paths.includes(path), `${source.id}: ${path}`);
    const paths = [...source.paths].sort();
    assert.equal(sha256(paths.join('\n') + '\n'), pathsDigest, source.id);
    assert.equal(sha256(paths.map(path => `${path}=${source.contentHashes[path]}`).join('\n') + '\n'), contentDigest, source.id);
  }
}

async function validatePackage(lock) {
  const pkg = lock.packages.find(item => item.name === 'ecc-agentshield');
  assert.equal(pkg.version, '1.6.0');
  assert.equal(pkg.sourceId, 'agentshield');
  assert.match(pkg.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(pkg.packageLock, 'audit/agentshield/package-lock.json');
  const manifest = JSON.parse(await readFile(new URL('../audit/agentshield/package.json', import.meta.url)));
  const bytes = await readFile(new URL(`../${pkg.packageLock}`, import.meta.url));
  assert.equal(pkg.packageLockSha256, '5b1e20169c1c97472eb9bcd1bfbcee9e24f202b0494ad47a1f3350f636e84ea4');
  assert.equal(sha256(bytes), pkg.packageLockSha256);
  const dependencyLock = JSON.parse(bytes);
  assert.equal(Object.keys(dependencyLock.packages).length, 62);
  assert.equal(manifest.dependencies['ecc-agentshield'], '1.6.0');
  assert.equal(dependencyLock.packages[''].dependencies['ecc-agentshield'], '1.6.0');
  assert.equal(dependencyLock.packages['node_modules/ecc-agentshield'].version, pkg.version);
  assert.equal(dependencyLock.packages['node_modules/ecc-agentshield'].integrity, pkg.integrity);
  assert.ok(Object.keys(dependencyLock.packages).length > 1);
  for (const [path, dependency] of Object.entries(dependencyLock.packages)) {
    if (!path) continue;
    assert.match(path, /^node_modules\//);
    assert.match(dependency.version, /^\d+\.\d+\.\d+/);
    assert.match(dependency.resolved, /^https:\/\/registry\.npmjs\.org\//);
    assert.match(dependency.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
  }
}

test('all selected sources and npm dependencies remain pinned', async () => {
  const lock = JSON.parse(await readFile(new URL('../sources.lock.json', import.meta.url)));
  validateSources(lock);
  await validatePackage(lock);
  assert.deepEqual(await readFile(new URL('../npm-shrinkwrap.json', import.meta.url)),
    await readFile(new URL('../package-lock.json', import.meta.url)), 'Published shrinkwrap must retain the exact locked graph');
});

for (const [name, mutate] of [
  ['source deletion', lock => { lock.sources = lock.sources.filter(source => source.id !== 'agentshield'); }],
  ['path and hash deletion', lock => {
    const source = lock.sources.find(item => item.id === 'ecc');
    const path = source.paths.find(item => item !== 'agents/planner.md');
    source.paths = source.paths.filter(item => item !== path);
    delete source.contentHashes[path];
  }],
  ['well-formed hash replacement', lock => {
    lock.sources.find(item => item.id === 'ecc').contentHashes['agents/planner.md'] = `sha256:${'0'.repeat(64)}`;
  }],
]) {
  test(`source validation rejects ${name}`, async () => {
    const lock = JSON.parse(await readFile(new URL('../sources.lock.json', import.meta.url)));
    mutate(lock);
    assert.throws(() => validateSources(lock));
  });
}
