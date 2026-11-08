# Adaptive execution and evidence

Use the [skill-use evidence and simplicity guide](skill-evidence-guide.md) alongside each relevant phase. Implementation tasks use its proportional evidence and simplicity checks by default; technical-skill selection, reading and actual application are separate claims. Carry application records and explicit task-only skips in existing evidence references, reassessing validity after changed scope or source.

This shared host procedure coordinates authorized work. Follow the target's actual instructions, knowledge, source, stack and selected checks through the [context protocol](../../context-protocol.md). Pegatus supplies guidance and existing state/handoff helpers; role names, generated packets and API success do not establish separate contexts, source isolation, native enforcement or release acceptance. No external skill installation is required.

## Human confirmation and execution mode

These host procedures apply to every task size and direct workflow entry point. Complexity chooses the depth of work and checks; it never chooses the user's execution mode. Applicable host/user authority remains in force.

Before implementation, present the concrete plan or compact small-task brief and ask the user to choose **Native subagents** or **Inline**. Wait for an explicit selection; a generic plan approval is not a mode selection. Preserve a mode already explicitly selected for this task without asking again. Native subagents permits supported native delegation, not mandatory parallelism. Inline prohibits all subagent spawning for this task, including exploration, planning, implementation, testing, browser testing, security review, code review and repairs. Perform applicable role procedures sequentially in the current context and disclose absent independence. Before mode selection, do not spawn workers on the user's behalf. If Native is unavailable or becomes unavailable, explain the limitation and wait for a decision before switching to Inline, unless the user previously approved automatic fallback for this task. Disclose an authorized fallback when it occurs; never infer permission from availability alone.

Both modes retain applicable instruction discovery, authoritative knowledge retrieval, source confirmation, technical skills and required overlays/resources, skill-use evidence, simplicity assessment, ownership and permission guards, security/completion gates, meaningful checks, evidence invalidation and the shared repair budget. Inline is not a waiver. A mode change does not waive pending approvals or checks.

By default, at each applicable phase boundary, summarize what was completed, reference the exact artifact/scope or code state, state unresolved issues and propose the next step. Ask for human confirmation and wait before entering that step:

| Completed phase | Confirmation required before |
| --- | --- |
| Brainstorming | Formal design/specification |
| Design/specification | Planning, with approved requirements, acceptance criteria and scope |
| Planning | Implementation, with explicit plan approval and execution-mode selection |
| Implementation | Verification |
| Verification | Code review |
| Code review or feedback assessment | The proposed repairs, or final checks when no repairs are needed |
| Repairs | Affected retesting, then re-review after testing returns |
| Final checks | Present completion report for human review; external actions need separate authorization |

### Optional task-scoped automatic behavior

Ask the human before enabling either option, independently:

- **Automatic Inline fallback:** when selected Native delegation is unavailable, allow switching this task to Inline without another prompt. This does not permit spawning after Inline is selected and does not authorize future tasks or unrelated actions.
- **Automatic phase progression:** allow continuing through explicitly named phases or boundaries without repeated confirmations, for example from approved implementation through verification and review. Record whether in-scope repairs and their retest/re-review are included; omission leaves their confirmation pending. This does not approve an unapproved design/specification or plan, material scope/design changes, or external actions.

Default both options to disabled. State the proposed scope and wait for an explicit answer before enabling either; a generic 'go ahead' or execution-mode selection does not enable them. Approved options apply only to the current task, survive its handoff/resume with their evidence and scope, and can be revoked by the user. Do not save a future-task default without an explicit user request through the applicable configuration/learning approval process. Existing defaults do not authorize changing configuration implicitly. Stop for missing authority, material changes, security/permission gates or blockers requiring a human decision regardless of automatic progression. All applicable skills, guards, checks, evidence and repair-budget rules remain required.

At a covered boundary, report the completed step and next action and continue under the recorded permission. At an uncovered, revoked or invalidated boundary, ask and wait. Never claim that opting into automation made a failed or blocked check pass.

