---
name: pegatus-investigate
description: Use when investigating a bug, failing check, performance issue or unexpected behavior to establish a supported cause before recommending a repair.
---

Follow the [human confirmation and execution-mode policy](../pegatus-execute/execution-guide.md#human-confirmation-and-execution-mode) before advancing phases or spawning workers. Preserve pending confirmations and the user-selected mode through direct invocation and resume; Inline forbids subagents throughout the task while retaining all applicable skills, guards and checks. Native unavailability requires a user decision before switching modes unless automatic Inline fallback was explicitly approved for this task. Phase confirmations may be automated only for explicitly human-approved phases in this task; all skills, guards and checks remain required.

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Follow the [shared debugging guide](debugging-guide.md): establish the observed failure and scope, reproduce or gather discriminating evidence, trace upstream inputs and affected consumers, compare working paths and test a specific causal hypothesis. Distinguish source-supported reasoning from reproduced behavior. Keep investigation-only read-only on product code; existing authorization permits justified in-scope fixes through the normal execution/verification procedures. Reassess failed hypotheses rather than layering speculative edits, preserve configured attempt limits and report unresolved causes honestly. Do not infer domain intent or authorize redesign from a repeated failure.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. Use the implemented runtime APIs for installation, hooks, reviewed learning and configuration scanning where applicable. Distinguish host guidance and generated entry points from actual native execution or enforcement; report unavailable tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC skills/iterative-retrieval/SKILL.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).

Debugging-depth additions adapt installed Superpowers 7.0.0; see [reference and license](reference.md). No external skill is required.
