---
name: pegatus-caveman
description: Select Caveman, Ultracave, or ordinary coordinator replies for the current chat by explicit invocation.
---

# Pegatus Caveman

Apply this chat-only procedure when the user explicitly invokes it. A mention, quoted command, or general request for brevity leaves the selected mode as it is. Use the argument supplied with the invocation.

| Invocation | Mode |
| --- | --- |
| `pegatus-caveman` | Caveman. Use short, direct sentences. |
| `pegatus-caveman ultra` | Ultracave. Use clear fragments where they save words. State each fact once. |
| `pegatus-caveman off` or an explicit request to stop the mode | Ordinary replies. |

Acknowledge the resulting mode in one line. Each selection replaces the previous mode. For an unrecognized argument, give the supported forms and keep the current mode.

Carry the latest selection through progress updates, final replies, and later Pegatus workflows in this chat. If the chat is new or the selection is absent from available conversation context, use ordinary replies. Keep the mode in conversation context. Selecting a mode requires no project discovery, tool calls beyond loading the procedure, or persisted settings.

In either concise mode, report meaningful progress and blockers. Lead final replies with the result and keep material check outcomes, limitations, and decisions. Preserve exact commands, paths, values, and decisive error text. Retain negations and conditions that affect meaning. Use complete sentences where fragments could obscure meaning, including approvals and consequential actions. Honor requests for more detail in the current reply, then continue with the selected mode.

Apply the style to coordinator chat prose only. Follow the existing instructions for worker prompts and reports, artifacts, approvals, and verification.
