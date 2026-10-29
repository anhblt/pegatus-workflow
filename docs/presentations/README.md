# Pegatus V2 presentation

## Expanded developer team session

Open [pegatus-team-session.html](pegatus-team-session.html) for the 90-minute, 38-slide developer session. It covers Pegatus workflow fundamentals, installation, token efficiency, the paired task-board demo, checkpoint/resume, native Windows Claude Code setup, model/effort choices, context management, and a five-minute conceptual worktree bonus. The original introduction below is preserved.

The expanded deck is a self-contained HTML file with no external runtime dependencies. It adds section navigation, searchable overview, presenter notes with sources and timing cues, an optional elapsed timer, copyable examples, and interactive workflow/recovery/model scenarios. Open it directly in a modern browser; a server is optional. External documentation links require internet access; repository source links require the original relative layout.

Use the existing keyboard controls below. Expanded reference sections can be opened on demand. Printing includes all slides and expands reference details; layout and pagination depend on browser print settings. Clipboard/fullscreen access may be restricted in embedded viewers or local-file contexts; examples remain selectable and a browser fullscreen fallback is explained in the UI.

The content follows [the agreed outline](team-session-outline.md). Demo projects, the mock ticket, product-owner answers and startup instructions are in `C:\Workspace\WorkflowDemo\README.md`. The ticket feature is deliberately unimplemented. Demo measurement rows are prompts to collect evidence, not recorded results; the checkpoint illustration is explicitly labeled. Full Claude/Pegatus implementation and interruption rehearsal remain to be performed before presenting. The worktree bonus has no live demo or command walkthrough.

Browser checks of the expanded deck on 2026-10-28 are separate from the original deck's historical checks below. They do not establish native Pegatus host qualification or measured token savings.

The expanded deck's 32 default slide states fit at 1280×720 without slide scrolling. At 390×844, content stays horizontally contained; long slides scroll within their viewport and wide tables scroll within their own containers. Overview search, section/slide navigation, route/recovery/model controls, notes and the N toggle, and the timer were exercised in the in-app browser without reported console errors. Inline JavaScript, slide/note counts, unique IDs and local source links were checked. Print pagination and direct-file clipboard/fullscreen behavior were not qualified by these checks; full application implementation/recovery rehearsal is still pending.

On 2026-10-29, six reference slides were added: all 17 host workflows with usage guidance, all nine roles and supporting features, and the full current CLI operation inventory across main slides and expandable details. Host invocation and terminal operations remain distinct. This reflects the local checkout, including its uncommitted cleanup command, rather than a published release. The original 32-slide checks above remain dated evidence; the expanded reference was checked separately.

The six added slides (8–11 and 18–19) fit the default 1280×720 viewport without slide overflow. Catalog coverage was checked against `catalog/manifest.json`; the revised deck has 38 slides and 38 presenter-note blocks, unique IDs, valid inline JavaScript and valid local source-file links. Overview search, advanced command details and the corrected section jumps were exercised without reported browser errors.

## Original introduction deck

The deck content was reconciled on 2026-10-27 with [current implementation and validation](../current-state.md): nine roles, seventeen workflow aliases, selected context-budget/file-cache/prompt-cache guidance, bounded retrieval, scoped memory ID reads, fixed-tier coordinator selection and guided installation/uninstall. Browser-testing presenter notes retain host-level Playwright MCP prerequisites and blocked-tool behavior; see [browser testing](../browser-testing.md). The existing preview PNG predates this content update.

Open `pegatus-v2.html` directly in a modern browser. No server, internet connection, external fonts, framework or build step is required. Optional documentation links work when the file stays in this repository; the slides themselves can be shared as a single HTML file.

## Presenting

- Right / Left arrows or Page Down / Page Up: next / previous slide.
- Space: next slide. Home / End: first / last slide.
- O or Overview: jump to any slide.
- N or Notes: toggle presenter notes, which are included for every slide.
- F or Fullscreen: request browser fullscreen; embedded viewers may restrict it.
- Escape: close notes or the overview.
- Swipe horizontally on touch devices to navigate.
- Select Small change, Feature or Investigation on slide 6 to compare routing. Arrow keys move between its tabs.
- Print: print all slides or choose Save as PDF in the browser dialog. Background graphics may need enabling. The currently selected routing example is used on slide 6.

Slide URLs use `#slide-1` through `#slide-16`. With JavaScript disabled, the presentation falls back to a scrollable document.

The deck is a team introduction to the private local candidate. Publishing is outside its scope. The readiness slide now shows the retained ECC parity result: 307/310 in the full Windows run, then 3/3 affected tests passed after the catalog link correction. This is split-run evidence, not a single clean full rerun or native/release qualification. Older Windows/Linux results remain dated evidence in the acceptance records and presenter notes; figures do not update automatically.

The documentation follow-up checked local file links, script syntax and all sixteen slide sections. Visual verification is **BLOCKED** because the available browser policy rejects local `file:` URLs; no fresh rendering or preview image is claimed.
