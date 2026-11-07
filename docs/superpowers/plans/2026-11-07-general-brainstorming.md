# General brainstorming implementation plan

**Approved scope:** Add `pegatus-brainstorm` for any subject, conversation by default, notes only when requested. No Superpowers dependency in the installed workflow.

**Architecture:** Add a Pegatus-owned catalog skill and thin host alias. Route brainstorming before project-task discovery; preserve applicable host/user instructions and project discovery for project-dependent decisions. No CLI command, new dependencies, automatic task state, or implementation authorization.

**Files:** `catalog/skills/pegatus-brainstorm/SKILL.md`, `catalog/commands/brainstorm.md`, catalog manifest/start/context/common rules, `src/adapters/capabilities.mjs`, README/catalog documentation, and `tests/brainstorm.test.mjs`.

## Execution

- [x] Establish baseline behavior and failing discovery/adapter tests.
- [x] Add the self-contained conversation procedure, catalog registration and routing; reconcile shared context/state guidance and generated wrappers.
- [x] Check general/personal brainstorming, no-files requests, project-specific exploration and explicit save/handoff boundaries with a read-only reviewer.
- [x] Run focused tests, full `npm test`, `npm run lint`, and `npm pack --dry-run`. Report structural checks separately from native host qualification. Leave changes uncommitted.

## Review focus

- No project root or codebase required for general conversation.
- No `.pegatus/work/`, checkpoints, notes, tests or delegation merely for chatting.
- Project-dependent recommendations still use applicable instructions/source; project context does not authorize files or implementation.
- Existing wrappers and start aliases must reach the conversational path before generic discovery.
- Saving notes requires a requested destination; formal project work follows existing design/approval/state procedures.

## Baseline evidence

Read-only baseline review found no conversational classification, mandatory discovery before requirements in start/design, source/API-contract expectations, and task-state/checkpoint expectations. Existing user no-files instructions override writes, but the workflow has no direct path for a non-project topic. Automated registration/wrapper tests below must fail before implementation.

## Verification evidence

### Approved installed-reference refinement (2026-11-08)

User approved using installed Superpowers 7.0.0 to make Pegatus brainstorming closer to its conversational method. Reference files: `skills/brainstorming/SKILL.md`, `builder-check-prompt.md`, and `visual-companion.md`. Keep Pegatus's no-files default, explicit project transition and approval rules; do not introduce a Superpowers runtime dependency, browser server or automatic document creation.

- [x] Baseline comparison: existing skill lacks concrete motivation/anti-goal exploration, medium/resource choice ownership, incremental playback, visual/experiment guidance and a consequential-gap builder check.
- [x] Rewrite the authored skill around those techniques; retain the reference license verbatim and record inspected source hashes in a packaged notice. Leave existing upstream source locks unchanged.
- [x] Evaluate the six baseline scenarios plus opt-out/approval boundaries, and verify catalog/resource/adapter behavior, lint and package contents. Prose-only refinement does not require repeating unrelated full-runtime integration checks.

Refinement evidence:

- New attribution/resource-closure test failed before adding the declared notice/license, then passed with exact copied-license SHA-256 and standalone-runtime byte checks.
- Final focused catalog, adapter, brainstorming, workflow-contract and ECC checks: 30/30 passed.
- Read-only reviewer simulated all eight conversational/boundary cases successfully, verified all recorded installed-reference hashes, and found no material issue. These are instruction-level simulations, not native host trials.
- Lint passed with the existing Vercel distribution-notice warning. Package dry-run passed: 2,683 files, skill/notice/license included, no Superpowers runtime, test tree or workflow scratch. Copied license has a scoped `-text` Git attribute to preserve exact bytes across platforms.
- Full suite and native host trials were not repeated for this documentation/catalog-resource refinement. Existing installations remain untouched and changes remain uncommitted.

### Initial workflow addition (2026-11-07)

- Initial new discovery/wrapper tests: 0/2 passed before implementation; missing registration and wrapper.
- Review found discovery-first ordering in generated rule wrappers. Added regression failed before the fix and passed afterward; scoped re-review found no remaining issue.
- Final focused catalog/adapter/brainstorm/workflow/ECC checks: 29/29 passed.
- Five read-only conversational scenario simulations passed; these do not establish native host behavior.
- `npm run lint`: passed, with the pre-existing Vercel distribution-notice warning.
- `npm pack --dry-run --json`: passed; 2,681 files, brainstorm skill/alias included, tests and `.superpowers`/`.pegatus` scratch excluded.
- Full `npm test`: 358/358 passed. This run started before the final rule-wrapper ordering correction and its additional regression test; the final focused 29/29 run covers that correction and the final behavior files.
- No native host trial or existing installation update performed. Changes remain uncommitted.
