import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, selectResources, workflowRoute } from '../src/catalog/manifest.mjs';
import { generateHost } from '../src/adapters/capabilities.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = await loadCatalog(root);
const guide = 'catalog/skills/pegatus-execute/execution-guide.md';
const consumers = ['start', 'brainstorm', 'design', 'plan', 'execute', 'verify',
  'review', 'review-feedback', 'resume', 'investigate', 'browser-test'];

// Installation coverage only: these assertions do not prove human or native-host adherence.
test('every coordinator entry point ships a reachable confirmation policy in all host scopes', () => {
  for (const host of ['claude', 'codex', 'antigravity']) {
    for (const scope of ['project', 'user']) {
      const generated = generateHost(catalog, {host, scope, root});
      const files = new Map(generated.operations.map(op => [op.relativePath, Buffer.from(op.content)]));
      const prefix = `.pegatus/runtime/${host}/`;
      assert.deepEqual(files.get(prefix + guide), catalog.files[guide]);
      for (const id of consumers) {
        const entry = catalog.skills.find(item => item.id === `pegatus-${id}`);
        assert.ok(selectResources(entry, {task: id}).includes(guide), entry.id);
        const body = files.get(prefix + entry.path).toString();
        const link = [...body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
          .find(match => match[1].includes('#human-confirmation-and-execution-mode'));
        assert.ok(link, entry.id);
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(prefix + entry.path), link[1].split('#')[0]));
        assert.equal(target, prefix + guide);
        assert.ok(files.has(target), target);
      }
      const wrappers = generated.operations.filter(op => !op.relativePath.startsWith('.pegatus/'));
      assert.ok(wrappers.length);
      for (const wrapper of wrappers) {
        assert.ok(wrapper.content.includes('Inline forbids all subagent spawning, including testing and review'), wrapper.relativePath);
        assert.ok(wrapper.content.includes('pending human phase confirmations'), wrapper.relativePath);
        assert.ok(wrapper.content.includes('retaining applicable skills, guards and checks'), wrapper.relativePath);
        assert.ok(wrapper.content.includes('Never silently switch Native subagents to Inline'), wrapper.relativePath);
        assert.ok(wrapper.content.includes('Automatic Inline fallback and automatic phase progression are separate options'), wrapper.relativePath);
        assert.ok(wrapper.content.includes('prior explicit human approval for this task only'), wrapper.relativePath);
        assert.ok(wrapper.content.includes('honor their recorded scope on resume, otherwise ask and wait'), wrapper.relativePath);
      }
    }
  }
});

test('route eligibility retains its existing contract rather than claiming human authorization', () => {
  assert.equal(workflowRoute(catalog, {classification: 'small'}).canImplement, true);
  assert.equal(workflowRoute(catalog, {classification: 'feature', approved: ['design']}).canImplement, false);
  assert.equal(workflowRoute(catalog, {classification: 'feature', approved: ['design', 'scope']}).canImplement, true);
  assert.ok(catalog.files[guide].toString().includes('reports existing route eligibility only'));
});

// These are instruction-contract checks, not simulated native-host decisions.
test('direct-entry instructions preserve mode, plan and preapproved fallback decisions', () => {
  const text = file => catalog.files[file].toString();
  const start = text('catalog/skills/pegatus-start/SKILL.md');
  assert.ok(start.includes('the human still selects Native subagents or Inline'));
  assert.ok(!start.includes('Small clear low-risk work stays inline'));
  const plan = text('catalog/skills/pegatus-plan/SKILL.md');
  assert.ok(plan.includes('even when the plan stays within approved design/scope'));
  assert.ok(plan.includes('Automatic phase progression does not approve an unseen plan'));
  assert.ok(!plan.includes('Seek approval only for material scope/design change'));
  const review = text('catalog/skills/pegatus-review/SKILL.md');
  assert.ok(review.includes('If no mode has been selected for a direct review, ask the human'));
  assert.ok(!review.includes('otherwise review inline only when delegation is unavailable'));
  const reviewGuide = text('catalog/skills/pegatus-review/review-guide.md');
  assert.ok(reviewGuide.includes('if no mode is selected, ask the human'));
  const browser = text('docs/browser-testing.md');
  assert.ok(browser.includes('unless automatic Inline fallback was explicitly human-approved for this task'));
  assert.ok(browser.includes('disclose any approved fallback'));
});
