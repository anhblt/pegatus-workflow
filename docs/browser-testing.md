# Browser testing

Follow the [human confirmation and execution-mode policy](../catalog/skills/pegatus-execute/execution-guide.md#human-confirmation-and-execution-mode). Every implementation requires explicit plan/brief approval and a **Native subagents** or **Inline** selection, regardless of task size. Inline spawns no subagents in any phase and retains all applicable skills, guards and checks. Confirm each applicable next phase with the user, preserve pending checkpoints on resume, and switch modes when native delegation is unavailable only with a user decision or explicitly preapproved task-scoped automatic fallback. Automatic phase progression is a separate human-approved option covering named phases of this task only; all guards and required checks remain. These are host procedures, not native enforcement or new CLI/runtime authorization gates.

Invoke `pegatus-browser-test` through the AI host, for example: "Use pegatus-browser-test to check validation and saving on the vehicle form at http://localhost:3000, including mobile layout." No implementation session or application Playwright dependency is needed.

The host workflow delegates to `browser-tester` only in selected Native subagents mode, or follows the procedure without spawning in confirmed Inline mode. Unavailable Native delegation requires a user decision before switching unless automatic Inline fallback was explicitly human-approved for this task; disclose any approved fallback. The existing `verifier` coordinates frontend verification; there is no separate frontend-tester role. Browser testing is selected for affected interactions, forms, navigation, rendered states and layout, or any explicit user request. Internal refactors, type-only, tooling and documentation work can omit browser checks with a recorded reason when they do not affect observable UI behavior.

## Entry points and responsibilities

The catalog has nine roles and twenty workflow aliases, including the three ECC optimization guidance workflows described in [current state](current-state.md). The portable role ID is `browser-tester`; generated Claude/Codex native role names are `pegatus-browser-tester`. Invoke the `pegatus-browser-test` skill in Claude/Codex or its generated workflow in Antigravity. These are AI-host entry points, not `pegatus browser-test` CLI commands. The general `verifier` selects browser checks and the coordinator handles task state; browser-tester returns evidence and findings. In substantial adaptive execution, selected testing returns before the coordinator dispatches the fresh code reviewer; testing-only requests retain their direct scope.

For an existing Pegatus installation, use the normal install/update ownership and security flow and reload the host. This exposes the new wrappers but does not provision MCP or guarantee that a child agent inherits browser tools. See [installation](installation.md), [orchestration](orchestration.md) and [host capability limits](compatibility/hosts.md).

## Playwright environment

Configure Microsoft's [Playwright MCP](https://github.com/microsoft/playwright-mcp) at user/host scope using that host's supported MCP setup procedure, with a deliberately selected pinned package version and a compatible browser. This setup is per execution environment; Windows, WSL, containers and remote hosts do not automatically share it. Follow host permissions and existing configuration ownership. Use the server's current official setup instructions rather than assuming identical configuration files across hosts.

The application only needs to be running and reachable by the browser, with services and test login available. The tester checks actual Playwright tools and browser access each session. A declared MCP server is not proof of capability. If setup is missing, the selected browser check is blocked and reports the missing prerequisite. Pegatus does not automatically install Playwright, download browsers or register an MCP server in this change.

## Results and support limits

Evidence lives under `.pegatus/work/<task-id>/evidence/browser/`: scenarios, expected/actual results, screenshots and available diagnostics, tied to the observed source/deployment state. Testing reports findings without editing application code. A later implementation task can fix defects and request retesting.

Build/type/lint/tests remain separate checks. Selected browser checks require actual browser evidence, and blocked/unrun required scenarios prevent a browser pass. UI/UX observations are scoped; they do not establish comprehensive accessibility or usability validation. Browser actions stay within authorized test scope and evidence must exclude secrets and sensitive data.

The catalog and adapters package this procedure and role. They do not mechanically execute browser checks or enforce role privileges. Generated host files, unit tests and catalog lint do not establish native Playwright availability, tool inheritance by child agents, independent delegation or live cross-host acceptance. Verify those in each active host; retain the existing [host support limits](compatibility/hosts.md).
