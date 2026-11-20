# Pegatus Caveman

## Intent

Make Pegatus progress updates and final replies easier to scan. The user chose Caveman and Ultracave for coordinator replies in the current chat.

## Approaches

- **Pegatus-owned host skill and command alias (proposed).** Define both styles in one shared skill. Use the existing catalog and host adapters for invocation, with an `ultra` argument that follows Caveman's command convention.
- **Bundle Caveman's upstream skills behind the alias.** This would give users the original writing styles and mode behavior. It would require a pinned upstream source, preserved license and notices, and a wrapper to narrow its scope for Pegatus.

## Behavior

- `pegatus-caveman` selects Caveman, using short sentences. `pegatus-caveman ultra` selects Ultracave, using fragments when they read clearly and stating each fact once. A mode selection replaces the previous mode. `pegatus-caveman off` or an explicit request to stop restores ordinary replies from either mode. Acknowledge each selection in one line. Use the host's existing syntax for invoking installed Pegatus commands or skills. Both styles require explicit selection.
- For progress updates, report meaningful changes and blockers briefly. For final replies, lead with the result, then include material checks, limitations, or decisions the user needs. In both modes, preserve exact commands, paths, values, decisive error text, negations, and conditions that affect meaning. Use complete sentences and enough detail for approvals, consequential actions, and ambiguous instructions.
- Keep the instruction in conversation context. It applies across Pegatus workflow invocations in the same chat while the host retains that context. A new chat starts with ordinary replies. The toggle requires no filesystem or configuration writes, hooks, CLI changes, or project discovery. Host context loss can require reactivation.
- The mode applies to coordinator chat prose. Worker prompts and reports, durable artifacts, workflow gates, and verification requirements follow their existing instructions. Explicit user requests for more detail still apply to the reply they request.

The same result in each mode.

- **Caveman** — “Catalog checks passed. Live host invocation is still unverified.”
- **Ultracave** — “Catalog checks passed. Live invocation unverified.”

## Acceptance

Check that the catalog resolves the explicit alias to the skill and that existing adapters generate entry points that can receive an explicit mode choice. In the same chat on any available host, try a later workflow update and final reply in each mode, switch from Ultracave back to Caveman, and check that `off` works from either mode. Confirm that compressed replies retain material results and caveats. Record which hosts were exercised. Static checks establish packaging and wiring. Observed chat behavior requires a live run.
