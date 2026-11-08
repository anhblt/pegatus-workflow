# Current implementation and validation

Documentation reconciled on 2026-11-08 for the local `0.1.0-rc.1` candidate. ECC workflow parity, guided administration, brainstorming, deep review, review-feedback handling, evidence-led debugging and adaptive workflow integration are implemented at the portable catalog/runtime level. The user authorized committing all pending work, including the separately retained draft design; committing that draft does not approve or implement it. No publication or release qualification is implied.

## Adaptive integration — 2026-11-08

The [approved design](superpowers/specs/2026-11-08-adaptive-workflow-design.md) and [completed plan](superpowers/plans/2026-11-08-adaptive-workflow-integration.md) integrate the main workflow through one [shared execution guide](../catalog/skills/pegatus-execute/execution-guide.md). Small clear low-risk work stays inline. Substantial work uses bounded skill-aware implementation, stopped source writers, separate verification, then a fresh reviewer, feedback assessment, evidence-led repairs, retesting/scoped re-review and final gates. Approvals, completed work and a shared repair budget survive resume. Existing APIs transport referenced task packets; no runtime phase engine, launcher, command, role, dependency or state schema was added.

Independent final-state verification passed 370/370 tests (zero failed/skipped/cancelled), catalog lint and package inventory checks. Twelve fresh-context instruction scenarios met their decision criteria; separate task and broad final reviews found no actionable findings. These results cover the integrated product state before this documentation/status reconciliation; commit-time checks qualify the documentation follow-up. Tests and generated packets do not prove native installed-host behavior or universal worker compliance.

Selected generated configuration scans passed the existing critical-finding gate for project/user scopes: Claude and Codex each had three measured AgentShield files plus 26 supplemental files; Antigravity had 26 supplemental files only. Zero AgentShield coverage for Antigravity is not a clean AgentShield scan. Claude retained 27 noncritical findings (six high, fifteen medium, six low) per scope, identical to actual baseline scans of byte-identical role wrappers; no criticals or exceptions. The Vercel distribution-notice warning remains. Existing broad `docs` packaging includes planning drafts; ignored task evidence and raw logs are excluded. No installed solution, host setting or credential was changed.

The [skill-use evidence/Ponytail simplicity design](superpowers/specs/2026-11-08-skill-evidence-and-simplicity-design.md) is committed as a draft only. Its additional policy and upstream integration are not implemented or approved by the adaptive task. Historical validation sections below retain their original dates and counts.

Commit-time documentation reconciliation passed 21/21 focused adaptive/catalog/workflow/review checks, `npm run lint` with the existing notice warning, and `npm pack --dry-run --json` (2,701 files, required guide/current-state page present, no raw task evidence). The earlier 370/370 full-suite result is retained rather than presented as a rerun after these status/count corrections. This follow-up changes documentation only; runtime, dependencies, upstream locks and vendored bytes remain unchanged.

## Implemented workflow

The [catalog manifest](../catalog/manifest.json) defines nine roles, twenty host workflow aliases, fifty-seven skills including selected stack guidance, and six rules. All eleven approved core categories remain represented. Host workflows run through the AI host; the CLI supplies concrete administration, state, memory, security and orchestration operations.

- `pegatus-context-budget` handles live context questions without tools or file scans. An installed-overhead audit requires an explicit request naming the host and root.
- `pegatus-file-cache` supplies selected guidance for deterministic file-processing caches. `pegatus-prompt-cache` supplies selected guidance for repeated model requests. Neither adds an automatic runtime cache or establishes live context usage.
- The shared retrieval procedure stops after at most three passes per decision, records gaps and blocks only gap-dependent work. Checkpoint guidance covers phase boundaries and compaction without automatic mid-edit compaction.
- `memory read <entry-id>` reads scoped approved fallback knowledge through existing instruction, authority, integrity, freshness and output checks. Query syntax and reviewed promotion remain supported.
- Unconfigured fast/standard/deep tiers carry a coordinator-selection policy; explicit supported team mappings take precedence. Workers cannot choose replacements. Native enforcement remains unqualified.
- Browser testing uses `browser-tester` and `pegatus-browser-test` for selected UI scenarios or explicit requests. Playwright MCP and actual worker access remain separate host prerequisites.
- Guided setup and uninstall preview all selected hosts before confirmation, then apply sequentially through existing ownership and security checks. Explicit administration flags remain available.

See the [ECC integration audit](upstream/ecc-workflow-audit.md), [token controls](tokens.md), [reviewed memory](learning.md), [installation guide](installation.md), and [browser testing](browser-testing.md) for exact behavior and limits.

## Retained ECC parity validation

The [completed execution plan](superpowers/plans/2026-10-26-ecc-workflow-parity.md) records implementation, regression tests and independent review. Review found two direct-read defects; both were fixed with regressions and the scoped rereview was clean.

| Check | Recorded result |
| --- | --- |
| Full Windows run | 307 of 310 passed; three installation/setup cases failed on a catalog documentation link |
| Affected final-source reruns | All three passed after the link correction: project/default deduplication, real setup preview and guided uninstall |
| Catalog lint | Passed with the existing Vercel distribution-notice warning |
| Package dry run | Passed; 2666 entries at that snapshot, all three new guidance skills present, tests and `.superpowers/` excluded |
| Diff whitespace | Passed at the parity handoff |

Every test passed in either the full run or its affected final-source rerun. There was no single clean full rerun after the link correction. The correction replaced a catalog README link outside its declared resource snapshot with a plain maintainer checkout path; users do not need to repair that link. These results predate this documentation reconciliation; package counts and hashes are snapshot-specific.

## Documentation reconciliation checks — 2026-10-27

The documentation-only follow-up passed 26/26 tests across catalog, workflow-contract, ECC parity, adapters and browser-tester suites. Catalog lint passed with the existing Vercel notice warning; the package dry run contained 2667 entries, including this new page, and excluded tests and `.superpowers/` records. A local-file link audit found no missing targets across 116 Markdown/HTML documents and 305 relative links. Presentation script syntax and the sixteen-slide structure were checked statically. Runtime code, configuration, locks, vendored bytes and other non-documentation files were unchanged by this follow-up. The full regression suite was not repeated.

Presentation visual verification is **BLOCKED**: the browser policy rejected opening the local `file:` URL. No alternative browser route was attempted. The existing preview PNG remains a historical artifact; no current visual/layout pass is claimed.

## Installation and remaining qualification

Checkout edits do not refresh detached installations. When ready, use the normal preview/update flow or uninstall and reinstall from this checkout, then inspect doctor output and reload the host. Preserve task state, team configuration, instructions and any edited managed files; never erase ownership records or force-copy over conflicts. This documentation task does not scan or change installed solutions or personal host configuration.

The candidate remains private and not release-qualified. Native cross-host/OS workflows, browser/tool inheritance, cross-host lifecycle behavior, hosted CI execution and the complete applicable Vercel notice remain open as recorded in the [acceptance checklist](acceptance/checklist.md) and [capability matrix](compatibility/capability-matrix.md). Dated plans and platform trial records retain their original evidence; generated files, passing fixtures and local package checks do not close native or licensing gates.
