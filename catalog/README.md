# Pegatus catalog

`pegatus-start` coordinates ordinary tasks; the fourteen commands are thin aliases to shared skills. Roles have explicit read/write responsibilities and fixed fast/standard/deep tiers. Explicit `hostModels` mappings take precedence; unconfigured tiers use the trusted host coordinator selection policy in `rules/common/tokens-orchestration.md`. Host defaults are a disclosed fallback when selection is unavailable; native enforcement and independent delegation still need host trials.

`pegatus-browser-test` supports standalone or delegated UI testing through the `browser-tester` role and host-level Playwright MCP. It is selected for relevant UI behavior or explicit requests, not every frontend task. See [browser setup and evidence limits](../docs/browser-testing.md).

Load `manifest.json` for discovery. Read the applicable [context protocol](context-protocol.md) before acting. Workflow skills link this shared policy and declare adaptive gates, records, checks and checkpoints. The manifest capability owners distinguish current APIs, procedures and later mechanical implementations.

`loadCatalog(packageRoot)` returns agents, skills, commands, rules and a snapshot of resources. `lintCatalog(catalog)` returns findings with severity, code, location and message. `pegatus catalog lint` uses the package root even when invoked from another directory; `--root` validates another package. Errors exit 1, invalid usage exits 2. The Vercel distribution notice gap remains a visible warning and release review gate.

Required frontmatter string fields use an explicit supported subset: plain scalars (including indented continuation), single quotes with doubled quote escaping, JSON-compatible double quotes, and literal/folded block text. Unquoted mapping delimiters, collections, tags and aliases are rejected in `name`/`description`. The linter is not a general YAML parser and does not interpret arbitrary upstream metadata.

`selectSkills(catalog, task)` is conservative task discovery, not instruction interpretation. The trusted caller supplies detected stack, framework, version, test framework and normalized task. Read each selected skill's `overlay` first, then use `selectResources(skill, task)` and semantic review to load applicable resources progressively. Dependencies are stable catalog IDs. Do not load every supporting file just because it is packaged.

All five permitted .NET groups and both Vercel folders are included with their complete locked resources. Upstream test agents and plugin metadata are passive resources, not automatic native registration. Unrelated language references remain for closure and are excluded from default resource selection. Existing repository skill overlays remain project-owned optional inputs. No additional .NET plugin group is included.

Installers must preserve the declared resource paths and links, shared context policy, overlays and licenses. Flattening a SKILL.md alone loses this contract. A later installer may transform output only with explicit provenance and usable reference paths. The compatibility bridges are separate Pegatus files; copied upstream bytes remain unchanged. See [source notices](../vendor/NOTICE.md) and [ECC adaptation decisions](ADAPTATIONS.md).

Scenario fixtures verify structural gates, real context retrieval, handoff fields and resource selection. They supplement practical Claude Code, Codex and Antigravity trials; they do not establish that agents obey every prose instruction or that hosts enforce role privileges.
