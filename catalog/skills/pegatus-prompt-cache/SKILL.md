---
name: pegatus-prompt-cache
description: Review repeated model requests for stable prefix reuse, authorized cache scope and measured usage; distinguish provider caching from file caching and context capacity.
---

Follow [solution context](../../context-protocol.md). Select for repeated model/API requests, prompt-cache hit rates or measured inference cost/latency work, not a general application cache.

Keep reusable authorized instructions, schemas and examples stable; put changing questions, timestamps and retrieved context after them where provider serialization permits. Do not pad prompts or load irrelevant resources to meet thresholds. Authorize access before reuse; scope application-managed cache references to workspace, user/account, model, content revision and request settings. Invalidate references on content/permission changes. Cache keys grant no access.

Verify current official documentation for the selected endpoint, model, retention, eligibility and prices before API changes. Do not copy stale model names, thresholds, prices or flags. Do not alter native host serialization without supported controls.

Record observed input/output, cache read/write, latency, retries and storage costs with endpoint/version and measurement source using src/telemetry/usage.mjs recordUsage when applicable. Unknown values remain null. Include cold requests, misses, writes, expiry and retries in comparisons; do not double count cached tokens. Provider caching does not establish more context-window capacity. File-result caching is a separate pattern.

Pegatus-owned adaptation of ECC `skills/prompt-caching-strategy/SKILL.md`, inspected at 25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b. [Upstream license](../../../vendor/ecc/LICENSE). This skill performs no provider requests or automatic cache control.
