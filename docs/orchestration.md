# Orchestration

## Browser testing lane

The verifier can request the browser-tester role through [pegatus-browser-test](../catalog/skills/pegatus-browser-test/SKILL.md) for selected UI scenarios. Direct user invocation can test an existing application with no implementation diff. Browser testing is not mandatory for every frontend task; record why it is unnecessary when observable UI behavior is unaffected.

Pass the URL or startup procedure, scenarios/expected outcomes, test data, viewports and evidence ownership alongside normal handoff context. Browser actions can modify shared application state, so serialize scenarios that share accounts or records even when filesystem ownership is disjoint. The tester writes evidence/findings, not source fixes or aggregate progress.

Native delegation and Playwright MCP availability are separate capabilities. Confirm tools in the actual worker session. Unsupported delegation uses the procedure inline with disclosure; missing browser tools, services or login block selected scenarios. Browser reports are separate from executable-command evidence and cannot be fabricated as successful command checks. Existing completion gates remain in force. See [browser testing](browser-testing.md).

`node bin/pegatus.mjs orchestrate plan --root <solution-root> --task <task-id>` reads saved progress and returns `status: 'skipped'`, `planningOnly: true`, and proposed batches. It does not execute or verify work. Unknown delegation capability uses sequential inline scheduling. `--concurrency <n>` overrides the configured default of two. An explicit `--capabilities-file <relative-json>` may declare `{ "schemaVersion": 1, "delegation": true, "maxWorkers": 2 }`. This declaration is supplied by the host integrator; a host name does not establish support or qualification.

The CLI reads project `.pegatus/config.json`; `runOrchestrationCommand` also accepts `userConfig` and preserves project-over-user precedence through `resolveConfig`. `--host` selects an existing team's host mapping for role briefs. Model and effort resolve through the Task 9c fixed-tier helper. Workers cannot select replacements.

`orchestrate run` requires an integrating host wrapper. The standalone binary reports blocked because it has no worker or verification callbacks. A wrapper may inject `orchestrationCallbacks` into exported `main`, or call the APIs below directly. There is no worker subprocess service, model API, automatic model selection, or inferred native launcher. Claude Code, Codex and Antigravity integrators must supply their supported native delegation callback or an explicit inline role executor; live host qualification is separate.

## Saved input

The coordinator loads `.pegatus/work/<task-id>/progress.json`. Existing coordinator approval must bind `approvedScopeHash` to a design approval with user evidence. It never accepts approvals from worker output. Each task needs `id`, `status`, `paths` (or `ownedPaths`), `dependsOn`, `scope`, and nonempty `checks`. Supported statuses are `pending`, `running`, `done`/`completed`, `failed`, `blocked`, and `interrupted`. Optional `role` contains the catalog role's fixed `modelTier`.

Context needs `instructionPaths`, trusted semantic `resolution.readInstructions` covering all discovered instructions, optional knowledge/resource/evidence references, and `combinedChecks` containing configured executable checks. Context records the coordinator's actual instruction review; reference presence alone does not prove semantic compliance. Checks are validated before dispatch. At least one declared Git repository and current content fingerprints are required for combined verification. Branch, HEAD, content drift on resume, or unverifiable submodules require reconciliation.

## API boundary

`schedule(tasks, { concurrency = 2, capabilities = {} })` is pure planning. It rejects dependency cycles, duplicate IDs, unknown dependencies, and escaping ownership. It respects ancestor paths, separator differences and conservative case-insensitive ownership. It serializes overlapping paths, including paths in separately named worktrees; this release does not assume worktree isolation from a caller label. Failed, blocked, running or interrupted dependencies are never assumed successful.

`buildHandoff(task, context)` returns a schema-versioned brief or a blocked brief. It carries instruction-review provenance, existing scope approvals, ownership, checks, dependencies, expected output, and a reference-only context manifest. At dispatch, completed dependency records and evidence references are added. It reuses `buildContextManifest` and token controls, and blocks overflow without trimming required instructions, approvals or checks.

`runOrchestration({ root, taskId, concurrency, capabilities, tokenControls, host, models, modelCapabilities }, deps)` accepts these host callbacks:

- `launchWorker(brief, { writeRecord, recordPath })` when `capabilities.delegation === true`.
- `executeInline(brief, { writeRecord, recordPath })` otherwise. Inline callbacks run sequentially.
- `verifyCombined({ root, taskId, checks, tasks, getCodeState })`. Normally call `runVerification({ checks, getCodeState, repositoryRoot: root, evidenceRoot })` using the existing verifier. Retain command logs in the declared evidence directory.

An executor either returns `{ status, changedPaths, evidence, openIssues, knowledgeCandidates, changedInterfaces }`, or calls its bound `writeRecord(outcome)` and returns nothing. Arrays contain bounded paths/references, never embedded log bodies. Passed worker outcomes require evidence references. An exception without a durable terminal result becomes interrupted. Unexpected changed interfaces or reported changes outside ownership block the worker and its dependent tasks. This is a workflow guardrail; host permissions and source review govern actual filesystem actions, and an unreported change is not a sandbox-enforced denial.

Before launch the coordinator reserves running ownership and invalidates prior verification in a progress CAS checkpoint. Workers receive cloned briefs and a writer bound to `.pegatus/work/<task-id>/workers/<worker-id>/<attempt-id>.json`. Records use schema version one, exclusive creation and fsync, and cannot carry aggregate progress or approval mutations. Partial/corrupt records are rejected; healthy parallel results are preserved. Only the coordinator writes aggregate state. A CAS conflict stops the invocation, keeping isolated results for recovery.

Combined success requires actual configured command evidence for every check, matching executable, argument array, working directory, zero exit, valid status and current code state. Code-state observation brackets verification. The coordinator stores bounded command provenance/log references rather than callback output bodies/history. `passed` means workers and combined checks passed; the task still needs its independent review and existing completion security gate.

## Recovery

Done/completed tasks are never redispatched. Running reservations with valid durable terminal records are imported. A running reservation without a terminal record blocks; no age heuristic assumes its worker has stopped. A changed scope or task graph requires coordinator reconciliation rather than reuse of stale completed work.

After confirming the host worker has stopped, call `reconcileWorker({ root, taskId, workerId, expectedRevision, stopped: true, retry: true, evidence: '<confirmation-reference>' })`. It uses aggregate CAS, retains prior immutable attempt paths, leaves completed tasks intact, and restores only dependency-blocked descendants. Omit `retry` to record interruption. A coordinator must reconcile repository snapshots through the existing explicit checkpoint operation before resuming if files changed after its last snapshot. The API does not kill host workers, approve expanded scope, or bypass host permissions.
