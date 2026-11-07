import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadCatalog, selectSkills, selectResources } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = await loadCatalog(root);
const guide = 'catalog/skills/pegatus-review/review-guide.md';
const notice = 'catalog/skills/pegatus-review/reference.md';
const license = 'catalog/skills/pegatus-review/SUPERPOWERS-LICENSE.txt';

test('review skill and reviewer role share the packaged procedure and reference closure', () => {
  const skill = selectSkills(catalog, {task: 'review'}).find(entry => entry.id === 'pegatus-review');
  const role = catalog.agents.find(entry => entry.id === 'code-reviewer');
  assert.ok(skill);
  assert.equal(role.modelTier, 'deep');
  for (const entry of [skill, role]) {
    for (const resource of [guide, notice, license]) {
      assert.ok(selectResources(entry, {task: 'review'}).includes(resource), `${entry.id}: ${resource}`);
      assert.ok(catalog.files[resource], resource);
    }
  }
  assert.equal(createHash('sha256').update(catalog.files[license]).digest('hex'),
    '0da33ed814ee87e72db078f489c4447af72f13d9f25d9e17476f32efd77705fc');
});

test('every host packet retains the same review guide and license bytes', () => {
  assert.ok(catalog.files[guide], 'shared guide must exist');
  for (const host of ['claude', 'codex', 'antigravity']) {
    for (const scope of ['project', 'user']) {
      const generated = generateHost(catalog, {host, scope, root});
      for (const resource of [guide, notice, license]) {
        const file = generated.operations.find(op => op.relativePath === `.pegatus/runtime/${host}/${resource}`);
        assert.ok(file, `${host}/${scope}: ${resource}`);
        assert.deepEqual(Buffer.from(file.content), catalog.files[resource]);
      }
      assert.ok(generated.operations.some(op => !op.relativePath.startsWith('.pegatus/') &&
        (op.relativePath.endsWith('/pegatus-review/SKILL.md') || op.relativePath.endsWith('/pegatus-review.md'))));
    }
  }
});
