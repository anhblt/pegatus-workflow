# Shared installed runtime

Status: approved for implementation on 2026-10-28. Implemented on the local
`feat/shared-installed-runtime` branch; verification evidence follows below.

## Intent and explicit choice

Reduce installation time and duplicated files. The user chose to keep projects
self-contained and share one runtime across hosts. Projects must continue to work
when the original Pegatus checkout is moved or deleted. No external/global runtime,
symlinks, new dependencies, publication, or dependency-lock changes are required.

The details below are proposed implementation decisions, not additional user choices.

## Current behavior and measured baseline

`src/install/admin.mjs` builds a full runtime catalog, including prepared locked
dependencies. `src/adapters/capabilities.mjs` copies it beneath
`.pegatus/runtime/<host>/`. This supports detached execution and separate host
ownership; separate copies are not required by Node.js. Dependencies support the
pinned `ecc-agentshield@1.6.0` scanner and its transitive graph. The CLI also provides
state, learning, hooks, configuration and other documented operations.

A disposable Windows/Node v24.19.0 installation of this working checkout measured:

| Item | Result |
| --- | --- |
| Runtime per host | 2,640 files; 21,780,511 bytes |
| Dependencies per host | 61 packages; 2,275 files; 19,445,305 bytes |
| Claude preview / apply / doctor | 44.531 s / 63.042 s / 5.189 s |
| Codex preview / apply / doctor | 5.483 s / 65.558 s / 4.833 s |
| Antigravity preview / apply / doctor | 5.299 s / 62.450 s / 5.512 s |
| Security preflight within apply | Claude 1.935 s; Codex 1.793 s; Antigravity 1.180 s |

All three installs and doctor calls passed; doctor reported unchanged owned files.
Normalized runtime path/hash manifests were identical for all three hosts. These
are administration results, not native host trials. Antigravity had zero native
scanner files; its coverage was supplemental static coverage, not a native scan.

The first preview was much slower than subsequent previews; these are single-run
observations, not a controlled cold/warm benchmark or a promised speedup. Each
administration call reloads the source graph. Apply repeatedly checks containment,
case collisions and hashes, stages rollback data and writes files atomically.
The wizard invokes preview, apply and doctor separately for every host.

With identical runtime content, three hosts currently duplicate about 43.6 MB and
5,280 runtime files beyond the one required copy. These are logical file sizes,
not filesystem allocation measurements. Native host behavior is not tested here.

## Runtime layout and version coexistence

Store the complete runtime at `.pegatus/runtime/shared/<content-id>/`. Derive the
content ID from a deterministic manifest of sorted relative paths and SHA-256
hashes of every included file, including prepared dependencies and source locks.
Version strings alone cannot identify a snapshot: this candidate can change
without a version bump. Do not include host configuration or destination paths
in this identity. Preserve upstream bytes, resource closure and notices.

All hosts installed from identical content reference the same snapshot. A host
update may reference a new snapshot without changing another host's runtime.
Several snapshots may temporarily coexist during mixed-version updates. This
preserves independent host updates rather than silently upgrading every host.

Host wrappers stay in existing discovery locations and link directly to their
selected snapshot. Host model/effort configuration stays in host wrappers or
existing override packets; it does not produce another runtime copy. Task state,
configuration and reviewed learning retain their current locations and semantics.
Do not add a target project's npm dependency or copy its application dependencies.

## Ownership, transactions and removal

Introduce a separately owned runtime manifest for each snapshot, containing its
identity, version, provenance and complete file hashes. A versioned host ownership
record owns host wrappers and records the referenced snapshot and manifest hash.
Host locks, not an independently mutable reference counter, determine consumers.
Legacy schema-1 records remain readable for inspection, recovery and migration;
an unknown or inconsistent schema blocks mutation with a repair explanation.

Use a root-wide administration mutex and recoverable transaction spanning runtime
creation, host wrapper changes, host ownership and snapshot manifests. Serialize
with legacy host writers as well: an active legacy busy record or pending journal
blocks new mutation. Retain stale-writer handling and explicit recovery checks;
do not delete locks based only on age. Installation must not expose wrappers
pointing at a partial snapshot. Rollback restores the previous usable references.

