---
name: pegatus-resume
description: Direct resume procedure for Pegatus tasks; invoke when resume is requested or routed by the main workflow.
---

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Load saved progress and current applicable instructions; reconcile repository presence, branch/head, working-tree fingerprint and evidence. Use pegatus resume and state/reconcile.mjs; missing repos, changed branch or uncertain evidence block dependent steps until safely resolved. Do not reset, stash, discard or overwrite user work to force a match. Preserve still-valid approvals and completed ownership; invalidate stale verification, read relevant artifacts, then continue the recorded next action. Cross-host recovery also needs matching code files.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. Use the implemented runtime APIs for installation, hooks, reviewed learning and configuration scanning where applicable. Distinguish host guidance and generated entry points from actual native execution or enforcement; report unavailable tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC commands/resume-session.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).

Follow the [skill-use evidence and simplicity guide](../pegatus-execute/skill-evidence-guide.md) for the relevant phase: proportional default implementation evidence, concrete application assessment, task-only skips and handoff/resume validity. Preserve this procedure's existing authority and edit scope.
