# Skill-use evidence and Ponytail simplicity guidance

Date: 2026-11-08
Status: Approved by the user on 2026-11-08 ("Good to go."). Implemented at the portable catalog/resource level through the linked implementation plan; actual installed-host adherence remains unqualified. See [current validation](../../current-state.md).

## Intent

The user has seen lengthy backend changes and cannot tell whether the workflow actually used relevant .NET skills. Pegatus should make technical skill use reviewable and encourage the smallest complete implementation without sacrificing quality. Shorter code is an expected possibility, not a success metric or a guarantee.

## Agreed behavior

- Run skill-use evidence and simplicity review by default for implementation tasks, proportional to the change.
- Allow an explicit per-task skip of these added checks. Existing project-required checks, context discovery, security, approval and verification requirements remain in force.
- Follow applicable host and project instructions, then prescribed vault/code-map/business-flow discovery, then relevant source confirmation. Apply technical skills and Ponytail within those constraints.
- Report unresolved instruction or documentation conflicts instead of silently choosing an authority. Source establishes current behavior; it does not independently establish intended business behavior.
- Integrate selected guidance into existing Pegatus workflows rather than require the user to invoke Ponytail separately.

## Existing foundation

The context protocol already requires instructed discovery, scoped retrieval, source confirmation and provenance-bearing handoffs. Catalog discovery uses selectSkills and selectResources with trusted task/stack/version inputs; selected skills have overlays and linked resource closure. Execute and review already require appropriate context, checks and review evidence. This design extends those procedures instead of creating another knowledge store or competing workflow.

Relevant surfaces are catalog/context-protocol.md, catalog/README.md, catalog/manifest.json, existing design/plan/execute/review/verify/resume guidance, role handoffs and the installed resource closure. Exact edits belong to implementation planning.

## Proposed implementation decisions

These are the author's recommended calls, not additional user requirements.

### Skill selection and evidence

Before code edits, identify relevant technical skills using the actual project stack, target version and task. Read their Pegatus overlays, skill bodies and applicable linked resources. Do not load all .NET skills or assume every backend task needs a catalog skill. If no suitable skill exists, record that outcome and use project guidance without claiming technical-skill coverage.

Maintain a compact skill-use record in existing task evidence and report artifacts. It contains:

- Instruction paths, knowledge references and relevant source references, reusing existing context evidence.
- Selected catalog skill IDs, overlay/resource paths actually read, applicability and upstream pin where available.
- Concrete guidance applied, with code or decision references; relevant guidance intentionally not applied and its reason.
- Review outcome and unresolved gaps; identify independent versus inline review.
- Any explicit user skip, its scope and originating instruction. No inferred skip from time pressure or task size.

Selection, reading and application are distinct claims. A manifest match or loaded file alone cannot be reported as proof of adherence. Evidence is agent-reported and reviewer-assessed, not native host attestation. Trivial work can use a few lines; do not invent application examples to fill fields.

Use existing evidence/report files and checkpoint references rather than add required progress-schema fields, new CLI commands or a runtime enforcement subsystem. Exact artifact names and compatible formatting are builder decisions. For already tracked tasks preserve current state APIs and coordinator ownership; lightweight tasks need only a concise report under existing tracking rules.

### Simplicity guidance

During design and planning, consider reuse of project components and patterns, suitable platform or standard-library features, and existing dependencies before introducing new machinery. Record a material choice briefly when a smaller-looking alternative was rejected for correctness, compatibility or project conventions.

During implementation, complete the approved scope, including affected callers, fixtures, exports, configuration and necessary checks. Avoid speculative abstractions, options, wrappers and dependencies. Readability and completeness take precedence over compressed expressions or raw line count. Do not broaden scope into unrelated cleanup.

During existing code review, assess unnecessary additions and safe simplifications alongside correctness, security and relevant technical-skill guidance. A finding needs a concrete location and benefit or consequence; no mandatory deletion quota, automatic rejection of long changes or speculative style findings. Zero simplicity findings is valid. Follow existing repair authorization and invalidate affected verification after edits.

