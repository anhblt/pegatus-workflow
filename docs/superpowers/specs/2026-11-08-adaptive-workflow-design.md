# Adaptive requirement-to-delivery workflow

Date: 2026-11-08. Status: Approved and implemented for the portable host-guidance/catalog scope. After reviewing the design summary, the user instructed "okay go" and later "commit them all" with relevant document updates. The [completed plan](../plans/2026-11-08-adaptive-workflow-integration.md) and [current validation record](../../current-state.md) retain the implementation/evidence; original direction remains in the [handoff](../plans/2026-11-08-adaptive-workflow-handoff.md). Commit authorization does not authorize push, installation or publication.

## Intent and authority

The user brings a requirement to `pegatus-start` and Pegatus coordinates context, useful questions, necessary approvals, planning, implementation, separate testing, fresh review, justified repairs and a final evidence-backed report. The enhancements already committed at `1784ab7`, `53d23b0`, `a5c3185` and `d053f3b` remain the supporting brainstorming, review, feedback and debugging procedures; this work integrates them rather than replacing them.

The user requires adaptive delegation: small, clear, low-risk work can stay inline without forced specs/plans or multiple agents. Substantial, uncertain or risky work uses independent implementer, verifier and reviewer contexts when supported and permitted. A small diff does not establish low risk. Existing authorization survives routine phase changes, repairs and resume; material design/scope changes require a new decision.

This extends the [approved architecture](2026-10-12-pegatus-v2-design.md). Actual target instructions, authoritative knowledge, source, stack and selected checks remain authoritative. Pegatus stays standalone; installed Superpowers is a development process reference, not a product dependency.

## Current source and implementation choices

Source inspected on `main` at `d053f3b6cbcf96d8a6ff4df4fa0b6db879f99520`:

- `catalog/skills/pegatus-start/SKILL.md` and the feature manifest route currently put review before verification. Execute requires combined behavior checks and independent review but does not define the requested separate tester then fresh reviewer sequence.
- `src/catalog/manifest.mjs` already supplies conservative skill discovery, resource filtering and route descriptions. Discovery does not interpret project instructions.
- `src/orchestration/handoff.mjs` carries bounded instruction, knowledge, resource and evidence references, scope approval, ownership, checks and dependency records. It has no first-class selected-skill or independent-context assertion.
- `src/orchestration/coordinator.mjs` schedules approved tasks, retains isolated worker outcomes and checks stable-state combined command evidence. Its `passed` result does not establish independent testing/review or completion security approval.
- `src/verify/loop.mjs` provides bounded diagnosis/authorization/repair/review/recheck callbacks. Diagnosis changes are detected after the callback and block continuation. Existing repair-limit and failed/blocked semantics must remain.

Builder choices proposed here: integrate through one Pegatus-owned shared execution guide, existing skill/role briefs and manifest resource closure. Use referenced handoff/evidence documents for additional semantic detail. Do not add a new CLI command, role, provider launcher, progress schema, Result shape or runtime enforcement engine. No `src/` behavior change is planned. The manifest feature route is a descriptive host route and may repeat existing phase names; it is not a new state machine. If implementation exposes a need for a new runtime contract, stop that dependent change and present the concrete gap.

Alternative considered: a runtime phase engine with new identity and phase schemas. It would not establish actual host independence, needs broader compatibility/recovery design and is unnecessary for the approved host-guidance integration. Duplicating the policy separately in every skill is also rejected because its ordering and evidence requirements would drift.

## Adaptive choice before execution

Record a short decision with scope, risk/uncertainty, relevant user/developer preferences, actual delegation/tool availability and selected mode. Reassess when new evidence changes the risk or scope.

| Situation | Handling |
| --- | --- |
| Small, understood, low-risk authorized change | Inspect, implement, proportionate checks and report inline; no mandatory feature artifacts or independent seats |
| Feature/architecture scope | Context and consequential questions, explicit design/scope approval, actionable plan, then the substantial execution sequence below |
| Small but risky/uncertain change | Resolve consequential uncertainty and use substantial verification/review as appropriate; create design/plan artifacts only when scope warrants them |
| Investigation, review or testing only | Preserve read-only/product-edit boundary; findings alone do not authorize fixes |
| Explicit inline instruction, disallowed delegation or unavailable delegation | Follow the same relevant procedures sequentially inline, recording exactly which independence is absent; no claim that renamed roles create separate contexts |

Default concurrency remains two, capped by configuration and actual host support. Parallelize independent implementation lanes only with agreed interfaces and disjoint ownership. Separate seats do not require simultaneous execution. Missing test prerequisites block affected checks; they do not invalidate unrelated safe work or authorize tool installation.

## Main substantial-work sequence

