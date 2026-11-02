# Browser tester implementation plan

**Current status (2026-10-27):** Implemented and independently reviewed. The results below describe this extension's original snapshot; the later [ECC parity record](2026-10-26-ecc-workflow-parity.md) covers the larger suite. [Current state](../../current-state.md) consolidates implemented features and remaining qualification without treating these dated counts as a fresh run.

**Goal:** Add an optional browser testing role and a directly invocable host workflow, using host-level Playwright MCP without application dependencies.

**Approved scope:** The conversation approves a separate browser-tester, delegation from frontend verification when relevant, standalone testing without implementation, and an explicit inline fallback. Browser checks are required only when selected or explicitly requested.

**Architecture:** Extend the existing catalog and generated host wrappers. Keep browser execution in the host; do not introduce a CLI command, browser engine, MCP provisioning or application dependency changes.

**Constraints:** Preserve existing working changes, upstream bytes, state schemas and host support limits. Testing reports findings without editing application code. Browser availability and delegation are separate capabilities.

## Tasks

- Add failing discovery, handoff and host wrapper tests for the new role and workflow.
- Add the role, shared browser procedure and thin command alias; register resource closure and model tier in the manifest.
- Route explicit browser requests from start and selected UI checks from verifier; document scope selection, prerequisites, evidence and setup boundaries.
- Run focused tests, catalog lint, full tests and package dry run. Review the diff and report current verification limits. Do not commit or publish.

## Acceptance

Standalone invocation needs no implementation diff or feature design approval. Changed UI flows select browser checks; internal/type-only tasks can record a reason for skipping. Missing Playwright, application access or login leaves selected checks blocked. Reports include expected/actual outcomes and browser evidence, and cannot substitute a build pass for browser verification.

## Verification outcome

Implemented the catalog role, shared workflow, alias, routing and documentation. Fresh independent review reported no concrete defects in the scoped change and checked standalone URL, type-only task, missing MCP, missing child tool access and failing-browser/passing-build scenarios.

The initial full suite passed 285/288 tests. Three dependency-security fixtures failed because their isolated kit omitted newly linked docs resources. Added docs to that fixture's copied resource closure without changing security assertions. The subsequent focused run passed all 22 tests across browser-tester, catalog, adapters, workflow-contract and runtime-dependencies. The entire suite was not rerun after this fixture-only correction.

Catalog lint passed with the existing Vercel distribution-notice warning; package dry run and git diff --check passed. Native Playwright MCP connection, child tool inheritance and browser execution remain untested. No MCP provisioning, application dependency changes, commit or publication was performed. Preexisting unrelated workspace changes were preserved.
