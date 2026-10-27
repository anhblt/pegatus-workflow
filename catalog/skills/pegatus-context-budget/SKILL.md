---
name: pegatus-context-budget
description: Check live context capacity using the host meter without tools; audit installed overhead only on an explicit request with a named host and root.
---

For a live-context, remaining-capacity, headroom or context-pressure request, do not use tools, read files, scan installations or launch provider CLIs. Direct the user to the active host's native context meter if its availability is known in this session; otherwise disclose unavailable live measurement. A skill cannot invoke a native interactive command for the user. Do not substitute character counts or account rate limits for context-window usage. This live path takes precedence over general context-reading instructions.

Only an explicit request such as `--audit` or “audit installed components” selects the static audit. Context pressure or verbose output alone does not authorize a scan. Require the named host and explicit installation/configuration root before inspection. Then follow [solution context](../../context-protocol.md) within that scope.

Inspect only the named installation and explicitly selected host configuration. Never recursively enumerate the workspace, home, caches, transcripts or unrelated worktrees. Do not launch provider CLIs, MCP servers or debug sessions. Cap reported metadata at 50 entries per component class. Separate eagerly discovered descriptions, always-loaded instructions and available tool-schema metadata from on-demand body disk sizes. Do not copy configuration bodies or secrets into reports or temporary logs.

Report inspected paths, counts, heaviest descriptions, assumptions, unavailable metrics and at most three improvements. Label calculated tokens as estimates of static overhead, never provider-reported live context or realized savings. UTF-16 character limits in src/telemetry/usage.mjs are helper bounds, not token measurements. Keep unknown measurements null.

Pegatus-owned adaptation of ECC `skills/context-budget/SKILL.md`, inspected at 25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b. [Upstream license](../../../vendor/ecc/LICENSE). No provider command/version compatibility is inferred from that source.
