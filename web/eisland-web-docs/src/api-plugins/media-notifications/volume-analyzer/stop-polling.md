---
watermark: true
title: stopPolling
icon: fa6-solid:code
---

# stopPolling

:::info
`stopPolling` stops the periodic polling timer started by [startPolling](start-polling.md) and clears the registered callbacks. The native capture process continues running — only the JavaScript-side polling is stopped.
:::

## Signature

```typescript
function stopPolling(): void
```

## Parameters

This function takes no parameters.

## Usage

Call `stopPolling` when you want to stop receiving periodic analysis updates but keep the native capture process running. This is uncommon — in most cases, calling [stop](stop.md) is preferred since it stops both polling and the capture process.

:::note
Calling `stopPolling` when no polling is active is a safe no-op.
:::

:::tip
If you want to temporarily pause updates (e.g. when the UI is hidden), call `stopPolling` and later call [startPolling](start-polling.md) again. The capture process continues in the background, so new data is available immediately when polling resumes.
:::

## Return Value

This function returns `void`.

:::warning
After `stopPolling`, the `onUpdate` and `onError` callbacks are cleared. You must call [startPolling](start-polling.md) again with new callbacks to resume receiving updates.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { start, startPolling, stopPolling, stop } from '@eisland/windows-volume-analyzer';

start(12345);

// Start polling
startPolling(16, (result) => {
  console.log(`RMS: ${result.amplitude.rms.toFixed(3)}`);
});

// Pause polling (capture continues in background)
stopPolling();
console.log('Polling paused');

// Resume polling with the same or different interval
startPolling(33, (result) => {
  console.log(`RMS: ${result.amplitude.rms.toFixed(3)}`);
});

// Clean up everything
stop();
```

@tab JavaScript

```js
const { start, startPolling, stopPolling, stop } = require('@eisland/windows-volume-analyzer');

start(12345);

// Start polling
startPolling(16, (result) => {
  console.log(`RMS: ${result.amplitude.rms.toFixed(3)}`);
});

// Pause polling (capture continues in background)
stopPolling();
console.log('Polling paused');

// Resume polling with the same or different interval
startPolling(33, (result) => {
  console.log(`RMS: ${result.amplitude.rms.toFixed(3)}`);
});

// Clean up everything
stop();
```

:::

## Notes

:::note
`stopPolling` does not call [stop](stop.md). The native capture process continues running and producing analysis data. To fully terminate the analysis session, call [stop](stop.md) instead.
:::

:::tip
For most use cases, skip `stopPolling` and call [stop](stop.md) directly. `stop` automatically calls `stopPolling` internally, so there is no risk of leaving the timer running.
:::

:::important
After `stopPolling`, you can still call [getResult](get-result.md) to read the latest result manually. The data continues to be updated by the capture process — only the automatic callback delivery is stopped.
:::

## Danger Avoidance

:::danger
Do not call `stopPolling` and assume the capture process has also stopped. The native capture process continues consuming CPU and memory. Always call [stop](stop.md) to fully release resources when analysis is no longer needed.
:::
