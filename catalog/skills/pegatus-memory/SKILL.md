---
name: pegatus-memory
description: Direct memory procedure for Pegatus tasks; invoke when memory is requested or routed by the main workflow.
---

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Retrieve relevant approved knowledge through instructed tools; follow freshness and source confirmation rules. Existing vault/knowledge owner is authoritative; use .pegatus/memory/index.md only without an external owner. Scope projectId, task, paths and branch. Distinguish recovery/evidence, candidates and approved durable entries with source task, evidence, approval and freshness. Supersede/retire contradicted knowledge traceably through its owning tool with approval; preserve active records during explicit cleanup.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. An operation cannot claim later install/hooks/learning/scanner mechanics are implemented merely because this procedure describes them; report unavailable APIs/tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC skills/iterative-retrieval/SKILL.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).
