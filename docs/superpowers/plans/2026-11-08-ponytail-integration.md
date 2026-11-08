# Ponytail Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make technical-skill application reviewable and integrate proportional Ponytail simplicity guidance into existing Pegatus workflows.

**Architecture:** Extend the existing shared execution procedure with one Pegatus-owned evidence/simplicity guide. Preserve upstream core guidance and license as passive pinned resources; workflows consume the owned adaptation, not upstream session commands. Existing catalog resource declarations, generated detached runtime and task evidence references transport the guidance without new runtime contracts.

**Tech Stack:** Node.js >=22, ESM, Node built-ins, node:test, Markdown and JSON; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-08-skill-evidence-and-simplicity-design.md` (approved 2026-11-08).

**Execution status — 2026-11-08:** User selected Native execution. All three tasks completed. Product integration, twelve inline scenarios, 373/373 full-suite tests, lint and detached package checks passed. A fresh independent final review found no Critical, Important or Minor findings. After status reconciliation, 15/15 focused tests and refreshed package inventory passed; final checklist/status wording received whitespace and link checks. Actual installed-host adherence remains unqualified. The user subsequently authorized committing the completed integration, superseding the original no-commit constraint below; no push, publication or installation update is authorized.

## Global Constraints

- Run skill-use evidence and simplicity review by default for implementation tasks, proportional to the change.
- Follow applicable host and project instructions, then prescribed vault/code-map/business-flow discovery, then relevant source confirmation. Apply technical skills and Ponytail within those constraints.
- Selection, reading and application are distinct claims. Evidence is agent-reported and reviewer-assessed, not native host attestation.
- An explicit skip can cover skill-use evidence, the added simplicity review, or both; interpret an unqualified request to skip this feature as both for the current task only and disclose the scope.
- Existing mandatory checks, ordinary technical guidance/correctness review, security, approvals, coordinator ownership and repair limits remain in force.
- Never remove required architecture, trust-boundary validation, data-loss handling, accessibility, security or meaningful tests to reduce code.
- No required progress-schema fields, new CLI commands, runtime enforcement subsystem, roles or npm dependencies.
- No upstream installer, scripts, hooks, plugin registration, dashboard, telemetry, session-wide persona or lite/full/ultra mode.
- Use the current checkout. No commits, push, publication, installation updates or host-setting changes are part of this plan. Existing upstream entries/bytes and dependency/release metadata remain unchanged.
- Preserve the existing Vercel licensing blocker and native host qualification limits.

## Review Focus

1. A selected or loaded backend skill must not become a false application claim; Task 2 checks concrete code/decision evidence and mismatched versions.
2. Core upstream instructions may conflict with project authority or test policy; Tasks 1–2 keep raw bytes passive and exercise owned precedence/adaptation.
3. A skip may leak across tasks or suppress mandatory checks; Task 2 exercises partial, unqualified and resumed skips.
4. Old evidence may survive changed source, stack or scope; Task 2 exercises invalidation and missing-resource/review fallbacks.
5. Generated resources may work only beside the reference clone; Tasks 1–3 check hashes, all host/scope packets and a detached package snapshot without clone access.

## File map and interfaces

- Create `vendor/ponytail/skills/ponytail/SKILL.md` and `vendor/ponytail/LICENSE`: exact selected upstream bytes.
- Modify `sources.lock.json`, `vendor/NOTICE.md`, `catalog/ADAPTATIONS.md`: provenance, hashes, actual notice and explicit adaptation decisions.
- Create `catalog/skills/pegatus-execute/skill-evidence-guide.md`: single owner of added evidence, simplicity and skip semantics.
- Modify `catalog/skills/pegatus-execute/execution-guide.md`, `catalog/context-protocol.md`: integrate the new guide with existing packets, review and resume context.
- Modify `catalog/skills/pegatus-design/SKILL.md`, `catalog/skills/pegatus-plan/SKILL.md`, `catalog/skills/pegatus-execute/SKILL.md`, `catalog/skills/pegatus-review/SKILL.md`, `catalog/skills/pegatus-verify/SKILL.md`, `catalog/skills/pegatus-resume/SKILL.md`, `catalog/agents/code-reviewer.md`: phase-specific consumption; avoid duplicating the policy.
- Modify `catalog/manifest.json`: declare the new guide and pinned resources for affected consumers, including existing shared-execution-guide consumers; no separate invocable Ponytail skill or alias.
- Create `tests/ponytail-integration.test.mjs`; extend `tests/source-lock.test.mjs` only if its current generic checks do not cover the added source.
- Modify `catalog/README.md`, `README.md`, `docs/current-state.md`: behavior and exact evidence/limits after implementation.
- Keep raw logs and scenario reports under ignored `.superpowers/sdd/2026-11-08-ponytail-integration/`, outside distributable content. Do not alter historical task records.

Existing interfaces remain authoritative: `loadCatalog(root)`, `lintCatalog(catalog)`, `selectSkills(catalog, task)`, `selectResources(skill, task)`, `generateHost(catalog, {host, scope, root})`, and `buildHandoff(task, context)`. Use the actual exports/import paths in `tests/adaptive-workflow.test.mjs` and `tests/source-lock.test.mjs`; do not introduce replacement APIs.

## Task 1: Pin provenance and ship the integrated guidance

**Files:** File map above, excluding final validation/status reports.

**Interfaces:** Consumes approved spec and existing catalog/generator/handoff APIs. Produces the installed owned guide, passive upstream bytes and unchanged-shape referenced evidence transport used by Task 2.

- [x] Read applicable instructions, catalog context and relevant resource declarations. Inspect the existing source-lock tests and linter before adding the new source.
- [x] Add failing tests named `ponytail source retains exact core bytes and MIT notice`, `all host scopes retain reachable evidence guidance and passive upstream resources`, and `handoff carries evidence references without changing state contracts`. Assert exactly two selected upstream paths, revision `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846`, SHA-256 integrity, actual copyright/permission text, preserved guide/vendor bytes in Claude/Codex/Antigravity project/user packets, resolvable local links and evidence refs in existing context manifests. Assert no Ponytail command, role, hook or dependency is added. Reuse generator/handoff patterns from adaptive tests rather than simulate a new runtime.
- [x] Run `node --test tests/ponytail-integration.test.mjs`; retain expected failures caused by absent integration.
- [x] Confirm the clean reference checkout at `C:/Workspace/PonyTail` matches the chosen revision. Extract `skills/ponytail/SKILL.md` and `LICENSE` from that Git revision as bytes, avoiding PowerShell text redirection/encoding conversion. Add source ID `ponytail`, repository `https://github.com/dietrichgebert/ponytail`, MIT declaration and `sha256:` content hashes in the existing lock format. Stop if the pin cannot be verified; do not silently select a different revision or fetch latest.
- [x] Retain the actual `Copyright (c) 2026 DietrichGebert` notice and full MIT license. Explain adaptation boundaries in `catalog/ADAPTATIONS.md`: project-context precedence, task-only activation, existing meaningful verification policy and omission of upstream modes/commands. Raw core content is passive reference material; owned guidance explicitly governs its use.
- [x] Write the owned guide with a compact optional Markdown record: context references; skill IDs/applicability/pin; overlay/resource paths actually read; applied guidance with code/decision refs; relevant nonapplication reasons; review result/identity/gaps; explicit skip origin/scope. Store it in existing report/evidence artifacts, not required JSON fields. A no-suitable-skill outcome is valid; do not invent adherence examples.
- [x] Integrate reuse/standard-library/existing-dependency consideration into design/plan; complete scoped implementation into execute; concrete beneficial simplicity findings into review. Zero findings and justified longer code can pass. Preserve ordinary correctness/security review and existing repair authority.
- [x] Integrate default activation, proportionate trivial-task evidence, partial/unqualified task skips, missing-resource/review disclosures, changed-state invalidation and resume reevaluation. Add links/resource declarations to mapped consumers and existing shared-execution-guide consumers. Preserve selective resource loading; do not force unrelated stack packs.
- [x] Run `node --test tests/ponytail-integration.test.mjs tests/source-lock.test.mjs tests/adaptive-workflow.test.mjs tests/catalog.test.mjs tests/adapters.test.mjs tests/orchestration.test.mjs`. Require zero failures; diagnose and repair only in-scope defects. Inspect diff for unchanged runtime, dependency graph and old vendor hashes.

