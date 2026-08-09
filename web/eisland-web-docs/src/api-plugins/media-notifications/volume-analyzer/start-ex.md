---
watermark: true
title: startEx
icon: fa6-solid:code
---

# startEx

:::info
`startEx` is an alternative entry point for [start](start.md) that requires `includeProcessTree` as a mandatory parameter. Both functions produce identical results — `startEx` simply enforces explicit configuration of child process audio capture.
:::

## Signature

```typescript
function startEx(processId: number, includeProcessTree: boolean): CommandResult
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `processId` | `number` | Windows process ID (PID) of the target application. Must be a positive 32-bit integer. |
| `includeProcessTree` | `boolean` | Whether to include audio from child processes. Required — no default value. |

## Usage

Use `startEx` instead of [start](start.md) when you want to make the `includeProcessTree` decision explicit in your code. This is useful in configuration-driven scenarios where the flag is determined at runtime.

:::tip
If you are unsure whether to include child processes, use [start](start.md) with the default (`true`). Most applications (browsers, media players) produce audio from child processes, so excluding them may result in missing audio data.
:::

## Return Value

Returns a [CommandResult](command-result.md) object.

| Type | Description |
|------|-------------|
| [CommandResult](command-result.md) | `{ success: true, error: null }` on success, `{ success: false, error: string }` on failure. |

:::warning
The return value is identical to [start](start.md). A `success: true` result means the capture process was spawned, not that audio data is available.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { startEx, CommandResult } from '@eisland/windows-volume-analyzer';

// Explicitly exclude child process audio
const result: CommandResult = startEx(12345, false);

if (result.success) {
  console.log('Analysis started (single process only)');
} else {
  console.error(`Failed: ${result.error}`);
}
```

@tab JavaScript

```js
const { startEx } = require('@eisland/windows-volume-analyzer');

// Explicitly exclude child process audio
const result = startEx(12345, false);

if (result.success) {
  console.log('Analysis started (single process only)');
} else {
  console.error(`Failed: ${result.error}`);
}
```

:::

## Notes

:::note
`startEx` delegates directly to [start](start.md). There is no behavioral difference between the two — `startEx` exists solely for API clarity when the `includeProcessTree` parameter must be explicit.
:::

:::tip
For most use cases, [start](start.md) with the default `includeProcessTree: true` is sufficient. Use `startEx` only when you have a specific reason to exclude child process audio.
:::

:::important
Setting `includeProcessTree` to `false` means audio from child processes (e.g. a browser's GPU process or audio renderer) will not be captured. For applications like browsers or Electron apps, this may result in silence even when the user hears audio.
:::

## Danger Avoidance

:::danger
Do not use `startEx(processId, false)` for browser-based audio sources (Chrome, Edge, Firefox). These applications render audio from child processes, not the main process. Excluding the process tree will capture no audio. Use `startEx(processId, true)` or the default [start](start.md) instead.
:::
