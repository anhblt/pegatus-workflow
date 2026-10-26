import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadCatalog, selectSkills, validateHandoff } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('browser testing is discoverable without a detected frontend framework or implementation', async () => {
  const catalog = await loadCatalog(root);
  const selected = selectSkills(catalog, { task: 'browser-test' });
  assert.ok(selected.some(skill => skill.id === 'pegatus-browser-test'));
  const role = catalog.agents.find(agent => agent.id === 'browser-tester');
  assert.ok(role);
  assert.equal(role.privileges.aggregateProgress, false);
  const brief = { instructionPaths: ['AGENTS.md'], scope: 'test login at localhost', knowledgeRefs: [], approvedArtifacts: [], ownedPaths: ['.pegatus/work/login/evidence'], checks: ['login validation'], evidence: [] };
  assert.deepEqual(validateHandoff(role, brief), []);
  delete brief.checks;
  assert.ok(validateHandoff(role, brief).some(finding => finding.field === 'checks'));
  const command = catalog.commands.find(entry => entry.id === 'command-browser-test');
  assert.equal(command?.skill, 'pegatus-browser-test');
});

test('host packets include browser workflow and native roles where supported', async () => {
  const catalog = await loadCatalog(root);
  for (const [host, workflow, role] of [
    ['claude', '.claude/skills/pegatus-browser-test/SKILL.md', '.claude/agents/pegatus-browser-tester.md'],
    ['codex', '.agents/skills/pegatus-browser-test/SKILL.md', '.codex/agents/pegatus-browser-tester.toml'],
    ['antigravity', '.agents/workflows/pegatus-browser-test.md', null],
  ]) {
    const packet = generateHost(catalog, { host, scope: 'project', root, models: {} });
    assert.ok(packet.operations.some(operation => operation.relativePath === workflow), host);
    if (role) assert.ok(packet.operations.some(operation => operation.relativePath === role), role);
    assert.ok(packet.operations.some(operation => operation.relativePath === `.pegatus/runtime/${host}/catalog/agents/browser-tester.md`));
    assert.equal(packet.operations.some(operation => /(?:^|\/)mcp\.json$/.test(operation.relativePath)), false);
  }
});
