---
name: pegatus-execute
description: Direct execute procedure for Pegatus tasks; invoke when execute is requested or routed by the main workflow.
---

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Before dispatch, follow the model-selection policy in [tokens and orchestration](../../rules/common/tokens-orchestration.md). Preserve each role's fast/standard/deep tier and configured model/effort pair. For an unconfigured tier the coordinator selects and records both fields from the actual host allowlist before spawning; the CLI does not launch or discover models. Disclose host-default fallback when explicit selection is unavailable.

Follow the [shared execution guide](execution-guide.md) for the adaptive decision, task-specific skill/resource packets, implementation completion barrier, separate verification, fresh review, feedback dispositions, authorized repairs and stable-state final gates. Preserve feature design/scope approval and small-work proportionality. A bounded implementer/repairer assignment performs its assigned work and returns evidence to the coordinator; it does not recursively launch the coordinator sequence.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. Use the implemented runtime APIs for installation, hooks, reviewed learning and configuration scanning where applicable. Distinguish host guidance and generated entry points from actual native execution or enforcement; report unavailable tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC skills/parallel-execution-optimizer/SKILL.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).
