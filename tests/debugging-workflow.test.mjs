import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadCatalog, selectResources } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = await loadCatalog(root);
const guide = 'catalog/skills/pegatus-investigate/debugging-guide.md';
const notice = 'catalog/skills/pegatus-investigate/reference.md';
const license = 'catalog/skills/pegatus-investigate/SUPERPOWERS-LICENSE.txt';

test('investigation, start, verification and repairer use the same packaged debugging guide', () => {
  for (const id of ['pegatus-investigate', 'pegatus-start', 'pegatus-verify', 'build-test-repairer']) {
    const entry = [...catalog.skills, ...catalog.agents].find(item => item.id === id);
    assert.ok(entry, id);
    assert.ok(selectResources(entry, {task: 'investigate'}).includes(guide), id);
  }
  const investigate = catalog.skills.find(entry => entry.id === 'pegatus-investigate');
  for (const resource of [guide, notice, license]) {
    assert.ok(investigate.resources.includes(resource), resource);
    assert.ok(catalog.files[resource], resource);
  }
  assert.equal(createHash('sha256').update(catalog.files[license]).digest('hex'),
    '0da33ed814ee87e72db078f489c4447af72f13d9f25d9e17476f32efd77705fc');
  assert.equal(catalog.agents.find(entry => entry.id === 'build-test-repairer').modelTier, 'standard');
});

test('all host/scope packets retain the shared debugging resources byte-for-byte', () => {
  assert.ok(catalog.files[guide], 'debugging guide must exist');
  for (const host of ['claude', 'codex', 'antigravity']) {
    for (const scope of ['project', 'user']) {
      const packet = generateHost(catalog, {host, scope, root});
      for (const resource of [guide, notice, license]) {
        const copy = packet.operations.find(op => op.relativePath === `.pegatus/runtime/${host}/${resource}`);
        assert.ok(copy, `${host}/${scope}: ${resource}`);
        assert.deepEqual(Buffer.from(copy.content), catalog.files[resource]);
      }
    }
  }
});
