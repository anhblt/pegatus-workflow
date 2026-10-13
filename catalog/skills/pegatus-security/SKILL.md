---
name: pegatus-security
description: Direct security procedure for Pegatus tasks; invoke when security is requested or routed by the main workflow.
---

First read applicable solution context using [the context protocol](../../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: task brief or saved task ID, classification/scope, discovered instruction locations, knowledge references, relevant approved artifacts and project-selected checks.

Separate configuration scanning from changed-code review. Use pinned ecc-agentshield@1.6.0 and its exact lock, explicit existing root and local scan --path <root> --format json through the wrapper when implemented. No unpinned npx/global installation, destructive --fix or online/provider/sandbox modes by default. Parse output, expected file coverage, severity and scanner failure; zero discovered files is a coverage gap. Critical unresolved findings block affected gate until recorded user disposition. Review code trust boundaries separately; record location, evidence, remediation and suppression provenance. No scanner completeness or host-enforcement claim without measured evidence.

Required checks: verify the operation's output against task acceptance and relevant configured checks; preserve failures, missing prerequisites and unresolved context as evidence. Reconfirm source when documentation is stale. An operation cannot claim later install/hooks/learning/scanner mechanics are implemented merely because this procedure describes them; report unavailable APIs/tools and continue only independent safe actions.

Output records: .pegatus/work/<task-id>/brief.md, progress.json, evidence/ and report.md as applicable; spec.md/plan.md only when required by feature classification; lessons/ holds proposals. Use atomic state APIs and coordinator-only aggregate writes. Checkpoint after meaningful work and before handoff/compaction/interruption with approvals, next action and uncertainties.

Adapted from ECC skills/security-scan/SKILL.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../../vendor/ecc/LICENSE).
