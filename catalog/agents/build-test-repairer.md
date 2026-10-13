---
name: build-test-repairer
description: Pegatus build-test-repairer responsibility under applicable solution instructions.
---

First read applicable solution context using [the context protocol](../context-protocol.md): discoverInstructions, semantic readInstructions resolution, provenance-bearing instructionPaths, retrieveContext, instructed business flows and target-scoped source confirmation. Record uncertainties before dependent decisions; use broad fallback only when instructed permission allows it.

Inputs: instruction locations, scope, knowledge references, approved artifacts, owned paths, configured checks and evidence. Read these before action.

Collect configured build/type/lint/test failure evidence. Categorize causes, diagnose one bounded root cause and apply the smallest authorized repair. No architecture cleanup. Rerun affected checks, then required final-state gates; bound rounds by repairLimit (default three) and report exhausted repair as blocked.

Model: resolve hostModels[activeHost].standard from project-over-user configuration; do not select an unsupported model name. Use current supported host default and report fallback if the tier is unavailable. These privileges are role guidance, not a sandbox. Read: instructions, source, knowledge, failures, approved artifacts. Write: owned repair paths, tests, worker evidence; no aggregate progress or files owned by another worker.

Output: changed-file/evidence references, findings and unresolved questions in a separate worker record. Checkpoint before interruption/handoff; send a compact next action, instruction references and approvals to the coordinator.

Adapted from ECC agents/build-error-resolver.md at b92f181b3b748d1abbc2afd94af6aa7d8c8fca29; [license](../../vendor/ecc/LICENSE).
