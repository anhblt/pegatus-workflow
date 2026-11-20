# Pegatus Caveman Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for Inline or `superpowers:subagent-driven-development` for Native subagents after the user approves the plan and selects the mode.

**Goal** — Provide two opt-in levels of brevity for coordinator progress updates and final replies in the current chat.

**Architecture** — One Pegatus-owned skill defines both modes. The catalog alias exposes the skill through existing host adapters. Its generated entry points skip project discovery for this chat-only operation.

**Tech stack** — Node.js 22+, ESM, Markdown catalog, Node test runner.

**Spec** — [Pegatus Caveman design](../specs/2026-11-20-pegatus-caveman-design.md).

## Global constraints

- Work in the current checkout. Use conversation context for the mode. Add zero dependencies, CLI operations, hooks, and persisted settings.
- Keep the mode at the coordinator's chat boundary. Preserve worker instructions, task artifacts, approvals, and verification requirements.
- Document observed host behavior and unverified hosts separately. Generated entry points establish wiring.

## Review focus

- Generic requests for fewer words leave the mode as selected. An explicit invocation selects the mode.
- Standalone use with no project context goes straight to the skill, including the Antigravity workflow alias.
- Switching from `ultra` to the bare command selects Caveman. `off` clears either mode, and a new chat starts in ordinary mode.
- Exact errors, conditions, negations, and approval details survive both modes.
- One request for more detail is honored while the selected mode continues for later replies.

## Task 1 — Installable chat style command

**Files**

- Create `catalog/skills/pegatus-caveman/SKILL.md` and `catalog/commands/caveman.md`.
- Modify `catalog/manifest.json`, `src/adapters/capabilities.mjs`, `tests/adapters.test.mjs`, and `README.md`.

**Contract** — `command-caveman` targets `pegatus-caveman`. Both catalog entries use `activation.tasks: ["pegatus-caveman"]`. The skill declares its body as its resource with no dependencies. The command declares its body and the skill body as resources, with `pegatus-caveman` as its dependency.

- [ ] Add a focused adapter regression named `Caveman generates explicit chat-only entry points`. Use the existing `catalog`, `root`, and `generateHost` in `tests/adapters.test.mjs`. Assert `catalog.commands.find(entry => entry.id === 'command-caveman')?.skill === 'pegatus-caveman'`. Assert the matching skill has `activation.tasks` equal to `['pegatus-caveman']`. For both scopes, generate Claude and Codex and locate `.claude/skills/pegatus-caveman/SKILL.md` and `.agents/skills/pegatus-caveman/SKILL.md`. For Antigravity, locate `.agents/workflows/pegatus-caveman.md` in project scope and `.gemini/config/global_workflows/pegatus-caveman.md` in user scope. Assert each generated body explicitly mentions the optional `ultra` and `off` arguments, omits the generic `Read applicable solution instructions and follow their discovery procedure first` preamble, and links to its packaged procedure. For Antigravity, follow the command resource link to the packaged skill and assert both files are in the packet.
- [ ] Run `node --test --test-name-pattern=Caveman tests/adapters.test.mjs`. Expect failure at the missing command assertion.
- [ ] Add the two Markdown files and manifest entries. In the skill, define explicit bare, `ultra`, and `off` selections, a one-line acknowledgment, conversation-local persistence, a plain-prose clarity fallback, and the chat-only boundaries from the spec. The command file forwards the original invocation to the shared skill via a relative link. A missing or lost mode context defaults to ordinary replies.
- [ ] In `generateHost`, handle `pegatus-caveman` at the shared wrapper instruction point for both skill entries and command entries. Direct the host to read the packaged procedure with the existing relative-link helper and apply the explicitly invoked argument. Return from this path before adding project discovery and implementation guidance. Preserve the generic path for other entries. Add the mode syntax and scope to the README workflow catalog.
- [ ] Run `node --test tests/adapters.test.mjs tests/catalog.test.mjs tests/workflow-contract.test.mjs`, `npm test`, and `npm run lint`. Expect zero failures and zero lint errors. Report any warnings.
- [ ] On each available host that can discover the entry point, explicitly invoke the bare command and request a short sample workflow with a progress update and final reply. Repeat with `ultra`. Include `npm test`, a path, and a material caveat such as a verification lane that did not run. Confirm that details survive, ask once for an expanded reply, and check that a later reply returns to the selected style. Switch back to bare Caveman, test `off` from each active mode, and check ordinary replies in a new chat. Record the actual host and results, and disclose any blocked invocation or context checks.
