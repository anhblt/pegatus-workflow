# Pegatus V2 — installation and user guide

Pegatus is an installable workflow kit for **Claude Code, Codex, and Antigravity**, with a Node.js runtime for Windows and Linux. It supplies shared skills, roles, commands, rules, durable state, reviewed learning, verification, token controls, orchestration procedures, and AgentShield configuration checks.

Default stack guidance targets **.NET 10, EF Core, SQL Server, React 19, and TypeScript**. Actual solution versions, architecture, test libraries, and instructions take precedence.

> **Candidate status:** `0.1.0-rc.1` is private and not release-qualified. Start with a disposable pilot. Native acceptance across all three hosts/both operating systems, hosted CI, and the complete applicable Vercel license notice remain unfinished. A passing install/doctor result does not prove native behavior. See the [acceptance checklist](docs/acceptance/checklist.md).

The catalog contains nine roles and seventeen host workflow aliases, including context-budget, file-cache and prompt-cache guidance, bounded retrieval/compaction procedures and scoped memory ID reads. The [implementation and validation record](docs/current-state.md) describes the evidence retained on 2026-10-27; its statements about uncommitted work and package counts describe that historical snapshot, not necessarily this checkout. Existing detached installations do not update automatically: use the normal update or reinstall flow when they need the current kit.

## Contents

