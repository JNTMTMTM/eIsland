---
watermark: true
title: getStatus
icon: fa6-solid:code
---

# getStatus

:::info
`getStatus` returns the current state of the audio analysis engine. It reports whether the analyzer is actively capturing audio and the last error encountered. Returns an [AnalyzerStatus](analyzer-status.md) object.
:::

## Signature

```typescript
function getStatus(): AnalyzerStatus
```

## Parameters

This function takes no parameters.

## Usage

Call `getStatus` to check whether the analyzer is running before calling [getResult](get-result.md) or to diagnose why analysis stopped. Common use cases:

- Guarding against reading empty results when the analyzer is idle
- Displaying connection status in a UI
- Detecting if the target process exited

:::tip
Call `getStatus` before [getResult](get-result.md) to avoid reading stale or empty data. If `isRunning` is `false`, there is no active analysis and `getResult` will return default zeros.
:::

:::note
The `error` field persists across stop/start cycles. It is only cleared when a new [start](start.md) call succeeds. This allows you to inspect the failure reason even after the analyzer has stopped.
:::

## Return Value

Returns an [AnalyzerStatus](analyzer-status.md) object.

| Type | Description |
|------|-------------|
| [AnalyzerStatus](analyzer-status.md) | `{ isRunning: boolean, error: string \| null }` |

:::warning
`isRunning` reflects whether the native capture process is alive, not whether audio data is valid. The target process may be silent or have exited its audio session while the capture process is still running.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getStatus, getResult, AnalyzerStatus } from '@eisland/windows-volume-analyzer';

const status: AnalyzerStatus = getStatus();

if (status.isRunning) {
  // Safe to read results
  const result = getResult();
  console.log(`Volume: ${(result.amplitude.rms * 100).toFixed(0)}%`);
} else {
  console.log('Analyzer is not running');
  if (status.error) {
    console.log(`Reason: ${status.error}`);
  }
}
```

@tab JavaScript

```js
const { getStatus, getResult } = require('@eisland/windows-volume-analyzer');

const status = getStatus();

if (status.isRunning) {
  // Safe to read results
  const result = getResult();
  console.log(`Volume: ${(result.amplitude.rms * 100).toFixed(0)}%`);
} else {
  console.log('Analyzer is not running');
  if (status.error) {
    console.log(`Reason: ${status.error}`);
  }
}
```

:::

## Notes

:::note
`getStatus` is a lightweight synchronous call — it reads internal state without querying the native process. You can call it frequently without performance concerns.
:::

:::tip
Use `getStatus` in a polling loop to detect when the analyzer stops unexpectedly (e.g. the target process crashes). When `isRunning` transitions from `true` to `false`, check `error` for the reason and restart if needed.
:::

:::important
The `error` field is not cleared by [stop](stop.md). If you need a clean status, start a new analysis session with [start](start.md) — a successful start clears the previous error.
:::

## Danger Avoidance

:::danger
Do not rely solely on `isRunning` to determine if audio data is valid. The analyzer may be running but the target process may have no active audio sessions. Always check [AudioAnalysisResult.error](audio-analysis-result.md) from [getResult](get-result.md) for data-level issues.
:::
