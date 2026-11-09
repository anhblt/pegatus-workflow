---
name: rule-frontend-react-typescript
description: Scoped frontend Pegatus guidance.
---

Use project React/TypeScript conventions and actual versions. Load Vercel task resources progressively; Next.js-only server/app-router rules need detected Next.js; React 19-specific guidance needs version support. Preserve hooks correctness, accessible behavior and authorization/secret boundaries. Do not force blanket memoization, composition rewrites or a framework migration.

Frontend test authoring is disabled for now unless the user explicitly requests it. Do not create or modify automated frontend tests, apply test-first/TDD instructions, install test tooling or assign test authoring to another role. Preserve existing tests and run applicable existing checks; build, lint, type checks and selected browser verification remain in scope. Report missing coverage honestly. This exception concerns frontend test authoring only; backend testing requirements remain unchanged.

Adapted from ECC rules/typescript/patterns.md; backend additions are Pegatus overlays. [Source license](../../../vendor/ecc/LICENSE).
