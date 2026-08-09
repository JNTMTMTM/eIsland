---
watermark: true
title: BeatData
icon: fa6-solid:table
---

# BeatData

:::info
`BeatData` contains the beat detection results from the current audio frame. It indicates whether a beat was detected, the estimated BPM (beats per minute), and the intensity of the detected beat. This is one of three analysis dimensions returned by [AudioAnalysisResult](audio-analysis-result.md).
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `isBeat` | `boolean` | `true` if a beat was detected in the current frame, `false` otherwise. |
| `bpm` | `number` | Estimated beats per minute. `0` when no rhythm is detected (e.g. silence or ambient audio). |
| `intensity` | `number` | Beat strength on a scale from `0.0` (weak) to `1.0` (strong). |

:::note
Beat detection uses onset detection algorithms on the audio stream. The `bpm` value stabilizes over time as the analyzer accumulates more beat intervals. Very short analysis periods may produce inaccurate BPM estimates.
:::

## Usage

`BeatData` is accessed via `result.beat` on an [AudioAnalysisResult](audio-analysis-result.md) object. Use it for:

- Audio-reactive visual effects that pulse on beats
- BPM display for music applications
- Rhythm-based animations or game mechanics
- Detecting whether music is playing with a discernible rhythm

:::tip
Combine `isBeat` with `intensity` to create weighted visual effects. A strong beat (`intensity > 0.7`) could trigger a large pulse, while a weak beat triggers a subtle one.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getResult, BeatData } from '@eisland/windows-volume-analyzer';

const result = getResult();
const beat: BeatData = result.beat;

if (beat.isBeat) {
  // Trigger a visual pulse with intensity-based scaling
  const scale = 1 + beat.intensity * 0.5;
  console.log(`Beat! intensity=${beat.intensity.toFixed(2)}, scale=${scale.toFixed(2)}`);
}

// Display BPM when a rhythm is detected
if (beat.bpm > 0) {
  console.log(`BPM: ${beat.bpm.toFixed(1)}`);
} else {
  console.log('No rhythm detected');
}
```

@tab JavaScript

```js
const { getResult } = require('@eisland/windows-volume-analyzer');

const result = getResult();
const beat = result.beat;

if (beat.isBeat) {
  // Trigger a visual pulse with intensity-based scaling
  const scale = 1 + beat.intensity * 0.5;
  console.log(`Beat! intensity=${beat.intensity.toFixed(2)}, scale=${scale.toFixed(2)}`);
}

// Display BPM when a rhythm is detected
if (beat.bpm > 0) {
  console.log(`BPM: ${beat.bpm.toFixed(1)}`);
} else {
  console.log('No rhythm detected');
}
```

:::

## Notes

:::note
`isBeat` is `true` only on the frame where the beat onset is detected. On subsequent frames it returns to `false` until the next beat. Use it as a trigger, not a continuous state.
:::

:::tip
The `bpm` value takes several seconds to stabilize. During the first few seconds of analysis, the reported BPM may fluctuate. Consider displaying BPM only after the analyzer has been running for at least 5 seconds.
:::

:::important
Beat detection accuracy depends on the audio content. Music with clear rhythmic patterns (pop, electronic, hip-hop) produces reliable results. Ambient, classical, or speech audio may yield `bpm: 0` and `isBeat: false` consistently.
:::

## Danger Avoidance

:::danger
Do not assume `bpm` is always accurate. The beat detection algorithm works best with steady rhythmic music. Irregular rhythms, tempo changes, or non-musical audio may produce misleading BPM values. Always treat `bpm` as an estimate.
:::
