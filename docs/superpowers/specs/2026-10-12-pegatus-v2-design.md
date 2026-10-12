# Pegatus V2 workflow kit

Date: 2026-10-12
Status: Written spec approved by user; implementation plan awaiting review and execution-method selection

## Purpose and scope

Build a lightweight, installable engineering workflow kit for Claude Code, Codex, and Antigravity on Windows and Linux. It supports .NET 10, EF Core, SQL Server, React 19, and TypeScript projects. Natural-language tasks are the default; Jira IDs are optional metadata, without a required Jira integration.

Build an ECC-based operating model with Pegatus-owned integration and suitable V1 components after review. Preserve all core capability categories: agents, skills, commands, hooks, rules, persistent memory, continuous learning, verification loops, token optimization, orchestration, and AgentShield-backed security. Lighter means fewer supported stacks, harnesses, redundant catalog entries, and always-loaded instructions; it does not mean deleting core categories. Inspect and reuse suitable upstream components with pinned provenance rather than reinventing their behavior. A wholesale repository fork is not required. No standalone web application, hosted service, database, or mandatory Obsidian dependency is included.

Deliver engineering quality, selective autonomy, and reviewed learning together as a small foundation. Broader harness support and extraction of a complete vault indexing toolchain are later projects.

## Context-first contract

Before requirements refinement, design, implementation, review, verification, or resume, read applicable workspace and repository instructions using the host's instruction discovery rules. Follow the solution's prescribed discovery process, including referenced conventions, indexes, code maps, and business flows.

Use documented current behavior to ask targeted requirements questions. Do not infer business intent from generic stack practices. Inspect relevant source to confirm behavior and resolve documentation gaps. Identify uncertainty and assumptions explicitly.

Broad scanning is a fallback only when prescribed discovery is unavailable or insufficient and solution instructions permit it. Missing context tools must be reported, not silently replaced with assumptions. Stale documentation and differing branch state require source confirmation; they do not automatically prohibit useful work.

Delegated agents receive applicable instruction locations, task scope, relevant knowledge references, approved decisions, and verification expectations. Each agent must read instructions applicable to files it changes. Upstream skills provide technical guidance within the solution's constraints, not authority to replace those constraints.

## Architecture

Node.js runs the portable CLI. Markdown holds skills and neutral role definitions; JSON holds configuration and machine-readable state.

Four boundaries:

1. Workflow core: classify work, maintain approvals and checkpoints, reconcile resume state, run configured verification, and record evidence.
2. Skills and roles: one principal workflow entry point plus direct resume, review, and verify skills; focused implementer and reviewer roles for substantial work.
3. Stack packs: pinned upstream skill content and supporting resources, with small Pegatus overlays for project conventions and version constraints.
4. Harness adapters: translate installation and role configuration, report capabilities, and use native hooks where available.

Adapters must document instruction-level guidance versus mechanical enforcement. A common workflow does not imply identical hook, delegation, or plugin capabilities. Unsupported delegation falls back to inline work and an explicit review pass, with its limitations reported.

## ECC core capability contract

Every category below is required in the first release. Implementation may be staged, but no category can be silently deferred or removed to meet a smaller size target.

| Category | Pegatus responsibility | Reduction in breadth |
|---|---|---|
| Agents | Defined roles, task handoffs, independent review, configurable model tiers | Roles relevant to the selected stack |
| Skills | Discoverable workflow and stack procedures with progressive loading | Selected .NET groups and React/TypeScript |
| Commands | Direct entry points into shared workflow operations | One implementation per operation, thin host aliases |
| Hooks | Lifecycle checkpointing, validation, and supported enforcement | Small common event model with host adapters |
| Rules | Compact common policy plus stack and project scope | No unrelated language packs |
| Memory | Durable task state and retrieved approved knowledge | Files and existing vaults, without a new service |
| Learning | Evidence-backed lesson and reusable-skill proposals | Reviewed promotion, no unattended shared-policy changes |
| Verification | Diagnose, repair, review, recheck, and report | Project-selected checks |
| Token optimization | Focused retrieval, model routing, bounded output and delegation | No mandatory hosted telemetry |
| Orchestration | Selective parallelism, ownership, integration, recovery | Configurable bounded concurrency |
| AgentShield/security | Inspect agent configuration and changed-code security | Local scans and supported integrations |

