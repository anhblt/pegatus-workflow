# Human confirmation and execution mode

Approved scope: chat-approved plan for mandatory Native subagents/Inline selection,
human phase confirmations, unchanged skills/guards/checks, and preserved resume decisions.
Mode: Inline, explicitly selected by the user. No subagents may be spawned in this task.
Implementation: shared execution policy, coordinator entry-point links and resource
closure, common scope/context guidance, generated wrapper reminders, documentation,
and installation-contract tests. Existing route eligibility and runtime schemas remain unchanged.

Verification was confirmed and completed; see verification.md for exact results and findings.
Pending checkpoint: human confirmation before inline code review. No commits, installation updates or publication are authorized.
Next action after confirmation: read-only inline code review, preserving the known findings
and presenting any proposed repairs for human confirmation.
Repair attempts consumed: zero.

## Verification scenarios to assess inline

1. Simple task: present compact plan and both modes; generic approval alone leaves mode pending.
2. Complex feature: confirm direction, spec and plan individually; do not implement early.
3. Inline selected: retain required skills, overlays, context, security and checks; spawn no agents,
   including browser/security/review workers; disclose absent independent contexts.
4. No response at a checkpoint: preserve the pending transition; do not infer consent from time.
5. Resume: retain mode, valid approvals, pending checkpoint and consumed repair budget.
6. Material plan revision: present revised artifact and obtain renewed approval.
7. Native unavailable: explain and wait for a decision; do not automatically execute inline.
8. Review findings: present dispositions and proposed repair scope, confirm repairs,
   retain shared budget, then confirm retest and re-review boundaries.
9. Direct review/testing: perform only the requested phase; do not start repairs or the whole flow.
10. Mode-only reply does not approve a plan; plan-only reply does not select a mode.
11. Installation: all three hosts and both scopes preserve entry-point links and wrapper guards.
12. Failed/blocked checks remain failed/blocked even if the user accepts a limitation.

These scenarios assess instruction consistency only, not native host enforcement.
