---
watermark: true
title: AudioProcessInfo
icon: fa6-solid:table
---

# AudioProcessInfo

:::info
`AudioProcessInfo` represents a process that has an active audio session on the system. Returned by [getPlayingProcesses](get-playing-processes.md), it provides the process ID, name, session state, and display name. Use it to discover which applications are currently producing audio.
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `processId` | `number` | Windows process ID (PID). Pass this to [start](start.md) to begin analyzing this process's audio. |
| `processName` | `string \| null` | Process name without the `.exe` extension (e.g. `"Spotify"`). May be `null` if the process name cannot be resolved. |
| `state` | `'active' \| 'inactive' \| 'expired' \| 'unknown'` | Current audio session state. `'active'` means the process is actively playing audio. |
| `displayName` | `string \| null` | Human-readable display name of the audio session (e.g. `"Spotify Premium"`). May be `null` if the session does not provide a display name. |

:::note
The `state` field reflects the WASAPI audio session state: `'active'` means audio is currently playing, `'inactive'` means the session exists but is paused, `'expired'` means the session has ended, and `'unknown'` indicates an unrecognized state.
:::

## Usage

`AudioProcessInfo` objects are returned by [getPlayingProcesses](get-playing-processes.md). Use them to:

- Build a UI list of apps currently playing audio
- Let the user select a process to analyze
- Automatically detect and attach to the active audio source

:::tip
Filter for `state === 'active'` to show only processes that are currently producing audio. Use [getPlayingProcesses(true)](get-playing-processes.md) (the default) for the same result without post-processing.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getPlayingProcesses, AudioProcessInfo } from '@eisland/windows-volume-analyzer';

// Get all processes with audio sessions
const processes: AudioProcessInfo[] = getPlayingProcesses(false);

for (const proc of processes) {
  const label = proc.displayName ?? proc.processName ?? `PID ${proc.processId}`;
  console.log(`${label} [${proc.state}] (PID: ${proc.processId})`);
}

// Find the first actively playing process
const active: AudioProcessInfo | undefined = processes.find((p) => p.state === 'active');
if (active) {
  console.log(`Now playing: ${active.displayName ?? active.processName}`);
}
```

@tab JavaScript

```js
const { getPlayingProcesses } = require('@eisland/windows-volume-analyzer');

// Get all processes with audio sessions
const processes = getPlayingProcesses(false);

for (const proc of processes) {
  const label = proc.displayName ?? proc.processName ?? `PID ${proc.processId}`;
  console.log(`${label} [${proc.state}] (PID: ${proc.processId})`);
}

// Find the first actively playing process
const active = processes.find((p) => p.state === 'active');
if (active) {
  console.log(`Now playing: ${active.displayName ?? active.processName}`);
}
```

:::

## Notes

:::note
The `processId` is the Windows PID and is unique for the lifetime of the process. However, PIDs can be reused after a process exits. Always re-query [getPlayingProcesses](get-playing-processes.md) if significant time has passed before starting analysis.
:::

:::tip
Use `displayName` for user-facing labels — it is typically more descriptive than `processName`. Fall back to `processName` when `displayName` is `null`.
:::

:::important
The list returned by [getPlayingProcesses](get-playing-processes.md) is a snapshot at the time of the call. Processes may start or stop audio sessions between queries. For real-time tracking, poll the function periodically.
:::

## Danger Avoidance

:::danger
Do not cache `processId` values indefinitely. If the target process exits and a new process reuses the same PID, starting analysis on the stale PID will capture the wrong process's audio. Always re-query [getPlayingProcesses](get-playing-processes.md) before starting a new analysis session.
:::