1. [Understand the kit](#1-understand-the-kit)
2. [Prerequisites and preparation](#2-prerequisites-and-preparation)
3. [Project installation](#3-project-installation)
4. [User defaults and project overrides](#4-user-defaults-and-project-overrides)
5. [Activate your host](#5-activate-your-host)
6. [Solution configuration](#6-solution-configuration)
7. [Vault and no-vault projects](#7-vault-and-no-vault-projects)
8. [Daily workflows](#8-daily-workflows)
9. [Checkpoint and resume](#9-checkpoint-and-resume)
10. [Verification and security](#10-verification-and-security)
11. [Memory and learning](#11-memory-and-learning)
12. [Roles and orchestration](#12-roles-and-orchestration)
13. [Optional hooks](#13-optional-hooks)
14. [Update and uninstall](#14-update-and-uninstall)
15. [CLI reference](#15-cli-reference)
16. [Troubleshooting](#16-troubleshooting)
17. [Qualification and references](#17-qualification-and-references)

## 1. Understand the kit

| Part | Purpose | Usage |
| --- | --- | --- |
| Kit checkout | Versioned catalog, source, pinned resources and dependencies | Prepare once; install/update approved versions |
| Project/user installation | Host entry points and detached runtime | Open the target solution and invoke workflows |
| State/knowledge | Task records in `.pegatus/`; knowledge in the instructed vault or fallback | Checkpoint/resume and retrieve authoritative context |

Pegatus is not a running server. It requires no database or separate model account. Your solution may use MSSQL; Pegatus state is files. Your AI host provides inference, permissions and supported delegation.

**Workflow skills are not CLI subcommands.** Ask the host to use `pegatus-design` or `pegatus-execute`. Do not run `pegatus design` or `pegatus execute` in a terminal. The CLI provides operations such as `install`, `checkpoint`, `resume`, `security`, and `learn`.

Solution instructions govern every phase, including clarification/design. Agents must follow instructed discovery, consult relevant business flows/code maps and confirm relevant source. Broad rescanning must not replace that procedure.

## 2. Prerequisites and preparation

| Requirement | Notes |
| --- | --- |
| Node.js >=22 | On the actual execution OS; qualification targets Node 22/24 |
| npm | Prepare the committed dependency graph |
| Git | Repository snapshots, branches and resume checks |
| Configured AI host | Install/authenticate your host separately |
| Existing writable target | Administration requires an explicit existing directory |
| Solution tools | Actual SDK, frontend dependencies, Docker/SQL Server when selected checks need them |

Confirm the host can read a disposable project, edit an allowed file and run tests. Authentication/execution policy are separate from Pegatus. Windows executables invoked through WSL do not qualify native Linux behavior.

### Windows — PowerShell

Replace the example checkout location with your actual path:

```powershell
Set-Location 'C:\Workspace\PegatusWorkflow'
node --version
npm --version
git --version
npm ci --ignore-scripts
node .\bin\pegatus.mjs --help
npm run lint
```

### Linux — Bash

Replace the example checkout location with your actual path:

```bash
cd "$HOME/work/PegatusWorkflow"
node --version
npm --version
git --version
npm ci --ignore-scripts
node ./bin/pegatus.mjs --help
npm run lint
```

No public npm installation or clone URL is assumed. `npm ci --ignore-scripts` prepares the exact locked graph, including `ecc-agentshield@1.6.0`. It needs registry access or a prepared npm cache. Pegatus installation/scanning does not download packages. Do not substitute unpinned `npx` or copy only `bin/` and `src/`.

For qualification of a new kit revision, maintainers also run:

```text
npm test
npm pack --dry-run
```

Retain results for that revision. These are not steps to repeat before every task; local checks do not replace native acceptance or hosted CI.

`npm pack --dry-run` inspects package contents. `npm pack` creates a local archive for authorized candidate testing, not publication/licensing clearance. The archive bundles prepared scanner dependencies. `npm-shrinkwrap.json` retains exact root lock bytes because npm excludes `package-lock.json` from tarballs; detached runtimes retain both lock names. Unlocked nested packages are rejected.

## 3. Project installation

### Guided setup (recommended)

Run from the solution where you want to install Pegatus:

```powershell
Set-Location 'C:\Samples\PegatusPilot'
node 'C:\Workspace\PegatusWorkflow\bin\pegatus.mjs'
```

```bash
cd "$HOME/work/PegatusPilot"
node "$HOME/work/PegatusWorkflow/bin/pegatus.mjs"
```

The target directory must exist. With an interactive terminal, no arguments, `setup`, or bare `install` opens the wizard:

1. Detect supported host executables/applications and show detection status. Configuration-only detection is labeled unconfirmed; no credentials are read and no discovered executable is run.
2. Select one or more hosts with ↑/↓ and Space, then press Enter. Detected CLI/application hosts are preselected; undetected hosts remain manually selectable for IDE-only/custom setups. The focused row has a visible marker even without color.
3. Choose current-project or user-wide scope with ↑/↓ and Enter, then enter an existing destination. For project scope, optionally select existing user defaults to inherit.
4. Review planned write groups/removals and any conflicts. Preview never scans, recovers, or writes managed files; pending recovery blocks setup.
5. Select **Yes** on the final confirmation and press Enter. **No** is selected by default; Enter alone cancels before apply.
6. Install each selected host through existing security/ownership checks and report doctor summaries, warnings and integration snippets.

Detection is a bounded presence check, not proof of authentication, execution permission, native discovery, or qualification. Multiple hosts apply sequentially: if a later host blocks, earlier successful installations remain. Setup stops rather than silently rolling them back. Ctrl+C before confirmation cancels without installation; interruption during apply requires normal installation recovery/doctor inspection.

Scripts/piped input do not receive interactive prompts: use the explicit commands below. `--help` remains available without a terminal.

### Explicit installation for automation

Start with project scope in a disposable solution. Run from the kit checkout.

### Windows — PowerShell

```powershell
New-Item -ItemType Directory -Force 'C:\Samples\PegatusPilot' | Out-Null
Set-Location 'C:\Workspace\PegatusWorkflow'
node .\bin\pegatus.mjs install --host claude --scope project --root 'C:\Samples\PegatusPilot'
node .\bin\pegatus.mjs doctor --host claude --scope project --root 'C:\Samples\PegatusPilot'
```

### Linux — Bash

```bash
mkdir -p "$HOME/work/PegatusPilot"
cd "$HOME/work/PegatusWorkflow"
node ./bin/pegatus.mjs install --host claude --scope project --root "$HOME/work/PegatusPilot"
node ./bin/pegatus.mjs doctor --host claude --scope project --root "$HOME/work/PegatusPilot"
```

Exact host IDs are `claude`, `codex`, and `antigravity`. Repeat with the appropriate ID for another host. Each has its own ownership record; identical runtime content is shared inside the installation root. Shared `.agents/` collisions must be reconciled explicitly.

| Host | Generated entry points |
| --- | --- |
| Claude | `.claude/skills/` (including slash commands), `.claude/agents/`, `.claude/rules/` |
| Codex | `.agents/skills/`, `.codex/agents/*.toml` |
| Antigravity project | `.agents/workflows/`, `.agents/rules/`; portable skill/role references |

Full installations share `.pegatus/runtime/shared/<content-id>/`: CLI, modules, catalog, vendor resources, notices, provenance and prepared dependencies. Entry points link into their selected snapshot. The first host copies the runtime; later hosts with identical content reuse it. Different content can coexist during independent host updates. Projects remain self-contained if the original kit checkout moves or is deleted.

`.pegatus/runtime/<host>/` contains only small compatibility files for the documented CLI and context-protocol paths. Normal preview/update migrates an unchanged legacy host runtime; edited files block migration. Uninstalling one host retains snapshots used by other hosts. See [shared runtime ownership and migration](docs/installation.md#shared-runtime-ownership-and-migration).

Installation preserves existing `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, instruction generators and hook registrations. Hash ownership detects edited/foreign conflicts. Desired configuration is scanned before changes.

Read the JSON result: blocked is not passed. Doctor reports owned paths/file states, installed version, configuration, snippets, warnings and capability limits. Native qualification warnings differ from missing/broken installed files.

### Use the installed runtime

Task-state commands run **from the solution root**, without the original checkout:

```powershell
Set-Location 'C:\Samples\PegatusPilot'
node .\.pegatus\runtime\claude\bin\pegatus.mjs --help
```

```bash
cd "$HOME/work/PegatusPilot"
node ./.pegatus/runtime/claude/bin/pegatus.mjs --help
```

Later examples use `.pegatus/runtime/claude/bin/pegatus.mjs`; replace `claude` with your installed host. In inherited user installs use the runtime under the user root.

## 4. User defaults and project overrides

Project scope is simplest for pilots. User scope lets several solutions inherit a maintained installation.

The installer never guesses your home. Select an explicit existing user root. A disposable root is only a trial layout: hosts do not automatically discover it unless launched/configured to use it. Normal user discovery requires deliberately selecting the real approved home layout.

```powershell
New-Item -ItemType Directory -Force 'C:\Samples\PegatusUser' | Out-Null
Set-Location 'C:\Workspace\PegatusWorkflow'
node .\bin\pegatus.mjs install --host codex --scope user --root 'C:\Samples\PegatusUser'
node .\bin\pegatus.mjs install --host codex --scope project --root 'C:\Samples\PegatusPilot' --user-root 'C:\Samples\PegatusUser'
node .\bin\pegatus.mjs doctor --host codex --scope project --root 'C:\Samples\PegatusPilot' --user-root 'C:\Samples\PegatusUser'
```

On Linux use the same options with absolute paths such as `"$HOME/work/pegatus-user"` and `"$HOME/work/PegatusPilot"`; create directories first.

User config is `<user-root>/.pegatus/config.json`; project config is `<project-root>/.pegatus/config.json`. Project overrides explicitly supplied defaults. Pass the same `--user-root` on subsequent administration.

Clean compatible user resources are inherited without duplicate skills. Same-version project role/model differences create one owned `.pegatus/overrides/<host>.json`. Activate through the explicit portable path rather than assuming native same-name priority:

```powershell
node 'C:\Samples\PegatusUser\.pegatus\runtime\codex\bin\pegatus.mjs' role --host codex --scope project --root 'C:\Samples\PegatusPilot' --user-root 'C:\Samples\PegatusUser' --role context-explorer
```

The coordinator consumes the returned procedure, fixed selection and token controls. This does not launch inference/workers. Doctor distinguishes requested vs installed selection and reports `configurationUpdateRequired`. Different versions, edited user resources or an existing full project install may need reconciliation. See [installation](docs/installation.md).

## 5. Activate your host

Open the **target solution root** after installation. Reload/start a fresh session if entry points are absent. Inspect doctor snippets and actual installed paths.

```text
Use pegatus-start for this task: fix incorrect invoice rounding.
Read applicable solution instructions and their business-flow/code-map references
first. Preserve evidence and checkpoint under invoice-rounding.
```

### Claude Code

Select an installed `pegatus-*` skill or name it explicitly in your prompt. Check shortcut syntax/discovery in your installed version. Roles are generated in `.claude/agents/`.

Confirm the instruction chain: do not assume `AGENTS.md` takes precedence over `CLAUDE.md`. Review returned snippets and deliberately merge any needed import/reference into maintained instructions; installation does not do this for you.

### Codex

Select installed `.agents/skills/` workflows or request `pegatus-start`. Generated `.codex/agents/` files alone do not establish native model/effort loading or delegation. Resolve execution failures through normal host controls; successful inference text is not a passing workflow.

### Antigravity

Select a project workflow from `.agents/workflows/` using the host's supported picker/invocation. User workflows use `.gemini/config/global_workflows/`; global rules need the user-managed `GEMINI.md` snippet returned by administration.

User defaults need explicit project activation through the snippet. Native custom-role/global-skill discovery and hooks remain unqualified. Use portable procedures inline when unsupported and disclose review/delegation limits.

### Workflow catalog

| Skill | Purpose |
| --- | --- |
| `pegatus-start` | Classify/coordinate a natural-language task |
| `pegatus-design` | Clarify requirements and propose scope/design |
| `pegatus-plan` | Plan an approved design |
| `pegatus-execute` | Implement authorized work with checks/checkpoints |
| `pegatus-investigate` | Gather evidence before choosing a fix |
| `pegatus-review` | Review behavior, integration and relevant risks |
| `pegatus-verify` | Run checks and retain actual results |
| `pegatus-browser-test` | Test a running application through host-level Playwright MCP |
| `pegatus-checkpoint` | Save resumable state |
| `pegatus-resume` | Reconcile state and continue authorized work |
| `pegatus-learn` | Propose/review lessons separately from activation |
| `pegatus-memory` | Retrieve scoped knowledge with freshness limits |
| `pegatus-security` | Review relevant configuration/security evidence |
| `pegatus-status` | Inspect state and next action |
| `pegatus-context-budget` | Live native context meter guidance; explicit scoped overhead audits |
| `pegatus-file-cache` | Selected content-hash guidance for expensive file processing |
| `pegatus-prompt-cache` | Selected prompt-cache reuse and measurement guidance |

Selected upstream skills come from the five .NET groups (`dotnet`, `dotnet-advanced`, `dotnet-data`, `dotnet-test`, `dotnet-aspnetcore`), plus Vercel React best practices/composition patterns. Some address other frameworks/test tools: invoke only when compatible with the actual project and authorized task. Installing guidance does not authorize a framework or test-library migration.

## 6. Solution configuration

Maintain UTF-8 JSON at `.pegatus/config.json`. This example assumes `backend/` and `frontend/` below the root. Replace paths/checks/prerequisites with solution conventions:

```json
{
  "schemaVersion": 1,
  "repositories": [
    {
      "id": "backend",
      "path": "backend",
      "verify": [
        { "command": "dotnet", "args": ["test", "--no-restore"], "cwd": "backend", "requires": ["dotnet"] }
      ]
    },
    {
      "id": "frontend",
      "path": "frontend",
      "verify": [
        { "command": "node", "args": ["node_modules/typescript/bin/tsc", "--noEmit"], "cwd": "frontend", "requires": ["node"] }
      ]
    }
  ],
  "knowledge": null,
  "hostModels": {},
  "hostModelCapabilities": {},
  "concurrency": 2,
  "repairLimit": 3,
  "tokenControls": {
    "maxContextRefs": 128,
    "maxContextChars": 32768,
    "maxOutputChars": 16384,
    "maxSummaryChars": 4096
  },
  "evidenceExclusions": []
}
```

Use `"path":"."` and `"cwd":"."` when the root itself is the repository. IDs must be unique; paths/working directories are root-relative and contained. Backend assumes completed restore; frontend assumes installed TypeScript. Select the actual restore/build/test sequence and required test libraries.

Separate executable and arguments: do not put `dotnet test` in `command`. Shell use must be explicitly declared; prefer direct executables/data arguments. Missing prerequisites remain blocked checks. Do not provision production infrastructure implicitly.

Configuration does not execute checks by itself. The verification workflow/coordinator consumes it; there is no standalone `pegatus verify` command.

### Optional fixed models

Unconfigured tiers use host-coordinator selection within fast, standard and deep; unavailable host selection retains defaults with a disclosed limitation. Team-selected mappings need matching declarations. Merge this fragment into config; names are placeholders, not availability recommendations:

```json
{
  "hostModels": { "codex": { "deep": { "model": "TEAM_SELECTED_MODEL", "effort": "high" } } },
  "hostModelCapabilities": {
    "codex": {
      "source": "Team-tested host version and retained evidence location",
      "models": [{ "model": "TEAM_SELECTED_MODEL", "efforts": ["high"] }]
    }
  }
}
```

Project tier overrides replace the complete model/effort pair. Workers cannot choose replacements. Declarations are not native acceptance. Token controls bound local characters/references, not guaranteed host tokens or savings. See [tokens](docs/tokens.md).

## 7. Vault and no-vault projects

### Existing vault or authoritative knowledge

Keep the solution instruction chain. A maintained `AGENTS.md` may direct agents to a vault index, business flow, code map, query tool and freshness procedure. Pegatus follows it during clarification, design, implementation, review and resume. File access does not require Obsidian running.

Do not duplicate the vault into Pegatus memory, replace generators/synchronization, or mark stale notes verified without source review. If instructions do not already provide discovery, merge an optional location hint:

```json
{ "knowledge": { "paths": [".vault"] } }
```

Use the actual contained relative path. This neither creates/synchronizes a vault nor overrides instructed discovery. External knowledge uses the existing instructed access procedure, not escaping configuration paths.

### No vault

Leave `knowledge` null. State remains in `.pegatus/work/<task-id>/`; approved fallback knowledge can go in `.pegatus/memory/`. Applicable instructions/source are still required. No vault does not authorize invented business rules.

### File ownership

```text
Solution/
  AGENTS.md                     # existing solution instructions, if present
  CLAUDE.md / GEMINI.md          # existing host instructions, if present
  .vault/                       # optional authoritative knowledge
  .pegatus/
    config.json                 # team/project configuration
    runtime/shared/<content-id>/ # shared hash-owned runtime snapshot
    runtime/<host>/             # compatibility entry points
    overrides/<host>.json       # optional inherited-install override
    work/<task-id>/
      brief.md
      progress.json             # durable aggregate state
      spec.md / plan.md         # when feature work requires them
      report.md
      evidence/
      lessons/                  # proposals/review history
    memory/                     # approved no-vault fallback
```

This is conceptual: optional artifacts are created as needed. Existing solution artifact conventions still govern; state references authoritative artifacts. Decide what belongs in private Git and how handoffs are retained. Do not ignore all `.pegatus/` without a backup/handoff policy or commit credentials/unrestricted logs.

## 8. Daily workflows

### Small understood fix

```text
Use pegatus-start. Fix invoice-total rounding. Task ID: invoice-rounding.
Read solution instructions and the relevant billing flow/code map first.
Keep scope to the confirmed defect, run relevant checks, review the change,
and checkpoint with evidence and next action.
```

Understood small fixes proceed within existing authorization; no feature spec/plan is required by default. Broader interfaces/data changes or uncertainty can require reclassification and approval.

### Feature

```text
Use pegatus-design for invoice-export. I need invoice CSV export.
Consult solution instructions, business flows, code maps and conventions before
asking questions. Propose scope, acceptance criteria and design, then stop for
my explicit design/scope approval before implementation.
```

After reviewing and approving the actual design:

```text
Use pegatus-plan for invoice-export with the approved design, then use
pegatus-execute within that scope. Preserve approval evidence, use supported
independent review, verify current code and produce the report.
```

Feature sequence: context → design/scope approval → plan → implement → independent review where supported → verify → report. Material scope changes invalidate affected approvals. A checkpoint is not approval; agents cannot manufacture human authorization.

### Investigation

```text
Use pegatus-investigate for slow-order-search. Start with the instructed
business flow/query map. Gather evidence for slow SQL before edits. Report
hypotheses, measured findings, prerequisites and the narrowest supported fix.
```

### Review

```text
Use pegatus-review on current changes. Check behavior, performance, integration,
EF Core queries, tests and relevant security. Follow solution instructions and
report actionable findings with locations.
```

### Quota limit or handoff

```text
Use pegatus-checkpoint for invoice-export now. Save completed work, current
branches/content state, approvals, verification, uncertainties and exact next
action. Reference retained evidence rather than repeating logs.
```

## 9. Checkpoint and resume

The host coordinator maintains records. Jira is optional. Use task IDs such as `invoice-export` or `PROJ-123`, without spaces, path separators or reserved device names.

From the solution root:

```text
node .pegatus/runtime/claude/bin/pegatus.mjs status invoice-export
node .pegatus/runtime/claude/bin/pegatus.mjs resume invoice-export
```

Then ask the host:

```text
Use pegatus-resume for invoice-export. Read current solution instructions,
reconcile saved state with repositories, preserve approvals/completed work,
and continue only the saved authorized next action.
```

The CLI reports reconciliation; it does not start inference/execute the next task. Branch/content/missing-repository/dirty-submodule mismatches must be resolved. Old passing tests do not justify changed code.

### Explicit checkpoint

The coordinator prepares a complete record in a separate input file, preserving current approvals/revision:

```text
node .pegatus/runtime/claude/bin/pegatus.mjs checkpoint invoice-export --file .pegatus/work/invoice-export/checkpoint-input.json --expected-revision 4
```

`4` is illustrative: both input revision and expected revision must match saved state. Success advances revision. Do not keep using zero or edit aggregate `progress.json` directly.

The CLI refreshes declared Git snapshots. [State validation](src/state/store.mjs) defines required fields. Have the workflow construct actual task state: empty-repository fixtures are not real-solution proof. The plain checkpoint CLI cannot grant approvals; trusted coordinator APIs record actual human approval/scope events.

After interruption: open the same solution, invoke resume, resolve changed context/repositories, continue only pending authorized work, and reverify affected current code. Do not redo completed work solely because the conversation is new.

Do not delete locks based on age. Inspect owner/process and preserve evidence. Installation and learning have separate recovery protocols. Corrupt/missing state requires recovery from retained evidence, never invented approval/completion.

## 10. Verification and security

### Verification

Ask `pegatus-verify` to run checks appropriate to scope with actual solution tooling. Retain command, working directory, exit status, timestamps and current-code evidence. Results distinguish `passed`, `failed`, `blocked`, and `skipped`.

For changed UI interactions, forms, navigation, rendered states or layout, the verifier selects browser checks and delegates to `browser-tester`. Tasks without observable UI impact can omit them with a recorded reason. Invoke `pegatus-browser-test` directly to test an existing application without implementation in the session: "Test the vehicle form at http://localhost:3000, including validation, saving and mobile layout."

Browser testing uses Playwright MCP configured in the active host environment; application projects need no Playwright dependency. Selected browser checks require actual interaction and screenshot evidence; build/type/lint success alone cannot pass them. Missing browser tools, services or login leaves affected checks blocked. Inline fallback discloses the lack of independent delegation. Pegatus does not provision MCP or browsers automatically. See [browser setup, evidence and support limits](docs/browser-testing.md).

Missing Docker/SQL prerequisites are blocked/not run, never passed. Default repair budget is three rounds. Unchanged recurring failures, missing prerequisites, security blockers or scope expansion require checkpoint/next action.

Completion requires current verification and relevant configuration scanning. Specific failed/blocked limitations need explicit reviewed evidence bound to exact task/scope/code/check evidence; statuses remain failed/blocked. This is not a security waiver or release acceptance pass. See [completion records](docs/hooks.md).

### Configuration scanning

From the solution root, scan actual relevant files; omit nonexistent examples:

```text
node .pegatus/runtime/claude/bin/pegatus.mjs security --root . --file CLAUDE.md
```

Repeat `--file` for other relevant configurations:

```text
node .pegatus/runtime/codex/bin/pegatus.mjs security --root . --file AGENTS.md --file .codex/agents/pegatus-context-explorer.toml
```

The second command assumes those exact files exist; inspect your installation first. Scanning covers supplied configuration, not the whole application. AgentShield and separately labeled Pegatus static checks have distinct limits. Uncovered formats, missing binaries and malformed/failed scanner output cannot pass as clean scanning.

Review findings against actual bytes. Fix the underlying issue where appropriate; do not fake acceptance to obtain green output. [Security documentation](docs/security.md) defines narrow reviewed exceptions, discovery and redaction limits. Application security review remains separate.

## 11. Memory and learning

Use `pegatus-learn` for confirmed lessons. Candidates remain untrusted task/project-scoped proposals; they cannot grant permission or change shared policy automatically.

1. Propose a claim with paths, evidence and limitations.
2. Check project scope, duplicates and stale knowledge.
3. Read actual source and review destination authority.
4. Obtain an explicit human decision.
5. Promote transactionally to the instructed destination or no-vault fallback.
6. Retain history; supersede/retire stale knowledge explicitly.

Inspect existing candidates:

```text
node .pegatus/runtime/claude/bin/pegatus.mjs learn list --root . --task invoice-export --project billing
node .pegatus/runtime/claude/bin/pegatus.mjs learn review --root . --task invoice-export --project billing --candidate CANDIDATE_ID
```

Replace `billing` and `CANDIDATE_ID` with actual project ID/returned hash. Review displays a proposal; it does not approve. Mutation requires reviewed input with actual human evidence and, for promotion, resolved destination authority. Follow installed procedures and [review/recovery contract](docs/learning.md); do not fabricate generic approval JSON.

No-vault retrieval shape:

```text
node .pegatus/runtime/claude/bin/pegatus.mjs memory --root . --project billing --path backend --query "invoice rounding" --host claude
```

Applicable instructions can cause `instruction-resolution-required`: the coordinator must read them and supply semantic resolution through `--context-file <root-relative-json>`. Authoritative knowledge uses its instructed procedure; fallback CLI blocks competing retrieval. Edited approved bodies lose verified approval/freshness until source review. Output overflow returns blocked plus preserved-source reference rather than dropping required context.

## 12. Roles and orchestration

| Portable role ID | Responsibility |
| --- | --- |
| `context-explorer` | Instructions, knowledge and scoped source evidence |
| `planner-architect` | Clarification/design/planning |
| `backend-implementer` | Authorized backend implementation |
| `frontend-implementer` | Authorized frontend implementation |
| `code-reviewer` | Independent review where supported |
| `security-reviewer` | Task-relevant security review |
| `build-test-repairer` | Bounded build/test diagnosis and repair |
| `verifier` | Current-code checks and retained proof |
| `browser-tester` | Selected browser scenarios, UI inspection and evidence; reports findings without source fixes |

Generated names/paths can differ: inspect doctor/catalog rather than assuming a host picker name. Role tiers are fixed by catalog/team config. Workers cannot choose models or write aggregate progress.

Default parallelism is two. Delegate only independent lanes with agreed interfaces/disjoint ownership. Carry instructions and relevant approvals into handoffs. Overlap requires reconciliation. Unsupported delegation uses sequential inline work and discloses independent-review limitations.

Inspect a saved task schedule:

```text
node .pegatus/runtime/claude/bin/pegatus.mjs orchestrate plan --root . --task invoice-export --concurrency 2
```

This is planning only; `skipped` plus `planningOnly:true` does not mean work executed. `orchestrate run` requires host-provided delegation/verification callbacks; standalone use blocks. Host name alone does not establish delegation support. See [orchestration](docs/orchestration.md).

## 13. Optional hooks

Start with explicit workflows. Native registration is opt-in; installation does not merge/enable hooks in existing settings.

Print an activation proposal for installed Claude/Codex:

```text
node .pegatus/runtime/claude/bin/pegatus.mjs hook-activation --host claude --root .
```

Review the proposal before manually merging into existing host configuration. Preserve other settings/hooks. Bind an existing selected task before launching the host:

```powershell
$env:PEGATUS_ROOT = 'C:\Samples\PegatusPilot'
$env:PEGATUS_TASK_ID = 'invoice-export'
# Launch your host from the solution root in this shell.
```

```bash
export PEGATUS_ROOT="$HOME/work/PegatusPilot"
export PEGATUS_TASK_ID='invoice-export'
# Launch your host from the solution root in this shell.
```

Unset/change these variables when switching tasks. The bridge records session binding; missing/mismatched bindings skip advisory callbacks. Native hooks do not cover every tool path or replace required explicit gates.

Explicit pre-compaction checkpoint for an existing task:

```text
node .pegatus/runtime/claude/bin/pegatus.mjs lifecycle --root . --task invoice-export --event-id invoice-export-compact-001 --type pre-compact
```

Use a new unique ID for each new event; reuse only for exact retries. `complete` requires current checks/explicit affected configuration; `before-action` requires actual reviewed authorization. Antigravity uses explicit operations. See [hooks, binding and replay](docs/hooks.md).

## 14. Update and uninstall

To clean up empty folders left by older uninstall versions, run from the target solution:

```powershell
node 'C:\Workspace\PegatusWorkflow\bin\pegatus.mjs' cleanup
```

Confirm the existing destination, review the empty-directory preview, then select Yes (No is the default). An explicit destination is supported with `cleanup --root C:\Workspace\CM`. Use `cleanup --root C:\Workspace\CM --dry-run` for a read-only preview without an interactive terminal. This works after reinstalling and needs no old ownership record. It removes only empty directories in legacy host runtimes, unreferenced shared runtime snapshots, and `pegatus-*` skills under `.claude/skills` or `.agents/skills`. Files, referenced snapshots, owned file ancestors, directory links, unrelated folders, history, configuration and shared container directories remain. Pending recovery or installation mutex records block the preview; resolve them through normal administration first. Cleanup never deletes obsolete files.

Update from the approved new **kit checkout**, not an old detached catalog. Review changes/pins and prepare locked dependencies first. From the kit checkout:

```text
node bin/pegatus.mjs doctor --host claude --scope project --root C:/Samples/PegatusPilot
node bin/pegatus.mjs update --host claude --scope project --root C:/Samples/PegatusPilot
node bin/pegatus.mjs doctor --host claude --scope project --root C:/Samples/PegatusPilot
```

These roots are Windows examples. Linux uses its absolute root, e.g. `"$HOME/work/PegatusPilot"`. Quote spaces. Include `--user-root` consistently for inherited defaults.

Update scans staged config and compares ownership. Edited managed files block: preserve edits/review conflicts before reconciliation. Do not erase ownership locks or force-copy catalog resources.

For a guided read-only preview, run the setup wizard from the intended solution, select the existing host/scope/root and review the changes before its final confirmation. Setup also reconciles an existing installation. Preview does not scan or apply; confirmation starts the real security/ownership transaction. The explicit `update` command above applies immediately through those gates; it is not a preview command and has no CLI `--dry-run` flag.

If choosing uninstall/reinstall instead, complete the normal uninstall below and run guided setup again from this checkout. Uninstall preserves task history, team configuration and maintained instructions. Reinstall does not remove edited-file conflicts or activate hooks/MCP automatically. After either route, run doctor and reload the host. The unchanged candidate version alone does not prove that an older detached runtime contains the new workflow files.

For guided uninstall, run from the target solution in an interactive terminal:

```powershell
node 'C:\Workspace\PegatusWorkflow\bin\pegatus.mjs' uninstall
```

Choose project or user scope, confirm the existing destination, then select the hosts with ↑/↓ and Space. The menu lists hosts with Pegatus ownership or recovery records at that destination. Review the owned-file removals and confirm with **Yes**; **No** is selected by default. All selected hosts are previewed before any removal. Conflicts or pending recovery block the flow. Ctrl-C cancels; an active host transaction settles before stopping. Hosts apply sequentially, so completed removals remain if a later host blocks. Removing user defaults affects projects that inherit them; removing a project override preserves those defaults.

For scripts, uninstall selected host/scope from the kit checkout:

```text
node bin/pegatus.mjs uninstall --host claude --scope project --root C:/Samples/PegatusPilot
```

Uninstall removes unchanged owned files; edits block the transaction. It protects unrelated files/instructions. Task history and team config are not disposable installation files. After successful uninstall, empty ancestors of removed owned files are pruned where possible; unrelated directories and nonempty folders are preserved. Removing a project override leaves global defaults intact.

Interrupted administration retains a journal and attempts guarded recovery on subsequent administration. Concurrent edits can block recovery. See [installation recovery](docs/installation.md); there is no generic `pegatus recover` command.

## 15. CLI reference

Run `node <kit-or-installed-runtime>/bin/pegatus.mjs <operation> ...`. Task-state operations use the current solution directory.

| Operation | Inputs / behavior |
| --- | --- |
| `--help` | Runnable operations and host workflow distinction |
| no arguments, `setup`, bare `install` | Interactive host detection, scope/root selection, preview and confirmation; requires TTY |
| bare `uninstall` | Interactive scope/root and installed-host selection, removal preview and confirmation; requires TTY |
| `cleanup` | `[--root <existing-root>] [--dry-run]`; preview empty obsolete Pegatus folders; apply requires TTY confirmation |
| `install`, `update`, `doctor`, `uninstall` | `--host <host> --scope <project-or-user> --root <existing-root> [--user-root <defaults>]` |
| `role` | Administration flags plus `--role <catalog-role-id>`; portable procedure/selection |
| `catalog lint` | Catalog/resource closure validation |
| `checkpoint <task-id>` | `--file <complete-record.json> --expected-revision <n>` |
| `status <task-id>` | Saved progress and reconciliation |
| `resume <task-id>` | Reconcile only; does not execute next work |
| `security` | `--root <root> --file <relative-config>`; repeat files as needed |
| `learn` | propose/list/review/approve/reject/supersede/retire/recover with scoped input records |
| `memory` | `--root <root> --project <id> --path <relative> --query <text>`; or `memory read <entry-id>` with the same root/project/path scope; optional resolution |
| `lifecycle` | Root/task/unique event ID/type plus gate-specific inputs |
| `hook-activation` | Host/root; proposal only, Claude/Codex |
| `hook-native` | Internal native bridge with bounded stdin/task binding |
| `orchestrate plan` | Planning-only task schedule |
| `orchestrate run` | Host callbacks required; standalone blocks |

Result operations generally use exit `0` passed/skipped, `1` failed, `2` usage/input error, `3` blocked. Read JSON/status: planning-only skipped is not executed work. `status` reports reconciliation; `resume` exits 3 for blocked reconciliation.

## 16. Troubleshooting

| Symptom | Action |
| --- | --- |
| Unsupported/missing Node | Use >=22 on the actual execution OS |
| Missing scanner/dependency | Prepare committed dependencies in the approved checkout; use complete runtime/package |
| Unlocked dependency rejected | Restore exact graph; do not add arbitrary nested packages |
| Root/path error | Existing explicit root; quote spaces; contained relative config paths |
| Missing skill/workflow | Inspect doctor/paths/root; reload or start a fresh host session |
| Instruction mismatch | Review actual AGENTS/CLAUDE/GEMINI chain; merge intended references deliberately |
| `Host workflow` for design/verify | Invoke installed skill in AI host, not terminal |
| Install/update conflict | Inspect edited/foreign files and preserve changes before reconciliation |
| Scanner blocked | Review coverage/findings; fix or obtain specific reviewed disposition; never fake success |
| API retry error | Check native availability, retain checkpoint; do not invent auth/policy cause |
| Host execution denied | Resolve scoped host permissions normally; no bypass |
| Resume mismatch | Reconcile current Git/context and invalidate stale verification |
| Revision conflict | Stop competing aggregate writers, reload latest state |
| Lock after interruption | Inspect owner and documented recovery; no age-based deletion |
| Memory instruction resolution required | Read instructions and supply semantic resolution/use authoritative retrieval |
| Context budget exceeded | Narrow retrieval or deliberately revise budget; preserve instructions/source |
| Standalone orchestration blocked | Supply supported host integrator or work inline |
| Docker/SQL/test tools missing | Record blocked/not-run and prerequisite; do not claim integration pass |

Report kit revision, OS/Node/host versions, exact command, status/exit, relevant paths and a small redacted excerpt. Do not share credentials or unrestricted private source/transcripts.

## 17. Qualification and references

Implementation has retained tests/independent review; first-release qualification is incomplete. Generated files, fixtures, declared model support and clean installation do not establish native role/effort/hook/cross-host behavior. No percentage token-saving claim is made.

The source mapping and `sources.lock.json` preserve revisions, paths, hashes, actual notices and scanner integrity. Keep full supporting resources. Selected Vercel bytes lack a complete applicable notice: do not invent copyright, borrow another repository's notice, publish, or claim redistribution clearance.

| Reference | Details |
| --- | --- |
| [Acceptance](docs/acceptance/checklist.md) | All 17 conditions and remaining proof |
| [Windows](docs/acceptance/0.1.0-windows.md) / [Linux](docs/acceptance/0.1.0-linux.md) | Platform evidence and limits |
| [Native trials](docs/acceptance/0.1.0-live-hosts.md) | Actual host outcomes |
| [Capability matrix](docs/compatibility/capability-matrix.md) | Portable/native/unsupported modes |
| [Host contracts](docs/compatibility/hosts.md) | Reviewed mappings/instruction precedence |
| [Installation](docs/installation.md) | Ownership, transactions and defaults |
| [Hooks](docs/hooks.md) | Bindings, replay, completion and limitations |
| [Security](docs/security.md) | Scanner scope, findings and exceptions |
| [Learning](docs/learning.md) | Review integrity and recovery |
| [Tokens](docs/tokens.md) | Tiers/declarations/local helper bounds |
| [Orchestration](docs/orchestration.md) | Scheduling/callbacks/ownership |
| [ECC mapping](docs/upstream/component-map.md) | Core categories mapped to Pegatus |
| [Catalog](catalog/README.md) | Skill/role/resource discovery |
| [Licensing gate](docs/acceptance/0.1.0-licensing.md) | Applicable notice unresolved |
| [Approved design](docs/superpowers/specs/2026-10-12-pegatus-v2-design.md) | Requirements and acceptance |
