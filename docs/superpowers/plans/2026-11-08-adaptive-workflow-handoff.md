# Adaptive Pegatus workflow — session checkpoint

**Superseded resume status — 2026-11-08:** The approved integration is implemented and verified; see the [completed implementation plan](2026-11-08-adaptive-workflow-integration.md) and [current validation record](../../current-state.md). The user subsequently authorized committing all pending files, including this checkpoint and the separate unapproved draft. The snapshot below preserves the original checkpoint state; its pending actions are not a current backlog. No push, installation update or publication is authorized.

**Checkpoint date:** 2026-11-08, Asia/Bangkok.
**Repository:** `C:/Workspace/PegatusWorkflow`.
**Verified branch / HEAD:** `main` / `d053f3b6cbcf96d8a6ff4df4fa0b6db879f99520`.
**Status:** User requested a checkpoint before closing this session and resuming tomorrow. Do not begin implementation as part of creating this checkpoint. The next workflow-integration direction is approved; detailed design and implementation plan have not yet been authored. This file is a resume brief, not a completed implementation plan.

## What the user wants

One main entry point: the user brings a requirement to Pegatus, which coordinates context discovery, useful questions, necessary confirmations, specifications and plans, implementation, independent verification/review where appropriate, repairs, rechecks and a final report.

The enhancements below must be integrated into that main workflow, not merely available as separate commands. In substantial work the intended sequence is:

1. Read the actual project's instructions, authoritative knowledge and relevant source; understand the requirement and clarify important uncertainty.
2. Produce the feature specification and obtain design/scope approval, then create an actionable implementation plan. Preserve approvals; do not ask for confirmation after every routine task or in-scope repair.
3. Dispatch bounded implementation tasks to suitable subagents, carrying the correct task-specific skills and required references, requirements, instructions, owned paths, interfaces, checks and evidence expectations.
4. Have a separate verifier/tester check behavior and relevant integration on the resulting code state.
5. Have a fresh reviewer inspect requirements, logic, failure paths, downstream impacts and test sufficiency.
6. Evaluate findings using review-feedback handling. Assign justified authorized repairs to suitable implementers; use the debugging procedure for test failures and unexplained behavior.
7. Retest affected behavior after edits and perform scoped re-review where the result changed. Perform combined final checks on the integrated result, within configured repair limits.
8. Report delivered behavior, actual verification, unresolved findings, blocked prerequisites, limitations and next action. Persist resumable evidence.

**Adaptive delegation is essential.** Small, clear, low-risk tasks can be completed inline by one agent and need not force specs/plans or several subagents. Substantial, uncertain or risky work should use independent implementation, verification and review when supported and permitted. A small diff can still be high risk. Honor explicit user/developer choices and host capabilities; disclose inline fallbacks. Do not equate role names with genuinely separate contexts.

Testing/review phases must observe a stable code state; do not run supposedly final evidence collection against code concurrently being edited. Worker checks do not automatically replace independent or integrated verification. Relevant UI behavior may select browser testing, not every frontend change.

## Completed and committed in this session

| Commit | Delivered behavior |
| --- | --- |
| `1784ab7` | Added `pegatus-brainstorm` for any subject, conversation first, notes only on request. Refined with installed Superpowers 7.0.0 questioning, motivation/exclusions, choice ownership, playback, selective visuals/experiments and design completeness checks. |
| `53d23b0` | Deepened `pegatus-review` and `code-reviewer` through a shared guide: pinned PR target/merge-base/head, revision-correct read-only review, logic/caller/consumer tracing, target compatibility, test sufficiency, explicit coverage and qualified merge assessments. |
| `a5c3185` | Added `pegatus-review-feedback`: validate received findings, distinguish defects from wrong remedies, detect stale/already-addressed items, record dispositions, apply only authorized in-scope repairs and preserve remote-action boundaries. |
| `d053f3b` | Shared evidence-led debugging across investigate/start/verify/repairer: reproduction or causal evidence, upstream/component tracing, working comparisons, falsifiable hypotheses, intermittency/pollution, safe diagnostics, bounded repairs and final-state verification. |

All four commits were requested by the user and verified in local Git. No push was performed by this session. No existing installation was updated and no native-host trial was performed for these enhancements. Do not reimplement these completed tasks.

Installed reference: `C:/Users/bltanh/.codex/plugins/cache/claude-plugins-official/superpowers/7.0.0`. User explicitly preferred using this installed version rather than cloning. Adaptations are standalone Pegatus guidance; no Superpowers runtime dependency. Per-skill reference notices contain inspected hashes and exact retained MIT licenses with scoped `-text` attributes. Existing source locks, vendor bytes and release metadata were preserved.

## Validation already recorded — do not overstate it

- Brainstorm refinement: 30 focused checks, eight instruction-level scenario evaluations, lint and package dry-run passed. An earlier full suite passed 358/358 before a final wrapper correction; final focused checks covered that correction. This is not a clean full-suite run on today's final combined tree.
- Review upgrade: 32 focused checks plus instruction-level scenarios, lint and package dry-run passed; the commit-time focused run passed 16/16.
- Feedback addition: 34 focused checks plus eight instruction-level scenarios, lint and package dry-run passed; the commit-time focused run passed 18/18.
- Debugging upgrade: 53 focused checks including existing verification-loop regressions passed; scenarios, lint and package dry-run passed. The reviewer caught an incorrect API name and overstated mutation prevention; both were corrected and rechecked. The commit-time focused run passed 33/33.
- Lint retains the pre-existing Vercel distribution-notice warning. The candidate remains private and not release-qualified. Instruction simulations and packet tests do not establish native cross-host behavior.
- No tests were rerun merely to write this checkpoint. Earlier implementation notes saying "uncommitted" describe their capture-time state; the commit table and current Git verification above supersede those statements.

