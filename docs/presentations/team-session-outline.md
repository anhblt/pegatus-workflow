# Pegatus workflow and Claude Code team session

Audience: developers. Duration: 90 minutes. Platform: native Windows / PowerShell. Deliverable: HTML presentation based on the existing deck's visual language. Two main sections and a conceptual Git worktree bonus.

## Running order

| Part | Minutes | Elapsed |
| --- | ---: | --- |
| Opening | 5 | 00–05 |
| Section 1: Pegatus workflow, including paired demo | 40 | 05–45 |
| Section 2: Claude Code tips | 25 | 45–70 |
| Bonus: branches and worktrees, no live demo | 5 | 70–75 |
| Questions and discussion | 15 | 75–90 |

## Slide outline

Updated 2026-10-29: 38 slides. The six catalog reference slides are a quick tour within the existing workflow allocation; detailed command flags and advanced operations are optional reference material. Keep the total at 90 minutes.

### Opening — 5 minutes

1. **Pegatus workflow and Claude Code** — Purpose, audience and practical outcomes.
2. **The session roadmap** — Two sections, the paired task-board demo and the conceptual bonus.
3. **Common friction in AI-assisted development** — Repeated context, unclear scope, verification and interrupted work. These are possible problems, not inevitable behavior of ordinary Claude Code.

### Section 1 — 40 minutes

4. **Development workflow** — A repeatable process from request to verified change; developers own decisions.
5. **How a workflow helps** — Clarification, context discovery, bounded work, evidence and continuity.
6. **What Pegatus is** — An installable workflow kit; distinguish the model, AI host, kit and target project.
7. **What Pegatus offers** — Guided workflows, specialized roles, project context, task state, verification and context/token guidance.
8. **Host workflows: development** — List start, design, plan, execute, investigate and review with when-to-use guidance.
9. **Host workflows: checks and continuity** — List verify, browser-test, checkpoint, resume and status.
10. **Host workflows: knowledge and efficiency** — List learn, memory, security, context-budget, file-cache and prompt-cache; preserve approval and capability limits.
11. **Roles and supporting features** — Name all nine roles and explain selected stack guidance, ownership-aware installation, scoped handoffs and optional hooks.
12. **The task lifecycle** — Show the actual routes and proportional gates after verifying current catalog contracts; avoid implying every small task needs a large design process.
13. **Pegatus and Superpowers** — Shared development discipline and concrete packaging/state differences. Verify against the installed upstream version. Explain ECC and other packaged sources accurately; do not claim exclusive capabilities without evidence.
14. **Where token usage comes from** — Instructions, repeated reads, tool results, reasoning, output and delegated work. Prompt-cache reads have different pricing; token counts alone do not equal cost.
15. **How Pegatus can reduce unnecessary work** — Progressive loading, bounded retrieval, model tiers, checkpoint records and selected cache guidance. No measured savings claim.
16. **Installing Pegatus on Windows** — Node 22+, configured host, guided project installation, preview/confirmation and doctor. Current local-checkout path; registry distribution remains conditional on approved publication.
17. **Using Pegatus through the host** — Host workflow aliases versus CLI installation/state operations. Confirm current commands before finalizing.
18. **CLI: installation and maintenance** — setup/install, doctor, update, uninstall, cleanup and catalog lint; reference flags and current-checkout limits.
19. **CLI: state, knowledge and advanced tools** — status, resume, checkpoint, memory, learn, security, plus expandable role/lifecycle/hook/orchestration operations and execution limits.
20. **The comparison setup** — Identical independent repositories, one shared ticket, same model/effort and consistent product-owner answers. Disclose active global customizations.
21. **DEMO-101: task priorities and filtering** — Story and current board; explain the baseline without revealing all clarification answers immediately.
22. **Paired implementation demonstration** — Ordinary session and Pegatus session. Reserve approximately 12 minutes across slides 20–24; prepare clearly labeled rehearsal evidence as fallback. Do not guarantee both full implementations will finish live.
23. **Checkpoint, interruption and continuation** — Save at a meaningful milestone; close session; start fresh; reconcile files/branch and finish. Show real recorded fields and exact implemented commands. A checkpoint is not full conversation restoration or Git backup.
24. **Compare the observed results** — Outcome, assumptions, checks, time and actual reported usage. No fabricated numbers or scripted failure; distinguish setup and recovery from feature implementation.
25. **Best practices** — Clear acceptance criteria, authoritative instructions, scoped decisions, meaningful checkpoints, relevant verification and diff review.
26. **Current support and adoption** — Private pilot candidate; implementation and installation evidence do not establish native cross-host qualification or release clearance.

