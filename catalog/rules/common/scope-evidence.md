---
name: rule-common-scope-evidence
description: Scoped common Pegatus guidance.
---

Follow the [human confirmation and execution-mode policy](../../skills/pegatus-execute/execution-guide.md#human-confirmation-and-execution-mode). Require an explicit Native subagents or Inline choice before implementation and human confirmation before applicable phase transitions. Inline forbids all task subagents without weakening skills, guards or checks. Preserve choices and unanswered checkpoints on resume; switch to Inline only with a user decision or explicitly approved task-scoped automatic fallback, and disclose the switch. Automatic phase progression also requires explicit task-scoped human approval. Keep work within approved scope. Conversational brainstorming creates no files or checkpoints by default; save notes only when requested, without starting tracked work. Small understood fixes omit unnecessary artifacts; feature implementation requires design/scope approval. Preserve approvals on resume; seek approval for material changes and unauthorized consequential actions. For tracked project work, record final-state verification evidence and checkpoint before handoff/interruption.

Adapted from ECC rules/common/git-workflow.md; backend additions are Pegatus overlays. [Source license](../../../vendor/ecc/LICENSE).