## Current integration assessment

Read these source files before designing the next changes:

- `catalog/skills/pegatus-start/SKILL.md`
- `catalog/skills/pegatus-design/SKILL.md`, `pegatus-plan/SKILL.md`, `pegatus-execute/SKILL.md`
- `catalog/skills/pegatus-verify/SKILL.md` and `catalog/agents/verifier.md`
- `catalog/skills/pegatus-review/SKILL.md`, `review-guide.md`, and `catalog/agents/code-reviewer.md`
- `catalog/skills/pegatus-review-feedback/SKILL.md`
- `catalog/skills/pegatus-investigate/debugging-guide.md` and `catalog/agents/build-test-repairer.md`
- `catalog/manifest.json`, `catalog/context-protocol.md`, `catalog/rules/common/tokens-orchestration.md`
- `src/catalog/manifest.mjs`, `src/orchestration/{coordinator,graph,handoff,ownership}.mjs`, `src/verify/loop.mjs`
- `docs/orchestration.md`, `docs/tokens.md`, `docs/browser-testing.md`, applicable compatibility/acceptance records.

The general small-versus-feature classification, approvals, bounded ownership/concurrency, model-tier selection, worker records and evidence invalidation exist. Start routes explicit feedback tasks and bug failures to the new procedures; review hands returned findings to feedback; verifier and repairer link the shared debugging guide.

**Not yet fully explicit or verified:**

- `pegatus-execute` does not consistently define the user's exact separate-tester then fresh-reviewer sequence and its feedback/repair/recheck handoffs.
- Implementation handoffs need more explicit task-specific skill selection and required resource closure, respecting the target's actual stack and instructions.
- Independent tester/reviewer identities and stable reviewed/tested code state need clear evidence requirements; role labels alone are insufficient.
- The adaptive choice between inline and delegated execution needs a coherent central policy, with user/developer preferences and risk considered.
- `runOrchestration` uses host-supplied worker/inline and combined-verification callbacks. The standalone CLI is not a native subagent launcher. Its passed combined checks still do not establish independent review or the completion security gate. Do not present a proposed phase graph as existing native enforcement.

`runVerification` is the actual export in `src/verify/loop.mjs`. Its diagnosis callback must not edit source: the loop detects changed observed code state and blocks continuation, rather than preventing mutation. Preserve configured `repairLimit` (default three), early unchanged-failure stops, and existing `failed` versus `blocked` results. Repeated failure warrants reassessment, not an automatic architecture verdict or redesign authorization.

## Resume next session

1. Read this file and its Superpowers ledger at `.superpowers/sdd/2026-11-08-adaptive-workflow-handoff/progress.md`.
2. Read current `AGENTS.md`, relevant README/catalog context and approved architecture/spec/plan references. Check branch, HEAD, status and any newer user instructions; do not trust this snapshot as live Git state.
3. Preserve the unrelated untracked file `docs/superpowers/specs/2026-11-08-skill-evidence-and-simplicity-design.md`. It existed before this work, was not inspected and has not been approved as authority for the new task. Do not delete, commit or modify it as incidental cleanup.
4. Use Superpowers to formalize the approved adaptive workflow into a focused spec and implementable plan. Resolve implementation details from source. Ask only consequential unresolved scope/behavior questions, not whether the user still wants the already-approved direction.
5. Decide and document what is host guidance, what existing APIs already support, and whether any small runtime change is actually necessary. Do not assume a new state schema, role, command or orchestrator is needed. Preserve existing JSON/exit-code contracts unless a specific approved requirement requires change.
6. Implement and validate the approved integration. Test routing, skill/reference handoffs, independence/inline fallback, stable-state evidence, feedback repair loops, scope changes, unavailable tools, and preservation of completed work/approvals. Include meaningful scenario evaluation beyond prose-string assertions. Select proportionate checks and actual host trials when available; report gaps honestly.

Potential change areas are the coordinator-facing catalog skills, role briefs, manifest resource closure, orchestration documentation and focused tests. Investigate runtime changes only if the approved behavior cannot be expressed safely with current mechanics. Keep changes on the current checkout unless the user requests a worktree. No push/publish, host configuration changes, installation updates or unrelated cleanup are authorized by this checkpoint. Future implementation is approved in direction; detailed design/scope gates still apply to material choices. Commit only when requested or explicitly authorized for the next work.

## Copyable restart prompt

```text
Resume C:/Workspace/PegatusWorkflow from
docs/superpowers/plans/2026-11-08-adaptive-workflow-handoff.md
and its referenced Superpowers progress ledger. Use Superpowers to tighten
the approved adaptive requirement-to-implementation workflow and wire in
independent verification/review, review-feedback repairs and debugging.
Preserve inline handling for small tasks, existing approvals, unrelated work,
and honest host/evidence limits. Start by checking current Git state.
```
