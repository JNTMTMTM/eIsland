---
watermark: true
title: AudioAnalysisResult
icon: fa6-solid:table
---

# AudioAnalysisResult

:::info
`AudioAnalysisResult` is the complete output of the audio analysis engine. It bundles all three analysis dimensions — frequency, amplitude, and beat detection — into a single object. This is the return type of [getResult](get-result.md) and the callback payload of [startPolling](start-polling.md).
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `error` | `string \| null` | Error message from the analyzer, or `null` if analysis is running normally. |
| `frequency` | [FrequencyData](frequency-data.md) | Frequency spectrum analysis results. |
| `amplitude` | [AmplitudeData](amplitude-data.md) | Amplitude (loudness) analysis results. |
| `beat` | [BeatData](beat-data.md) | Beat detection results. |

:::note
When no analysis is active (before calling [start](start.md) or after calling [stop](stop.md)), `getResult()` returns a frozen empty result with `error: null`, empty `frequency.spectrum`, and all values at zero.
:::

## Usage

`AudioAnalysisResult` is the primary data structure you work with when consuming audio analysis data. Access it via:

- [getResult](get-result.md)`()` — synchronous one-shot read of the latest result
- [startPolling](start-polling.md)`(interval, callback)` — periodic delivery via callback

:::tip
Check the `error` field before processing the result. A non-null `error` indicates the analyzer encountered a problem (e.g. the target process exited). The remaining fields may still contain stale data from the last successful frame.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getResult, AudioAnalysisResult } from '@eisland/windows-volume-analyzer';

const result: AudioAnalysisResult = getResult();

// Check for errors
if (result.error) {
  console.error(`Analyzer error: ${result.error}`);
} else {
  // Frequency analysis
  console.log(`Dominant: ${result.frequency.dominantHz.toFixed(1)} Hz`);

  // Amplitude analysis
  console.log(`Volume: ${(result.amplitude.rms * 100).toFixed(0)}%`);

  // Beat detection
  if (result.beat.isBeat) {
    console.log(`Beat at ${result.beat.bpm.toFixed(0)} BPM`);
  }
}
```

@tab JavaScript

```js
const { getResult } = require('@eisland/windows-volume-analyzer');

const result = getResult();

// Check for errors
if (result.error) {
  console.error(`Analyzer error: ${result.error}`);
} else {
  // Frequency analysis
  console.log(`Dominant: ${result.frequency.dominantHz.toFixed(1)} Hz`);

  // Amplitude analysis
  console.log(`Volume: ${(result.amplitude.rms * 100).toFixed(0)}%`);

  // Beat detection
  if (result.beat.isBeat) {
    console.log(`Beat at ${result.beat.bpm.toFixed(0)} BPM`);
  }
}
```

:::

## Notes

:::note
The result object is updated in place as new analysis frames arrive. If you need to preserve a snapshot, copy the relevant fields before the next frame overwrites them.
:::

:::tip
For real-time visualizations, use [startPolling](start-polling.md) with an appropriate interval (16–50ms for smooth animations) rather than calling [getResult](get-result.md) in a `requestAnimationFrame` loop. Polling is more efficient and avoids redundant reads.
:::

:::important
The `error` field is specific to the analysis engine — it reports issues like the target process exiting or audio capture failures. It is not the same as the `error` event on the polling mechanism, which reports JavaScript-level errors.
:::

## Danger Avoidance

:::danger
Do not access `frequency.spectrum`, `amplitude.rms`, or `beat.bpm` without first checking `error`. When `error` is non-null, these fields may contain stale data from the last successful frame. Processing stale data can lead to incorrect visualizations or logic errors.
:::
