# Task 2 report: CLI, configuration, and safe roots

## Result and interfaces

Implementation commit: `e8a0b78` (`feat: add Pegatus config and safe-root CLI contracts`). This report is committed separately.

- `resolveConfig({ user, project }) -> Config` recursively merges objects and replaces arrays. It returns independent values with `schemaVersion: 1`, `concurrency: 2`, `repairLimit: 3`, `repositories: []`, `knowledge: null`, `hostModels: {}`, and `evidenceExclusions: []` by default. Project values override user values. Repository entries are `{ id, path, verify }`; each verification entry requires `{ command, args, cwd, requires }`, with `shell` explicitly set to the shell executable name for shell commands. Repository paths and command working directories are relative to their owning root and may not escape it. `examples/config.json` is the schema example.
- `assertContained(root, target) -> Promise<string>` requires absolute paths and an existing directory root. It resolves existing ancestors, including junctions and symlinks, then returns the canonical target path or rejects escape. Missing descendants are allowed. Existing ancestors supply filesystem casing for the containment check.
- `main(argv, { cwd, home }) -> Promise<number>` provides help (0), rejects unknown operations (2), and reports recognized operations as unimplemented (2). This makes the CLI surface visible without claiming future commands work. `package.json` declares Node `>=22`, the `pegatus` bin, `test`, and `lint` scripts.

## Red and green evidence

Initial `node --test tests/config.test.mjs tests/paths.test.mjs tests/cli.test.mjs` returned exit 1 before implementation:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Workspace\PegatusAgenticV2\bin\pegatus.mjs'
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Workspace\PegatusAgenticV2\src\config.mjs'
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Workspace\PegatusAgenticV2\src\paths.mjs'
ℹ tests 3
ℹ pass 0
ℹ fail 3
```

The default-isolation regression was red before its fix:

```text
✖ resolved defaults do not share mutable arrays with later calls
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ [ { id: 'injected', path: 'outside', verify: [] } ]
- []
ℹ tests 6
ℹ pass 5
ℹ fail 1
```

The Windows drive-relative root case was red before its fix:

```text
✖ duplicate repository IDs and invalid roots are rejected
AssertionError [ERR_ASSERTION]: Missing expected exception.
ℹ tests 6
ℹ pass 5
ℹ fail 1
```

Final `npm test` returned exit 0 after the case-sensitive-path hardening:

```text
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 194.3854
```

`node bin/pegatus.mjs --help` returned exit 0 and printed the usage and operation list. The Windows junction fixture ran and passed; it was not skipped. `git diff --cached --check` returned exit 0.

## Outstanding work and qualification

`npm run lint` currently returns exit 1 from npm because its target, `node bin/pegatus.mjs catalog lint`, deliberately reports `Operation not implemented: catalog lint` (direct CLI exit 2). The catalog handler belongs to later tasks. No catalog validation result is claimed here. Linux and Windows directories with per-directory case sensitivity still need platform qualification; this task's filesystem tests ran on ordinary Windows. The CLI does not execute configured commands yet, so shell execution behavior is a downstream contract rather than a measured runtime result.
