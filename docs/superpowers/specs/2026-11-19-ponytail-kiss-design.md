# Keep Pegatus guidance simple

Approved in conversation on 2026-11-19.

Use the simplest approach that fully solves the task. Match the depth of the workflow to the complexity of the change. A typo has no guards or throws to discuss. A trust-boundary change needs enough scrutiny to preserve its guarantees.

## Approaches

Consolidate the repeated PonyTail guidance and put the four checks in the existing procedures that use them. Adding four prompts to the current wording would be a smaller edit but would keep the overlap that prompted this change.

## Checks in the existing workflow

- **Implementer (§4.1)** Before handoff, identify each guard's triggering input and the layer that owns the rule. Drop the duplicate if the upstream guarantee holds for every supported path. Preserve checks required at a trust boundary.
- **Task packet (§4.2)** Name the concrete threat or failure behind a proposed guard. Phrases such as “double-check” and “defense-in-depth” alone do not describe a threat.
- **Code reviewer (§4.3)** During the existing changed-code review, look for redundant or unreachable branches and cite the caller, invariant, or control flow that proves the finding.
- **Verifier (§4.4)** Ask for a test that exercises each new throw or a written reason why one is infeasible. Respect the current frontend test-authoring policy and report any resulting coverage gap.

Use existing packets, handoffs, and reports. Keep project-required checks, the selected/read/applied evidence distinction, task-only skips, and PonyTail provenance. The change is limited to portable workflow guidance.
