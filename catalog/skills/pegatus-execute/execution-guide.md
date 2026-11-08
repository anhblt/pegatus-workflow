# Adaptive execution and evidence

This shared host procedure coordinates authorized work. Follow the target's actual instructions, knowledge, source, stack and selected checks through the [context protocol](../../context-protocol.md). Pegatus supplies guidance and existing state/handoff helpers; role names, generated packets and API success do not establish separate contexts, source isolation, native enforcement or release acceptance. No external skill installation is required.

## Choose depth before dispatch

Record a short decision: requested scope, risk and uncertainty, relevant user/developer preferences, actual tools/delegation availability and chosen mode. Reassess when evidence changes those inputs. Diff size alone does not determine risk: a one-line permission, tenant filter, data deletion or public-contract change may need substantial testing/review.

| Situation | Procedure |
| --- | --- |
| Small, clear, low-risk authorized work | Inspect, implement, proportionate checks and report inline. Do not force feature spec/plan artifacts or extra seats. |
| Feature or architecture work | Resolve consequential questions, retain explicit design and scope approval, produce an actionable plan, then use the substantial sequence below. |
| Small but risky or uncertain work | Resolve material uncertainty and select substantial verification/review as needed. Create design/plan artifacts only when scope warrants them. |
| Investigation, review, feedback assessment or testing only | Preserve that intent and the product-edit boundary. Findings alone do not authorize fixes. |
| Explicit inline choice, disallowed or unavailable delegation | Perform relevant procedures sequentially inline and state which independent testing/review is absent. Renaming the same context does not create independence. |

Default concurrency is two, capped by configuration and actual host support. Separate seats need not run simultaneously. Parallel implementation requires agreed interfaces, independent dependencies and disjoint ownership. Preserve existing authority through routine phase changes and resume; seek a decision only for missing authority or consequential scope/design changes. Design approval does not authorize publication, deployment or other external actions.

## Prepare a bounded task packet

Read target path instructions and prescribed knowledge before selecting roles or skills. Detect actual framework/version and test tooling; the kit's default .NET/React advice is not the target's stack. Use existing `selectSkills(catalog, task)` for discovery assistance, read selected overlays first, and apply semantic relevance plus `selectResources(skill, task)` and required dependencies/linked resources. Do not load all stack packs. If no skill fits, record that and follow target conventions rather than inventing a skill or installing a dependency.

Each task packet identifies:

- Applicable instruction paths and what the receiver must read; authoritative knowledge/source references and remaining uncertainties.
- Requirements/acceptance, approved artifacts and preserved approval evidence.
- Scope, owned paths, interfaces, dependency records, prerequisites and project-selected checks.
- Selected skill IDs/paths and reasons, required overlays, dependencies and resource references.
- Expected changes/evidence, report destination, stop conditions and remaining task repair budget.

Store supplemental detail as an ordinary referenced task artifact, for example `.pegatus/work/<task-id>/evidence/task-packet.md`. Carry its path and selected guidance in existing `resources`, evidence references and context manifests through `buildHandoff(task, context)`. Do not add runtime fields, embed entire logs or flatten skills away from required resources. A reference's presence proves neither reading nor application; the receiver must read its relevant packet and references before acting and report gaps. Required context overflow or unavailable guidance blocks dependent dispatch. Narrow retrieval without dropping mandatory context; unrelated safe work can continue. Existing handoff approval requirements remain; do not fabricate a design approval for a small inline task just to use the orchestration API.

Follow the configured role tiers and [model-selection policy](../../rules/common/tokens-orchestration.md). The trusted coordinator records an actual supported model/effort selection or host-default fallback; workers do not select replacements.

## Substantial implementation through completion

