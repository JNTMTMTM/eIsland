---
watermark: true
title: Windows Processes Attacker
icon: skull-crossbones
---

# Windows Processes Attacker

`@eisland/windows-processes-attacker` · v26.0.0

Process termination utilities via C N-API native addon.

:::danger
`closeProcess` and `closeProcesses` forcibly terminate processes. Unsaved data in the target process will be lost. Use with caution.
:::

## Interfaces

| Interface | Description |
|-----------|-------------|
| [ProcessCloseResult](processes-attacker/process-close-result.md) | Process close operation result |
| [ProcessFailure](processes-attacker/process-failure.md) | Individual process failure info |

## Functions

| Function | Description |
|----------|-------------|
| [closeProcess](processes-attacker/close-process.md) | Terminate processes matching a target |
| [closeProcesses](processes-attacker/close-processes.md) | Terminate processes for multiple targets |
