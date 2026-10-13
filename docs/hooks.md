# Lifecycle checkpoints

`dispatchEvent(event,deps)` accepts an explicit absolute root, existing task ID, unique event ID and one of `session-start`, `before-action`, `post-edit`, `pre-compact`, `session-end`, or `complete`. It returns a Result. Only a completed state checkpoint records the event ID, so a failed save, reconciliation, or security gate can be retried. IDs and native session bindings are hashed in `progress.json`; no native tool input, output, transcript, credentials, or learning candidate body enters the lifecycle journal. The journal retains up to 4096 event IDs per task and then rejects new events; it never evicts old IDs and reexecutes a replay. Archive or roll over a completed task before reaching that limit.

Start reconciles the task's declared repositories and blocks dependent Pegatus work on discrepancies. Post-edit refreshes those repository snapshots and marks prior verification and evidence `valid:false`, retaining their paths and earlier results for reporting. Pre-compaction and session end save the state and can call an injected optional `collectLearning` callback with task, hashed event reference and revision only. `before-action` needs an injected trusted authorization callback; no host permission is invented. Completion requires valid passed verification and explicit affected configuration files. It calls `scanAgentConfig({root,files})` and only checkpoints completion after a valid `passed` scanner result. Changed application code still needs its separate review.

Explicit calls work without native hook setup:

```text
node bin/pegatus.mjs lifecycle --root <explicit-root> --task <task-id> --event-id <unique-id> --type pre-compact
node bin/pegatus.mjs lifecycle --root <explicit-root> --task <task-id> --event-id <unique-id> --type complete --config-file <relative-config>
```

The CLI returns exit 0 for passed/skipped, 1 for failed, 2 for invalid usage, and 3 for blocked. A `complete` call must repeat `--config-file` for every affected agent configuration file; missing scope blocks completion. Explicit calls are the gate for consequential workflow operations, including compaction when no unique native invocation ID is available.

## Opt-in native bridge

`pegatus hook-activation --host claude|codex --root <installed-root>` prints a versioned JSON merge proposal; `doctor` includes the same proposal under `hookActivation`. Review and merge its `hooks` object into existing `.claude/settings.json` or `.codex/hooks.json` yourself. The installer does not alter existing host settings, register hooks, or claim active native enforcement. The command names only the fixed installed runtime and host. It never embeds task IDs, prompt text, file paths from tool input, or other task data in shell code. Roots with shell metacharacters cannot receive an automatic command proposal and must use explicit CLI calls.

Launch the host for one explicitly selected task with `PEGATUS_ROOT` set to that installed root and `PEGATUS_TASK_ID` set to its existing task ID. The `SessionStart` bridge records a hash of the native session ID under that task; later mapped events must have that binding. `PEGATUS_SESSION_ID` may additionally pin an already known native session ID. Missing task binding, unknown task records, mismatched session IDs, unsupported tool events, and Antigravity native events skip. Hook stdin never chooses the root or task. The bridge limits JSON input to 256 KiB and writes no raw payload. Replayed events across separate processes use the task's durable progress CAS.

The merge proposal covers documented `SessionStart`, file-edit `PostToolUse` (`Edit`, `Write`, `NotebookEdit` on Claude; `apply_patch` on Codex), and `SessionEnd`. Shell commands and arbitrary MCP tools cannot be proven to be edits from those events, so use an explicit `post-edit` call after they modify files. Native `PreCompact` is available to a manually configured hook only when a trusted wrapper supplies a distinct `PEGATUS_EVENT_ID` for each invocation. The default proposal leaves it to the explicit CLI; a fixed ID would suppress later checkpoints. `complete` and `before-action` also remain explicit calls. Antigravity has no audited native hook registration, so it uses explicit calls.

Native responses follow each documented event rather than pretending all failures block. `PreCompact` can stop compaction: Claude receives exit 2 and Codex receives JSON `continue:false`. `PostToolUse` occurs after a tool ran and cannot undo an edit; the bridge returns advisory context. `SessionStart` and `SessionEnd` are also advisory. Codex local hooks have tool-path exceptions and may proceed after hook failures; these native integrations supplement, but do not replace, required Pegatus CLI gates. A manual merge needs a live host trust/acceptance check on Windows and Linux before marking a host's hooks `native` in doctor.

Host semantics: [Claude Code hooks reference](https://code.claude.com/docs/en/hooks), [Codex hooks reference](https://learn.chatgpt.com/docs/hooks). The audited compatibility limits are in [hosts.md](compatibility/hosts.md).
