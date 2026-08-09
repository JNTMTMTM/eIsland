---
watermark: true
title: startPolling
icon: fa6-solid:code
---

# startPolling

:::info
`startPolling` starts a timer that periodically reads the latest analysis result and delivers it to a callback function. This is the recommended way to consume continuous audio analysis data without manually calling [getResult](get-result.md) in a loop.
:::

## Signature

```typescript
function startPolling(
  intervalMs: number,
  onUpdate: (result: AudioAnalysisResult) => void,
  onError?: (err: Error) => void
): void
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `intervalMs` | `number` | Polling interval in milliseconds. Minimum value is `16` (approximately 60fps). Values below 16 are clamped. |
| `onUpdate` | `(result: AudioAnalysisResult) => void` | Callback invoked on each tick with the latest [AudioAnalysisResult](audio-analysis-result.md). |
| `onError` | `(err: Error) => void` | Optional callback invoked if an error occurs during polling. |

## Usage

Call `startPolling` after [start](start.md) to receive continuous analysis updates. Typical workflow:

1. Call [start](start.md)`(processId)` to begin capture.
2. Call `startPolling(interval, onUpdate)` to receive results.
3. Process each result in the `onUpdate` callback (e.g. update UI).
4. Call [stop](stop.md) when done (automatically stops polling).

:::note
Calling `startPolling` while polling is already active replaces the existing timer and callbacks. You do not need to call [stopPolling](stop-polling.md) before restarting.
:::

:::tip
For smooth visualizations, use `intervalMs: 16` (60fps) or `intervalMs: 33` (30fps). Higher values reduce CPU usage but make visualizations less responsive. For simple BPM displays, `intervalMs: 100` is sufficient.
:::

## Return Value

This function returns `void`.

:::warning
The `onUpdate` callback receives the same cached result object on each tick. If you need to compare values across frames, copy the relevant fields to local variables inside the callback.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { start, startPolling, stop, AudioAnalysisResult } from '@eisland/windows-volume-analyzer';

// Start capture
start(12345);

// Poll at 60fps for smooth visualization
startPolling(
  16,
  (result: AudioAnalysisResult) => {
    if (result.error) {
      console.error(`Analysis error: ${result.error}`);
      return;
    }

    // Update frequency bars
    const spectrum = result.frequency.spectrum;
    console.log(`Bins: ${spectrum.length}, RMS: ${result.amplitude.rms.toFixed(3)}`);

    // React to beats
    if (result.beat.isBeat) {
      console.log(`Beat! BPM: ${result.beat.bpm.toFixed(0)}`);
    }
  },
  (err: Error) => {
    console.error('Polling error:', err.message);
  }
);

// Later, stop everything
stop();
```

@tab JavaScript

```js
const { start, startPolling, stop } = require('@eisland/windows-volume-analyzer');

// Start capture
start(12345);

// Poll at 60fps for smooth visualization
startPolling(
  16,
  (result) => {
    if (result.error) {
      console.error(`Analysis error: ${result.error}`);
      return;
    }

    // Update frequency bars
    const spectrum = result.frequency.spectrum;
    console.log(`Bins: ${spectrum.length}, RMS: ${result.amplitude.rms.toFixed(3)}`);

    // React to beats
    if (result.beat.isBeat) {
      console.log(`Beat! BPM: ${result.beat.bpm.toFixed(0)}`);
    }
  },
  (err) => {
    console.error('Polling error:', err.message);
  }
);

// Later, stop everything
stop();
```

:::

## Notes

:::note
Polling uses `setInterval` internally. The actual interval may drift depending on your application's event loop load. Do not rely on precise timing for frame-accurate synchronization.
:::

:::tip
If you only need occasional updates (e.g. a BPM display that refreshes once per second), use a higher `intervalMs` value (e.g. `1000`). This reduces CPU usage compared to polling at 60fps and discarding most frames.
:::

:::important
The `onUpdate` callback runs on the main thread. If your callback performs heavy computation (e.g. FFT visualization rendering), consider deferring the work to `requestAnimationFrame` or a Web Worker to avoid blocking the event loop.
:::

## Danger Avoidance

:::danger
Do not call [getResult](get-result.md) inside the `onUpdate` callback — the result is already provided as the callback parameter. Calling `getResult` again is redundant and wastes CPU.
:::

:::danger
Do not forget to stop polling. While [stop](stop.md) automatically calls [stopPolling](stop-polling.md), if you only call [stopPolling](stop-polling.md) without [stop](stop.md), the native capture process continues running and consuming resources.
:::
