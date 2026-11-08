# Adaptive Workflow Integration Implementation Plan

**Completion status — 2026-11-08:** All implementation and verification tasks below are complete. Independent full suite: 370/370; twelve instruction scenarios met criteria; task and broad final reviews found no findings. See [current validation](../../current-state.md) for evidence and limitations. The user subsequently authorized committing all pending files and updating relevant documents, superseding this plan's original no-commit constraint. Historical task steps retain their execution-time wording. No push, installation update or publication is authorized.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the main Pegatus workflow adapt its execution depth and coordinate task-specific implementation, separate verification, fresh review and bounded repairs.

**Architecture:** One shared host execution guide owns sequencing and semantic handoff/evidence requirements. Existing workflow skills, role briefs, manifest resources and descriptive routes integrate it; existing Node runtime contracts remain unchanged.

**Tech Stack:** Node.js >=22, ESM, Node built-ins and node:test, JSON and Markdown. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-adaptive-workflow-design.md`

## Global Constraints

- Actual target instructions, authoritative knowledge, source, stack and selected checks remain authoritative.
- Small, clear, low-risk work can stay inline without forced specs/plans or multiple agents.
- Default concurrency remains two, capped by configuration and actual host support.
- Honor configured `repairLimit` (default three) and unchanged-failure early stops.
- Do not add a new CLI command, role, provider launcher, progress schema, Result shape or runtime enforcement engine. No `src/` behavior change is planned.
- No source writes run concurrently with supposedly final testing/review.
- Only the coordinator updates aggregate progress and approval records.
- No commit, push, merge or publication is authorized. Use the current checkout; preserve unrelated work and existing instructions, source locks, vendor bytes, generated files and installations.

## Review Focus

1. A tiny permission/data change must not be classified low risk just by diff size; test through instruction scenarios.
2. A verifier/reviewer role label must not imply separate contexts; test fallback, explicit inline and reused-agent scenarios.
3. Handoff skill references must reach installed packets without flattening or losing required overlays/resources; use actual generator and handoff APIs.
4. A late source edit must invalidate affected testing/review, including untracked source; evaluate changing-state scenarios and existing verification regressions.
5. Review findings and check failures must share preserved repair accounting, approval and scope boundaries; evaluate stale/wrong remedies, unavailable prerequisites and resume.

## Task 1: Integrate the host workflow and its installable contract

**Files:**
- Create: `catalog/skills/pegatus-execute/execution-guide.md`, `tests/adaptive-workflow.test.mjs`.
- Modify: `catalog/skills/pegatus-start/SKILL.md`, `catalog/skills/pegatus-design/SKILL.md`, `catalog/skills/pegatus-plan/SKILL.md`, `catalog/skills/pegatus-execute/SKILL.md`, `catalog/skills/pegatus-verify/SKILL.md`.
- Modify: `catalog/agents/verifier.md`, `catalog/agents/code-reviewer.md`, `catalog/agents/build-test-repairer.md`, `catalog/context-protocol.md`, `catalog/manifest.json`, `catalog/README.md`, `docs/orchestration.md`, `README.md`.
- Modify only if needed for coordinator return and preventing recursive execution: `catalog/skills/pegatus-review/SKILL.md`, `catalog/skills/pegatus-review-feedback/SKILL.md`.
- Adjust existing focused tests only for intentional route/closure changes; no unrelated test rewrites.

**Interfaces:**
- Consumes existing `loadCatalog(root)`, `workflowRoute(catalog,{classification,approved})`, `selectSkills(catalog,task)`, `selectResources(skill,task)`, `generateHost(catalog,{host,scope,root})`, `buildHandoff(task,context)` and context budgets.
- Produces one installed shared execution guide linked by coordinator consumers and relevant roles; task-specific skill/evidence packets are referenced artifacts transported by existing context resources/evidence refs. No new JSON contract.

- [x] Write meaningful tests before product edits. Assert the feature route orders implementation → verification → review → final verification and preserves design/scope gates; small routing remains artifact-light. Use actual generated project/user packets for Claude/Codex/Antigravity to check guide bytes and relevant links/resources. Exercise selected stack resources and a supplemental packet through `buildHandoff`, including existing overflow blocking. Do not simulate a new phase engine or use only prose-string assertions.
- [x] Run `node --test tests/adaptive-workflow.test.mjs`; record expected initial route/resource failures before integration.
- [x] Implement the shared guide from the spec: adaptive decision, bounded skill/overlay/dependency packets, implementer completion barrier, separate verifier, fresh reviewer, feedback dispositions, debugging, authorized repairs, stable-state rechecks and final gates. Preserve runtime repair callback ordering; distinguish it from outer independent review. Record identities, working-content fingerprints, tools/prerequisites, coverage and actual evidence. Carry one task repair budget across phases/resume.
- [x] Wire guide references into the listed workflows/roles/context protocol and declared resource closure. Align manifest adaptations with the actual skills. Feature route uses existing phase names in this order: `context, design, plan, implement, verify, review, verify, report`; repeated verify describes final checks, not a runtime phase engine. Keep direct review/testing/assessment intent and nonrecursive coordinator handoffs explicit.
- [x] Update user-facing orchestration/catalog/README guidance to describe the same main flow and honest runtime/host limits. Reuse existing attribution; do not copy new upstream bytes or add runtime dependencies.
- [x] Run `node --test tests/adaptive-workflow.test.mjs tests/workflow-contract.test.mjs tests/catalog.test.mjs tests/orchestration.test.mjs tests/review-workflow.test.mjs tests/review-feedback.test.mjs tests/debugging-workflow.test.mjs`. Diagnose actual failures, make only justified in-scope repairs and retain red/green command evidence.
- [x] Self-review and write full implementation report to this plan's ignored workspace. Leave all changes uncommitted and return to coordinator. Do not start independent final verification while source edits are active.

## Task 2: Independently verify, review and finish the integrated state

**Files:** Read Task 1 outputs; write only evidence/reports in `.superpowers/sdd/2026-11-08-adaptive-workflow-integration/`. Coordinator alone updates the ledger and plan checkboxes.

**Interfaces:** Consumes stable Task 1 code/content, spec acceptance table and retained test evidence. Produces actual command results, observed instruction-scenario answers, independent review/dispositions, any justified repair requests and final report.

- [x] Stop implementer source writes. Record Git identity plus content hashes for changed/new product files, tests and relevant observed scope. Verify no unrelated file changed.
- [x] Dispatch a separate verifier with the guide and acceptance scenarios. It runs `npm test`, `npm run lint`, `npm pack --dry-run`, inspecting actual package file list for guide/reference closure and excluded scratch. Retain logs and before/after content observations. Browser checks are unnecessary because this kit change has no observable application UI behavior.
- [x] Have fresh scenario contexts read actual guidance and answer concrete next-action cases from the spec. Cover small/risky work, skills/resources, independence/fallback, unstable state, failures/feedback, scope changes, prerequisites and resume budget. Retain prompts, actual answers and coordinator/verifier evaluation. Do not claim native installed-host acceptance from these evaluations; no host setup, installation or credential changes are authorized.
- [x] Generate a working-tree review package relative to `d053f3b6cbcf96d8a6ff4df4fa0b6db879f99520`, including this task's untracked guide/test/design/plan files and excluding unrelated documents and ignored evidence. No staging or commits to create the package.
- [x] Dispatch fresh reviewer context after verifier returns; reviewer performed neither implementation nor verification. Obtain both spec-compliance and quality verdicts for Task 1, then a broad final review after task completion. Read-only review examines actual diff, requirements, relevant consumers and evidence, with source inspection for concrete risks. Do not rerun unchanged tests just for review.
- [x] Evaluate findings against actual evidence and scope. Reuse implementer for justified repairs; retest affected behavior, refresh content observation and obtain scoped re-review. Preserve configured budget (default three), no reset per phase. Material scope expansion returns to the user; routine in-scope repair is already authorized.
- [x] Reuse unchanged final-state check evidence where valid; rerun after relevant edits. Inspect final Git state/whitespace, record results and unresolved limits in ledger, mark completed checkboxes and report. Preserve ledger/evidence because work remains uncommitted; no deletion based on nonexistent commit history.

## Execution authorization and self-review

The user's "okay go" followed the explicit proposal to write the plan and proceed. It preserves that authorization; no new permission gate for routine planning details. Use bounded subagent execution for this cohesive multi-file integration, then independent testing and fresh review. The current-checkout instruction overrides worktree defaults. Subagent execution is a development method, not proof of the generated Pegatus roles or native installed-host enforcement.

Self-review: all spec sections map to Task 1 guidance/closure or Task 2 evidence. No new runtime types or interfaces are introduced; existing helper signatures above are authoritative. Review Focus scenarios belong to Task 2 and resource/route assertions to Task 1. Task 2 consumes Task 1 outputs and cannot collect stable evidence while Task 1 edits them.
