---
name: pegatus-start
description: Direct start procedure for Pegatus tasks; invoke when start is requested or routed by the main workflow.
---

Route live-context capacity/headroom requests to [pegatus-context-budget](../pegatus-context-budget/SKILL.md) without tools or file reads. Only explicit installed-overhead audits select that skill's bounded inspection path. Route repeated expensive file-processing cache tasks to [pegatus-file-cache](../pegatus-file-cache/SKILL.md), and repeated model-request cache tasks to [pegatus-prompt-cache](../pegatus-prompt-cache/SKILL.md). These are selected procedures, not new CLI operations.

Route brainstorming and open-ended idea exploration on any subject to [pegatus-brainstorm](../pegatus-brainstorm/SKILL.md) before project discovery or task-state creation. General conversation requires no project root or files. Project-dependent recommendations follow that skill's scoped context rules; brainstorming alone does not authorize implementation.

For other project tasks, first read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Route requests to assess or address received PR comments/review findings to [pegatus-review-feedback](../pegatus-review-feedback/SKILL.md) before generic implementation classification. Preserve assessment-only intent and existing fix authorization; verify each item against current source before accepting its proposed remedy. This differs from asking to perform a new code review.

For bugs, failing checks and unexpected behavior, use the [shared debugging guide](../pegatus-investigate/debugging-guide.md) before proposing a repair. Preserve whether the user requested investigation or an authorized fix; an understood small defect needs proportionate causal inspection, not a forced feature plan. Keep configured repair limits and stop unsupported repeated fixes without escalating scope automatically.

Route explicit requests to test a running application in the browser to [pegatus-browser-test](../pegatus-browser-test/SKILL.md). Standalone testing needs no implementation diff or feature design approval. Preserve requested target and scenarios; testing does not authorize source fixes.

Coordinate through the [shared execution guide](../pegatus-execute/execution-guide.md). Record scope, risk/uncertainty, user preferences, actual delegation/tools and chosen depth; a tiny permission/data change is not automatically low risk. Small clear low-risk work stays inline without forced feature artifacts or extra seats. Feature work retains explicit design/scope approval and planning, then implementation, separate verification, fresh review, dispositions/authorized repairs and final verification. Preserve direct review, investigation and testing intent. Honor explicit inline choice or unavailable/disallowed delegation with accurate independence limits. Only the coordinator assigns phases and updates aggregate progress.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. Use the implemented runtime APIs for installation, hooks, reviewed learning and configuration scanning where applicable. Distinguish host guidance and generated entry points from actual native execution or enforcement; report unavailable tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC skills/parallel-execution-optimizer/SKILL.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).

Follow the [skill-use evidence and simplicity guide](../pegatus-execute/skill-evidence-guide.md) for the relevant phase: proportional default implementation evidence, concrete application assessment, task-only skips and handoff/resume validity. Preserve this procedure's existing authority and edit scope.
