---
name: pegatus-file-cache
description: Apply content-hash caching when a project repeatedly performs expensive deterministic file processing; preserve authorization and invalidate on content or processing changes.
---

Follow [solution context](../../context-protocol.md) and confirm repeated expensive file processing before proposing a cache. This is task-selected development guidance, not an always-on Pegatus cache or provider prompt caching. Never bypass current-source, permission, approval or scanner checks.

Keep the processor independent of caching. At the service boundary: authorize the current source/workspace, hash bytes in bounded chunks using SHA-256, look up the approved local cache, process on a miss, then safely store the result. A rename with identical bytes may reuse results within the same authorized scope; changed bytes must miss. Include processor version and every result-affecting option in identity, or disable reuse when results depend on more than the bytes. Path-dependent output cannot be reused as path-independent output.

Keep storage inside an explicitly approved project boundary. Resolve containment/symlinks before reads or writes. Validate record shape/version and identity; corruption is a miss, never approval or fresh evidence. Use project atomic-write/concurrency conventions; preserve foreign files and report permission failures. Do not cache private bodies or secrets without authorization and retention rules. Scope isolation precedes lookup; hashes are not authorization.

Add bypass/cleanup only when required by the target task. Verify unchanged-content hits, rename behavior, content/option/version invalidation, corruption, bypass and project isolation. Measure work avoided before claiming savings.

Pegatus-owned adaptation of ECC `skills/content-hash-cache-pattern/SKILL.md`, inspected at 25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b. [Upstream license](../../../vendor/ecc/LICENSE). Use the target stack and existing dependencies.