### Section 2 — 25 minutes

27. **Claude Code on native Windows** — Official PowerShell native installer, new terminal, version/doctor checks, authentication and starting in the project folder. Distinguish Claude Code prerequisites from Pegatus's Node requirement. Account/provider setup follows the team's approved route.
28. **The first session** — Working directory, instructions, permissions and a precise initial request.
29. **Model and effort** — Separate controls; supported options depend on model/provider/client/policy.
30. **Choosing a model** — Routine explanation, bounded implementation and complex investigation. Use current available model names, and record exact selection for comparisons.
31. **When to increase effort** — Ambiguous reasoning and difficult edge cases; first repair missing context or requirements. More effort does not guarantee correctness.
32. **What occupies context** — Instructions, messages, reads and tool outputs; use a conceptual visual without invented measured proportions.
33. **Context habits** — Focused paths and excerpts, short durable instructions, linked references and meaningful boundaries.
34. **Compaction, resume, checkpoints and Git** — Four separate mechanisms. Claude Code already saves conversations; show native continue/resume alongside Pegatus task-state recovery.
35. **A daily decision guide** — Task scope → context → model/effort → verification → continue/compact/checkpoint as appropriate. Include version-verified command reference in expandable detail.

### Bonus — 5 minutes, conceptual only

36. **Branches and worktrees** — A line of development versus an additional working directory; diagram one repository with two folders on distinct branches.
37. **A feature and an urgent fix** — Explain how both can remain open, shared Git history versus separate files/index, usual same-branch restriction, ports/external service considerations and remaining merge conflicts. No live demo or command walkthrough. Pegatus worktrees are opt-in; paired comparison folders are independent repositories.

### Discussion — 15 minutes

38. **Questions and team pilot** — Discuss appropriate first tasks and evidence the team wants before broader adoption.

## HTML direction

Retain the existing deck's forest-green, warm-paper and lime palette, generous typography, keyboard navigation, overview, fullscreen, print and presenter notes. Add section-aware navigation, timed presenter cues and expandable command/reference detail. Keep the main slide focused on one idea. The checkpoint sequence and workflow lifecycle can use progressive reveals. Model/effort guidance should use a compact task comparison, not a universal ranking. Keep external resources optional so the core presentation works offline.

Create a separate HTML file, preserving the existing overview deck. Presenter notes hold detailed explanations, sources, demo prompts, caveats and fallback instructions. Never present rehearsal or illustrative output as a live measurement.

## Supporting material

- Existing deck: `pegatus-v2.html` and its presentation README.
- Demo projects and runbook: `C:/Workspace/WorkflowDemo/README.md`.
- Shared mock ticket: `C:/Workspace/WorkflowDemo/mock-jira-ticket.md`.
- Pegatus facts: current README, catalog/context protocol and manifest, relevant installation/state/token/compatibility/acceptance guides; confirm implementation where exact semantics matter.
- Claude setup: https://code.claude.com/docs/en/setup
- Model and effort: https://code.claude.com/docs/en/model-config
- Context: https://code.claude.com/docs/en/context-window
- Sessions: https://code.claude.com/docs/en/sessions
- Cost measurement: https://code.claude.com/docs/en/costs
- Worktrees: https://git-scm.com/docs/git-worktree

Commands and model availability must be checked again when authoring the deck. The current outline records content decisions, not proof of live demo outcomes or native host acceptance.
