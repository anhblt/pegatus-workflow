# PonyTail Simplicity Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for approved Inline execution or superpowers:subagent-driven-development for approved Native subagents execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PonyTail's smallest-complete-change rule easy to find and apply.

**Architecture:** Keep the rule in the existing skill-evidence guide and put the four checks in the shared procedures that use them. Both direct and delegated entry points read the same rules.

**Tech stack:** Markdown catalog guidance and existing Node.js 22+ catalog checks.

**Spec:** [Approved short design](../specs/2026-11-19-ponytail-kiss-design.md).

## Global constraints

Use existing packets, handoffs, and reports. Keep project-required checks, selected/read/applied evidence, task-only skips, frontend test-authoring limits, and pinned PonyTail provenance. Work in the current checkout.

## Review focus

Trace five cases through the affected entry points: a trivial edit, a proven upstream guard, a separate trust boundary, a reviewer with an unproven reachability assumption, and a new frontend throw with no authorized test authoring. Check that each case has a clear next action in the existing workflow.

## Task 1. Consolidate guidance

- [x] Reduce `catalog/skills/pegatus-execute/skill-evidence-guide.md` to one smallest-complete-change rule, short phase links, and the existing evidence, skip, and attribution rules. Keep links that entry points use to reach this guide. Shorten repeated PonyTail policy summaries in `catalog/context-protocol.md` and the manifest's affected `adaptation` descriptions.
- [x] In `catalog/skills/pegatus-execute/execution-guide.md`, name the concrete threat in the task-packet list. Add a short implementation handoff instruction and a verification sentence for new throws that applies in Inline and delegated execution. Link both implementer briefs to the shared handoff instruction, declare that guide as a resource for each, and make the shared verification instruction discoverable from both verifier entry points.
- [x] Add the redundant/unreachable branch check to behavior tracing in `catalog/skills/pegatus-review/review-guide.md`, which both reviewer entry points already use. Use the existing task-only simplicity skip and retain the ordinary correctness review.
- [x] Check the five review cases against the changed text. Run `node --test tests/ponytail-integration.test.mjs tests/adaptive-workflow.test.mjs tests/adapters.test.mjs`, `npm run lint`, and `git diff --check`. Expect passing tests, no lint errors, and no whitespace errors. These checks cover local guidance and generated resources.
