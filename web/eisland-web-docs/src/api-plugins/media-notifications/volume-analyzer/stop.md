---
watermark: true
title: stop
icon: fa6-solid:code
---

# stop

:::info
`stop` terminates the current audio analysis session and releases the native capture process. It also stops any active polling started via [startPolling](start-polling.md). Returns a [CommandResult](command-result.md) confirming the stop.
:::

## Signature

```typescript
function stop(): CommandResult
```

## Parameters

This function takes no parameters.

## Usage

Call `stop` when you no longer need audio analysis — for example, when the user navigates away from the visualization, the application is closing, or you want to switch to a different target process. Typical workflow:

1. Start analysis with [start](start.md).
2. Consume data via [getResult](get-result.md) or [startPolling](start-polling.md).
3. Call `stop` to release resources.

:::note
`stop` is safe to call even if no analysis is running. It will return `success: true` and perform no action.
:::

:::tip
If you are using [startPolling](start-polling.md), you do not need to call [stopPolling](stop-polling.md) separately — `stop` automatically stops polling before terminating the capture process.
:::

## Return Value

Returns a [CommandResult](command-result.md) object.

| Type | Description |
|------|-------------|
| [CommandResult](command-result.md) | Always `{ success: true, error: null }` since stopping is always possible. |

:::warning
After `stop` returns, [getResult](get-result.md) will return an empty result (frozen default values). Any pending polling callbacks will no longer fire. Ensure your UI handles the transition gracefully.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { start, stop, getResult, CommandResult } from '@eisland/windows-volume-analyzer';

// Start analysis
start(12345);

// ... use getResult() or startPolling() ...

// Stop analysis and clean up
const result: CommandResult = stop();
console.log(`Stopped: ${result.success}`);
```

@tab JavaScript

```js
const { start, stop, getResult } = require('@eisland/windows-volume-analyzer');

// Start analysis
start(12345);

// ... use getResult() or startPolling() ...

// Stop analysis and clean up
const result = stop();
console.log(`Stopped: ${result.success}`);
```

:::

## Notes

:::note
The native capture process is terminated gracefully — a newline is sent to its stdin, and a 1-second kill timer is set as a fallback. In most cases, the process exits within milliseconds.
:::

:::tip
If you plan to start analyzing a different process, you can call [start](start.md) directly without calling `stop` first. The `start` function automatically stops any existing session before starting a new one.
:::

:::important
After `stop`, the [getStatus](get-status.md) function will report `isRunning: false`. However, the `error` field from the previous session persists until a new [start](start.md) call succeeds.
:::

## Danger Avoidance

:::danger
Do not call [getResult](get-result.md) or rely on polling callbacks after `stop`. The result will be an empty default object with all values at zero. If your UI is still rendering based on analysis data, it will display incorrect information. Unsubscribe from polling before stopping, or guard your render logic with [getStatus](get-status.md) checks.
:::
