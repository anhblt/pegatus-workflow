# Selective Worker Skills Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. User selected Inline and authorized automatic progression until finished on 2026-11-15; no subagents, including review.

**Goal:** Expose overlay-first guidance and preserve selective task-specific worker reading.

**Architecture:** Extend existing wrapper generation and portable handoff instructions. Keep catalog selection, runtime transport and result shapes unchanged.

**Tech Stack:** Node.js >=22, ESM, built-in test runner, Markdown catalog.

**Spec:** ../specs/2026-11-15-selective-worker-skills-design.md

## Global constraints

- Current checkout; no dependency, vendor, source-lock or release changes.
- No CM edits, installation updates, host registration, commits or publication.
- Inline assessment cannot claim independent review or native host qualification.

## Review focus

- Overlay-free entries retain their existing procedure link.
- Custom shared runtime paths resolve all generated links.
- Live-context/conversational exceptions remain before general discovery.
- Small tasks do not inherit unrelated testing/review bundles.
- Resume does not assume inherited skill visibility or persistent role registration.

## Task 1: Overlay-first wrappers

Files: src/adapters/capabilities.mjs; tests/adapters.test.mjs.
Interface: generateHost(catalog, options), unchanged operation shapes.

- [x] Add a regression enumerating overlay-bearing skills across Claude/Codex project/user scope, checking link order, detached runtime resolution and absence of unrelated skill links. Antigravity keeps portable skill access rather than new native skill wrappers.
- [x] Run the focused regression and confirm failure for omitted overlays.
- [x] Add an overlay link before the existing body link only when entry.overlay exists; point selected dependencies/resources to catalog discovery without embedding resource bodies or unconditional lists.
- [x] Run adapter and existing exception/closure tests; preserve overlay-free behavior.

## Task 2: Selective worker procedure

Files: catalog/context-protocol.md; catalog/skills/pegatus-execute/execution-guide.md; catalog/skills/pegatus-execute/skill-evidence-guide.md; catalog/agents/backend-implementer.md; catalog/agents/frontend-implementer.md; docs/orchestration.md; tests/adaptive-workflow.test.mjs.
Interface: existing resources/evidence references; no runtime fields.

- [x] Make task-specific selection, exact reading paths, no blanket role bundles, missing guidance handling, result assessment and dispatch/resume availability checks explicit.
- [x] Extend the existing handoff scenario to demonstrate a small C# packet excludes unrelated testing/frontend guidance while retaining its overlay/body and packet references.
- [x] Evaluate missing guidance and resume scenarios inline; distinguish host procedure from native enforcement.
- [x] Run focused workflow tests.

## Task 3: Verify and review

- [x] Run npm test, npm run lint and npm pack --dry-run; retain scratch logs outside package content.
- [x] Review the diff inline for resource links, scope, stable APIs and honest capability limits; repair any findings and rerun affected checks.
- [x] Mark completed steps and report actual checks and remaining native trial limitation.

Ruling: User task-scoped automatic approval covers this plan and progression; no repeated approval prompts. User Inline instruction overrides Superpowers' fresh-reviewer default. No suitable .NET/React skill applies to this Node/Markdown kit implementation.

## Resume verification and inline review — 2026-11-15

User resumed with "Then continue". Continued in the current main checkout; existing changes match the checkpoint. No subagents, commits, installed-project edits or registration changes.

Tasks 1–2: complete. The checkpoint records the original missing-overlay RED. Fresh focused suite passed 26/26: node --test tests/adapters.test.mjs tests/adaptive-workflow.test.mjs tests/human-confirmation.test.mjs tests/ecc-parity.test.mjs tests/brainstorm.test.mjs. Wrapper coverage enumerates all catalog skills (including overlay-free entries) in Claude/Codex project/user scopes with a custom shared runtime path. Existing workflow checks preserve closure across all three hosts and both scopes, including Antigravity's portable resources and command aliases. Live-context/conversational exceptions remain before general instructions.

Inline scenario assessment:
- Missing mandatory skill reference: receiver stops dependent work and requests the reference; unrelated safe work may continue. Coordinator supplies guidance and reviews affected existing changes before acceptance. This is procedural; buildHandoff transports references and does not prove they were read.
- Resume after conversation-local registration loss: coordinator checks actual role/delegation/tool availability and re-supplies the packet. Native unavailability retains existing user-approved fallback rules; no automatic permission expansion or invented registration API.
- Small C# implementation: selected overlay/body travel in the handoff without test-authoring or frontend bundles. No fit remains a valid selection outcome.

Inline self-review (user-selected Inline; no independent-context review claimed): no actionable correctness, security or API findings. The generator changes only reading links/text; operation shapes, source/vendor bytes, permissions and host capability claims remain unchanged. No runtime loader or receipt schema added. Moved the worker-packet paragraph before the bounded-retrieval heading, as identified in the checkpoint.

Checks so far: catalog lint passed with the existing distribution-notice-gap warning; package dry run passed (2,708 entries), retaining the three task planning/checkpoint documents under the existing docs inclusion. No temporary test logs, .superpowers, .pegatus or tests entries were found in that package inventory. Logs are under the system TEMP directory. Full npm test still running at this entry.

Ruling: Preserve checkpoint/plan as this task's record instead of creating or changing .superpowers/sdd records; project instructions and the existing approved checkpoint govern this continuation. No additional task workspace or repeated RED investigation is needed.

Final verification: COMPLETE. npm test passed 387/387, zero failures/cancellations/skips, on Node v24.19.0 (913.6 seconds). The slow installation/security checks completed successfully. npm run lint and npm pack --dry-run passed; existing Vercel notice warning remains a release gate. git diff --check passed. No actionable inline review findings or deferred minors. No native Antigravity worker trial or independent-context review was performed; local tests establish generated references and transport, not native reading/application. Implementation is complete and remains uncommitted and uninstalled, as authorized.
