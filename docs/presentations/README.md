# Pegatus V2 presentation

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
