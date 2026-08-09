---
watermark: true
title: getResult
icon: fa6-solid:code
---

# getResult

:::info
`getResult` returns the most recent audio analysis snapshot from the running analyzer. It reads the latest [AudioAnalysisResult](audio-analysis-result.md) produced by the native capture process, including frequency spectrum, amplitude, and beat detection data. This is a synchronous one-shot read — it does not block or wait for new data.
:::

## Signature

```typescript
function getResult(): AudioAnalysisResult
```

## Parameters

This function takes no parameters.

## Usage

Call `getResult` whenever you need a point-in-time snapshot of the audio analysis. Common use cases:

- Rendering a frequency visualization in a `requestAnimationFrame` loop
- Reading the current BPM for a rhythm display
- Checking amplitude levels for a volume meter

For continuous updates, prefer [startPolling](start-polling.md) instead — it delivers results at a configurable interval without manual polling.

:::tip
If no analysis is active (before [start](start.md) or after [stop](stop.md)), `getResult` returns a frozen empty result with all values at zero. Check [getStatus](get-status.md) first to verify the analyzer is running.
:::

:::note
`getResult` reads the latest buffered result from the capture process. It does not trigger a new analysis frame. If called faster than the analyzer produces frames, repeated calls will return the same data.
:::

## Return Value

Returns an [AudioAnalysisResult](audio-analysis-result.md) object.

| Type | Description |
|------|-------------|
| [AudioAnalysisResult](audio-analysis-result.md) | The latest analysis result, or an empty default if no analysis is active. |

:::warning
When no analysis is active, the returned object is a frozen empty result. Modifying it will throw in strict mode. If you need to store the result, copy the relevant fields first.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { start, getResult, getStatus, AudioAnalysisResult } from '@eisland/windows-volume-analyzer';

// Start analysis on a process
start(12345);

// Read the latest result
const result: AudioAnalysisResult = getResult();

if (result.error) {
  console.error(`Error: ${result.error}`);
} else {
  // Frequency data
  console.log(`Dominant: ${result.frequency.dominantHz.toFixed(1)} Hz`);
  console.log(`Spectrum bins: ${result.frequency.spectrum.length}`);

  // Amplitude data
  console.log(`RMS: ${result.amplitude.rms.toFixed(3)}`);
  console.log(`Peak: ${result.amplitude.peak.toFixed(3)}`);

  // Beat data
  if (result.beat.isBeat) {
    console.log(`Beat! BPM: ${result.beat.bpm.toFixed(0)}`);
  }
}
```

@tab JavaScript

```js
const { start, getResult } = require('@eisland/windows-volume-analyzer');

// Start analysis on a process
start(12345);

// Read the latest result
const result = getResult();

if (result.error) {
  console.error(`Error: ${result.error}`);
} else {
  // Frequency data
  console.log(`Dominant: ${result.frequency.dominantHz.toFixed(1)} Hz`);
  console.log(`Spectrum bins: ${result.frequency.spectrum.length}`);

  // Amplitude data
  console.log(`RMS: ${result.amplitude.rms.toFixed(3)}`);
  console.log(`Peak: ${result.amplitude.peak.toFixed(3)}`);

  // Beat data
  if (result.beat.isBeat) {
    console.log(`Beat! BPM: ${result.beat.bpm.toFixed(0)}`);
  }
}
```

:::

## Notes

:::note
The result is updated asynchronously by the native capture process. The data you read is whatever was last produced — it may be slightly stale depending on the capture frame rate.
:::

:::tip
For real-time visualizations, call `getResult` inside a `requestAnimationFrame` loop or use [startPolling](start-polling.md) with a 16ms interval. Both approaches deliver smooth updates without excessive CPU usage.
:::

:::important
`getResult` returns the same object reference between calls (it is cached internally). If you need to compare values across frames, copy the relevant fields to local variables rather than comparing object references.
:::

## Danger Avoidance

:::danger
Do not call `getResult` in a tight loop (e.g. `while (true)`) without any delay. While the function is fast, it reads from an internal buffer that updates at the native capture rate. Tight loops waste CPU without getting newer data.
:::

:::danger
Do not assume `frequency.spectrum` is non-empty. When no audio is playing or the analyzer just started, the spectrum array may be empty. Always check `spectrum.length` before iterating or indexing.
:::
