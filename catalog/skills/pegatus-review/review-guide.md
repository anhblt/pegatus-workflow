# Behavior and impact review

Use this procedure for both the review coordinator and the code-reviewer role. Syntax, formatting and successful builds are supporting checks, not a substitute for understanding behavior. Review only what you actually inspect; a review with no findings is valid when its scope and limitations are clear.

## 1. Establish the review scope

Follow the [context protocol](../../context-protocol.md). Read applicable instructions, the requested requirements/PR description and relevant instructed business flows/code maps. Separate documented requirements from assumptions. Do not invent business rules to fill gaps.

Record the repository, review mode and source identity before conclusions:

- **PR or whole branch:** identify the intended target ref and branch/head ref. Resolve and record their commit SHAs, then compute their merge-base. Inspect the complete branch delta from that merge-base to the pinned head, not just its last commit. Never assume `HEAD~1`, `main` or `develop` when the actual target is unknown. A supplied PR base must be checked for its meaning: target tip, merge-base or explicit range boundary.
- **Explicit commit range:** preserve the exact requested base/head and explain whether this is a subset of a branch. Do not silently widen it into a whole-branch review.
- **Working changes:** identify staged, unstaged and untracked files selected by the user and their baseline. Do not substitute this mode for a committed-branch review.

For a known whole-branch target/head, use read-only Git inspection such as `git rev-parse --verify <ref>^{commit}`, `git merge-base --all <target-sha> <head-sha>`, `git diff --stat <merge-base> <head-sha>`, `git diff --name-status <merge-base> <head-sha>` and `git diff <merge-base> <head-sha>`. Supply arguments through the host's safe invocation mechanism. If multiple merge-bases exist, report the ambiguity rather than choosing one silently. Missing refs or unavailable PR context block dependent range/merge conclusions; continue independent inspection if useful. State whether target refs were refreshed or are local snapshots. Do not claim a local `origin/develop` is the live remote tip without evidence.

Inventory dirty state first. For committed reviews, inspect file contents at the pinned revisions with `git show <sha>:<path>` or an equivalent revision-aware reader; local files may contain unrelated edits or belong to a different branch. Inspect renames, deletions, configuration and migrations as relevant. Read-only review does not authorize modifying product files, index, HEAD or refs: no checkout, reset, stash, cherry-pick, merge, push, fixes, dependency installation or automatic worktree creation. Write only designated review/state evidence when authorized. Obtain separate authorization for any additional test environment or source changes.

## 2. Trace behavior beyond changed lines

Group the delta into meaningful behavior changes. For each material group:

1. Describe the old and new behavior and the requirement it is intended to satisfy.
2. Trace relevant entry points, callers and inputs through changed conditions, validation, transformations, side effects and outputs. Read the full changed routine and the relevant surrounding contracts, not only diff hunks.
3. Follow affected outputs to consumers: persisted-data readers, events/subscribers, jobs, API clients or UI state. Check the actual consumer before assuming a downstream effect is safe or broken.
4. Challenge at least the important realistic lifecycle/failure scenarios for that change. Explain existing guards and whether they cover the failure path. Stop expanding when the affected contract and consumers are understood; record any material boundary you could not inspect.

Select impact lanes by relevance, not by a universal checklist quota:

| Changed behavior | Investigate when affected |
| --- | --- |
| Domain conditions or state transitions | Eligible/excluded records, invariants, ordering, cancellation, failure and recovery |
| Writes, jobs or external calls | Transactions, partial failure, concurrency, duplicate submissions, retries and idempotency |
| Queries or data representation | Joins/cardinality, null/empty cases, paging, volume, serialization and precision/time handling |
| API/event/schema contracts | Existing consumers, compatibility, migrations, existing stored records, rollout sequencing |
| Access or trust boundaries | Authorization, ownership/tenant isolation, validation, sensitive data and unsafe input |
| UI or asynchronous state | User-visible flows, loading/error state, stale responses, lifecycle and accessibility |

Use the solution's actual stack. Do not substitute generic .NET/React advice for application logic. A spec's silence does not excuse a demonstrated correctness or safety regression, but neither does it authorize invented domain policy. Surface consequential unknown intent as a question and qualify only the affected conclusion.

