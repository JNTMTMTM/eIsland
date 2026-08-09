---
watermark: true
title: getMute
icon: fa6-solid:code
---

# getMute

:::info
`getMute` queries the mute state of the default Windows playback device through Core Audio COM. It returns `true` if the device is muted, `false` if unmuted, or `null` if no playback device is available or the query failed. This is a synchronous one-shot read — it does not subscribe to changes.
:::

## Signature

```typescript
function getMute(): boolean | null;
```

## Parameters

This function takes no parameters.

## Usage

Call `getMute` when you need to check whether the system audio is muted — for example, to display a mute icon in your UI, or to decide whether to unmute before playing a sound effect. Because this is a synchronous one-shot query, it does not reflect external changes made after the call returns. For real-time monitoring, use [VolumeMonitor](volume-monitor.md) instead.

:::note
This function performs a synchronous query via a .NET console EXE backed by Core Audio COM. While the call is fast on most systems, avoid calling it in a tight loop; cache the result and re-query only when needed, or use [VolumeMonitor](volume-monitor.md) for continuous tracking.
:::

:::tip
If you need both the volume level and mute state, call [getVolume](get-volume.md) and `getMute` in sequence. Both are fast synchronous calls, and together they give you a complete picture of the audio output state.
:::

## Return Value

Returns `true` if the default playback device is muted, `false` if unmuted, or `null` if the mute state cannot be read.

| Type | Description |
|------|-------------|
| `boolean` | `true` if muted, `false` if unmuted |
| `null` | No playback device available or query failed |

:::warning
The return value can be `null`. Systems without an active playback device (e.g. no speakers or headphones connected) will return `null`. Always check for `null` before using the value.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getMute } from '@eisland/windows-volume-helper';

// Query the current mute state
const muted = getMute();

if (muted === null) {
  console.log('Unable to read mute state');
} else if (muted) {
  console.log('Audio is muted');
} else {
  console.log('Audio is unmuted');
}
```

@tab JavaScript

```js
const { getMute } = require('@eisland/windows-volume-helper');

// Query the current mute state
const muted = getMute();

if (muted === null) {
  console.log('Unable to read mute state');
} else if (muted) {
  console.log('Audio is muted');
} else {
  console.log('Audio is unmuted');
}
```

:::

## Notes

:::note
External mute changes made by the OS, hardware mute keys, or other applications are not reflected until you call `getMute` again. This function reads a snapshot, not a live subscription.
:::

:::tip
For real-time mute state tracking, use [VolumeMonitor](volume-monitor.md). While it currently only emits `volume-changed` events, monitoring volume drops to 0 can serve as a proxy for mute detection in many scenarios.
:::

:::important
This plugin only queries the **default playback device** mute state. It does not control per-application mute or capture (microphone) mute. If the system has no default playback device configured, `getMute` returns `null`.
:::

## Danger Avoidance

:::danger
Do not assume the return value is always non-null. Systems without an active playback device will return `null`. Always guard against `null` before using the value, or your application will crash with a TypeError when evaluating `null` in a boolean context.
:::

:::danger
Do not poll `getMute` in a rapid loop (e.g. `setInterval` with < 500ms). Each call spawns a synchronous .NET process and queries COM. Excessive polling causes high CPU usage. Use [VolumeMonitor](volume-monitor.md) for event-driven tracking instead.
:::
