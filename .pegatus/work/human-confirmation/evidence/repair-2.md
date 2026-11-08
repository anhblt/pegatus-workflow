# Repair 2 — align direct-entry instructions

Human approved the three review findings with "yes". Mode remains Inline. No subagents,
commits or installation updates. Automatic phase progression remains disabled for this task.

Changes: start and README no longer choose Inline by task size or unavailable delegation;
review skill and its linked review guide require the selected mode and ask when missing;
planning explicitly requires approval of the concrete plan even within approved scope;
browser guide honors explicitly approved task-scoped fallback with disclosure.
Added instruction-contract assertions covering these repaired paragraphs. They do not
prove native-host compliance or independent review.

Scenarios for the next verification phase:
- Small task + selected Native: do not force Inline; use proportionate roles/checks.
- Direct review + no mode: ask before choosing delegation/Inline.
- Same-scope plan + no plan approval: present the plan and wait, including under generic automation.
- Browser + unavailable Native + approved fallback: switch Inline with disclosure and retain checks.
- Same browser case without fallback consent: wait for a human mode decision.

Prior verification predates these source edits. Pending checkpoint: human confirmation
before verification. Proposed checks: focused human-confirmation/adaptive/workflow/review/
brainstorm/browser suites, lint, package dry run and whitespace checks, plus inline
assessment of these scenarios. The earlier full 375/375 result is historical; do not
claim a full-suite rerun for this repair. Changes are guidance/test-only and no runtime
logic/dependencies changed, so focused contract checks are proportionate unless they
surface broader concerns.

Repair attempts consumed: two of the default three. Read-only verification/review
does not consume another attempt. Ask before subsequent review or additional repairs.