Before implementation, inventory the relevant ECC components at a pinned revision. Record each component's source, license, dependencies, planned reuse/adaptation, and harness mapping in the implementation plan. This audit must cover each category, not just the README feature list.

## Agents, skills, commands, and rules

Initial role responsibilities: context explorer, planner/architect, backend implementer, frontend implementer, code reviewer, security reviewer, build/test repairer, and verifier. Roles may share supporting procedures, but their responsibilities and input/output contracts are explicit. The main workflow acts as coordinator. A substantial change requires review from a context independent of its implementation where supported; inline review must be labeled as such.

Workflow skills cover requirements refinement/design, planning, execution, investigation/debugging, review, verification, resume, checkpointing, learning, and security audit. Small tasks can skip unnecessary artifacts through classification, not by bypassing context or verification requirements.

Logical command surface: start, design, plan, execute, investigate, review, verify, checkpoint, resume, learn, memory, security, and status. A main entry point routes ordinary requests. Harness-native commands or skill aliases expose these operations without duplicating workflow implementations. CLI administration includes install, update, doctor, and uninstall; uninstall removes only owned unchanged files and reports edited files.

Rules are packaged separately from detailed skills: common rules for context, scope, approvals, evidence, security, and knowledge ownership; scoped backend/frontend rules; and existing solution instructions. Keep the always-loaded common rules small. Explicit user instructions and host policy retain their authority; applicable solution rules govern project choices over generic Pegatus or upstream defaults. Surface unresolved conflicts instead of inventing a new precedence over host instructions.

## Hooks and lifecycle

Define shared lifecycle operations for session/task start, before consequential tool actions, after relevant edits/tool results, before context compaction or handoff, and task/session end. These operations load/reconcile state, check authorization where mechanically possible, invalidate stale verification, checkpoint progress, and collect learning candidates.

Adapters map operations to actual supported host events. Where an event is unavailable, expose the corresponding workflow/CLI operation and require explicit workflow calls. Doctor reports native, explicit-call, instruction-only, and unavailable capabilities for each host. Do not claim fallback instructions prevent arbitrary host actions.

Hook operations must be idempotent, fast, bounded, and limited to the relevant task. Preserve existing hook configuration. Avoid running a full test suite after every edit. Required security or state-validation failures stop the dependent Pegatus operation; optional collection failures are recorded without silently losing progress.

## Token optimization

Use instructed indexes and focused retrieval before reading large source trees. Load skill bodies and memory entries only when relevant; retain a compact catalog for discovery. Prefer source/evidence references over repeatedly embedding logs. Keep stable shared instructions separate from task-specific context so host caching can work where supported.

Configure fast, standard, and deep model/effort tiers per harness and role, using user-selected supported models rather than hardcoded names. Simple retrieval and command verification use cheaper tiers where available; architectural decisions and difficult reviews can use deeper tiers. Do not lower required verification or omit relevant context to save tokens.

Delegate with a compact brief containing instruction references, scope, relevant evidence, expected output, and ownership. Bound concurrency, tool output, retries, and optional exploration through configuration. Before compaction, persist decisions, approvals, unresolved questions, and next actions; resume retrieves these records.

Record available usage measurements with their source; mark unavailable measurements explicitly. Acceptance compares equivalent tasks for unnecessary repeated reads, duplicated prompts, and unbounded outputs rather than promising an unmeasured percentage saving.

## Parallelization and subagent orchestration

The coordinator builds a dependency graph from approved work. Dispatch only independent tasks with distinct file ownership or isolated Git worktrees. Shared interfaces are agreed before consumers run in parallel. Default maximum active workers is two, configurable and capped by host capability.