Before reusing a snapshot, validate its manifest and actual owned files. Matching
content IDs or version strings alone are insufficient. An edited/missing runtime
blocks dependent operations with a precise conflict; never overwrite it silently.
Uninstall removes one host's owned wrappers and compatibility files first. Remove
a snapshot only when no remaining host ownership record references it and all its
owned bytes are unchanged. Unreadable/unknown ownership, foreign files, edited
bytes or pending recovery block affected cleanup; retain the runtime and explain
the condition. Preserve unrelated files, state, knowledge and configuration.

User-scope installs use the same sharing inside their explicit user root. Existing
project inheritance and role override behavior remains supported, with identity
and integrity comparisons using the selected shared snapshot. Do not share across
different project roots implicitly.

## Existing installations and documented paths

Normal preview/update must describe the migration before apply. Validate old host
ownership and bytes before removing that host's duplicate runtime. Migrate hosts
individually: unmigrated hosts retain their independent legacy runtime until their
own update. Never adopt or remove a foreign runtime simply because bytes match.

Preserve documented historical commands such as
`.pegatus/runtime/codex/bin/pegatus.mjs` with a tiny owned host-specific dispatcher
that resolves the host's installed snapshot locally. Preserve the documented
`catalog/context-protocol.md` location with a small forwarding document. These
compatibility files contain no copied modules or `node_modules`. New generated
wrappers and activation snippets use the shared snapshot directly. Include the
same compatibility paths on fresh installs so documented commands remain stable.
Dispatchers preserve arguments, working directory, exit codes and detached module
resolution; reject missing/inconsistent ownership instead of using another host.

Existing user-maintained instructions and hook registration files are never edited.
Document that arbitrary manually saved deep resource paths require updating;
only the documented CLI and context-protocol paths receive compatibility files.
Migration preview lists removed legacy paths and replacement references. No force
cleanup, implicit uninstall/reinstall, or host permission changes are introduced.

## Installation work reduction

Prepare one immutable source snapshot per guided administration session and reuse
its bytes and pure host-independent derivations across selected hosts. Preview
must remain read-only and apply must scan the approved desired configuration.
Apply rechecks live destination ownership, containment and concurrent edits; a
session snapshot is not permission to trust stale destination state. New processes
prepare their own snapshots; no persistent unchecked filesystem cache is added.

Do not rebuild/copy the dependency-bearing source graph solely to inspect installed
file health in doctor. Use installed ownership/manifests for installed integrity;
load only the source metadata necessary for existing requested-configuration and
update-required reporting. Preserve doctor result contracts and inherited paths.

Reuse an existing verified snapshot without rewriting its files. Scan the desired
host configuration and relevant runtime configuration with explicit coverage;
sharing cannot bypass security gates or turn zero scanned files into a clean
native scan. Keep scanner-supported and supplemental static coverage distinct.
First install still incurs one full runtime copy and safety checks. Later matching
hosts should write only their wrappers, compatibility files and ownership records.

## Acceptance and verification

- Three hosts from identical bytes produce exactly one dependency-bearing runtime;
  snapshot manifests prove identical content and host records identify consumers.
- Installed CLI, state operation and security checks work from a disposable project
  when source access is unavailable; resolution stays within the installed runtime.
- Removing one or two hosts leaves remaining hosts usable; the last consumer can
  remove only the unchanged owned snapshot. Foreign/edited files are preserved.
- Different runtime bytes with the same package version produce distinct snapshots.
  Updating one host preserves another host's previous usable snapshot.
- Fresh install, legacy migration, inherited user defaults and project overrides
  retain their documented contracts and compatibility CLI/context paths.
- Fault injection proves interruption recovery, rollback, CAS protection, and
  concurrent legacy/new writer exclusion across runtime and host metadata.
- A changed runtime, edited wrapper, path escape, symlink, case collision or invalid
  ownership record blocks affected mutation without losing user files.
