# Installation and ownership

Administration always requires a host, scope, and explicit existing root. User scope uses the supplied root as the home layout; the installer never discovers or writes the machine's home automatically. Project defaults are read only from an explicitly supplied `--user-root`; project `.pegatus/config.json` overrides that root's configuration using `resolveConfig`. Existing configuration, instruction files, generators, and hook registrations are preserved.

```text
node bin/pegatus.mjs doctor --host codex --scope project --root <project-root>
node bin/pegatus.mjs install --host claude --scope user --root <explicit-user-root>
node bin/pegatus.mjs update --host codex --scope project --root <project-root> --user-root <explicit-user-root>
node bin/pegatus.mjs uninstall --host antigravity --scope project --root <project-root>
```

Install/update currently block without a passed security preflight supplied by the security integration. The CLI prints the blocked result and exits 3. Task 8 supplies the real scanner; an injected passed fixture is test evidence for transaction behavior, never scanning evidence. The current apply interface also requires preflight for uninstall. Do not change this to a fabricated clean scanner result.

`generateHost(catalog,{host,scope,root,models})` returns `operations`, `capabilities`, `warnings`, and user-managed `snippets`. Operations contain `relativePath`, `path`, `content` (string or Buffer), SHA-256 `hash`, and `sourceHash`. Models are the explicitly configured `hostModels[host]` tiers. Missing tiers retain host defaults with warnings; actual configured model availability requires host acceptance. No tool IDs or upstream native metadata are copied into generated roles.

The owned portable runtime lives at `.pegatus/runtime/<host>/`, preserving the catalog/vendor trees, notices, relative resource links, source lock, CLI, and complete `src`/`bin` module trees. Generated host entry points link into that runtime. Catalog lint runs before packaging. This retains detailed stack packs and portable role/command procedures without flattening linked resources.

Claude emits `.claude/skills`, `.claude/agents`, `.claude/commands`, and `.claude/rules`. Codex emits `.agents/skills` and `.codex/agents/*.toml`; its command aliases reuse workflow skills. Antigravity emits project `.agents/workflows` and `.agents/rules`, or user `.gemini/config/global_workflows`. Global Antigravity rules use a user-managed `GEMINI.md` snippet. Its native custom roles, user skill discovery, and hooks remain unverified, with role and skill references available in the portable runtime. Hook registration is deferred to the lifecycle integration and currently reported `explicit-call`. Instructions are not an enforcement boundary. These mappings remain subject to live Windows/Linux acceptance in the hosts.

`planInstall(current,desired,{root,host,scope,version,sourceRevisions})` returns `writes`, `removes`, `conflicts`, and `owned`. Current entries carry `path`, `installedHash`, and observed `actualHash`; desired entries carry `path` or `relativePath`, bytes and their `hash`. Edited/foreign files, path escapes, reserved paths, user instruction/generator destinations, and case-insensitive collisions block the whole transaction. Edited uninstall files are preserved and reported as conflicts. Matching complete user installs are inherited without project duplication; differing overlapping scopes are blocked with an explicit reconciliation reason.

`applyInstall(plan,{securityPreflight,afterWrite?})` returns the shared Result with optional `lock`, `written`, `removed`, and rollback details. Security preflight is a Result; `runAdministration(argv,{cwd,securityPreflight})` also accepts an async `(plan)=>Result` scanner integration. All destinations are checked before journaling and checked again before mutation. An exclusive process mutex and an atomic write-ahead journal prevent overlapping applies and retain original bytes. Recovery never recursively deletes directories, checks containment for each file, and refuses restoration when a file has subsequently been edited. `recoverInstall(root,host)` performs explicit recovery; administration also attempts interrupted recovery before planning. Missing journals cause no metadata writes. Empty uninstall removes the ownership lock; empty host directories remain.

Ownership locks and journals have `schemaVersion:1`. Locks record host, scope, version, source revisions and `files[{path,installedHash,sourceHash}]`. Doctor reports installed version, effective configuration, command locations, file states, user scope version, integration snippets, capability modes and qualifications. Scanner absence is `unavailable`, never clean scanning.