Never remove required architecture, trust-boundary validation, data-loss handling, accessibility, security or meaningful tests to reduce code. Project-selected verification remains authoritative; trivial changes do not gain artificial tests solely to satisfy Ponytail wording.

### Skips, gaps and resume

An explicit skip can cover skill-use evidence, the added simplicity review, or both; interpret an unqualified request to skip this feature as both for the current task only and disclose the scope. It does not disable ordinary technical guidance or ordinary correctness review. Skips do not carry into unrelated tasks or become user defaults.

When a selected resource or review capability is unavailable, record the gap and follow existing context/review fallback rules. Do not label unverified application as checked. Block only dependent decisions that cannot safely proceed under existing requirements. Resume and handoffs carry evidence and skip scope; re-evaluate applicability when code scope, stack/version, instructions or source state changes. Prior evidence cannot prove adherence of later edits.

## Upstream integration and provenance

Reference checkout: C:/Workspace/PonyTail, inspected at 96608e078b2d5ea607c5c3b8b5a54d1c1fba6846 (one commit after v5.3.3). This is an evaluation snapshot, not a live dependency. Planning must confirm and lock the selected revision before copying content.

Select only the core skills/ponytail/SKILL.md guidance and actual LICENSE notice initially. Preserve selected upstream bytes and hashes through the repository's established source-lock/vendor mechanism, retain Copyright (c) 2026 DietrichGebert and its MIT permission notice, and put Pegatus adaptations in owned guidance. Record explicit adaptations for context precedence, task-scoped activation, verification rules and omission of session levels/commands. Installed references must resolve inside the detached runtime; installations must not depend on the reference checkout or network access.

Review/audit prompts beyond the core skill are not implicitly selected. No upstream installer, scripts, hooks, plugin registration, dashboard, telemetry, npm dependency, session-wide persona or lite/full/ultra mode is included. Existing pinned files remain unchanged unless the implementation plan explicitly requires additions. Existing licensing and release-qualification blockers remain in force.

## Acceptance and verification

The implementation plan should map these scenarios to meaningful checks:

1. A backend API task selects applicable version-compatible skills, reads relevant resources and reports concrete application; an unrelated skill is not claimed as used.
2. A vault-backed project follows prescribed discovery before source reads; conflicting business intent remains explicit. A no-vault project follows its normal context protocol.
3. A trivial change produces proportionate evidence without forced tests or a separate reviewer; substantial work retains existing independent-review requirements and disclosed fallbacks.
4. A justified longer implementation can pass; an unnecessary abstraction receives a concrete review finding. Required validation and project architecture are preserved.
5. Explicit per-task skips are reported, preserve mandatory checks and do not leak to other tasks; resume retains only the applicable task skip.
6. Missing skill resources or unsupported host review are reported accurately; selection/reading alone never becomes proof of adherence.
7. Handoff/resume preserves evidence references and re-evaluates changed scope; changed code invalidates affected evidence.
8. Catalog lint, source hashes, notices and installed resource links remain valid; detached installation requires no PonyTail checkout.

Run task-specific tests plus npm test, npm run lint and npm pack --dry-run as appropriate to the final implementation. Fixture and package results establish structural behavior only. Claims about actual guidance adherence require observed host trials with retained evidence; report each tested host and limitations separately. Do not promise measured code, time or cost savings without a controlled comparison.

## Scope boundaries and next step

No product code, installation behavior or runtime schema is changed by drafting this document. No publishing, target-application modification or automatic remediation is included. Builder may choose exact shared-guidance placement, evidence formatting and tests within these contracts; changes to authority, skip semantics or default activation require renewed design review.

The user approved this full design on 2026-11-08 with "Good to go." The [implementation plan](../plans/2026-11-08-ponytail-integration.md) records the subsequent native execution. The earlier authorization to commit pending files did not itself approve this design; the subsequent explicit approval does. This approval does not authorize publication or changes to installed solutions.
