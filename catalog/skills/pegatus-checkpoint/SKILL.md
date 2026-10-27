---
name: pegatus-checkpoint
description: Direct checkpoint procedure for Pegatus tasks; invoke when checkpoint is requested or routed by the main workflow.
---

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Choose logical phase boundaries for compaction: after exploration before planning, after an approved plan is saved before implementation, after a completed milestone, or before changing tasks. Keep relevant implementation context through testing when needed; avoid mid-edit compaction. First persist the plan, approvals, unresolved gaps and next action to files, then suggest the active host's supported compaction action. Never assume a task list survives. Do not invoke compaction automatically or scan private transcripts to infer pressure. Native hooks remain opt-in and explicitly qualified as described in docs/hooks.md.

Persist concise next actions, completed work, open questions, context refs, branches/fingerprints, approvals and verification outcomes after meaningful milestones and before compaction/handoff/interruption. Use .pegatus/work/<task-id>/progress.json through state/store.mjs and pegatus checkpoint with --expected-revision for atomic concurrency control. Only coordinator writes aggregate state; workers checkpoint separate records. Keep evidence references rather than repeated logs.

Use src/telemetry/usage.mjs checkpointSummary({summary,logs},tokenControls) for coordinator-authored summary text and evidence outputPath references. Retain supporting logs under the applicable evidence redaction policy first; omit log bodies from the summary and include a visible full-log truncation reference when text exceeds the budget. This helper does not replace approvals, required checks or aggregate progress records. Missing usage remains unavailable/null.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. Use the implemented runtime APIs for installation, hooks, reviewed learning and configuration scanning where applicable. Distinguish host guidance and generated entry points from actual native execution or enforcement; report unavailable tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC skills/strategic-compact/SKILL.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).
