# Pegatus V2

`0.1.0-rc.1` is a local qualification candidate. **Release is blocked:** native acceptance in all three hosts and both operating systems is incomplete, and the pinned Vercel pack lacks a complete root license notice. This repository is private; do not publish the package until these gates are resolved. See [acceptance](docs/acceptance/checklist.md) and [capabilities](docs/compatibility/capability-matrix.md).

Pegatus distributes shared agents, skills, logical commands, rules, lifecycle checkpoints, reviewed memory and learning, verification, token controls, orchestration, and AgentShield security. It preserves pinned upstream resources and solution instruction authority. Read applicable solution instructions before requirements, design, implementation, review, verification, and resume. Follow their discovery procedures and business flows. Where a vault is configured, it owns project knowledge; `.pegatus/` owns workflow state. A vault is optional.

Use Node 22 or later, npm, and Git. Prepare the exact scanner dependency graph with `npm ci --ignore-scripts`. The local tarball bundles AgentShield 1.6.0 and all locked transitive dependencies; installation copies this prepared graph without runtime downloads. `npm-shrinkwrap.json` retains the exact `package-lock.json` bytes because npm excludes the latter from tarballs. Installed files, including dependency files, receive ownership hashes.

```sh
npm ci --ignore-scripts
npm test
npm run lint
npm pack --dry-run
node bin/pegatus.mjs install --host codex --scope project --root /absolute/sample
node bin/pegatus.mjs doctor --host codex --scope project --root /absolute/sample
node bin/pegatus.mjs update --host codex --scope project --root /absolute/sample
node bin/pegatus.mjs uninstall --host codex --scope project --root /absolute/sample
```

Use an absolute Windows path such as `C:\Samples\Solution` on Windows. Host choices are `claude`, `codex`, and `antigravity`. User defaults require an explicitly selected disposable or approved home root with `--scope user`; project operations can inherit them through `--user-root`. Project configuration overrides defaults. Antigravity user workflows need explicit project activation through the supplied instruction snippet; native global skill/custom-role discovery is unqualified. Installation never modifies existing `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or instruction generators. Edited or conflicting owned files block update/uninstall and remain for review. See [installation and recovery](docs/installation.md).

Invoke installed `pegatus-start`, `pegatus-design`, `pegatus-plan`, `pegatus-execute`, `pegatus-investigate`, `pegatus-review`, `pegatus-verify`, `pegatus-checkpoint`, and `pegatus-resume` workflows directly. The CLI also exposes `learn`, `memory`, `security`, `status`, `lifecycle`, and `orchestrate`. These operations implement shared procedures; agents remain responsible for semantic instruction reading and trusted human approval. Small tasks use a short design approval; features require approved spec, design, and plan; investigations proceed through an evidence-based diagnosis. A scope change invalidates affected approvals.

Checkpoint a complete progress record with `checkpoint <task-id> --file <record.json> --expected-revision <n>`, then use `resume <task-id>`. Atomic revision checks preserve completed work and approval history; resume detects branch, content, and submodule mismatches. Verification distinguishes `passed`, `failed`, `blocked`, and `skipped`, retains current-code evidence, and permits at most three repair rounds by default. Required completion rechecks verification and configuration security. Specific failed/blocked limitations can be accepted only with explicit reviewed evidence bound to task, scope, current code state, and each check's exact evidence; their check statuses remain unchanged. See [hooks and accepted limitations](docs/hooks.md).

Security is an explicit CLI gate, not a claim of universal native enforcement: `security --root <root> --file <relative-config>` reports measured AgentShield discovery, supplemental static coverage, uncovered files, and scanner failures. Native hooks are opt-in, advisory where documented, and require explicit task/session binding. Required direct gates fail closed for missing tasks and unbound sessions. See [security](docs/security.md).

Learning candidates remain untrusted proposals until human review. Approval promotes knowledge through the solution's authoritative destination, with deduplication, project scope, and stale-entry supersession. Use [learning procedures](catalog/skills/pegatus-learn/SKILL.md) and [memory procedures](catalog/skills/pegatus-memory/SKILL.md). Default parallelism is two workers; disjoint ownership and the original instruction context are required, and overlapping edits trigger reconciliation. Unsupported delegation uses inline role work and explicit review. [Token controls](docs/tokens.md) bound reference packets, output previews, and summaries; host-native enforcement and percentage savings require measured trials.

The [source mapping](docs/upstream/component-map.md) and `sources.lock.json` preserve audited source revisions, per-file hashes, selected resource trees, licenses actually present, and the scanner's npm integrity. Do not replace missing notices with invented copyright text. The [Vercel licensing blocker](docs/acceptance/0.1.0-licensing.md) must be resolved by review of actual upstream rights before distribution.
