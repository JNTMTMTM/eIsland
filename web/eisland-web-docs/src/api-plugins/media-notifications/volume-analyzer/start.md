---
watermark: true
title: start
icon: fa6-solid:code
---

# start

:::info
`start` initiates audio analysis for a specific process by its Windows process ID. It spawns a native capture process that hooks into the target process's audio output via WASAPI loopback, producing real-time frequency, amplitude, and beat data. Returns a [CommandResult](command-result.md) indicating success or failure.
:::

## Signature

```typescript
function start(processId: number, includeProcessTree?: boolean): CommandResult
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `processId` | `number` | Windows process ID (PID) of the target application. Must be a positive 32-bit integer. |
| `includeProcessTree` | `boolean` | Whether to include audio from child processes. Defaults to `true` if omitted. |

## Usage

Call `start` to begin analyzing a specific process's audio output. Typical workflow:

1. Call [getPlayingProcesses](get-playing-processes.md) to discover processes with active audio sessions.
2. Select a target process from the list.
3. Call `start(processId)` to begin analysis.
4. Use [getResult](get-result.md) or [startPolling](start-polling.md) to consume the analysis data.
5. Call [stop](stop.md) when done.

:::note
If an analysis session is already running when `start` is called, the existing session is automatically stopped before the new one begins. You do not need to call [stop](stop.md) explicitly between sessions.
:::

:::tip
Use [getPlayingProcesses](get-playing-processes.md) to find valid process IDs. Passing an invalid or exited PID will return `success: false` with an appropriate error message.
:::

## Return Value

Returns a [CommandResult](command-result.md) object.

| Type | Description |
|------|-------------|
| [CommandResult](command-result.md) | `{ success: true, error: null }` on success, `{ success: false, error: string }` on failure. |

:::warning
A `success: true` result means the capture process was spawned successfully. It does not guarantee that the target process is producing audio. Use [getStatus](get-status.md) or check [AudioAnalysisResult.error](audio-analysis-result.md) to verify the analyzer is functioning.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getPlayingProcesses, start, getResult, stop } from '@eisland/windows-volume-analyzer';

// Find a process playing audio
const processes = getPlayingProcesses();
if (processes.length === 0) {
  console.log('No audio processes found');
} else {
  const target = processes[0];
  console.log(`Analyzing: ${target.processName} (PID: ${target.processId})`);

  // Start analysis
  const result = start(target.processId);
  if (result.success) {
    // Read the latest analysis
    const analysis = getResult();
    console.log(`Dominant: ${analysis.frequency.dominantHz.toFixed(1)} Hz`);
    console.log(`Volume: ${(analysis.amplitude.rms * 100).toFixed(0)}%`);

    // Stop when done
    stop();
  } else {
    console.error(`Failed: ${result.error}`);
  }
}
```

@tab JavaScript

```js
const { getPlayingProcesses, start, getResult, stop } = require('@eisland/windows-volume-analyzer');

// Find a process playing audio
const processes = getPlayingProcesses();
if (processes.length === 0) {
  console.log('No audio processes found');
} else {
  const target = processes[0];
  console.log(`Analyzing: ${target.processName} (PID: ${target.processId})`);

  // Start analysis
  const result = start(target.processId);
  if (result.success) {
    // Read the latest analysis
    const analysis = getResult();
    console.log(`Dominant: ${analysis.frequency.dominantHz.toFixed(1)} Hz`);
    console.log(`Volume: ${(analysis.amplitude.rms * 100).toFixed(0)}%`);

    // Stop when done
    stop();
  } else {
    console.error(`Failed: ${result.error}`);
  }
}
```

:::

## Notes

:::note
The `includeProcessTree` parameter defaults to `true`, meaning audio from child processes of the target is also captured. Set it to `false` to analyze only the specified process's audio output.
:::

:::tip
Use [startEx](start-ex.md) as an alternative when you need to explicitly pass `includeProcessTree` as a required parameter. Both functions produce identical results.
:::

:::important
The native capture process runs as a child process of your application. It consumes CPU and memory proportional to the audio complexity. Always call [stop](stop.md) when analysis is no longer needed to free resources.
:::

## Danger Avoidance

:::danger
Do not call `start` with an arbitrary PID without first verifying it belongs to a valid audio-producing process. Starting analysis on a non-existent or non-audio process wastes resources and may produce empty or error results. Use [getPlayingProcesses](get-playing-processes.md) to discover valid targets.
:::

:::danger
Do not forget to call [stop](stop.md) when done. The native capture process continues running until explicitly stopped or your application exits. In long-running applications, this leads to resource leaks.
:::
