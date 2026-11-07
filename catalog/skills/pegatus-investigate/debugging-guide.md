# Debug from evidence to cause

Use this shared procedure for investigation and authorized repairs. The goal is a supported causal explanation and a verified outcome, not a sequence of plausible edits. Keep the process proportionate: an obvious local defect may need only a short trace and focused check; a distributed or intermittent failure needs more evidence. Urgency does not turn guesses into facts.

## Establish scope and observed failure

Follow the [context protocol](../../context-protocol.md), instructed project discovery and the solution's actual stack, flows and test setup. Distinguish expected behavior from observed behavior; cite requirements or mark unknown domain intent. Read the complete relevant error and stack trace, not just the last line.

Record the revision/content state, exact failing command or user sequence, input conditions, expected/actual result, frequency and environment/prerequisites. Check recent relevant source, dependency and configuration changes without assuming the newest change caused the failure. Preserve unrelated edits and diagnostics.

Investigation-only does not authorize product edits. Existing authorization to fix a defect permits justified in-scope changes without renewed confirmation; broader interfaces, data actions, architecture or external operations still need the relevant authorization. A missing tool, service, login or dataset is an evidence gap, not permission to install tools, alter production data or weaken checks.

## Reproduce and locate the first divergence

Use the smallest relevant reproduction or existing failing check, retaining the conditions that trigger the issue. Do not keep rerunning without a question or stopping condition. For intermittency, record successes and failures and compare environments; one passing run does not establish a fix.

Trace the bad value/state backward through callers to its origin. Then trace the affected behavior forward to consumers and side effects to establish consequence. The line throwing an exception may only expose an earlier broken contract; explain why the proposed repair belongs at the selected boundary.

For multi-component paths such as API → queue/job → persistence, inspect relevant contracts, correlation/order, transformed values, configuration propagation, persisted state and errors on each side of the suspected boundary. Locate the first supported difference between expected and actual behavior rather than adding guards everywhere.

Compare a working path, test, environment or prior revision when useful. Read enough to understand why it works and which differences could explain failure. For suite-only failures, compare isolated and ordered execution and inspect fixtures, cleanup, shared files, environment variables, global state and concurrency. Do not hide pollution with assertion removal, arbitrary sleeps or unconditional retries.

Use existing logs and read-only inspection first. If additional instrumentation or an experiment is needed, state what it will distinguish, its scope and stopping condition, and use existing task authorization or request only missing authority. Avoid dumping secrets, payloads or entire environments; prefer redacted correlation, presence, types, counts and bounded metadata. Do not collect unrelated user data.

When running inside `runVerification`'s diagnosis callback in `src/verify/loop.mjs`, keep diagnosis read-only. The runtime detects changes in the observed code state after diagnosis and blocks continuation; it does not prevent the mutation itself. Propose a needed diagnostic edit to the coordinator for a separately authorized step, then refresh the observed state and affected evidence before resuming. Do not mutate source inside that callback or bypass its state checks.

## Test a causal hypothesis

State a falsifiable explanation: suspected cause, supporting observations, the result predicted by that cause, and the smallest check that distinguishes it from alternatives. Keep competing explanations and unknowns visible. Test one causal variable at a time; do not combine unrelated fixes and then infer which one worked.

Read the result before proceeding. A disproven hypothesis requires a revised explanation based on the new evidence, not another speculative patch layered over it. Preserve the attempt and its outcome. Remove or revise only your own unsuccessful diagnostic changes when authorized; never use blanket restore/reset commands that could erase user work.

If runtime reproduction is unavailable but source establishes a concrete trigger and causal path, describe that proof and its limits. Do not claim reproduced or verified runtime behavior. If the cause remains uncertain, report the leading hypotheses, evidence already gathered and the next discriminating check. An environmental or external cause remains possible; adding retry, timeout or fallback behavior is a separate justified change, not an automatic response to uncertainty.

## Repair and verify within the existing workflow

For an authorized repair, select the smallest cohesive change addressing the supported cause. Use meaningful regression coverage for behavioral defects: an existing failing check or a focused reproduction should demonstrate the original failure and then the corrected behavior where feasible. Preserve the solution's test framework; no mandatory new dependency, artificial coverage target or ceremonial test for a nonbehavioral edit. If a check cannot run, record why and what remains unverified.

Do not weaken assertions, disable required validation or bundle cleanup to get green output. Add defensive validation only where justified by the contract and consequences; do not scatter speculative guards across every layer. For asynchronous readiness, use an observable condition with a bounded deadline when appropriate. Tests of actual time semantics, such as debounce or expiry, must retain their timing contract rather than polling until any result appears.

Remove your own temporary instrumentation before final checks unless retaining it is an intentional authorized change; preserve user-owned diagnostics. Rerun the original failure and affected regression/integration checks on the resulting code state, obtain required review and run configured final gates. Source edits invalidate affected earlier evidence. A passing build alone does not prove a behavioral, concurrency or integration fix.

## Bound attempts and reassess honestly

Keep hypothesis/experiment results, actual repair attempts, remaining budget and next action in existing task/worker records as applicable. Carry them across handoff/resume; do not restart the count to manufacture more attempts. Diagnostic retrieval passes and repair attempts are different limits; neither bypasses the other.

Honor configured `repairLimit` (default three) and the existing unchanged-failure early stop. Do not import a second unconditional three-attempt rule or increase the budget implicitly. An unchanged failure on unchanged code is not a reason for another blind repair. At a stop, report the actual result and unresolved cause; continue only independent safe work. In the runtime loop, exhausted repairs and unchanged failures return `failed`; scope/security/state blockers retain their existing `blocked` distinctions. Do not relabel them as passing or invent new result statuses.

Repeated failures, spreading symptoms or a repair requiring broad redesign warrant reassessing assumptions, shared state, dependencies and architecture. They do not prove architectural fault or authorize redesign. Present the evidence and any material design decision to the user before dependent scope expansion. An explicitly requested temporary mitigation must be labeled and validated as a mitigation, with the root cause still unresolved when that is the evidence.

Report observed failure, supported cause versus remaining hypotheses, experiments, authorized changes, exact checks/results, remaining risks and next action. Never claim fixed from an edit alone. This is host procedure around existing APIs, not mechanical enforcement of every debugging step. See [reference and attribution](reference.md).
