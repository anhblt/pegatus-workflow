# Inline review — 2026-11-09

Human authorized review with "yes". Mode remains Inline. Same context performed
implementation and verification; this is not independent review. No source edits,
new test runs, subagents, commits or installation updates during review.

Scope: current tracked working changes and tests/human-confirmation.test.mjs on main,
baseline HEAD d8d6b74089c57363e71c0d045cdd25a0131332a9. Inspected shared policy,
entry points, context/scope rules, manifest resources, generator and wrapper consumers,
test assertions, README/orchestration/browser instructions and retained verification.
No committed-branch merge-readiness assessment is made. Native-host adherence untested.

## Findings — changes required

1. Important: legacy execution-mode instructions remain inconsistent. pegatus-start
   says small low-risk work stays inline and permits unavailable/disallowed delegation;
   pegatus-review defaults to independent delegation and otherwise automatic inline;
   README daily workflow/orchestration sections still describe automatic fallback.
   A direct entry point or reader following these paragraphs can choose an execution
   mode without the human selection required by the new opening policy. Qualify these
   instructions with selected Native/Inline and explicit task-scoped fallback consent.

2. Important: pegatus-plan/SKILL.md says "Seek approval only for material scope/design
   change." A plan consistent with an approved spec still requires explicit plan
   approval before implementation, as the shared policy specifies. Replace this
   instruction with plan approval plus retained material-change approval requirements;
   generic phase automation must not approve an unseen plan.

3. Moderate: docs/browser-testing.md says unavailable Native delegation requires a new
   human decision unconditionally, whereas the new introductory policy and browser
   skill permit previously human-approved task-scoped automatic fallback. Qualify
   the older sentence so approved fallback proceeds with disclosure and unapproved
   fallback still waits. This otherwise creates unnecessary repeated prompts.

Automated evidence retained: focused 15/15, full 375/375, lint/package/whitespace
passed on the reviewed source; existing licensing warning remains. New tests verify
installation closure and wrapper text, not semantic compliance of every legacy paragraph.
No runtime API/schema/dependency change was found beyond generated instruction text.

Recommended bounded repair: align the listed active instructions and add explicit
scenario checks for selected Native on a small task, missing-mode direct review,
same-scope unapproved plan and preapproved browser fallback. Do not alter runtime
eligibility or historic qualification records. Retest affected catalog/wrapper contracts
after repair; preserve valid broad runtime evidence where source/command scope permits.

Pending checkpoint: human confirmation of this repair scope before editing.
Repair attempts consumed: one; this read-only review consumes no repair attempt.
