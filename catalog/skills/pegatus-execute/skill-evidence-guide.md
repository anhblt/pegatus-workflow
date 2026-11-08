# Skill-use evidence and simplicity

Apply this added procedure by default to authorized implementation tasks, proportional to risk and scope, within the [context protocol](../../context-protocol.md) and [shared execution guide](execution-guide.md). Direct design, planning, review and resume use the relevant phase below without expanding their requested scope or authorizing product edits. These are host instructions, not native attestation or a runtime enforcement engine.

## Authority and applicability first

Read applicable host/project instructions, perform prescribed vault/code-map/business-flow discovery, then confirm relevant source. Source establishes current behavior, not intended business rules. Report unresolved conflicts; do not silently override the knowledge owner or infer business intent. A no-vault project follows its ordinary context protocol.

Before edits, identify relevant technical skills against the actual task, project stack, target framework/version and test tooling. Catalog matching assists discovery; a match alone does not establish version compatibility or semantic applicability. Read selected Pegatus overlays first, skill bodies and applicable dependencies/linked resources. Do not load all stack packs or count unrelated guidance as coverage. If none fits, record no suitable skill and follow project conventions without claiming technical-skill coverage.

## Smallest complete implementation

During design and planning, consider existing project components/patterns, platform or standard-library features and installed dependencies before new machinery. Respect required project layers and conventions. Briefly record material choices when a smaller-looking alternative is rejected for correctness, compatibility or project requirements.

During implementation, finish the approved scope, including affected callers, tests/fixtures, configuration and exports. Avoid speculative abstractions, wrappers, options and dependencies; do not broaden into unrelated cleanup. Prefer readable, complete changes over compressed expressions or raw line count.

During existing code review, assess concrete guidance application, unnecessary additions and safe simplifications alongside correctness, security and downstream effects. Each finding needs a location and concrete benefit or consequence. Zero simplicity findings is valid; a justified longer implementation can pass. There is no deletion quota, automatic rejection of long changes or speculative style-finding requirement. Preserve existing repair authority and budget; edits invalidate affected evidence and require appropriate retesting/re-review.

Never remove required architecture, trust-boundary validation, data-loss handling, security, accessibility or meaningful tests to reduce code. Project-selected checks remain authoritative. Trivial changes do not gain artificial tests or a separate reviewer solely for this procedure; substantial work retains existing independent testing/review requirements and disclosed fallbacks.

## Compact evidence in existing artifacts

Distinguish **selected**, **read** and **applied**. A manifest match, resource reference or loaded file proves neither application nor adherence. Record only what actually happened; evidence is agent-reported and reviewer-assessed, not proof from the host.

Use the existing task report/evidence and checkpoint references. A tracked task may use `.pegatus/work/<task-id>/evidence/skill-use.md`; an artifact-light task can use a few lines in its existing report. This is an example format, not a mandatory schema or a new required file:

```markdown
Context: instruction paths; prescribed knowledge refs; confirmed source refs; conflicts/gaps.
Selected: catalog skill ID; task/stack/version applicability; upstream pin when available.
Read: overlay, skill and relevant resource paths actually read (record omissions/gaps).
Applied: concrete guidance -> code location or implementation decision.
Not applied: relevant guidance intentionally omitted and reason, if any.
Review: actual reviewer/context identity; independent or inline; assessed application,
        simplicity outcome/findings, unresolved gaps and state checked.
Skip: originating user instruction; evidence, simplicity or both; this task only, if any.
```

Do not invent examples to fill fields. No suitable skill, missing resource or unverified application are honest outcomes. Independent reviewers assess the record against actual relevant guidance and changed source; inline assessment must say it is inline. Unsupported independent review remains a gap rather than a renamed role claiming independence. Carry record paths through existing `resources`, evidence refs and context manifests; no new required progress fields or CLI commands. Only the coordinator writes aggregate progress.

## Explicit skips, gaps and resume

An explicit user skip may cover skill-use evidence, the added simplicity review, or both. An unqualified request to skip this feature means both for the current task only; disclose scope and originating instruction. Never infer a skip from task size, time pressure or missing tools. A skip does not disable ordinary technical guidance, ordinary correctness review, mandatory project checks, context discovery, security or approval requirements. It never becomes a default for unrelated tasks.

When resources or review capability are unavailable, record the gap and follow existing fallback rules. Block only dependent decisions that cannot safely proceed. Selection/reading must not become a checked-application claim. Continue independently safe work without fabricating completeness.

Handoff and resume preserve evidence references, actual review status and the applicable task-only skip. Re-evaluate skill applicability when scope, stack/version, instructions or source state changes. Prior evidence cannot establish adherence of later edits; invalidate affected application/review/verification claims and refresh relevant checks. Preserve still-valid approvals and completed work through existing state APIs.

## Pinned upstream and owned adaptation

This procedure adapts the passive [Ponytail core reference](../../../vendor/ponytail/skills/ponytail/SKILL.md) at revision `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846`, with its actual [MIT license](../../../vendor/ponytail/LICENSE), Copyright (c) 2026 DietrichGebert. Original bytes and hashes are preserved; the copied skill is not separately registered or invoked.

Apply the Pegatus-owned procedure above within project/host authority. The raw reference's session-wide persona, session commands, lite/full/ultra modes, shortest-diff preference and test/comment wording are not additional mandates. Existing meaningful verification, readable completeness and task-only activation govern. No upstream installer, hooks, scripts, dashboard, telemetry, plugin registration or npm dependency is installed. Installed references resolve within the detached runtime without the reference checkout or a network fetch.
