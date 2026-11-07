# PR and branch review depth

**Approved scope:** Improve Pegatus review using the installed Superpowers 7.0.0 reviewer reference. Review committed branches against their intended target with behavior, downstream impacts and qualified merge assessments, rather than syntax-only inspection.

**Approach:** A shared packaged review guide serves `pegatus-review` and `code-reviewer`. Preserve source/instruction discovery, configured deep-tier selection, bounded context, evidence/severity standards and existing state APIs. Keep review read-only on product files, Git index/HEAD/branches; allow designated report artifacts. Do not add a CLI, runtime dependency or unconditional additional review seats.

## Tasks

- [x] Inspect existing guidance and installed reference. Baseline review found underspecified merge-base/range handling, revision isolation, downstream consumers, target drift, test sufficiency and incomplete coverage reporting.
- [x] Add failing catalog/resource-closure checks for the shared guide and reference license.
- [x] Author the guide, route skill and role through it, register resources and retain installed-reference hashes/license. Add branch-to-develop invocation documentation.
- [x] Review scenarios covering range selection, dirty state, cross-component impact, missing domain intent, inadequate tests, partial coverage and changed target. Verify focused tests, lint and package contents; distinguish host procedure from native execution proof.

## Review boundaries

Whole-branch PR mode uses pinned target/head SHAs and their merge-base. Explicit commit-range and working-tree modes retain requested scope. Never substitute `HEAD~1` for an unknown PR base. Missing refs or ambiguous targets block only dependent conclusions. No source fixes, checkout/reset/stash, merge/push, automatic worktrees or automatic dependency installation during review. Report current checkout checks separately from evidence for pinned reviewed revisions.

## Evidence

- New resource tests failed 0/2 before registration and the shared guide, then passed after implementation. They check shared skill/role resources, exact upstream-license SHA-256 and byte preservation in all host/scope packets.
- Focused review, brainstorm, catalog, adapter, workflow-contract and ECC checks passed 32/32. Lint passed with the existing Vercel notice warning; Git whitespace check passed with `cr-at-eol` for the intentionally byte-preserved upstream license.
- Package dry-run passed and includes the review guide, reference, license and role; no Superpowers runtime, tests or workflow scratch added to the package.
- Read-only reviewer evaluated eight scenario groups and found no material issue. Source-backed logic findings do not require runtime reproduction; incomplete coverage and target uncertainty limit the verdict. This is instruction-level evaluation, not an actual native-host branch review.
- No full-suite repetition or native host trial was run for this catalog/procedure change. Existing installations were not updated. Changes remain uncommitted.
- The unrelated untracked `docs/superpowers/specs/2026-11-08-skill-evidence-and-simplicity-design.md` is outside this task and is preserved.