Small clear low-risk tasks may combine the brief, compact plan and mode choice into one pre-implementation confirmation without forced spec/plan files; later applicable phase confirmations still apply unless covered by explicit task-scoped automatic progression. Omitted phases require no artificial checkpoint. A direct request for a specific phase authorizes that named phase within its scope, not automatic advancement to subsequent phases. Commands and implementation-local checks needed to construct a reviewable implementation remain part of implementation; they do not substitute for the later verification phase. Assigned workers return findings/evidence to the coordinator and never run a nested confirmation sequence or advance phases themselves.

A response approves only the named next step and presented scope, or the explicitly named automatic behavior and phase range. Silence, elapsed time, tool success, a worker's assertion or a generic earlier 'go ahead' does not approve future transitions. A reply answering only the mode question does not approve an unapproved plan, and vice versa. Human acceptance never turns a failed/blocked check into a pass or waives mandatory checks. Justified in-scope repair authority remains, but the coordinator must obtain confirmation of the proposed repair step before executing it unless approved automatic progression explicitly includes that in-scope repair.

For tracked work retain mode, both automatic-option decisions and their covered phases, user confirmation evidence, artifact/scope identity, pending checkpoint and next action in existing task artifacts and evidence references, using coordinator-only atomic state APIs for aggregate writes. No new progress schema or approval kind is required. Handoffs carry those references; receivers read them before action. Resume preserves valid choices, approvals, completed work and consumed repair budget, and remains at any unanswered checkpoint. Materially revised scope, plan or affected artifact invalidates its prior approval and requires renewed confirmation. Conversational brainstorming retains choices in chat and creates no task files by default.

This policy governs host coordination; it is not a new runtime enforcement engine. `workflowRoute().canImplement` reports existing route eligibility only, not plan approval, mode selection or human confirmation of the next step. Low-level scheduling/callback success cannot authorize a host transition. Existing runtime APIs, Result shapes and exit codes remain unchanged.

## Choose depth before dispatch

Record a short decision: requested scope, risk and uncertainty, relevant user/developer preferences, actual tools/delegation availability and chosen mode. Reassess when evidence changes those inputs. Diff size alone does not determine risk: a one-line permission, tenant filter, data deletion or public-contract change may need substantial testing/review.

| Situation | Procedure |
| --- | --- |
| Small, clear, low-risk authorized work | Confirm the brief/compact plan and mode, then inspect, implement, perform proportionate checks and report with applicable phase confirmations. Do not force feature spec/plan artifacts or extra seats. |
| Feature or architecture work | Resolve consequential questions, retain explicit design and scope approval, produce an actionable plan, then use the substantial sequence below. |
| Small but risky or uncertain work | Resolve material uncertainty and select substantial verification/review as needed. Create design/plan artifacts only when scope warrants them. |
| Investigation, review, feedback assessment or testing only | Preserve that intent and the product-edit boundary. Findings alone do not authorize fixes. |
| Confirmed Inline mode or explicitly preapproved automatic Inline fallback | Perform relevant procedures sequentially inline and state which independent testing/review is absent. Renaming the same context does not create independence. |
| Unavailable/disallowed Native delegation without approved fallback | Explain the limitation and wait for a human mode decision; do not start dependent Inline work. |

Default concurrency is two, capped by configuration and actual host support. Separate seats need not run simultaneously. Parallel implementation requires agreed interfaces, independent dependencies and disjoint ownership. Preserve existing authority through routine phase changes and resume; honor each applicable phase confirmation unless covered by explicit task-scoped automatic progression, and seek a decision for missing authority or consequential scope/design changes. Design approval does not authorize publication, deployment or other external actions.

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
5. **Disposition the entire finding set.** Use [review feedback](../pegatus-review-feedback/SKILL.md) to retain per-item evidence and valid, not applicable, already addressed, unclear/blocked or outside-scope decisions. Revalidate against current source and approved requirements. A valid defect may have a wrong or stale proposed remedy. Route unexplained failures through the [debugging guide](../pegatus-investigate/debugging-guide.md) before choosing a fix. Assessment-only remains read-only; existing task authorization permits justified in-scope repairs, subject to confirmation of the proposed repair step unless explicit task-scoped automatic progression includes that repair.
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
