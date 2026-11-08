---
name: pegatus-review
description: Use when reviewing working changes, a commit range or a branch/PR before merge for behavioral correctness, downstream impact, compatibility and verification gaps.
---

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Follow the [shared behavior and impact review guide](review-guide.md) in full. Establish the requested working-tree/range/PR mode and pin its revisions; whole-branch review uses the actual target and merge-base rather than assuming the last commit. Keep source, index and branch state read-only. Trace changed behavior through callers, data/side effects and downstream consumers; assess relevant target integration and test gaps. Report source-supported findings, inspected coverage, unresolved risks and a qualified merge assessment. Zero findings is valid; incomplete material coverage is not an unqualified Ready.

For substantial work, default to one independent [code-reviewer](../../agents/code-reviewer.md) with the guide's focused brief and configured tier selection when delegation is supported and task instructions permit it. Honor an explicit inline choice; otherwise review inline only when delegation is unavailable or disallowed and disclose that limit. Do not duplicate reviewer seats or treat review as authorization for fixes, merge or publication.

Within substantial execution, follow the [shared execution guide](../pegatus-execute/execution-guide.md): verification returns before the fresh reviewer starts, and that context performed neither implementation nor verification. A delegated review invocation stays read-only and returns findings/coverage to the coordinator without dispatching another reviewer or recursively launching execution. A direct review keeps its requested scope. Re-review may reuse the independent reviewer; absent freshness/identity is an explicit evidence gap.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. Use the implemented runtime APIs for installation, hooks, reviewed learning and configuration scanning where applicable. Distinguish host guidance and generated entry points from actual native execution or enforcement; report unavailable tools and continue only independent safe actions.

When the user asks to assess or address returned findings, hand off to [pegatus-review-feedback](../pegatus-review-feedback/SKILL.md) with finding IDs, reviewed revisions, evidence and current authorization. Performing this review alone does not authorize fixes or external replies.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC agents/code-reviewer.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).

Review-depth additions adapt the installed Superpowers 7.0.0 reviewer; see [reference and license](reference.md). No external skill is required.
