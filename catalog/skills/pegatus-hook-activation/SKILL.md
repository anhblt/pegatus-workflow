---
name: pegatus-hook-activation
description: Use when the user asks to set up optional Pegatus hooks for an installed project host.
---

Follow applicable project instructions and identify the existing project root. Inspect `.pegatus/install-lock-claude.json`, `.pegatus/install-lock-codex.json`, and `.pegatus/install-lock-antigravity.json` in that root for installed host choices. Ask the user which installed host to configure. Antigravity native hooks are unsupported or unverified; explain that it uses explicit lifecycle operations.

For Claude or Codex, use that host's installed runtime and run `node <root>/.pegatus/runtime/<host>/bin/pegatus.mjs hook-activation --host <host> --root <root> --preview yes` with direct arguments. Show the target and proposed configuration to the user. Ask for confirmation before applying. Do not write or merge configuration yourself, bypass the preview, or treat a preview as activation. After confirmation invoke the same command with `--apply <token>` instead of `--preview yes`, using the exact token returned by preview. A stale preview, installation conflict, or failed security scan blocks apply; report the failure. Do not claim success from a preview.

After a successful or already-configured result, tell the user to restart the selected host and bind `PEGATUS_ROOT` and an existing `PEGATUS_TASK_ID` in the host process environment before starting a task. Callbacks are advisory; completion and authorization remain explicit gates. Native host support still requires live acceptance. Preserve other settings and permissions.
