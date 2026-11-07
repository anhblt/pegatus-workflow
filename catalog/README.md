# Pegatus catalog

`pegatus-review-feedback` bridges received review findings to evidence-backed decisions and authorized fixes. Start routes feedback tasks to it; assessment alone stays read-only on product code. It tracks stale/already-addressed items, wrong remedies, dependency-specific uncertainty and scope limits, and keeps external replies/resolutions separate from local fixes. The installed Superpowers 7.0.0 reference is attributed without becoming a runtime dependency.

`pegatus-brainstorm` supports conversational exploration on any subject, including personal and non-software topics. It requires no project root or task state and saves notes only when requested. Start routes brainstorming to it before project discovery; project-dependent recommendations retain scoped context and implementation approval requirements. This Pegatus-owned procedure has no external skill dependency.

The manifest includes nine roles, workflow aliases, selected stack guidance, and six rules. Installation and runtime APIs are implemented; native qualification remains separate from catalog and fixture validation.

`pegatus-start` coordinates ordinary tasks; host commands are thin aliases to shared skills. Roles have explicit read/write responsibilities and fixed fast/standard/deep tiers. Explicit `hostModels` mappings take precedence; unconfigured tiers use the trusted host coordinator selection policy in `rules/common/tokens-orchestration.md`. Host defaults are a disclosed fallback when selection is unavailable; native enforcement and independent delegation still need host trials.

Selected optimization procedures are `pegatus-context-budget` (live native meter without tools; static installed-overhead audit only on explicit request), `pegatus-file-cache` (deterministic file processing), and `pegatus-prompt-cache` (repeated model requests). Start routes relevant tasks to them; their exact activation aliases are in the manifest. The maintainer audit is at `docs/upstream/ecc-workflow-audit.md` in the kit checkout.

`pegatus-browser-test` supports standalone or delegated UI testing through the `browser-tester` role and host-level Playwright MCP. It is selected for relevant UI behavior or explicit requests, not every frontend task. See [browser setup and evidence limits](../docs/browser-testing.md).

Load `manifest.json` for discovery. Read the applicable [context protocol](context-protocol.md) before acting. Workflow skills link this shared policy and declare adaptive gates, records, checks and checkpoints. The manifest capability owners distinguish implemented runtime APIs from host procedures and native qualification limits.

`loadCatalog(packageRoot)` returns agents, skills, commands, rules and a snapshot of resources. `lintCatalog(catalog)` returns findings with severity, code, location and message. `pegatus catalog lint` uses the package root even when invoked from another directory; `--root` validates another package. Errors exit 1, invalid usage exits 2. The Vercel distribution notice gap remains a visible warning and release review gate.

Required frontmatter string fields use an explicit supported subset: plain scalars (including indented continuation), single quotes with doubled quote escaping, JSON-compatible double quotes, and literal/folded block text. Unquoted mapping delimiters, collections, tags and aliases are rejected in `name`/`description`. The linter is not a general YAML parser and does not interpret arbitrary upstream metadata.

`selectSkills(catalog, task)` is conservative task discovery, not instruction interpretation. The trusted caller supplies detected stack, framework, version, test framework and normalized task. Read each selected skill's `overlay` first, then use `selectResources(skill, task)` and semantic review to load applicable resources progressively. Dependencies are stable catalog IDs. Do not load every supporting file just because it is packaged.

All five permitted .NET groups and both Vercel folders are included with their complete locked resources. Upstream test agents and plugin metadata are passive resources, not automatic native registration. Unrelated language references remain for closure and are excluded from default resource selection. Existing repository skill overlays remain project-owned optional inputs. No additional .NET plugin group is included.

Installers preserve the declared resource paths and links, shared context policy, overlays and licenses in the detached runtime. Flattening a SKILL.md alone loses this contract. Any output transformation requires explicit provenance and usable reference paths. Maintainer documents outside the declared resource closure must not become links from installed catalog guidance. The compatibility bridges are separate Pegatus files; copied upstream bytes remain unchanged. See [source notices](../vendor/NOTICE.md) and [ECC adaptation decisions](ADAPTATIONS.md).

Scenario fixtures verify structural gates, real context retrieval, handoff fields and resource selection. They supplement practical Claude Code, Codex and Antigravity trials; they do not establish that agents obey every prose instruction or that hosts enforce role privileges.