Each handoff states inputs, instruction locations, approved scope, owned paths, dependencies, required checks, and expected evidence. Workers report changed files, results, open issues, and knowledge candidates. Only the coordinator writes aggregate task progress; workers use separate records.

The coordinator integrates results, checks combined behavior, and dispatches independent review. Overlapping edits, failed dependencies, or changed interfaces halt affected tasks for reconciliation. Reuse existing worker context for bounded repair where supported. Checkpoint finished work and pending ownership before interruption; do not blindly redispatch completed work on resume.

## AgentShield and security

AgentShield is a planned pinned upstream integration, not a discarded optional core. Inspect its actual package/API, execution requirements, licensing, and compatibility during planning. Wrap local invocation and normalize findings for Pegatus. If it cannot support a target platform or configuration, record the gap and seek a reviewed equivalent implementation; do not advertise AgentShield equivalence without evidence.

Security has two tracks: agent configuration scanning (instructions, skills, hooks, permissions, MCP configuration, secrets, and suspicious injected instructions) and task-relevant changed-code review (authorization, validation, SQL injection, secret handling, dependencies, and other applicable .NET/frontend risks). AgentShield findings do not establish application-code security by themselves.

Provide a direct security command, install/update auditing, and pre-completion scanning of relevant changed agent configuration. Use explicit file scope; do not transmit solution contents to an external service by default. Findings include location, severity, evidence, remediation, and suppression provenance. A scanner failure is blocked/failed scanning, never a clean result. Unresolved critical findings block the affected Pegatus install or completion gate; exceptions require explicit recorded user disposition. No automatic destructive remediation.

External tool output, retrieved content, and learning candidates cannot grant permissions or override trusted instructions. Security checks supplement host permissions and cannot sandbox arbitrary actions in a host without enforcement support.

## Installation and configuration

Support both user-wide and project/workspace installation. User-wide installation supplies defaults; project configuration overrides those defaults. Workspace configuration identifies participating repositories and the commands appropriate to each repository.

Preserve existing instruction files, generators, unrelated installed skills, and user edits. Record installed versions, source revisions, and generated-file ownership. Explicit updates detect edited files and present conflicts instead of overwriting them silently. Avoid duplicate skill installations when project and user scopes overlap.

Use platform-neutral path handling and shell-aware command execution. Treat verification commands as explicitly configured executable commands, preserving their exit codes and working directories. Do not assume Bash exists on Windows or PowerShell exists on Linux.

An optional knowledge configuration identifies locations and discovery commands only when existing solution instructions do not already supply them. It must not override an instruction-defined discovery procedure.

## Adaptive workflow

| Work | Phases | Gate |
|---|---|---|
| Small, understood fix | Inspect, implement, verify, report | Proceed within authorized scope |
| Feature or architectural change | Inspect, design, plan, implement, review, verify, report | Explicit design and scope approval before implementation |
| Investigation | Gather evidence, explain findings, recommend next steps | Any subsequent implementation follows its applicable path |

Escalate classification when investigation reveals broader interfaces, data changes, or uncertainty. Do not require approval at every routine phase. Preserve granted approvals on resume, but seek approval for material scope changes.

Publishing, deployment, destructive database operations, and other consequential actions require explicit authorization unless the user has already authorized the particular action. Approval of a design does not imply deployment permission.

Small tasks remain inline. Substantial work may use focused implementers and reviewers. Parallel work is limited to independent tasks with explicit file ownership and integration checks.

## State and recovery

Store state at the project root or multi-repository workspace root:

```text
.pegatus/
  config.json
  work/<task-id>/
    brief.md
    spec.md             # when required
    plan.md             # when required
    progress.json
    report.md
    evidence/
    lessons/            # proposed durable knowledge
  memory/               # fallback knowledge when no external source exists
    index.md
    conventions.md
    decisions.md
```