## Task 2: Exercise behavior and review the stable integration

**Files:** Read Task 1 outputs; write scenario prompts/results and review findings only under this task's ignored evidence directory. Repairs return to Task 1 ownership.

**Interfaces:** Consumes stable generated guidance and approved acceptance requirements. Produces retained actual observations and scoped dispositions, distinguishing structural checks, instruction evaluations and native host trials.

- [x] Stop source writers and record Git identity plus working-file hashes, including untracked product files. Evaluate concrete next-action cases using the actual owned guidance and retained prompts/answers; do not treat assertions about prose strings as proof of adherence.
- [x] Exercise a version-compatible backend API task and a mismatched/irrelevant skill: require selected/read/applied claims to remain separate, with concrete guidance/code refs and no false skill coverage. Include no-suitable-skill and missing linked-resource cases.
- [x] Exercise vault-backed discovery, contradictory business intent and no-vault context: require instructed discovery before source confirmation, explicit unresolved conflict and no invented authority.
- [x] Exercise trivial work, substantial work and unavailable separate review: require proportional evidence, preserved existing independence requirements and honest inline fallback. No artificial tests or extra seat for trivial work.
- [x] Exercise a justified longer validation path and a speculative wrapper: require preserved validation/architecture and either zero findings or a concrete located simplification with benefit; no deletion quota or compressed-code target.
- [x] Exercise evidence-only skip, simplicity-only skip, unqualified skip, same-task resume and a new task: require exact task-only scope, originating instruction and preserved ordinary guidance/mandatory checks.
- [x] Exercise changed code, stack/version, scope and instruction inputs after checkpoint: require reevaluation of applicability and affected evidence, preserved references/skip scope and explicit gaps rather than stale checked claims.
- [x] Review the actual final diff against all eight spec acceptance scenarios, source notices and downstream generated consumers. Use a fresh reviewer if the selected execution method authorizes delegation; otherwise disclose the absence of independent review. Assess findings before authorized repair; retest and rereview affected changes under the existing repair budget.

