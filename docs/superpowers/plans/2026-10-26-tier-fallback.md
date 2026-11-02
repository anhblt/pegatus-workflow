# Tier fallback implementation plan

**Current status (2026-10-27):** Implemented and independently reviewed. The 296-test result below is this task's historical snapshot; later [ECC parity validation](2026-10-26-ecc-workflow-parity.md) covers 310 cases with affected reruns. See [current state](../../current-state.md); no native tier-selection qualification is implied.

**Goal:** Keep catalog fast/standard/deep assignments and explicit project-over-user mappings; use host-coordinator model selection when a tier has no mapping.

**Approved design:** The user approved automatic fallback and explicitly retained the existing three tiers. Select both model and effort from the actual host allowlist. Workers cannot reroute themselves. Unsupported explicit mappings retain the existing safe fallback.

**Architecture:** The pure tier resolver exposes a pending coordinator-selection policy for missing mappings. Generated host workflows and portable role handoffs carry the same policy. The kit does not discover provider models or launch them; the trusted host coordinator selects and records the pair before spawning, or discloses host-default fallback when unsupported.

**Tech stack:** Existing Node.js ESM modules and node:test; no dependencies.

## Steps

- [x] Add regression tests for missing tiers, configured precedence, unsupported mappings and generated routing instructions; observe failures.
- [x] Add shared tier policy metadata/instructions and propagate them through generated roles and existing handoffs without changing role tiers or native field claims.
- [x] Update current routing documentation and catalog guidance; preserve unrelated work and pinned sources.
- [x] Run focused tests, npm test, npm run lint, npm pack --dry-run and git diff --check. Review only task changes; native host execution remains unqualified. Leave changes uncommitted.

## Verification

Two new regression tests failed before implementation and passed afterward. Full suite: 296 passed, zero failed. Final focused installation suite: three passed, including portable configured and unconfigured role selection. Adapter/usage suite: 20 passed; existing orchestration/usage run: 46 passed; new handoff test also passed independently. Catalog lint passed with the existing Vercel distribution-notice warning. Package dry run and diff checks passed. Independent review found stale portable-role wording; all nine role briefs and the portable role response now follow the shared policy, and follow-up review found no remaining actionable issues. No native-host routing trial, global installation update, commit or publication was performed.