Progress records the phase, classification, approved scope and gates, completed work, repository paths and branches, verification outcomes, and context references. Checkpoint after meaningful steps and before handoff. Persist state atomically; avoid simultaneous writers for the same task.

Resume reconciles recorded state against current files and Git state. It must identify changed branches, missing repositories, incomplete work, and evidence invalidated by later changes. Do not reset, stash, discard, or overwrite user work to force reconciliation. Pause dependent actions when a discrepancy cannot be resolved safely.

Progress is portable across the three harnesses. Transferring to another machine also requires the corresponding code and state files; saved progress alone does not transfer uncommitted code.

## Project knowledge and vaults

Solution instructions are the general integration point. CM is an example of this pattern, not a special integration target.

When a vault or another instructed knowledge source exists, it owns architecture, conventions, business flows, code maps, and approved project knowledge. Pegatus references that source without duplicating its content in a competing memory store. The workflow follows its query, freshness, and generation procedures. Obsidian need not be running.

Without an external knowledge source, use indexed Markdown in `.pegatus/memory/`. Load only relevant entries by task and file scope. No database or search service is required.

Agents automatically save task state and propose lessons with source-task references and evidence. Durable shared knowledge changes require human review. Approved lessons go to the existing authoritative knowledge source or fallback memory. Generated maps and indexes are updated using their owning tools; authored business knowledge is not silently rewritten.

## Memory persistence and continuous learning

Distinguish session recovery records, task evidence, approved durable knowledge, and unapproved learning candidates. Recovery includes a concise next-action summary written before supported compaction/end events or explicit checkpoint. Durable entries carry source task/evidence, applicable project and paths, approval state, and freshness information. Project business knowledge never becomes user-wide memory automatically.

Retrieve through solution-prescribed tools when present; otherwise use the fallback memory index. Validate branch-sensitive claims against current code. Supersede or retire outdated entries with traceable history rather than silently retaining contradictory guidance. Cleanup is explicit/configured, preserves approved knowledge and active tasks, and does not delete records merely because a session ended.

Learning lifecycle: observe verified outcomes and failures, propose a lesson with evidence and scope, deduplicate against existing knowledge, request human review, promote to the authoritative source, and revise/retire when contradicted. Recurring patterns can produce a proposed reusable skill or rule; promotion also requires approval and validation. Candidates may carry confidence and observation counts, but frequency alone does not make them authoritative.

The learn command supports listing, reviewing, approving, rejecting, and superseding candidates. Automatic observation must redact sensitive data and respect configured exclusions. Hooks aid collection where available; explicit workflow collection preserves the same lifecycle elsewhere.

## Stack guidance

Backend sources are restricted to these five plugin groups from https://github.com/dotnet/skills:

- dotnet
- dotnet-advanced
- dotnet-data
- dotnet-test
- dotnet-aspnetcore

Pin an upstream revision and retain skill content, supporting resources, attribution, and applicable license notices. Install the selected catalog with progressive task-relevant loading. Preserve reference dependencies; inspect host-specific agents and integrations rather than assuming portability. Detect unresolved cross-plugin references and report them before release; do not silently include additional plugin groups.

Respect actual target frameworks and package versions. The default guidance is .NET 10; skills must not introduce newer-framework APIs or migrate a project's test framework without authorization. Project-defined EF Core, SQL Server, and testing conventions take precedence over generic examples.

Frontend baseline: Vercel React best practices and composition patterns, with pinned sources and preserved supporting resources. Add a small Pegatus layer for React 19, TypeScript, and the project's actual tooling. Do not assume Next.js or impose a new frontend architecture.

## Verification and reporting

Project configuration defines build, lint, type-check, and test commands, their working directories, and prerequisites. Select checks proportionate to changes and honor required solution checks. Record command, exit code, relevant output, and the code state verified.

Results distinguish passed, failed, skipped, and blocked verification. Missing Docker or other prerequisites cannot become a passing result. Verification evidence must support completion claims. A report identifies changes, results, unresolved limitations, and pending knowledge proposals.

