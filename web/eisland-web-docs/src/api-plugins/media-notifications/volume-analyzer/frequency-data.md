---
watermark: true
title: FrequencyData
icon: fa6-solid:table
---

# FrequencyData

:::info
`FrequencyData` contains the frequency analysis results from the current audio frame. It includes a downsampled spectrum array, the dominant frequency, and a list of the strongest frequency peaks. This is one of three analysis dimensions returned by [AudioAnalysisResult](audio-analysis-result.md).
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `spectrum` | `number[]` | Frequency spectrum amplitude array, downsampled to 512 bins. Each element represents the amplitude at a frequency band. |
| `dominantHz` | `number` | The frequency with the highest amplitude in the current frame, in Hertz (Hz). |
| `topFrequencies` | [FrequencyPeak](frequency-peak.md)`[]` | Array of the strongest frequency peaks, sorted by magnitude in descending order. |

:::note
The `spectrum` array has a fixed length of 512 elements. Each bin covers a frequency range determined by the sample rate and FFT window size of the native analyzer. The first bin corresponds to the lowest frequency and the last bin to the highest.
:::

## Usage

`FrequencyData` is accessed via `result.frequency` on an [AudioAnalysisResult](audio-analysis-result.md) object. Use it for:

- Rendering frequency bar charts or spectrograms
- Identifying the dominant tone or instrument
- Detecting bass drops, vocal presence, or specific frequency patterns

:::tip
For most visualization use cases, `topFrequencies` is more efficient than iterating the full `spectrum` array. It contains only the most significant peaks and is already sorted by magnitude.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getResult, FrequencyData } from '@eisland/windows-volume-analyzer';

const result = getResult();
const freq: FrequencyData = result.frequency;

// Display the dominant frequency
console.log(`Dominant: ${freq.dominantHz.toFixed(1)} Hz`);

// Render a simple bar chart from the spectrum (first 32 bins)
const bars = freq.spectrum.slice(0, 32).map((v) => '█'.repeat(Math.round(v * 20)));
console.log(bars.join(''));

// Show top 3 peaks
for (const peak of freq.topFrequencies.slice(0, 3)) {
  console.log(`Peak: ${peak.hz.toFixed(1)} Hz (mag: ${peak.magnitude.toFixed(3)})`);
}
```

@tab JavaScript

```js
const { getResult } = require('@eisland/windows-volume-analyzer');

const result = getResult();
const freq = result.frequency;

// Display the dominant frequency
console.log(`Dominant: ${freq.dominantHz.toFixed(1)} Hz`);

// Render a simple bar chart from the spectrum (first 32 bins)
const bars = freq.spectrum.slice(0, 32).map((v) => '█'.repeat(Math.round(v * 20)));
console.log(bars.join(''));

// Show top 3 peaks
for (const peak of freq.topFrequencies.slice(0, 3)) {
  console.log(`Peak: ${peak.hz.toFixed(1)} Hz (mag: ${peak.magnitude.toFixed(3)})`);
}
```

:::

## Notes

:::note
When no audio is playing, `spectrum` will be an empty array, `dominantHz` will be `0`, and `topFrequencies` will be empty. Always check for empty data before processing.
:::

:::tip
If you only need the dominant frequency for simple visualizations (e.g. a single color that shifts with pitch), use `dominantHz` directly instead of processing the full `spectrum` array.
:::

:::important
The `spectrum` values are normalized amplitudes, not decibels. They are suitable for relative comparison within a frame but should not be treated as absolute measurements across frames.
:::

## Danger Avoidance

:::danger
Do not assume `spectrum` always has 512 elements. While the analyzer targets 512 bins, the array may be empty when no audio is captured. Always check `spectrum.length` before indexing.
:::
