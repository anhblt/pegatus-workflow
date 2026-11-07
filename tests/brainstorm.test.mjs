import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadCatalog, selectSkills, selectResources } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = await loadCatalog(root);

test('brainstorming is discoverable without a project stack and has a local resource closure', () => {
  for (const task of ['brainstorm', 'brainstorming']) {
    const selected = selectSkills(catalog, {task});
    assert.deepEqual(selected.map(skill => skill.id), ['pegatus-brainstorm']);
    const skill = selected[0];
    assert.deepEqual(skill.dependencies, []);
    for (const resource of selectResources(skill, {task})) assert.ok(catalog.files[resource], resource);
  }
  assert.equal(catalog.commands.find(command => command.id === 'command-brainstorm')?.skill, 'pegatus-brainstorm');
});

test('all host scopes expose brainstorming and start guards before generic project discovery', () => {
  for (const host of ['claude', 'codex', 'antigravity']) {
    for (const scope of ['project', 'user']) {
      const generated = generateHost(catalog, {host, scope, root});
      for (const skill of ['pegatus-brainstorm', 'pegatus-start']) {
        const wrappers = generated.operations.filter(op => !op.relativePath.startsWith('.pegatus/') &&
          (op.relativePath.endsWith(`/${skill}/SKILL.md`) || op.relativePath.endsWith(`/${skill}.md`)));
        assert.ok(wrappers.length, `${host}/${scope}/${skill}`);
        for (const wrapper of wrappers) {
          const guard = wrapper.content.indexOf('For conversational brainstorming');
          const discovery = wrapper.content.indexOf('Read applicable solution instructions and follow their discovery procedure first.');
          assert.ok(guard >= 0 && guard < discovery, wrapper.relativePath);
          assert.match(wrapper.content, /no project root or task files/);
          const links = [...wrapper.content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)];
          assert.ok(links.length);
          for (const [, link] of links) {
            const target = path.posix.normalize(path.posix.join(path.posix.dirname(wrapper.relativePath), link));
            assert.ok(generated.operations.some(op => op.relativePath === target), `${wrapper.relativePath}: ${target}`);
          }
        }
      }
    }
  }
});

test('generated rule wrappers preserve the conversational exception before project discovery', () => {
  for (const host of ['claude', 'antigravity']) {
    for (const scope of ['project', 'user']) {
      const generated = generateHost(catalog, {host, scope, root});
      for (const wrapper of generated.operations.filter(op => !op.relativePath.startsWith('.pegatus/') && op.relativePath.includes('/rules/'))) {
        const guard = wrapper.content.indexOf('For conversational brainstorming');
        const discovery = wrapper.content.indexOf('Read applicable solution instructions and follow their discovery procedure first.');
        assert.ok(guard >= 0 && guard < discovery, wrapper.relativePath);
      }
    }
  }
});

test('brainstorm reference attribution and exact upstream license travel in the standalone runtime', () => {
  const skill = catalog.skills.find(entry => entry.id === 'pegatus-brainstorm');
  const notice = 'catalog/skills/pegatus-brainstorm/reference.md';
  const license = 'catalog/skills/pegatus-brainstorm/SUPERPOWERS-LICENSE.txt';
  for (const resource of [notice, license]) {
    assert.ok(skill.resources.includes(resource), resource);
    assert.ok(catalog.files[resource], resource);
  }
  assert.equal(createHash('sha256').update(catalog.files[license]).digest('hex'),
    '0da33ed814ee87e72db078f489c4447af72f13d9f25d9e17476f32efd77705fc');
  const generated = generateHost(catalog, {host: 'codex', scope: 'user', root});
  for (const resource of [notice, license]) {
    const copied = generated.operations.find(op => op.relativePath === `.pegatus/runtime/codex/${resource}`);
    assert.ok(copied, resource);
    assert.deepEqual(Buffer.from(copied.content), catalog.files[resource]);
  }
});
