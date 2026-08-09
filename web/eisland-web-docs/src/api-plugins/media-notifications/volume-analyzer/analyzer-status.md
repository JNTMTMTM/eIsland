---
watermark: true
title: AnalyzerStatus
icon: fa6-solid:table
---

# AnalyzerStatus

:::info
`AnalyzerStatus` represents the current state of the audio analysis engine. It indicates whether the analyzer is actively capturing and processing audio, and reports the last error if one occurred. Returned by [getStatus](get-status.md).
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `isRunning` | `boolean` | `true` if the analyzer is currently capturing audio from the target process, `false` otherwise. |
| `error` | `string \| null` | The last error message encountered, or `null` if no error has occurred. |

:::note
The `error` field persists until a new analysis session is started via [start](start.md). Calling [getStatus](get-status.md) after [stop](stop.md) will still show the last error from the previous session.
:::

## Usage

`AnalyzerStatus` is returned by [getStatus](get-status.md). Use it to:

- Check if the analyzer is running before calling [getResult](get-result.md)
- Display connection status in a UI (e.g. "Analyzing…" vs "Disconnected")
- Diagnose why analysis stopped (e.g. target process exited)

:::tip
Call [getStatus](get-status.md) before starting a new analysis session to check if one is already running. If `isRunning` is `true`, call [stop](stop.md) first to avoid resource conflicts.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getStatus, AnalyzerStatus } from '@eisland/windows-volume-analyzer';

const status: AnalyzerStatus = getStatus();

if (status.isRunning) {
  console.log('Analyzer is active');
} else {
  console.log('Analyzer is idle');
  if (status.error) {
    console.log(`Last error: ${status.error}`);
  }
}
```

@tab JavaScript

```js
const { getStatus } = require('@eisland/windows-volume-analyzer');

const status = getStatus();

if (status.isRunning) {
  console.log('Analyzer is active');
} else {
  console.log('Analyzer is idle');
  if (status.error) {
    console.log(`Last error: ${status.error}`);
  }
}
```

:::

## Notes

:::note
`isRunning` reflects whether the native capture process is alive. It does not guarantee that audio data is being produced — the target process may be silent or have no audio sessions.
:::

:::tip
For a complete health check, combine `isRunning` with the `error` field from [AudioAnalysisResult](audio-analysis-result.md). A running analyzer with a non-null error may need to be restarted.
:::

:::important
The `error` field is not cleared by [stop](stop.md). It persists until a new [start](start.md) call succeeds. This allows you to inspect the failure reason even after the analyzer has stopped.
:::

## Danger Avoidance

:::danger
Do not rely solely on `isRunning` to determine if audio analysis is producing valid data. The analyzer may be running but encountering errors. Always check `error` in conjunction with `isRunning` for accurate status reporting.
:::