## Task 3: Verify the package and reconcile documentation

**Files:** `README.md`, `catalog/README.md`, `docs/current-state.md`, this plan; ignored validation reports.

**Interfaces:** Consumes stable Task 1 content and Task 2 outcomes. Produces exact final validation record and remaining host qualification gaps.

- [x] Update user documentation to explain actual skill-use evidence, simplicity review, task skips and advisory evidence limits. Replace obsolete draft/unimplemented status only once implementation exists. Preserve dated historical evidence.
- [x] Run `npm test`, `npm run lint` and `npm pack --dry-run --json`; retain outcomes separately. The existing Vercel notice warning remains a known qualification gap, not new clearance.
- [x] Inspect actual package inventory for both Ponytail files, lock, notices, owned guide and resource consumers; exclude task logs/scratch. Use a temporary detached package snapshot to load/lint the catalog and generate all three hosts without access to `C:/Workspace/PonyTail`; verify byte hashes and local resource links. Do not install into user solutions or host settings.
- [x] Record observed host trials only if actually performed with available tools and retained evidence. If none are performed, explicitly leave actual host adherence unqualified; instruction evaluations and generated fixtures cannot close that gate.
- [x] Run `git diff --check`, inspect final status and compare working-content hashes with verification scope. Rerun affected checks after edits; do not repeat unchanged checks without cause. Mark completed steps and report remaining gaps. Leave changes uncommitted.

## Self-review and execution handoff

Spec coverage: default/skip/context/evidence/simplicity requirements map to Task 1 and Task 2; provenance and detached closure map to Tasks 1 and 3; every acceptance scenario maps to Task 2 or final package checks. No new runtime signatures or fields are introduced. Review Focus cases have explicit checks above. Three tasks share one guidance/resource contract and run sequentially.

Planning verified the local reference revision and clean reference checkout on 2026-11-08; it did not copy bytes or claim latest upstream status. Implementation must repeat pin/byte validation. The user selected Native execution; changes were implemented in this context and reviewed in one separate fresh context. No commits, installation updates or publication were performed. Full test evidence predates only final status/checklist reconciliation; it is not represented as a full rerun after that documentation follow-up.
