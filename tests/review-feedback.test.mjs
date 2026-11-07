import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadCatalog, selectSkills, selectResources } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = await loadCatalog(root);
const skillPath = 'catalog/skills/pegatus-review-feedback/SKILL.md';
const notice = 'catalog/skills/pegatus-review-feedback/reference.md';
const license = 'catalog/skills/pegatus-review-feedback/SUPERPOWERS-LICENSE.txt';

test('review feedback is task-selectable without a stack and resolves its own alias and resources', () => {
  for (const task of ['review-feedback', 'receive-code-review', 'address-review-feedback']) {
    const selected = selectSkills(catalog, {task});
    assert.deepEqual(selected.map(entry => entry.id), ['pegatus-review-feedback']);
    for (const resource of [skillPath, notice, license]) {
      assert.ok(selectResources(selected[0], {task}).includes(resource), resource);
      assert.ok(catalog.files[resource], resource);
    }
  }
  const command = catalog.commands.find(entry => entry.id === 'command-review-feedback');
  assert.equal(command?.skill, 'pegatus-review-feedback');
  assert.equal(createHash('sha256').update(catalog.files[license]).digest('hex'),
    '0da33ed814ee87e72db078f489c4447af72f13d9f25d9e17476f32efd77705fc');
});

test('all host/scope packets expose feedback and preserve standalone reference bytes', () => {
  assert.ok(catalog.files[skillPath], 'feedback procedure must exist');
  for (const host of ['claude', 'codex', 'antigravity']) {
    for (const scope of ['project', 'user']) {
      const generated = generateHost(catalog, {host, scope, root});
      assert.ok(generated.operations.some(op => !op.relativePath.startsWith('.pegatus/') &&
        (op.relativePath.endsWith('/pegatus-review-feedback/SKILL.md') || op.relativePath.endsWith('/pegatus-review-feedback.md'))), `${host}/${scope}`);
      for (const resource of [skillPath, notice, license]) {
        const copied = generated.operations.find(op => op.relativePath === `.pegatus/runtime/${host}/${resource}`);
        assert.ok(copied, `${host}/${scope}: ${resource}`);
        assert.deepEqual(Buffer.from(copied.content), catalog.files[resource]);
      }
    }
  }
});
