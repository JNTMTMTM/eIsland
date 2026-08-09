---
watermark: true
title: FrequencyPeak
icon: fa6-solid:table
---

# FrequencyPeak

:::info
`FrequencyPeak` represents a single peak in the frequency spectrum of an analyzed audio stream. Each peak contains the frequency in Hertz and its corresponding magnitude. Peaks are sorted by magnitude in descending order and returned as part of [FrequencyData](frequency-data.md).
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `hz` | `number` | Frequency of the peak in Hertz (Hz). |
| `magnitude` | `number` | Amplitude magnitude at this frequency. Higher values indicate stronger energy at this frequency. |

:::note
The `magnitude` value is a normalized amplitude — it does not correspond to a physical unit like decibels. Use it for relative comparison between peaks within the same frame, not for absolute loudness measurement.
:::

## Usage

`FrequencyPeak` objects appear inside the `topFrequencies` array of [FrequencyData](frequency-data.md). They represent the loudest frequency components detected in the current audio frame. Typical use cases include:

- Visualizing a frequency bar chart or waveform display
- Identifying the dominant instrument or tone in a music track
- Detecting specific frequency patterns (e.g. bass drops, vocal frequencies)

:::tip
The `topFrequencies` array is sorted by magnitude in descending order. The first element is always the strongest peak. If you only need the dominant frequency, use [FrequencyData.dominantHz](frequency-data.md) instead — it is pre-computed and avoids iterating the array.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getResult, FrequencyPeak } from '@eisland/windows-volume-analyzer';

const result = getResult();

// Iterate the top frequency peaks
for (const peak of result.frequency.topFrequencies) {
  console.log(`${peak.hz.toFixed(1)} Hz — magnitude: ${peak.magnitude.toFixed(3)}`);
}

// Check if bass frequencies (20–200 Hz) are dominant
const bassPeaks: FrequencyPeak[] = result.frequency.topFrequencies.filter(
  (p) => p.hz >= 20 && p.hz <= 200
);
if (bassPeaks.length > 0) {
  console.log(`Bass energy detected: ${bassPeaks[0].hz} Hz`);
}
```

@tab JavaScript

```js
const { getResult } = require('@eisland/windows-volume-analyzer');

const result = getResult();

// Iterate the top frequency peaks
for (const peak of result.frequency.topFrequencies) {
  console.log(`${peak.hz.toFixed(1)} Hz — magnitude: ${peak.magnitude.toFixed(3)}`);
}

// Check if bass frequencies (20–200 Hz) are dominant
const bassPeaks = result.frequency.topFrequencies.filter(
  (p) => p.hz >= 20 && p.hz <= 200
);
if (bassPeaks.length > 0) {
  console.log(`Bass energy detected: ${bassPeaks[0].hz} Hz`);
}
```

:::

## Notes

:::note
The number of peaks in `topFrequencies` is determined by the native analyzer and may vary between frames. Do not assume a fixed array length.
:::

:::tip
For a full frequency spectrum (all 512 bins), use [FrequencyData.spectrum](frequency-data.md) instead of `topFrequencies`. The `topFrequencies` array only contains the most significant peaks, which is sufficient for most visualization use cases.
:::

:::important
Frequency analysis is performed on the audio stream captured via WASAPI loopback. The quality and resolution of peaks depend on the FFT window size used by the native analyzer. Very short audio transients may not produce stable peak data.
:::

## Danger Avoidance

:::danger
Do not assume `topFrequencies` is always non-empty. When no audio is playing or the analyzer has just started, the array may be empty. Always check the array length before accessing elements to avoid undefined access errors.
:::
