---
watermark: true
title: AmplitudeData
icon: fa6-solid:table
---

# AmplitudeData

:::info
`AmplitudeData` contains the amplitude analysis results from the current audio frame. It provides both the RMS (root mean square) amplitude for perceived loudness and the peak amplitude for maximum signal level. This is one of three analysis dimensions returned by [AudioAnalysisResult](audio-analysis-result.md).
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `rms` | `number` | Root mean square amplitude — a measure of perceived loudness. Typically ranges from `0.0` (silence) to `1.0` (maximum). |
| `peak` | `number` | Peak amplitude — the maximum signal level in the current frame. Ranges from `0.0` to `1.0`. |

:::note
RMS amplitude is a better indicator of perceived loudness than peak amplitude, as it averages the signal over time. Peak amplitude captures the maximum instantaneous level, which is useful for detecting clipping or sharp transients.
:::

## Usage

`AmplitudeData` is accessed via `result.amplitude` on an [AudioAnalysisResult](audio-analysis-result.md) object. Use it for:

- Volume level meters and VU displays
- Detecting silence or loud passages
- Audio-reactive visualizations (e.g. pulsing effects based on loudness)
- Clipping detection when `peak` approaches `1.0`

:::tip
For a simple volume meter, use `rms` — it represents perceived loudness more accurately than `peak`. Use `peak` only when you need to detect the absolute maximum signal level, such as for clipping prevention.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getResult, AmplitudeData } from '@eisland/windows-volume-analyzer';

const result = getResult();
const amp: AmplitudeData = result.amplitude;

// Simple volume meter (0–10 scale)
const meter = Math.round(amp.rms * 10);
console.log(`Volume: ${'█'.repeat(meter)}${'░'.repeat(10 - meter)} ${(amp.rms * 100).toFixed(0)}%`);

// Detect clipping
if (amp.peak >= 0.99) {
  console.warn('Audio clipping detected!');
}

// Detect silence
if (amp.rms < 0.001) {
  console.log('Silence detected');
}
```

@tab JavaScript

```js
const { getResult } = require('@eisland/windows-volume-analyzer');

const result = getResult();
const amp = result.amplitude;

// Simple volume meter (0–10 scale)
const meter = Math.round(amp.rms * 10);
console.log(`Volume: ${'█'.repeat(meter)}${'░'.repeat(10 - meter)} ${(amp.rms * 100).toFixed(0)}%`);

// Detect clipping
if (amp.peak >= 0.99) {
  console.warn('Audio clipping detected!');
}

// Detect silence
if (amp.rms < 0.001) {
  console.log('Silence detected');
}
```

:::

## Notes

:::note
Both `rms` and `peak` are normalized to the range `0.0`–`1.0`. A value of `0.0` indicates silence, while `1.0` represents the maximum digital signal level.
:::

:::tip
When building audio-reactive UIs, apply a smoothing or easing function to `rms` to avoid jittery visual updates. Raw `rms` values can fluctuate rapidly between frames.
:::

:::important
Amplitude values are derived from the WASAPI loopback capture of the target process. They represent the audio output of that specific process, not the system-wide volume.
:::

## Danger Avoidance

:::danger
Do not use `peak` as a proxy for loudness in UI displays. Peak amplitude captures instantaneous spikes and will appear much louder than the perceived volume. Use `rms` for loudness visualization and `peak` only for clipping detection.
:::