## 3. Review integration with the target

For a PR, distinguish what the branch introduces from compatibility with the pinned target tip. Inspect relevant target changes since the merge-base, especially where they alter the same contracts, callers, schemas or consumers. A textual diff alone cannot prove the result will merge or behave correctly. Do not run a trial merge or change the checkout as part of read-only review.

Before the report, recheck available source refs. If head or target moved, retain the reviewed SHAs, identify what changed and mark merge readiness stale until the relevant delta is reviewed. A pinned local snapshot remains useful evidence, but not proof of unseen remote changes. Separate pre-existing target defects from branch-introduced regressions; state when the branch makes an existing risk newly reachable or worse.

## 4. Challenge verification evidence

Read relevant tests and assertions. Map important changed behavior and failure scenarios to actual coverage. Identify tests that only assert implementation details, overly mocked paths, or omitted consumers and lifecycle cases. A passing suite does not establish retry safety, migration compatibility or domain correctness it never exercised. Missing tests become actionable findings when tied to a concrete important risk, not merely a coverage preference.

Use project-selected checks and prerequisites, within the authorized environment. Record exact commands, results and the revision/content state they exercised. Checks on a dirty or different checkout do not prove the pinned committed branch. If running a check would require changing source, dependencies or the review environment, report the limitation and request that scope separately. Do not present proposed tests, CI status not inspected, unavailable services, or a build-only check as passing behavioral validation.

## 5. Prepare a defensible report

Lead with actionable findings, ordered by impact. Each finding includes:

- A precise file/line in the reviewed revision and the affected behavior.
- A concrete triggering input, state or sequence, with the source trace or executed evidence supporting it.
- The failure and user/system consequence, including relevant caller/consumer references and why existing guards do not prevent it.
- Defensible severity and a bounded repair direction when clear. Distinguish demonstrated execution from source-based reasoning.

Consolidate duplicates. Do not inflate style issues, make findings about unread code, or manufacture issues to fill the report. Identify requirement/plan defects separately from implementation defects. Check tentative findings against surrounding guards and callers before reporting them. A test need not reproduce a source-provable defect for it to be actionable; explain the proof and any uncertainty honestly.

Include a compact coverage and evidence section: pinned target/base/head or selected working changes, behavior groups and callers/consumers actually inspected, relevant target integration checks, tests read/run with outcomes, and independent-versus-inline review. For large diffs, work in passes and list unreviewed material areas explicitly. Token limits or missing context must produce a scoped limitation, not a silently complete verdict.

List consequential questions, behaviors deliberately set aside and their reasons, and blocked/unreviewed risks. Do not silently discard a risk merely because the plan did not mention it. The coordinator resolves material scope/intent questions without changing approved requirements on the reviewer's authority.

End with one evidence-backed assessment for the reviewed scope: **Ready**, **Changes required**, or **Insufficient evidence**. Explain the basis and limits. Zero findings with material unreviewed behavior is not an unqualified Ready. A review assessment is not permission to merge, push or publish.

## Coordinator and reviewer handoff

The coordinator supplies a focused brief: purpose/requirements and their source, repository and pinned review mode/refs/SHAs, applicable instruction paths and knowledge references, authorized scope/report destination, relevant known checks/evidence, and explicit unknowns. Do not supply the implementation conversation as a substitute for those artifacts.

For substantial reviews, default to one independent reviewer when the host supports delegation and task instructions permit it, following the role's configured model/tier policy. Honor an explicit inline choice. For small reviews or unavailable/disallowed delegation, work inline and disclose the limitation. A reviewer does not recursively dispatch extra reviewers; the coordinator owns any separately selected lanes. Do not infer independence merely from having a role label. The reviewer reports findings and evidence; source fixes and subsequent reviews require the coordinator's authorized next step and current evidence.

The installed Superpowers 7.0.0 reviewer informed this Pegatus-owned guide; see [reference attribution](reference.md). This is host guidance, not automatic native enforcement or a release qualification claim.
