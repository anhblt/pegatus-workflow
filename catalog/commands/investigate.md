---
name: command-investigate
description: Thin investigate entry point.
---

First read applicable solution instructions and task context using [the context protocol](../context-protocol.md). Delegate to [pegatus-investigate](../skills/pegatus-investigate/SKILL.md) with the same task, scope and saved approvals. No duplicate workflow implementation; no additional authorization. The command is a host alias to the shared skill, not a claim that every CLI workflow operation is mechanically implemented.
