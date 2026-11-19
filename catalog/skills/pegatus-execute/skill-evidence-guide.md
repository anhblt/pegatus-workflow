# Skill-use evidence and simplicity

Use this guidance by default for authorized implementation and its relevant phases. Match the depth to the task's risk and complexity.

## Authority and applicability first

Follow the [context protocol](../../context-protocol.md) for instruction, knowledge and source discovery. Select skills that fit the assigned task, stack, version and tooling. Read applicable overlays first, then skill bodies and required resources. When no skill fits, record that and follow project conventions.

## Smallest complete implementation

Use the simplest readable approach that fully solves the task. Reuse project code, platform features or installed dependencies where they fit. Cover affected callers, tests, fixtures, configuration and exports. Preserve required architecture, trust-boundary validation, data-loss handling, security, accessibility and meaningful checks.

Apply this in the existing [task packet](execution-guide.md#prepare-a-bounded-task-packet), [implementation handoff](execution-guide.md#implementation-handoff), [verification](execution-guide.md#verify-new-throws) and [code review](../pegatus-review/review-guide.md#2-trace-behavior-beyond-changed-lines).

## Compact evidence in existing artifacts

Distinguish **selected**, **read** and **applied**. Record paths actually read, concrete guidance applied to changes or decisions, and unused selections or gaps. The coordinator checks those claims against the returned changes before accepting the work. If mandatory guidance arrives later, review the changes it affects.

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

Reviewers assess the record against relevant guidance and changed source. Label Inline assessment and report missing independent review. Carry record paths through existing `resources`, evidence refs and context manifests. Only the coordinator writes aggregate progress.

## Explicit skips, gaps and resume

An explicit user skip may cover skill-use evidence, the added simplicity review, or both. An unqualified request to skip this feature means both for the current task only; disclose scope and originating instruction. Never infer a skip from task size, time pressure or missing tools. A skip does not disable ordinary technical guidance, ordinary correctness review, mandatory project checks, context discovery, security or approval requirements. It never becomes a default for unrelated tasks.

When resources or review capability are unavailable, record the gap and use existing fallback rules. Block only work that depends on the missing capability.

Handoff and resume preserve evidence references, actual review status and the applicable task-only skip. Re-evaluate skill applicability when scope, stack/version, instructions or source state changes. Prior evidence cannot establish adherence of later edits; invalidate affected application/review/verification claims and refresh relevant checks. Preserve still-valid approvals and completed work through existing state APIs.

## Pinned upstream and owned adaptation

This procedure adapts the passive [Ponytail core reference](../../../vendor/ponytail/skills/ponytail/SKILL.md) at revision `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846`, with its actual [MIT license](../../../vendor/ponytail/LICENSE), Copyright (c) 2026 DietrichGebert. Original bytes and hashes are preserved; the copied skill is not separately registered or invoked.

Apply the Pegatus guidance within project and host authority. The detached runtime includes the reference and notice for provenance.
