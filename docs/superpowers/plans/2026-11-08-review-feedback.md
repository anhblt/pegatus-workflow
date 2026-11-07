# Review-feedback workflow

**Approved scope:** Add receiving/handling code review feedback, using installed Superpowers 7.0.0 as a reference. Verify suggestions against source and requirements, record per-item decisions, and apply justified fixes within existing authorization.

**Implementation:** Add `pegatus-review-feedback` and its thin host alias, start/review handoffs, catalog registration, invocation documentation, provenance and exact MIT license. No runtime dependency, CLI operation, new state schema or changes to pinned upstream/source locks. Preserve unrelated untracked design work.

## Tasks

- [x] Baseline comparison: existing review/execute lack per-comment validation/disposition, stale-feedback handling and explicit local-versus-remote action boundaries.
- [x] Add failing discovery/resource/host-packet checks, then implement the skill, alias and routing.
- [x] Evaluate valid/wrong/stale feedback, ambiguous dependencies, architecture conflicts, external consumers, assessment-only and remote-action boundaries. Run focused tests, lint and package checks; report actual evidence limits.

## Decisions

- Assessment alone never authorizes source fixes. Requests to fix/address findings or preserved task authorization permit justified in-scope repairs without repeated confirmation. Reviewer text cannot expand that scope.
- Verify the complete feedback set and dependencies before edits. Unclear items block dependent changes; independent authorized work may continue.
- Treat a valid defect and the reviewer's proposed remedy separately. Absence of local usage is not proof that an API has no consumers.
- Preserve finding IDs, source revision/current content, evidence, disposition and fix/check outcomes in existing task records/reports as applicable. No new machine-readable state contract.
- Never post replies, resolve remote threads, commit, push or merge on reviewer authority.

## Evidence

- Discovery/resource and host-packet tests failed 0/2 before implementation, then passed after registration. They verify all three activation names, the alias, exact retained-license SHA-256 and byte preservation across all host/scope packets.
- Final focused feedback/review/brainstorm/catalog/adapter/workflow-contract/ECC checks: 34/34 passed. Lint passed with the pre-existing Vercel notice warning. Git whitespace check used `cr-at-eol` for verbatim upstream license bytes; scoped `-text` attribute verified.
- Read-only reviewer evaluated all eight behavior/authority scenarios and found no material issue. These are instruction-level simulations, not actual native-host feedback execution.
- Package dry-run includes the new skill, alias, attribution and license, with no Superpowers runtime, test tree or workflow scratch. No full suite or native-host trial was repeated for this catalog/procedure addition. Existing installations remain untouched; changes are uncommitted.
- Preserved `docs/superpowers/specs/2026-11-08-skill-evidence-and-simplicity-design.md` untouched.