- Repeat the disposable three-host timing with preview/apply/doctor and scanner
  time separated. Record source revision, cache/order conditions, counts, bytes,
  statuses and evidence boundaries. Do not promise a percentage time improvement.
- Run focused installation/security/setup/dependency regressions, then `npm test`,
  `npm run lint`, `npm pack --dry-run` and `git diff --check`. Keep temporary
  profiling artifacts out of distributed content. Native host and Linux acceptance
  remain separate qualification work; retain existing licensing/release limits.

The builder may choose module boundaries and exact metadata schema fields, provided
the identity, ownership, recovery, security and compatibility contracts above hold.
Implementation follows approval of this design and a dependency-ordered plan.

## Implementation evidence — 2026-10-28

The implementation uses separately owned snapshot manifests and schema-2 host
records, while retaining schema-1 recovery journals. Journal entries follow actual
mutation order: complete new snapshot, compatibility files/wrappers, host reference,
then obsolete files. Reverse recovery restores retired snapshot bytes before the
old host reference. A root-wide shared mutex plus all legacy host mutexes excludes
concurrent installers. Compatibility launchers validate the manifest hash before
loading the selected local CLI.

A real disposable Windows/Node v24.19.0 three-host installation measured:

| Host | Preview | Apply | Doctor | Files written |
| --- | --- | --- | --- | --- |
| Claude | 6.704 s | 73.742 s | 3.012 s | 2,714 |
| Codex | 4.640 s | 39.816 s | 3.017 s | 65 |
| Antigravity | 4.129 s | 41.419 s | 2.919 s | 25 |

All operations passed. The project contained exactly one dependency-bearing
snapshot: 2,642 files / 21,794,400 bytes. Dependencies remained 2,275 files /
19,445,305 bytes. Each historical host directory contained two compatibility files
totaling under 1.4 KB, with no `node_modules`. The first installation still copies
and checks the complete runtime; subsequent hosts reuse it but retain integrity
verification. These sequential warm-cache observations differ in cache/order and
source content from the baseline; no controlled percentage saving is claimed.
The measured working tree includes the pre-existing Claude alias changes, which
remain outside this task's commit. Host wrapper counts can differ without those
edits; shared runtime/dependency counts and ownership behavior are unaffected.
The profile predates the final grouped-preview correction below; exact byte sizes
and timing belong to that measured snapshot, rather than a post-correction rerun.

All three historical CLI paths ran successfully. A real installed CLI security
probe scanned one native configuration file with the bundled scanner and passed.
Claude/Codex install preflights discovered 15/9 native files respectively;
Antigravity used supplemental static coverage with zero native scanner files and
is not a native scan pass. Isolated integration fixtures also moved the source kit
away and successfully ran installed help/catalog lint through every host path.

Fresh code review found activation ordering, new-tree foreign-file detection and
manifest-validation gaps. Each was reproduced, fixed and covered by regressions;
the scoped rereview found no remaining important issues. Additional regressions
cover shared removal, mixed snapshots, legacy migration, live destination edits,
peer metadata conflicts, source-independent doctor and interrupted recovery.

A later grouped-preview regression reproduced unpreviewed last-consumer cleanup
when multiple hosts were selected. Read-only previews now project earlier selected
runtime references. Actual apply ignores those projections and rejects additional
planned writes/removals outside the approved preview. Grouped install/update,
uninstall and post-preview consumer-change regressions pass; independent review
found no important issues in this scope. Existing automatic recovery remains a
separate documented operation rather than a newly approved plan mutation.

The initial full suite passed 331/332; its sole failure was an end-to-end assertion
for the removed deep `runtime/claude/release.json` path. The test now resolves the
snapshot from ownership while retaining historical CLI lifecycle/security checks.
Final full-suite evidence is recorded in the implementation plan after completion.
The final frozen-source run passed 335/335 tests with concurrency 6, including the
grouped-preview regressions. Lint passed with the existing Vercel notice warning;
package dry-run contained 2,671 entries and excluded tests and scratch evidence.
Whitespace checks passed. These checks ran in the working checkout, preserving
the four pre-existing uncommitted files. Native host/OS acceptance and release
licensing remain open.
