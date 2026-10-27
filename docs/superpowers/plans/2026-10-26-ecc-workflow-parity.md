# ECC workflow parity repairs

**Current status (2026-10-27):** Tasks 1–5 are complete; implementation and independent review need no repeat. The final-source validation record below is retained exactly, including the split full-run/rerun result. See [current state](../../current-state.md) for the consolidated handoff. Changes remain uncommitted; installation into other roots and publication are outside this completed task.

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit the local ECC checkout and repair missing integration within the approved ECC-derived Pegatus design.

**Architecture:** Retain Pegatus's existing ESM runtime, reviewed memory, context protocol and host adapters. Add task-selected guidance rather than unconditional infrastructure; add scoped ID lookup to the existing memory retrieval path.

**Tech Stack:** Node.js >=22, built-ins, Markdown catalog, node:test.

**Spec:** `docs/superpowers/specs/2026-10-12-pegatus-v2-design.md` (approved); user instruction dated 2026-10-26 to audit and wire missing ECC pieces.

## Constraints and review focus

- Preserve existing dirty README, CLI, installation and uninstall work; no commit, publish or installation into other roots.
- Preserve pinned upstream bytes, source locks, notices and host permission boundaries.
- ID lookup must preserve project/path scoping, instruction resolution, external knowledge ownership, digest verification and output bounds. Duplicate IDs and incomplete indexes must block direct lookup.
- Guidance is not native enforcement; a generated wrapper is not live-host acceptance.
- Content-hash processing caches and provider prompt caches are different; neither supplies authority or freshness proof.

## Tasks

1. Record local ECC revision and inspected component hashes; map all eleven approved core categories and distinguish newer upstream breadth from missing integration.
2. Add failing behavioral tests for task-selected context-budget/file-cache/prompt-cache guidance and generated host activation; add failing memory ID lookup tests for scope, ambiguity, integrity, ownership and bounds.
3. Wire the three selected guidance skills and host aliases. Put the three-cycle retrieve/evaluate/refine/stop protocol and phase-boundary compaction decisions in the shared workflow. Live-context requests must bypass file scans, including generated wrappers and start routing.
4. Add `memory read <id>` using the existing retrieval path; preserve legacy query syntax and reviewed promotion/checkpoint writes.
5. Run focused tests, full suite, catalog lint, package dry run and diff checks; obtain one independent review and resolve substantive findings. Record evidence and unresolved native qualification separately.

## Execution record

- Baseline dirty work: README.md, bin/pegatus.mjs, docs/installation.md; untracked src/install/uninstall.mjs and tests/uninstall-setup.test.mjs.
- Local ECC revision: 25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b. Existing Pegatus ECC pin remains b92f181b3b748d1abbc2afd94af6aa7d8c8fca29.
- Ruling: This repairs the already-approved capability contract; no replacement architecture or blanket adoption of ECC's unrelated stacks, personal stores, observers or hooks.
- Tasks 1–4 implemented. Selected source hashes and the eleven-category crosswalk are in docs/upstream/ecc-workflow-{snapshot.json,audit.md}. Existing upstream locks/bytes and unrelated dirty work remain intact.
- TDD: initial parity run 0/5 passed (expected missing catalog activation and unsupported memory-read syntax); implementation 5/5; expanded failure-budget/orphan coverage 6/7 before orphan fix, then 7/7 passed. Combined context/memory/catalog/adapter/usage suite passed 88/88 before the final two regressions.
- Independent review found two P2 defects in the new direct-read path: early failure-envelope budget bypass and ignored orphan approved metadata. Both fixed with regressions; scoped rereview clean, no further substantive findings.
- Catalog lint passed, retaining the pre-existing Vercel distribution-notice warning. Package dry run passed with 2666 entries and confirmed all three new skills plus audit/plan records; no tests/scratch entries were added to package files.
- First default-concurrency npm test was interrupted after prolonged silence. A diagnostic low-concurrency sandbox run returned EPERM resolving workspace/fixture roots and was stopped. Final full run uses approved escalated `npm test -- --test-concurrency=2`; result pending below. No product change was made to bypass containment checks.
- Full escalated run completed: 310 tests, 307 passed, three failures, duration 742748 ms. Failures: project user/default deduplication, real setup preview, and guided uninstall. All encountered a newly introduced catalog README link outside its declared resource snapshot. Corrected the maintainer-audit reference to a plain checkout path; fresh catalog lint passed.
- Targeted final-source reruns outside the sandbox: `node --test --test-name-pattern="project configuration wins" tests/install-cli.test.mjs` passed 1/1 (283986 ms); `node --test --test-name-pattern="real dry-run|guided uninstall removes" tests/setup.test.mjs tests/uninstall-setup.test.mjs` passed 2/2 (34979 ms). Thus every case passed either in the full run or its affected final-source rerun; no single clean full rerun is claimed. Detached runtime/security/checkpoint/resume end-to-end test passed in the full run.
- Final code review: clean scoped rereview after both P2 fixes. Current catalog lint and git diff whitespace checks passed. Final package dry run passed after documentation corrections: 2666 entries, all three new skills present, no tests/ or .superpowers/ package entries. No installation into user/solution roots, commit, push or publication performed. Tasks 1–5 complete; native qualification remains separate.