1. Read the target instruction chain, prescribed knowledge/flows and relevant source. Clarify material uncertainty using existing design procedure. Preserve approval evidence and approved scope; produce spec/plan where classification requires them.
2. Select suitable existing implementer roles and applicable task-specific skills for bounded tasks. Dispatch implementation and collect worker checks, changes, unresolved issues and interface deviations. Reconcile overlap or changed interfaces before dependent work.
3. Integrate the completed implementation lanes. Stop all source writers for the verification scope and capture the resulting code state. Dispatch a verifier context separate from implementation to test acceptance behavior, failure cases and relevant integration. Worker checks are useful input, not independent testing. The verifier writes evidence/findings, not source repairs. Selected UI scenarios use the existing browser-tester procedure.
4. Once verification has returned on a stable state, dispatch a fresh code-reviewer context that performed neither implementation nor verification. It receives requirements/approvals, plan, diff, pinned state, verification evidence and known gaps. It independently inspects requirements, logic, failure paths, consumers and test sufficiency using the existing review guide. A failing or blocked test is retained, not hidden; review can still inspect safe source to help diagnosis, but cannot yield an unqualified completion verdict while required checks are outstanding.
5. Evaluate the full finding set through `pegatus-review-feedback`; record valid, not applicable, already addressed, unclear/blocked or outside-scope dispositions with evidence. Valid findings may have incorrect proposed remedies. Route unexplained failures through the shared debugging guide before selecting a repair. Use existing authorization for justified in-scope fixes; ask only for missing authority or consequential scope choices.
6. Assign bounded repairs to an appropriate implementer, reusing its context where supported. Keep tester/reviewer contexts free of product edits. Stop source writers again, retest affected behavior and obtain scoped re-review of changed results. Prior unaffected findings/evidence can be retained only with a concrete scope/dependency justification; material uncertainty requires a wider check.
7. Run the configured combined final checks on the integrated resulting state. Earlier identical final-state command evidence can be referenced when its scope, commands, prerequisites and code state still match; do not rerun just to rename the phase. New edits or interacting repairs require the relevant combined checks again. Complete existing security/completion gates separately and report actual results, findings, gaps and next action.

The outer sequence does not change `runVerification`'s existing repair callback ordering. A host may use its bounded loop for command failures, including its required repair review before rechecks. That callback review is not automatically the fresh substantial-work review in step 4. After repairs, reconcile actual resulting state and finish independent testing/review as required. Neither an API return nor role label substitutes for that evidence.

## Task-specific skill and reference handoff

The coordinator reads the target's actual stack, framework/version, test tooling, path instructions and the individual task before selecting skills. Use existing `selectSkills`/`selectResources` assistance where applicable, read overlays first, then semantic relevance and required dependencies/linked resources. No global loading of all stack packs and no default assumption that the kit itself is .NET or React.

Each task packet includes applicable instruction paths and reading expectations; requirements/acceptance and approved artifact references; scope, ownership, interfaces, dependencies and checks; selected skill IDs/paths and why each applies; required overlay/dependency/resource references; expected evidence and stop conditions. If no catalog skill fits, record that and follow target instructions rather than inventing a skill or adding a dependency.

The supplemental packet is an ordinary referenced artifact: use existing `resources` and evidence references/context manifests to carry it and its selected resources without adding JSON fields to runtime contracts. Readers must read the relevant packet and references before acting. Budget overflow or unavailable required guidance blocks only dependent tasks; narrow retrieval without discarding mandatory context. Coordinator-supplied reference presence is not evidence that a worker read or followed it.

## Independence and stable-state evidence

Retain a compact evidence note per substantial phase with:

- Actual host agent/session identity or independently invoked process reference, assigned responsibility, whether delegated or inline, and relation to implementation/testing/review contexts. A fresh reviewer starts without the implementation conversation and receives a focused evidence packet. Re-review may reuse that independent reviewer.
- Repository/branch/HEAD plus working-content fingerprint covering relevant tracked and untracked source/configuration; a HEAD alone cannot identify uncommitted changes. Record the scoped content and exclusions and compare before/after observations.
- Requirements/check scope, commands with args/cwd/exit/timing/log references, or scenario expected/actual observations and evidence references. Browser evidence retains its own deployment/source relationship and is not fabricated as command evidence.
- Findings, coverage, limitations, changed state, invalidation and next action. Unavailable identity or state observation must be recorded as an independence/evidence gap; do not fabricate IDs or fresh-context claims.

No source writes run concurrently with supposedly final testing/review. A changing observation invalidates the affected claim; stop dependent verdicts, reconcile and rerun/review on the stable result. Evidence/report writes can continue only outside the observed source scope with recorded exclusions; do not exclude application/configuration changes merely to keep a fingerprint stable. Roles are host guidance, not filesystem privileges or sandbox guarantees.

