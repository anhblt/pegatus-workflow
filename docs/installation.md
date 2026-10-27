# Installation and ownership

## Current workflow delivery

The catalog defines nine roles and seventeen host workflow aliases. ECC parity is implemented: context-budget, file-cache and prompt-cache guidance, bounded retrieval/compaction and scoped `memory read <entry-id>`. See [current state and validation](current-state.md). Install/update copies the current checkout runtime, including the separate guided setup/uninstall work; it does not update existing installations automatically.

Use guided setup to review an existing installation's ownership diff and cancel before confirmation when only a preview is wanted. `runAdministration(argv,{cwd,dryRun:true})` is the read-only API used by that wizard: it skips recovery, scanning and managed writes, and blocks on pending journal/busy records. There is no CLI `--dry-run` option. Explicit `update` applies immediately with the real preflight and ownership checks. Uninstall/reinstall is also supported; retain task history, configuration, maintained instructions and edited-file evidence, then run doctor and reload the host. Matching version strings alone do not establish matching runtime bytes.

## Browser tester installation boundary

The catalog includes browser-tester and pegatus-browser-test among its nine roles and seventeen workflow aliases. Update an existing installation through the normal ownership/security checks and reload the host to expose the new entry points. Claude/Codex receive generated native role wrappers; Antigravity uses portable role guidance and its workflow wrapper, subject to existing support limits.

Playwright MCP and its compatible browser are configured separately at user/host scope. Pegatus install/update does not register MCP, download browsers or add Playwright to application dependencies. The active session and delegated tester must verify actual browser tool access; otherwise selected browser scenarios remain blocked. See [browser setup and invocation](browser-testing.md).

## Guided terminal setup

Run `node bin/pegatus.mjs` (or `setup` / bare `install`) from an interactive terminal. The guided flow uses ↑/↓ to navigate, Space to toggle agents, and Enter to confirm. Detected supported applications are preselected; configuration-only presence remains labeled unconfirmed. Scope and final confirmation use single-choice menus; final confirmation defaults to No. Destination paths remain editable text prompts. Ctrl-C cancels; during apply, the active transaction settles before setup stops.

Detection, destination entry, preview, installation progress, doctor details, and completion share a connected console layout. `NO_COLOR` disables color; the focused row also has a visible marker. Explicit CLI commands retain their structured output and noninteractive behavior. No terminal UI dependency is installed.

## Administration and ownership

Bare `node bin/pegatus.mjs uninstall` opens a guided uninstall using the same terminal menus as setup. Select project/user scope and an existing root, then choose one or more hosts with local ownership or recovery records. Hosts start unselected; final confirmation defaults to No. All selections receive a read-only administration preview before any apply. Edited files and pending recovery block removal. Apply uses the existing administration ownership, preflight and transaction checks; Ctrl-C waits for an active transaction to settle and prevents further hosts. Earlier completed removals remain if a later host blocks. User-wide removal affects inheriting projects; project removal leaves user defaults intact. Explicit flags retain structured noninteractive behavior, and bare uninstall without a TTY prints usage and exits 2.

Administration always requires a host, scope, and explicit existing root. User scope uses the supplied root as the home layout; the installer never discovers or writes the machine's home automatically. Project defaults are read only from an explicitly supplied `--user-root`; project `.pegatus/config.json` overrides that root's configuration using `resolveConfig`. Existing configuration, instruction files, generators, and hook registrations are preserved.

```text
node bin/pegatus.mjs doctor --host codex --scope project --root <project-root>
node bin/pegatus.mjs install --host claude --scope user --root <explicit-user-root>
node bin/pegatus.mjs update --host codex --scope project --root <project-root> --user-root <explicit-user-root>
node bin/pegatus.mjs uninstall --host antigravity --scope project --root <project-root>
```

Install/update use the implemented `scanInstallPlan` integration by default and require a passed security preflight before managed mutations. An unavailable, blocked or failed preflight blocks administration with exit 3; failed apply results exit 1 and invalid usage exits 2. An injected passed fixture proves transaction behavior only. Removal-only uninstall retains the preflight contract and reports `coverage.operation:'removal-only'` rather than claiming removed files were scanned. See [security coverage](security.md).

`generateHost(catalog,{host,scope,root,models,modelCapabilities,tokenControls})` returns `operations`, `capabilities`, `warnings`, user-managed `snippets`, `roleModels`, and effective `tokenControls`. Operations contain `relativePath`, `path`, `content` (string or Buffer), SHA-256 `hash`, and `sourceHash`. Models are the explicitly configured `hostModels[host]` tiers. Legacy strings and explicit `{model,effort?}` mappings require a matching team `hostModelCapabilities[host]` declaration before emitting native model/effort fields; missing mappings carry a coordinator-selection policy, while unsupported explicit mappings retain host defaults with warnings. These declarations are not proof of host qualification. See [token controls](tokens.md) for schema, limits and fallback behavior. No tool IDs or upstream native metadata are copied into generated roles. Doctor also returns an opt-in `hookActivation` proposal for Claude/Codex; see [hooks.md](hooks.md).

