---
watermark: true
title: CommandResult
icon: fa6-solid:table
---

# CommandResult

:::info
`CommandResult` is the standard return type for command functions in the volume analyzer plugin. It indicates whether the command succeeded and provides an error message on failure. Returned by [start](start.md), [startEx](start-ex.md), and [stop](stop.md).
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `success` | `boolean` | `true` if the command executed successfully, `false` otherwise. |
| `error` | `string \| null` | Error description on failure, or `null` on success. |

:::note
A `success: true` result means the command was accepted and the analyzer state was updated. It does not guarantee that audio analysis is producing valid data — the target process may have no audio sessions.
:::

## Usage

Always check the `success` field after calling [start](start.md), [startEx](start-ex.md), or [stop](stop.md). On failure, the `error` field describes what went wrong (e.g. invalid process ID, EXE not found).

:::tip
When `success` is `false`, read the `error` field to determine the cause. Common failures include an invalid `processId`, the native EXE not being built (`"Analyzer EXE not found"`), or the target process having exited.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { start, CommandResult } from '@eisland/windows-volume-analyzer';

const result: CommandResult = start(12345);

if (result.success) {
  console.log('Analysis started');
} else {
  console.error(`Failed to start: ${result.error}`);
}
```

@tab JavaScript

```js
const { start } = require('@eisland/windows-volume-analyzer');

const result = start(12345);

if (result.success) {
  console.log('Analysis started');
} else {
  console.error(`Failed to start: ${result.error}`);
}
```

:::

## Notes

:::note
`CommandResult` is a synchronous return value — the command completes before the function returns. There is no asynchronous variant.
:::

:::tip
If [start](start.md) is called while another analysis session is already running, the existing session is automatically stopped before the new one begins. In this case, `success` will be `true` even though a previous session was terminated.
:::

:::important
The `error` field contains developer-facing messages (e.g. stack traces or internal error codes). Do not display it directly to end users without sanitization.
:::

## Danger Avoidance

:::danger
Do not ignore the `success` field. A failed [start](start.md) call leaves the analyzer in a stopped state. If you proceed to call [getResult](get-result.md) or [startPolling](start-polling.md) without checking, you will receive empty or stale data without any indication of failure.
:::
