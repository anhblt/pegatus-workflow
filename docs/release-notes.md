# Pegatus release notes

## 0.1.0-rc.3 — 2026-11-23

This private release candidate summarizes changes since `0.1.0-rc.2`.

### Implementation and review

- Code review flags duplicated logic and repeated business rules across related methods or files when they can drift or require coordinated updates. Reviewers recommend consolidation only when it simplifies the code and preserves existing boundaries.
- C# implementation and review check that enums start at `0` with implicit sequential values, each `.cs` file contains exactly one type declaration, and code contains no local functions. Explicit enum values and changes to existing members' numeric values require human approval. Project instructions govern file naming and placement.

### Update and qualification

Update the kit checkout, then run `pegatus update` from the installed project and reload the host. Cross-host and OS acceptance, hosted CI, and the Vercel license notice remain open release gates. [Installation and update guide](../README.md#14-update-and-uninstall) · [Acceptance checklist](acceptance/checklist.md)

## 0.1.0-rc.2 — 2026-11-21

This private release candidate summarizes changes since `0.1.0-rc.1`.

### Chat and workflow

- Use `pegatus-caveman` for shorter coordinator progress updates and final replies, `pegatus-caveman ultra` for tighter replies, and `pegatus-caveman off` to restore ordinary replies. The setting lasts for the current chat.
- Use `pegatus-brainstorm` for conversational exploration and `pegatus-review-feedback` to assess received findings and carry out approved fixes. Investigation and code review now give more explicit guidance on gathering and tracing evidence.
- Choose Inline or Native subagents before implementation. Pegatus asks for confirmation at applicable phase boundaries unless the user approves automatic progression for those phases.
- Implementation and repair procedures include the pinned PonyTail skill. Frontend automated test authoring requires an explicit request. Existing checks still apply.

### Installation and tools

- Guided setup and update handle installed host workflows. Windows setup can register the `pegatus` command. Installations in the same root can share a detached runtime. Claude Code exposes one slash entry point per workflow alias.
- `pegatus-browser-test` supports standalone checks through host-level Playwright MCP. File-cache and prompt-cache guidance can be selected for relevant tasks.

### Update and qualification

Update the kit checkout, then run `pegatus update` from the installed project and reload the host. [Installation and update guide](../README.md#14-update-and-uninstall)

Both Caveman modes were exercised in the Codex CLI. Claude Code and Antigravity entry points were checked through generated adapter output. Cross-host and OS acceptance, hosted CI, and the Vercel license notice remain open release gates. [Acceptance checklist](acceptance/checklist.md)
