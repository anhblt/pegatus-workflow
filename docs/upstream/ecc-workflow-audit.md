# ECC workflow integration audit — 2026-10-26

## Basis and limits

Compared local `C:/Workspace/ECC` revision `25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b` with the current Pegatus working tree and approved [design](../superpowers/specs/2026-10-12-pegatus-v2-design.md). Pegatus's existing ECC pin remains `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29`. [Inspected source hashes](ecc-workflow-snapshot.json) identify local bytes, not a replacement source lock or proof that the checkout is unmodified.

ECC has 71 top-level agent files, 311 skill directories, 97 command files and 23 top-level rule entries. These are breadth counts. This audit covers the eleven approved workflow categories, selected source/runtime integration and the five requested components; it does not approve every ECC domain skill, shell script, MCP server or provider example.

## Core category crosswalk

| Category | ECC inputs inspected | Pegatus delivery | Finding / disposition |
| --- | --- | --- | --- |
| Agents | planner, code-reviewer, common/agents | catalog/agents; src/adapters/capabilities.mjs; orchestration/handoff.mjs | Scoped roles/handoffs exist. Generated skill descriptions hid activation terms; repaired discovery descriptions. Native acceptance remains separate. |
| Skills | Selected retrieval, compact, context-budget and caching skills | catalog/manifest.json; src/catalog/manifest.mjs; context protocol | Added three task-selected guidance skills and routing. Existing workflow/stack skills retained. |
| Commands | README command/skill contract; selected activation | catalog/commands; generated host aliases; bin/pegatus.mjs | Added thin host aliases. No invented CLI design/execute subcommands. |
| Hooks | hooks/hooks.json; strategic-compact setup | src/hooks/dispatch.mjs, operations.mjs; docs/hooks.md | Lifecycle/checkpoint bridge exists. Registration remains explicit; default proposal does not auto-register PreCompact. No ECC bootstrap/personal-home scan copied. |
| Rules | common/agents, common/performance | catalog/rules/common; shared context protocol | Existing scoped rules retained. Live-context exception now precedes discovery in start/generated wrappers. |
| Persistent memory | unified-memory; README Memory Vault | src/memory/{index,cli,learning}.mjs; src/state/{store,reconcile}.mjs | Search/promotion and checkpoint/resume exist. Added scoped stable-ID read. ECC's unreviewed vault is a different trust model; no competing vault introduced. |
| Learning | continuous-learning-v2 | pegatus-learn; src/memory/learning.mjs; lifecycle collection | Collection/deduplication/review exist. Automatic instincts/global promotion remain intentionally replaced by approved review. |
| Verification | verification-loop | pegatus-verify; src/verify/{runner,loop}.mjs; completion gate | Project checks, bounded repair and source-bound evidence exist. ECC fixed commands/coverage are not universal target requirements. |
| Token optimization | performance, retrieval, compact, context-budget, prompt-caching | src/telemetry/usage.mjs; context protocol; selected skills | Repaired three-pass procedure, compaction phases and explicit context/prompt-cache selection. Character limits are not live token measurements. |
| Orchestration | parallel-execution-optimizer; common/agents | src/orchestration/{graph,ownership,coordinator,handoff}.mjs | Dependency/ownership/concurrency and callbacks exist. No automatic worktree/service creation or unsupported standalone launcher added. |
| Security | security-scan; source boundary guidance | src/security/{agentshield,findings,credentials}.mjs; docs/security.md | Pinned scanner, coverage gates and separate code review retained. Configuration scans do not qualify application code or native enforcement. |

## Requested components

| Component | Before | Delivered repair |
| --- | --- | --- |
| iterative-retrieval | Refinement guidance lacked an explicit limit | Shared retrieve/evaluate/refine/stop procedure: three passes per decision, early stopping, recorded queries/gaps/reasons, blocking only gap-dependent work. Host procedure, not an automatic API loop. |
| strategic-compact | Checkpoint mechanics existed; phase guidance was thin | Added phase/milestone decisions, persisted plan requirement and no mid-edit automatic compaction; retained explicit hook limitations. |
| context-budget | Character/reference helpers only | Selected native-meter/no-tools path plus separate explicit named-root static audit. No invented live counters/provider command compatibility. |
| Memory CLI | Reviewed query/promotion and checkpoint/resume, no ID read | Added `memory read <id>` with explicit root/project/path, instruction/knowledge ownership, integrity/freshness and output limits. Ambiguous/incomplete reads block. |
| content-hash-cache-pattern | Integrity/dedup hashes, no processing-cache guidance | Selected development guidance: content identity, option/version invalidation, corruption, containment, bypass and isolation. No speculative runtime retrieval cache. |

Also added selected prompt-cache guidance: the old map promised it, but actual delivery only provided generic stable/dynamic-context advice. All three new skills have catalog activation, start routing and generated entry points on all three adapters. Integrity hashes, file-result caching, provider prompt caching and live context remain distinct.

The manifest also still described implemented hooks, learning and scanner APIs as “future” mechanics. Updated those capability descriptions to the current runtime boundaries, including scoped memory reads and callback-only orchestration; this is metadata correction, not new native qualification.

## Provenance, installation and proof

Status reconciled on 2026-10-27: implementation and independent review are complete, including fixes and regressions for both direct-read findings. The catalog has nine roles and seventeen host workflow aliases. The full run passed 307/310; all three affected cases passed after correcting a catalog README link outside its declared resource snapshot. No single clean full rerun after that correction is claimed. See [current state](../current-state.md) for the consolidated handoff and installation choices; the linked inspected source hashes remain the dated audit snapshot.

New files are Pegatus-owned adaptations with upstream path/revision and license links. Existing pinned bytes, source lock, dependencies, release metadata and old task records remain unchanged. Reviewed writes still use learn/promotion; handoffs use checkpoint/resume. Pre-existing dirty installation/uninstall work was preserved.

The kit checkout is updated. Existing installations need the normal preview/update, ownership and scanner flow; this task does not modify personal host configuration or other solution roots. No hook activation, provider call, native acceptance or release qualification is implied.

`tests/ecc-parity.test.mjs` exercises task selection, all adapter entry points, actual CLI reads, query compatibility, scope, duplicate IDs, digest changes, overflow, instruction/knowledge ownership, malformed IDs and incomplete approved indexes. Missing-feature tests failed before implementation. Independent review found a failure-envelope budget bypass and orphan metadata; regression tests and fixes cover both. Final commands/results are retained in the [execution plan](../superpowers/plans/2026-10-26-ecc-workflow-parity.md). Existing [native acceptance limits](../acceptance/checklist.md) remain.
