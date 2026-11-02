# Agent instructions

## Project scope

Pegatus V2 is a Node.js ESM workflow kit for Claude Code, Codex, and Antigravity. The kit repository is not itself a .NET or React application. It requires Node.js 22 or later. Treat the target solution's actual stack, instructions, architecture, and test setup as authoritative whenever working on an installed project.

## Start with the right context

- Read this file and the relevant sections of `README.md` before changing kit behavior.
- For architecture or acceptance changes, consult `docs/superpowers/specs/2026-10-12-pegatus-v2-design.md` and `docs/superpowers/plans/2026-10-12-pegatus-v2.md`.
- For catalog or workflow changes, read `catalog/README.md`, `catalog/context-protocol.md`, and the applicable entries in `catalog/manifest.json`. Load only the selected skill's required references and linked resource closure.
- For host behavior, installation, security, state, learning, hooks, tokens, or orchestration, read the relevant guide under `docs/` and check `docs/compatibility/` or `docs/acceptance/` for the current support limits.
- When continuing an existing task, read its `.superpowers/sdd/<task>/progress.md` and the cited current reports or snapshots before repeating work. Do not treat old plans, generated files, or test fixtures as proof of current host behavior.
- When a task targets another solution, follow that solution's instruction chain, code map, business flows, and prescribed discovery tools before broad searches or edits. Pegatus guidance does not replace target-solution instructions.

## Product and safety invariants

- Host workflows such as `pegatus-design` and `pegatus-execute` are invoked through the AI host. The CLI handles installation, state, security, learning, and other documented operations; do not invent CLI subcommands for host workflows.
- `.pegatus/` owns workflow state. Where solution instructions identify an authoritative vault or knowledge source, it owns project knowledge; no-vault projects may use `.pegatus/memory/` under the documented review rules.
- Preserve existing `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, instruction generators, hooks, and unrelated configuration. Install and update behavior must honor ownership checks, path containment, conflict handling, and recovery procedures.
- Keep preview and apply separate. Use explicit existing roots and documented confirmation flows. Do not bypass security scans, ownership checks, approvals, or host permission boundaries.
- AgentShield success is meaningful only when expected files were discovered and coverage is adequate. Zero scanned files is not a clean scan. A scanner result does not establish application-code safety or native host enforcement.
- Learning remains a reviewed proposal until approved. Do not promote lessons, change authoritative knowledge, or infer business rules without the required approval and evidence.
- Preserve pinned upstream bytes, source mappings, hashes, attribution, and notices. Follow `docs/acceptance/0.1.0-licensing.md`; do not invent licensing text or claim release clearance. The current candidate is private and not release-qualified; do not publish it as part of ordinary development work.
- Report host support and verification only to the level actually evidenced. Unit tests, fixtures, generated files, package checks, and successful installation do not prove native cross-host behavior or release qualification.
- Browser testing is a selected verification lane or a standalone `pegatus-browser-test` host workflow, using the `browser-tester` role and host-level Playwright MCP. Do not require it for frontend tasks without observable UI impact, install Playwright into target applications implicitly, or substitute a build pass for selected browser evidence. See `docs/browser-testing.md`; unavailable tools, services or login block affected scenarios.

## Code and repository conventions

- Use the existing JavaScript modules and Node built-ins; keep the package in ESM form and preserve the locked dependency graph. Add dependencies only when the task requires them, and update the relevant lock files consistently.
- Keep changes within the requested behavior. Preserve JSON result shapes, exit-code distinctions, explicit capability limits, and safe failure behavior unless the task specifically changes those contracts.
- Keep scratch outputs and task evidence out of distributable package content unless explicitly required. Review `package.json`'s `files` list before changing package contents.
- Do not modify `.superpowers/sdd/` records, release metadata, source locks, vendored upstream files, or generated artifacts unless the task calls for those files.

## Available checks

The repository uses Node's built-in test runner and catalog linter:

```text
npm test
npm run lint
npm pack --dry-run
```

Use task-specific checks and the documented prerequisites. A package dry run checks package contents; it does not authorize publication or prove licensing or native-host acceptance. Report checks actually requested and run, with their outcomes and limitations.
