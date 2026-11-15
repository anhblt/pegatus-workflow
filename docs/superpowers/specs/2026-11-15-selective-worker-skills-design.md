# Selective worker skill loading

Date: 2026-11-15. Status: Approved for Inline implementation. User selected Inline and then authorized automatic approval/execution until finished; this applies to this task only.

## Intent

Make required technical guidance discoverable and explicit in worker handoffs without loading unrelated skills. Observed Antigravity task packets omitted skill references even though the plan named them; generated skill wrappers link to upstream bodies without naming their declared Pegatus overlays. Skill availability, reading and application remain separate claims.

## Scope and approach

Use the existing ESM generator, catalog selection and bounded resource-reference transport. Add explicit overlay-first links to generated wrappers when the catalog entry declares an overlay. Preserve existing procedure links and host/scope behavior. Direct upstream invocation must not bypass the applicable Pegatus overlay.

Strengthen shared execution/context and relevant role guidance so each worker receives the coordinator's task-specific skill IDs, applicability reasons, exact overlay/body paths and applicable required dependencies/resources. Use selectSkills and selectResources as discovery aids, followed by semantic relevance review against the target stack, versions, assigned work and test tools. Packaged resources are not an instruction to read everything. No suitable skill is an explicit valid outcome.

Workers read applicable instructions and selected guidance before dependent action; request missing mandatory references rather than guessing. Record selected/read/applied guidance compactly in existing worker evidence, including gaps and unused selections. Coordinators assess this evidence against returned changes before accepting results; receipts alone do not prove adherence. Add guidance only when task needs change, respecting ownership, approvals and context budgets.

Resume and dispatch check actual native role/tool availability and carry the selected packet forward. Do not assume conversation-local registrations or parent skill visibility survive into a worker. Do not prescribe unverified Antigravity APIs or enable broader permissions automatically. Preserve the existing user decision requirement when Native delegation is unavailable.

## Alternatives and boundaries

A documentation-only fix leaves direct generated wrappers incomplete. A new loader/attestation service or fixed skill bundle per role adds machinery and unnecessary context. The focused wrapper-and-guidance change addresses the evidenced gaps using existing contracts.

No new CLI command, dependency, progress schema, handoff field or runtime approval gate. No vendor/source-lock changes, automatic host registration, installation updates, modifications to CM tasks, commits or publication. Native loading and permissions remain qualified only by actual host evidence.

## Verification and acceptance

Add a failing generator regression proving declared overlays are explicitly linked before skill bodies across applicable hosts/scopes, with links resolving in detached runtime layouts. Cover entries without overlays and preservation of conversational/live-context exceptions. Add focused workflow checks/scenarios for small task-specific selection, required references, missing guidance, worker-result assessment and resume without assumed registration. Avoid tests that imply prose compliance proves native execution.

Run focused tests, then npm test, npm run lint and npm pack --dry-run for the final change. Report actual outcomes and existing qualification limits. A live Antigravity trial is separate evidence requiring host access; local checks cannot establish it.

## Implementation choices

Use the current checkout and locked dependency graph. Keep runtime API/result shapes unchanged. The builder chooses compact wording and test placement within existing adapter/workflow suites. Execution mode is Inline, including review; no independent-context review is claimed. Approval was not inferred from another project's task.