The owned portable runtime lives at `.pegatus/runtime/<host>/`, preserving the catalog/vendor trees, notices, relative resource links, source lock, CLI, and complete `src`/`bin` module trees. Generated host entry points link into that runtime. Catalog lint runs before packaging. This retains detailed stack packs and portable role/command procedures without flattening linked resources.

Claude emits `.claude/skills`, `.claude/agents`, `.claude/commands`, and `.claude/rules`. Codex emits `.agents/skills` and `.codex/agents/*.toml`; its command aliases reuse workflow skills. Antigravity emits project `.agents/workflows` and `.agents/rules`, or user `.gemini/config/global_workflows`. Global Antigravity rules use a user-managed `GEMINI.md` snippet. Its native custom roles, user skill discovery, and hooks remain unverified, with role and skill references available in the portable runtime. Hooks remain reported `explicit-call` until the opt-in Claude/Codex proposal is merged and accepted in a live host; native callbacks are advisory and do not replace required Pegatus gates. Instructions are not an enforcement boundary. These mappings remain subject to live Windows/Linux acceptance in the hosts.

`planInstall(current,desired,{root,host,scope,version,sourceRevisions,expectedLockHash})` returns `writes`, `removes`, `conflicts`, and `owned`. `readOwnership(root,host).lockHash` supplies the raw ownership-lock SHA-256 snapshot, or null when absent. Apply requires this planning snapshot and rejects a changed lock before writing any managed files. Current entries carry `path`, `installedHash`, and observed `actualHash`; desired entries carry `path` or `relativePath`, bytes and their `hash`. Edited/foreign files, path escapes, reserved paths, user instruction/generator destinations, and case-insensitive collisions block the whole transaction. Edited uninstall files are preserved and reported as conflicts. Matching complete user installs are inherited without project duplication; same-version project role overrides use the explicit portable path described below.

`applyInstall(plan,{securityPreflight,afterWrite?})` returns the shared Result with optional `lock`, `written`, `removed`, and rollback details. Security preflight is a Result; `runAdministration(argv,{cwd,securityPreflight})` also accepts an async `(plan)=>Result` scanner integration. All destinations are checked before journaling and checked again before mutation. An exclusive process mutex and an atomic write-ahead journal prevent overlapping applies and retain original bytes. Recovery never recursively deletes directories, checks containment for each file, and refuses restoration when a file has subsequently been edited. `recoverInstall(root,host)` performs explicit recovery; administration also attempts interrupted recovery before planning. Missing journals cause no metadata writes. Empty uninstall removes the ownership lock; empty host directories remain.

Recovery also rechecks bytes and containment immediately before each restore/removal, including after staging replacement bytes. Concurrent edits block further restoration and retain the journal for reconciliation. `recoverInstall(root,host,{afterRestore?})` supports an optional recovery-progress observer called after each restoration.

Ownership locks and journals have `schemaVersion:1`. Locks record host, scope, version, source revisions and `files[{path,installedHash,sourceHash}]`. Doctor reports installed version, effective configuration, actual owned command locations, file states, user scope version, integration snippets, capability modes and qualifications. An inherited user installation reports `inherited:true`, `inheritedRoot`, its installed version, and user-root paths rather than nonexistent project paths. Scanner absence is `unavailable`, never clean scanning.

## Same-version project role overrides

Keep the clean user installation and supply `--user-root` on project install/update. Unchanged skills, rules, workflows and their runtime/resource closure remain inherited. A differing same-version project configuration creates one owned `.pegatus/overrides/<host>.json` packet. It does not install duplicate skill entry points or depend on same-name native role priority. Edited/foreign override files retain normal ownership/CAS conflict protection. Project update/uninstall operates only on that packet; global defaults and other projects stay intact. Incompatible versions, changed user bytes or resource closure, and a pre-existing full project installation require explicit reconciliation.

The supported activation is the explicit portable coordinator path:

```text
node <user-root>/.pegatus/runtime/codex/bin/pegatus.mjs role --host codex --scope project --root <project-root> --user-root <user-root> --role context-explorer
```

Use the returned procedure path, `selection` (configured model/effort, pending coordinator-selection policy, or explicit host-default fallback), and `tokenControls` when the trusted coordinator performs that role. This command selects a reviewed portable role packet; the coordinator still executes the procedure and supplies supported host delegation or inline fallback. It does not launch a provider or assert native role priority. Model names and capabilities remain team supplied. Native execution/effort enforcement remains a release qualification gate.

Doctor distinguishes `requestedRoleModels` from installed effective `roleModels`, inherited `nativeRoleModels`, and `activation.mode:explicit-portable` plus the required invocation. `configurationUpdateRequired` reports requested configuration that has not been installed yet; `role` consumes the installed packet. Changed packet/user runtime bytes block portable activation. Inherited command locations remain user-root locations. Pass the same explicit user root when inspecting or updating the project.
