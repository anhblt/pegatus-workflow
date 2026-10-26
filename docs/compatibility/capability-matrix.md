# Qualification capability matrix

Candidate: `0.1.0-rc.1`, 2026-10-13. Generated files and version probes are implementation evidence, not native qualification. [Source-reviewed mappings](hosts.md) remain subject to exact-host trials.

| Category | Claude Code | Codex | Antigravity |
| --- | --- | --- | --- |
| Agents | Generated native Markdown roles; authenticated init lists roles, linked system wrapper observed; configured effort unqualified | Generated TOML roles with `developer_instructions` / `model_reasoning_effort`; full native role loading still requires proof | Portable role briefs, inline fallback; native custom roles unqualified |
| Skills / commands | Project/user skills and command wrappers generated; native discovery unqualified | Project/user skills; logical commands reuse workflows; native discovery unqualified | Project workflows / user global workflows; explicit project activation; native skill discovery unqualified |
| Rules / instructions | Generated rules; solution instructions retain authority | Portable rules plus project instructions retain authority | Project rules; user instruction snippet requires explicit activation |
| Hooks | Opt-in native proposal; mapped callbacks advisory; required completion/action gates explicit | Opt-in native proposal; mapped callbacks advisory; required completion/action gates explicit | Explicit lifecycle calls; native hooks unqualified |
| State / memory / learning | Atomic checkpoint, reconciliation, human-reviewed promotion CLI | Same shared runtime | Same shared runtime |
| Verification / security | Current-evidence gates and independent bundled AgentShield CLI | Same shared runtime | Same shared runtime; supplemental coverage disclosed |
| Tokens / model effort | Explicit helper budgets; fixed declared mappings; native enforcement unqualified | Same; `qualified:false` until live loading evidence | Helper budgets; host default / instruction-only model fallback |
| Orchestration | Ownership graph and handoff CLI; native worker trial blocked | Same; native worker trial blocked | Same; inline fallback pending supported delegation proof |
| Browser testing extension (October 2026) | browser-tester role and pegatus-browser-test wrappers generated; Playwright MCP and child tool access unqualified | Same catalog procedure and generated role/skill; live browser execution unqualified | Workflow and portable role; disclosed inline fallback, browser access unqualified |
| Windows actual small-fix / feature | Installed repair/test/checkpoint/resume plus separate review and coordinator security-gated completion; feature approval checkpoint saved, process bounded before final response | Authenticated inference; project reads and exact state commands policy-rejected, origin unverified; no task pass | Attempted; command denial / empty response, not a pass |
| Linux actual small-fix / feature | Native CLI unavailable in qualification environment | Native CLI unavailable | Native CLI unavailable |

The Windows Antigravity CLI can report exit code zero and `SUCCESS` alongside an empty response and denied actions. Qualification must inspect the transcript, files, and verification evidence. Its reported token counts describe unsuccessful trials only. No cross-host savings percentage or equivalent-task efficiency claim is established.

The CI Windows/Linux Node 22/24 matrix is defined but unexecuted. Native Linux CLI/package/security tests use checksum-verified official Node archives in Linux-local `/tmp`; Windows executables under `/mnt/c` are not Linux qualification.
