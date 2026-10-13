---
name: pegatus-start
description: Direct start procedure for Pegatus tasks; invoke when start is requested or routed by the main workflow.
---

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Route a natural-language task by impact and uncertainty. Small understood fixes inspect, implement, verify and report within existing authorization, omitting spec/plan artifacts. Features inspect, design, plan, implement, independently review, verify and report after explicit design and scope approval. Investigations gather evidence and recommend action; subsequent edits follow the appropriate path. Escalate on broader interfaces/data or uncertainty; approvals are preserved until material scope changes. Coordinate only independent lanes with agreed interfaces and distinct ownership; default two workers capped by host/config. If delegation is unavailable, work inline and label the review limitation. Only the coordinator writes aggregate progress.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. An operation cannot claim later install/hooks/learning/scanner mechanics are implemented merely because this procedure describes them; report unavailable APIs/tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC skills/parallel-execution-optimizer/SKILL.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).