Verification is a loop: establish applicable baseline, implement, run affected checks, classify failures, diagnose before repair, repair within approved scope, review, and rerun affected checks plus required integration gates. Pre-existing failures are recorded separately and cannot be attributed to the change without evidence. New edits invalidate relevant earlier results.

Allow at most three repair rounds by default, configurable per project. Stop for unchanged recurring failures, missing prerequisites, material scope expansion, or security blockers, preserving evidence and the next action. Completion requires applicable checks to pass or explicit recorded acceptance of specific outstanding limitations; it must never describe blocked or failed checks as passing. Reports include final code-state provenance and remaining risks.

Do not commit secrets or unrestricted environment output into evidence. Shared work records and knowledge may be versioned; temporary files and bulky logs have explicit ignore guidance. Pegatus does not automatically create or push a separate state repository.

## Acceptance conditions

1. Project/workspace and user-wide installs work on Windows and Linux, preserve user edits, and report update conflicts.
2. Each target harness completes a practical small-fix run and a gated-feature run. Generated adapter files alone are insufficient proof.
3. Requirements refinement consults an instructed business flow before asking detailed questions; implementation and review follow instructed indexes and conventions.
4. A project without a vault completes the same workflow using `.pegatus/` state and fallback knowledge.
5. An interrupted task resumes in another harness without losing completed work or re-requesting unchanged approvals; branch mismatches are detected.
6. Verification failures and missing prerequisites are accurately reflected in reports.
7. A proposed lesson remains separate from shared knowledge until approved, then updates the authoritative source without duplication.
8. Selected upstream packs retain resources and version provenance; incompatible API guidance and missing references are detected.
9. Delegation respects scope and instruction context; unsupported capabilities have documented fallback behavior.
10. Each ECC core category has a source-to-Pegatus mapping and a working first-release entry point; lighter packaging does not remove a category.
11. Rules and logical commands resolve to shared procedures without duplicated conflicting instructions.
12. Lifecycle hooks and explicit fallbacks preserve checkpoints, invalidate affected evidence, and report enforcement limits in doctor output.
13. Equivalent-task trials show focused retrieval and bounded delegation; usage claims distinguish measured values from unavailable data.
14. Parallel tasks respect ownership, survive interruption, and pass combined integration checks; an overlapping-edit fixture triggers reconciliation.
15. AgentShield integration or an explicitly reviewed compatibility replacement scans supported configuration on Windows and Linux; injected/secrets fixtures produce findings and scanner failure cannot report success.
16. Verification repairs a controlled failure, reruns invalidated checks, and stops after its configured retry limit.
17. Learning candidates remain untrusted until approved; deduplication, scope isolation, superseding stale knowledge, and recovery after compaction are exercised.

Test the CLI's installation, configuration resolution, state transitions, atomic checkpoints, reconciliation, evidence handling, and adapter outputs. Use controlled fixtures and practical harness acceptance checks for behavior that unit tests cannot establish.

## Implementation handoff

This spec defines the first-release contract, not an implementation plan. After written-spec approval, produce a dependency-ordered plan covering the ECC component audit, core, catalogs and rules, hooks, persistence and learning, token optimization, orchestration, AgentShield/security, source packaging, adapters, project-context integration, and acceptance proof. Select concrete runtime minimums, schema fields, host command syntax, and tested host versions in that plan based on repository and upstream inspection. Unsupported upstream dependencies or host features require explicit design amendments; they cannot silently remove a required category.

References:
- ECC: https://github.com/affaan-m/ECC
- ECC lifecycle hooks: https://github.com/affaan-m/ECC/blob/main/hooks/hooks.json
- ECC agent orchestration rules: https://github.com/affaan-m/ECC/blob/main/rules/common/agents.md
- ECC security rules: https://github.com/affaan-m/ECC/blob/main/rules/common/security.md
- .NET skills: https://github.com/dotnet/skills
- V1 reference: C:/Workspace/PegatusAgentic
- Example solution knowledge structure: C:/Workspace/CM