1. **Implement.** Dispatch suitable existing implementer roles with bounded packets. Collect worker changes, checks, evidence, unresolved issues and interface deviations. Reconcile overlap or changed interfaces before dependent work. Worker checks are useful input and remain implementation evidence.
2. **Establish the completion barrier.** Integrate completed lanes and confirm all source writers for the verification scope have stopped, including outstanding asynchronous workers. Capture the resulting working-content state. Do not start supposedly final testing/review while repairs or other relevant source writes are active.
3. **Test separately.** Dispatch a verifier context separate from implementation to exercise acceptance behavior, failure cases and relevant integration on that stable state. It writes verification evidence/findings, never product repairs. Select UI scenarios through [browser testing](../pegatus-browser-test/SKILL.md) when observable UI impact or an explicit request warrants them. Confirm actual worker tools and prerequisites; unavailable services, browser tools or login block affected scenarios and do not authorize installation. Preserve expected/actual observations and coverage gaps.
4. **Review freshly after testing returns.** Dispatch one fresh code-reviewer context that performed neither implementation nor verification and has not inherited the implementation conversation. Supply requirements/approvals, plan, pinned diff/content state, verification evidence, known gaps and a focused brief. Follow the [behavior and impact review guide](../pegatus-review/review-guide.md): independently trace requirements, logic, failure paths, callers/consumers and test sufficiency. Failed or blocked tests stay visible; safe source review can still assist diagnosis, but cannot support an unqualified completion verdict with required checks outstanding. Reusing an implementer or verifier as reviewer must be disclosed as an independence gap, even if the role label changes. An independent reviewer may be reused for scoped re-review.
5. **Disposition the entire finding set.** Use [review feedback](../pegatus-review-feedback/SKILL.md) to retain per-item evidence and valid, not applicable, already addressed, unclear/blocked or outside-scope decisions. Revalidate against current source and approved requirements. A valid defect may have a wrong or stale proposed remedy. Route unexplained failures through the [debugging guide](../pegatus-investigate/debugging-guide.md) before choosing a fix. Assessment-only remains read-only; existing task authorization permits justified in-scope repairs without repeated approval.
6. **Repair within bounds and recheck.** Assign a bounded repair to an appropriate implementer, reusing its context when supported. Keep verifier/reviewer contexts free of product edits. Preserve unrelated work and approvals; a changed approved interface or material scope pauses affected work for a decision. Stop source writers again, capture the new state, retest affected behavior and obtain scoped re-review. Retain unaffected findings/evidence only with a concrete scope/dependency justification; interacting changes or uncertainty require wider checks.
7. **Finish on the integrated state.** Run configured combined final checks and existing security/completion gates, then report. Earlier final-state command evidence may be referenced when code state, scope, commands/args/cwd and prerequisites still match; do not rerun merely to rename a phase. New edits or interacting repairs require relevant combined checks again. Browser evidence retains its own source/deployment relationship and cannot be fabricated as command evidence. Passing implementation checks, a callback or `runOrchestration` alone does not establish independent testing/review or security-gated completion.

The manifest describes `context → design → plan → implement → verify → review → verify → report` for feature work. The second verify denotes final integrated checks; this is a host route, not a runtime phase engine. Direct review/testing/investigation requests keep their scope and do not automatically start implementation. Delegated verifier/reviewer/repairer calls return findings and evidence to the coordinator without recursively launching the whole sequence. Only the coordinator assigns subsequent work and updates aggregate progress/approval records.

## Record independence and stable-state evidence

For each substantial phase, retain a compact note in existing task evidence/report artifacts with bounded references:

- Actual host agent/session identity or independently invoked process reference, responsibility, delegated versus inline mode and relationship to implementation/testing/review contexts. State unavailable identity as a gap; never invent IDs or claim fresh context from a role name.
- Repository, branch, HEAD and a working-content fingerprint covering relevant tracked **and untracked** source/configuration. Record observed paths and exclusions and compare before/after observations. HEAD alone cannot identify uncommitted state.
- Requirements and check scope, tools/prerequisites, command executable/args/cwd, exit status, timing and retained log references; for scenarios record expected/actual behavior and evidence. Keep secrets out of reports.
- Findings, actual coverage, limitations, state changes, invalidated evidence and next action.

No relevant source writes run concurrently with final testing/review. A changed observation invalidates the affected evidence/verdict: stop dependent completion claims, reconcile and repeat affected checks/review on the stable result. Evidence/report writes may continue only outside observed source scope with explicit exclusions. Never exclude application/configuration changes just to keep a fingerprint stable. Role responsibilities are guidance, not filesystem privileges or sandbox guarantees.

## Carry one repair budget across phases and resume

Honor configured `repairLimit` (default three) and unchanged-failure early stops. Retain actual repair attempts, outcomes and remaining task budget across command failures, review findings, handoffs and resume. Do not give each role, phase or nested loop a new allowance. Read-only investigation and rejected suggestions are not repair attempts. Exhaustion triggers reassessment/reporting, not automatic redesign or a fresh budget.

`runVerification` keeps its existing diagnosis → authorization → repair → repair-review → recheck callback ordering. Diagnosis stays read-only; detected state changes block continuation. Charge loop repairs to the coordinator's remaining task budget. Its repair-review callback does not automatically supply the outer fresh review after independent testing; reconcile resulting state and finish the substantial sequence's independent checks/review as applicable. Preserve runtime `failed` versus `blocked` outcomes, including exhausted repairs and unchanged failures.

On resume, reconcile instructions, approved scope, repository content and evidence first. Preserve completed tasks, approval evidence, immutable worker attempts, dispositions and consumed repair budget. Do not redispatch completed work or infer that an outstanding worker stopped. Continue only with valid evidence and the recorded next action.

## Report what the evidence supports

Distinguish delivered behavior, implementation checks, independent versus inline testing/review, actual tested/reviewed state and coverage, feedback dispositions, unresolved findings, missing prerequisites, accepted limitations and next action. Apply existing security gates separately: zero-file scans, blocked checks, generated files, prose scenarios and package dry runs do not become clean scanning, native-host acceptance or release qualification. Explicit acceptance of a limitation does not turn a failed or blocked check into a pass.

This Pegatus-owned integration reuses existing catalog procedures and their retained attribution; it adds no upstream bytes, dependency, CLI command or runtime contract.
