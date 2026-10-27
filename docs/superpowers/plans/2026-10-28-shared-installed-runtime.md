# Shared Installed Runtime Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Share one detached dependency-bearing runtime across hosts with identical source content.

**Architecture:** Content-addressed snapshots have separate manifests; schema-2 host ownership refers to a snapshot. Existing journal/CAS transactions cover snapshot and host changes under a root-wide mutex that also excludes legacy writers. Compatibility launchers preserve documented host CLI paths.

**Tech Stack:** Node.js >=22 ESM, built-in filesystem/crypto/test modules; unchanged dependencies.

**Spec:** `docs/superpowers/specs/2026-10-27-shared-installed-runtime-design.md`

## Global Constraints

- Projects remain self-contained; do not use an external runtime or symlinks.
- Preserve original source bytes, locks, notices, project instructions, task state and unrelated changes.
- Preview remains read-only; real apply retains security, containment, CAS and recoverability.
- Preserve mixed legacy/shared installations, independent host updates and project/user inheritance.
- Commit only this task on `feat/shared-installed-runtime`; do not push.

## Review Focus

- Last-consumer cleanup must preserve foreign/edited bytes and another host's snapshot.
- Recovery and concurrent legacy writers must never expose dangling host references.
- Same-version source edits must generate a new ID while destination roots/model choices do not.
- Inherited overrides must consume the installed user snapshot and block changed user ownership.
- Cached session snapshots must not bypass live destination validation or desired-byte scanning.

### Task 1: Snapshot identity and ownership

**Files:** `src/install/runtime.mjs`, `src/install/ownership.mjs`, `tests/shared-runtime.test.mjs`.

**Interfaces:** `createRuntimeSnapshot(catalog)` returns `{id,path,descriptor,operations}`; descriptor contains `{id,manifestHash}`. `readRuntime(root,descriptor)` returns verified-shape owned files with actual hashes. `readOwnership(root,host,{expandRuntime=true})` supports legacy and schema-2 records.

- [x] Write/run failing tests for deterministic identity, different same-version bytes, invalid manifests and unsafe metadata paths.
- [x] Implement snapshot manifests and schema-2 ownership expansion with strict containment/hash checks.
- [x] Run focused snapshot/ownership tests; expected all pass.

### Task 2: Shared transaction and administration

**Files:** `src/install/apply.mjs`, `src/install/admin.mjs`, `src/adapters/capabilities.mjs`, `src/security/agentshield.mjs`, installation/dependency tests.

**Interfaces:** `generateHost` accepts optional `runtimePath`; `planInstall` retains its public shape with optional `runtime`, `hostOwned`, `expectedLocks`. Apply journals shared changes and records only host files plus snapshot reference in schema-2 host locks.

- [x] Write/run failing integration tests for sharing, independent updates, legacy migration, compatibility CLI, last-consumer removal and foreign/edited conflicts.
- [x] Add root serialization, all-host lock CAS and recovery exclusion; extend journaling without changing legacy schema-1 recovery.
- [x] Route administration through snapshots, preserving inherited overrides and doctor output. Runtime reuse verifies actual bytes; deletion checks foreign files.
- [x] Add/run recovery, simultaneous writer, malformed peer ownership and changed-runtime tests; expected all pass.
- [x] Update existing tests that intentionally inspected legacy deep runtime paths to resolve installed snapshot metadata. Keep tests for historical CLI/context compatibility.

### Task 3: Session preparation and installed inspection

**Files:** `src/install/admin.mjs`, `src/install/setup.mjs`, `src/install/uninstall.mjs`, focused setup tests.

**Interfaces:** `createAdministrationSession()` returns a scoped administration callback using one immutable source snapshot; `runAdministration` remains the public single-call API. Doctor loads installed manifests without traversing prepared source dependencies.

- [x] Write/run failing tests for one preparation per session and source-dependency-independent doctor.
- [x] Wire guided setup/uninstall defaults to a scoped session, preserving injected test callbacks.
- [x] Prove preview has no writes/scans and session reuse still rejects edited live destinations.

### Task 4: Verification, documentation and commit

**Files:** README, installation guide, design/plan evidence and affected tests.

- [x] Run all focused installation/setup/security/dependency regressions, then `npm test`, lint, package dry-run and whitespace checks.
- [x] Run disposable real three-host installation timing and installed CLI checks; record byte/file counts and security coverage limits.
- [x] Update public installation/ownership/migration documentation and measured evidence.
- [x] Obtain fresh whole-change review and fix important findings with regression evidence.
- [x] Stage task changes while excluding the saved pre-existing patch; inspect staged content, commit, and verify remaining worktree changes equal the pre-existing changes. Do not push.

## Final evidence

- Frozen final implementation: `npm test -- --test-concurrency=6` passed 335/335 tests in 415.7 seconds. This includes grouped preview/apply guards.
- Earlier runs: first 331/332 (obsolete end-to-end deep path assertion); corrected second 332/332 before the final grouped-preview fix. They are superseded by the final run.
- Final catalog lint passed with the existing Vercel distribution-notice warning. Package dry-run passed, 2,671 entries, with tests and scratch evidence excluded. Whitespace checks passed.
- Fresh reviews: three original important findings fixed with watched regressions and clean scoped rereview; final grouped-preview correction reviewed with no important findings.
- Real install timing and detached/installed scanner evidence are in the design document. Timing predates the narrow grouped-preview fix and is explicitly snapshot-specific. No native host or release qualification is claimed.
- Pre-existing changes in README, installation guide, adapter alias generation and adapter tests are preserved outside this task's commit using a saved baseline and three-way index subtraction. Verification used the working checkout including those existing changes.
- Ruling: grouped previews use projected consumer references only for read-only cleanup planning; live apply ignores projections and blocks additional planned paths outside the approved preview. Existing automatic recovery remains separate.
- Integration: keep the new local branch, commit the task, and do not push, as explicitly requested.
