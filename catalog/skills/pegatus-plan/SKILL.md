---
name: pegatus-plan
description: Direct plan procedure for Pegatus tasks; invoke when plan is requested or routed by the main workflow.
---

Follow the [human confirmation and execution-mode policy](../pegatus-execute/execution-guide.md#human-confirmation-and-execution-mode) before advancing phases or spawning workers. Preserve pending confirmations and the user-selected mode through direct invocation and resume; Inline forbids subagents throughout the task while retaining all applicable skills, guards and checks. Native unavailability requires a user decision before switching modes unless automatic Inline fallback was explicitly approved for this task. Phase confirmations may be automated only for explicitly human-approved phases in this task; all skills, guards and checks remain required.

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Read the approved feature design/scope, or the bounded small-fix brief. Map acceptance criteria to owned file changes, dependency edges and meaningful checks. Keep interfaces agreed before parallel consumers; no overlapping writers. Write plan.md for feature work, with prerequisites and risk, while small work can retain a compact next-action record. Present the concrete plan and obtain explicit human plan approval before implementation, even when the plan stays within approved design/scope. A compact small-task brief/plan may share one confirmation with the execution-mode choice. Automatic phase progression does not approve an unseen plan. Material scope/design changes also require renewed approval.

Plan through the [shared execution guide](../pegatus-execute/execution-guide.md): bounded task-specific skills/overlay/dependency packets, implementer completion barrier, separate verification, fresh review, dispositions/authorized repairs and stable-state final checks. Include ownership, tools/prerequisites, evidence destinations and the remaining shared task repair budget. Honor explicit inline choice and disclose missing independence. Return the plan to the coordinator; planning alone does not start source edits.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. Use the implemented runtime APIs for installation, hooks, reviewed learning and configuration scanning where applicable. Distinguish host guidance and generated entry points from actual native execution or enforcement; report unavailable tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC agents/planner.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).

Follow the [skill-use evidence and simplicity guide](../pegatus-execute/skill-evidence-guide.md) for the relevant phase: proportional default implementation evidence, concrete application assessment, task-only skips and handoff/resume validity. Preserve this procedure's existing authority and edit scope.
