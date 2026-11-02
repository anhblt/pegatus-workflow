# Reviewed memory integrity and recovery

Scoped query and stable-ID reads, reviewed learn operations and recovery are implemented in the shared runtime. See [current state](current-state.md) for validation; a passing portable test is not native host qualification. Both memory read forms use the existing external-knowledge ownership boundary and preserve candidate/promotion separation.

## Stable ID retrieval

`memory read <entry-id> --root <existing-root> --project <project-id> --path <relative-target> [--branch <branch>] [--host <host>] [--context-file <relative-resolution.json>]` reads one approved fallback entry by its 64-character lowercase SHA-256 ID. The existing `memory --query <text> ...` form is unchanged. ID lookup bypasses keyword matching only: it preserves instruction review, project/path filtering, external knowledge ownership, digest validation, freshness signals and output budgets. Duplicate IDs anywhere in the approved project index, malformed indexed metadata, missing scoped IDs or unavailable selected documents block direct lookup. Legacy notes without a stable ID remain queryable but cannot be addressed by ID. Retired/candidate records remain excluded from both forms; inspect their history through the owning review records instead. This differs intentionally from ECC's unreviewed Memory Vault.

Use the existing reviewed learn operations to create durable knowledge, and checkpoint/resume for portable task handoffs. The memory command does not copy external vault knowledge into fallback storage or read personal host memory. A stable ID and matching digest establish identity/integrity, never truth, current freshness or authority.

Approval binds the exact promoted Markdown bytes through `documentHash`. Selected bodies are validated when read. A changed digest or an interrupted candidate review returns `approvalState:unverified`, unknown freshness, required source review and an explicit uncertainty. Legacy manually authored sidecars without a digest remain readable for source review but do not inherit current verified approval. Missing bodies are not returned. Pegatus never stamps a digest on an authored note or rewrites it to make it appear approved. Re-review the actual source, propose the revised claim, and approve a new destination; retirement preserves authored content and requires its expected bytes.

`recordReview` serializes the persisted candidate validation and immutable review append. `commitReview(root,candidate,review,{target,trustedCoordinator,write?,validateCatalog?})` adds promotion/retirement inside the same exclusive per-candidate transaction. The CLI uses this boundary. Concurrent losers cannot promote after a rejected decision. Direct `promoteLesson`/`retireLesson` remain low-level destination APIs; coordinators managing persisted candidate history must use `commitReview`.

An interrupted transaction retains `.pegatus/work/<task>/lessons/<candidate>.review-lock` containing the PID, exact event, destination and pre-write hashes. Do not delete a lock based on age. Stop/inspect the original writer and destination first, preserve prior events/files, compute SHA-256 of the inspected lock bytes, then create a root-relative recovery request:

```json
{
  "taskId":"TASK-1",
  "projectId":"project-a",
  "candidateId":"<candidate SHA-256>",
  "expectedLockHash":"<inspected lock SHA-256>",
  "stoppedWriter":true,
  "decision":"complete"
}
```

Run `learn recover --root <project-root> --recovery-file <relative-request.json>`. The explicit trusted coordinator protocol is not authentication. `complete` verifies the exact document digest, project, candidate, status and review history before appending the missing immutable event. An already committed event is retained. `abort` is allowed only when destination bytes still equal the pre-write snapshot and the event was not committed. Partial or edited destinations block recovery; inspect and preserve those files, reconcile them explicitly, then retry with a newly inspected lock digest. A malformed/partial intent or separate interrupted destination lock requires manual owner/source inspection; no age-based takeover or automatic file deletion is attempted. Recovery itself has an exclusive mutex and bounded lock input.

The `memory` command bounds the serialized aggregate result, including all bodies, metadata and uncertainties, against both output and context limits. Overflow returns a compact blocked result and the root-relative `.pegatus/memory` reference. Full documents remain there; narrow query/path selection or intentionally increase team limits before dependent work. No partial claim or omitted instruction is presented as complete.

Credential handling at verification and learning boundaries covers common quoted/plain assignments, multiline JSON and bounded nested JSON-encoded strings, as well as explicit literal redactions, Bearer values and private keys. Exclusions still apply. Supplemental MCP JSON checks report critical embedded credentials with redacted display evidence and file/line provenance; supported environment references are retained. These bounded format checks do not claim universal unknown-secret detection.
