---
watermark: true
title: getPlayingProcesses
icon: fa6-solid:code
---

# getPlayingProcesses

:::info
`getPlayingProcesses` returns a list of processes that currently have audio sessions on the system. It uses WASAPI audio session enumeration to discover which applications are producing (or have recently produced) audio. Returns an array of [AudioProcessInfo](audio-process-info.md) objects.
:::

## Signature

```typescript
function getPlayingProcesses(activeOnly?: boolean): AudioProcessInfo[]
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `activeOnly` | `boolean` | `true` (default) to return only processes actively playing audio. `false` to return all processes with audio sessions, including inactive and expired ones. |

## Usage

Call `getPlayingProcesses` to discover which applications are currently producing audio. This is typically the first step before calling [start](start.md) to analyze a specific process. Typical workflow:

1. Call `getPlayingProcesses()` to get active audio processes.
2. Let the user select a process (or pick one automatically).
3. Pass the selected `processId` to [start](start.md) to begin analysis.

:::tip
Use `getPlayingProcesses(true)` (the default) for a clean list of actively playing processes. Use `getPlayingProcesses(false)` when you need to show all audio sessions, including paused players.
:::

:::note
This is a synchronous call that queries the Windows audio session enumerator via a native .NET EXE. The call is fast but should not be made in a tight loop — cache the result and re-query when needed.
:::

## Return Value

Returns an array of [AudioProcessInfo](audio-process-info.md) objects. The array is empty if no audio sessions are found.

| Type | Description |
|------|-------------|
| [AudioProcessInfo](audio-process-info.md)`[]` | Array of processes with audio sessions. |

:::warning
The returned list is a snapshot at the time of the call. Processes may start or stop audio sessions between queries. If the user takes time to select a process, re-query before calling [start](start.md) to verify the process still has an active session.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getPlayingProcesses, AudioProcessInfo } from '@eisland/windows-volume-analyzer';

// Get only actively playing processes
const active: AudioProcessInfo[] = getPlayingProcesses();

if (active.length === 0) {
  console.log('No audio processes found');
} else {
  console.log(`${active.length} audio process(es):`);
  for (const proc of active) {
    const label = proc.displayName ?? proc.processName ?? `PID ${proc.processId}`;
    console.log(`  ${label} [${proc.state}] — PID ${proc.processId}`);
  }
}

// Get all audio sessions (including paused)
const all: AudioProcessInfo[] = getPlayingProcesses(false);
console.log(`Total sessions: ${all.length}`);
```

@tab JavaScript

```js
const { getPlayingProcesses } = require('@eisland/windows-volume-analyzer');

// Get only actively playing processes
const active = getPlayingProcesses();

if (active.length === 0) {
  console.log('No audio processes found');
} else {
  console.log(`${active.length} audio process(es):`);
  for (const proc of active) {
    const label = proc.displayName ?? proc.processName ?? `PID ${proc.processId}`;
    console.log(`  ${label} [${proc.state}] — PID ${proc.processId}`);
  }
}

// Get all audio sessions (including paused)
const all = getPlayingProcesses(false);
console.log(`Total sessions: ${all.length}`);
```

:::

## Notes

:::note
The function returns processes with WASAPI audio sessions, not processes that are currently outputting sound. A paused media player still has an audio session but is not actively producing audio. Use the default `activeOnly: true` to filter these out.
:::

:::tip
Use `displayName` for user-facing labels — it is typically more descriptive than `processName`. For example, a browser may show the tab title as the display name.
:::

:::important
This function requires the native .NET EXE to be built. If the EXE is not found, the function returns an empty array. Ensure `npm run build` has been run for the plugin before calling this function.
:::

## Danger Avoidance

:::danger
Do not cache the result of `getPlayingProcesses` for extended periods. Process IDs can be reused after a process exits. If you cache a PID and the process exits, calling [start](start.md) with the stale PID may analyze the wrong process or fail. Re-query before starting a new analysis session.
:::

:::danger
Do not call `getPlayingProcesses` in a rapid loop (e.g. every frame). Each call spawns a native process and queries the Windows audio session enumerator. For continuous monitoring, call it once every few seconds or on user interaction.
:::