Store these notes as existing task evidence/report artifacts and bounded references. Worker outcomes remain the existing schema; only the coordinator updates aggregate progress and approval records. Preserve completed tasks and immutable attempt records on resume; do not fabricate a design approval to use an orchestration API that requires one. Small inline tasks need not use that API.

## Repair limits, blockers and final reporting

Honor configured `repairLimit` (default three) and unchanged-failure early stops. Track actual repair attempts and remaining budget across verification failures, review repairs, handoffs and resume; do not grant each seat, phase or nested loop a fresh budget. When using `runVerification`, count its repairs against the coordinator's remaining task budget. Read-only investigation or rejected suggestions are not repair attempts. Exhaustion triggers reassessment/reporting, not automatic redesign permission. Preserve actual runtime `failed` versus `blocked` statuses.

The final report distinguishes delivered behavior, independent versus inline work, verified/tested/reviewed state and coverage, actual checks, feedback dispositions, unresolved findings, missing prerequisites, accepted limitations and next action. Existing security gates and explicit dispositions retain their own requirements. Do not turn blocked integration/browser checks, zero-file scans, prose simulations, generated files or package dry runs into native-host/release acceptance.

## Intended changes and exclusions

Expected edits: `pegatus-start`, `pegatus-design`, `pegatus-plan`, `pegatus-execute`, `pegatus-verify`, relevant verifier/reviewer/repairer briefs, shared context handoff guidance, manifest adaptations/resources/feature route, `catalog/README.md`, `docs/orchestration.md`, and relevant README workflow explanation. Add one shared execution guide under `catalog/skills/pegatus-execute/`, linked by consumers and included in their installable resource closure. Amend feedback/review guidance only where integration needs a nonrecursive handoff back to the coordinator.

Tests cover existing API behavior, generated closure and behavioral instruction scenarios. Evidence and scratch reports belong outside distributable content; `package.json` includes `docs`, so do not place raw task logs there. Do not alter upstream locks/bytes/licenses, release metadata, generated files, dependencies, installations, hooks or host settings. Do not touch the unrelated `2026-11-08-skill-evidence-and-simplicity-design.md`. No commit, push, merge or publication is authorized.

## Acceptance and validation design

| Scenario | Required observable result |
| --- | --- |
| Small, clear low-risk fix | Inline path, proportionate checks, no artificial spec/plan or extra seats |
| Tiny diff changes risky permission/data behavior | Risk assessment prevents automatic small/low-risk shortcut |
| Approved substantial feature | Implementers finish, separate verifier returns, fresh reviewer follows, then dispositions/repairs/rechecks and final gates |
| Target stack differs from kit defaults | Only task-relevant skills/overlays/dependencies load; all required references are reachable in generated packets |
| Wrong or stale reviewer remedy | Coordinator validates current defect and disposition before any authorized repair |
| Test fails without known cause | Evidence-led diagnosis, bounded repair, retest and scoped re-review; no speculative patch or budget reset |
| Source changes during testing/review | Affected evidence/verdict is stale and must be reconciled on stable state |
| Explicit inline choice or missing delegation | Sequential procedure with accurate absent-independence disclosure |
| Browser/service/tool/login unavailable | Selected checks remain blocked; unrelated safe work continues; no dependency/MCP setup implied |
| Repair changes approved interface or needs more scope | Affected work pauses for decision; unrelated work/approvals retained |
| Resume after completed work or partly used repair budget | Reconcile state, retain completed work/approvals/attempts, no redispatch or fresh budget |

After approval, write the actionable implementation plan with task ownership/checks. Use Node's test runner for meaningful manifest routing, stack/resource selection, existing handoff transport/budget and generated host/scope closure checks. Evaluate scenarios with fresh agent contexts reading the proposed guidance, concrete inputs and expected decisions/actions; retain observed answers and deviations, not a self-grading invented execution engine or only phrase assertions. These are instruction-level evaluations, not proof of native installed workflow enforcement. Use a bounded disposable host trial only where actual tools/access permit it without new installation/configuration authority; report unavailable trials explicitly.

Run appropriate focused tests, then `npm test`, `npm run lint`, and `npm pack --dry-run` on the final integrated tree. Inspect package contents for scratch evidence and required resource closure. Record actual results and the pre-existing notice warning honestly. This document itself changes no product behavior, so approval-stage validation is source grounding and independent builder review, not an implementation test pass.

## Design review record

Fresh builder-check context `/root/adaptive_builder_check` read this design and applicable repository instructions on 2026-11-08. Asked for consequential unanswered planning questions, it returned: "nothing important left". This establishes the result of that bounded document review only; it is not implementation verification or design approval.
