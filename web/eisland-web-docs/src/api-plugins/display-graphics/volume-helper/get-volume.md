---
watermark: true
title: getVolume
icon: fa6-solid:code
---

# getVolume

:::info
`getVolume` queries the current master volume level of the default Windows playback device through Core Audio COM. It returns a whole number between 0 and 100 representing the volume percentage, or `null` if no playback device is available or the query failed. This is a synchronous one-shot read — it does not subscribe to changes.
:::

## Signature

```typescript
function getVolume(): number | null;
```

## Parameters

This function takes no parameters.

## Usage

Call `getVolume` when you need to read the current system volume — for example, to display the value in a UI slider, log the audio state, or decide whether to adjust volume based on user preferences. Because this is a synchronous one-shot query, it does not reflect external changes made after the call returns. For real-time monitoring, use [VolumeMonitor](volume-monitor.md) instead.

:::tip
If you only need the volume value once at startup or on demand, `getVolume` is the simplest choice. If you need to react to every volume change (e.g. hardware keys, OS mixer adjustments), prefer [VolumeMonitor](volume-monitor.md) for event-driven tracking without polling overhead.
:::

:::note
This function performs a synchronous query via a .NET console EXE backed by Core Audio COM. While the call is fast on most systems, avoid calling it in a tight loop; cache the result and re-query only when needed, or use [VolumeMonitor](volume-monitor.md) for continuous tracking.
:::

## Return Value

Returns a number between 0 and 100 representing the current volume percentage, or `null` if the volume cannot be read.

| Type | Description |
|------|-------------|
| `number` | Current volume percentage (0–100) |
| `null` | No playback device available or query failed |

:::warning
The return value can be `null`. Systems without an active playback device (e.g. no speakers or headphones connected) will return `null`. Always check for `null` before using the value.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getVolume } from '@eisland/windows-volume-helper';

// Query the current system volume
const level = getVolume();

if (level !== null) {
  // Volume is a whole number from 0 to 100
  console.log(`Current volume: ${level}%`);
} else {
  // No playback device available or query failed
  console.log('Unable to read volume');
}
```

@tab JavaScript

```js
const { getVolume } = require('@eisland/windows-volume-helper');

// Query the current system volume
const level = getVolume();

if (level !== null) {
  // Volume is a whole number from 0 to 100
  console.log(`Current volume: ${level}%`);
} else {
  // No playback device available or query failed
  console.log('Unable to read volume');
}
```

:::

## Notes

:::note
External volume changes made by the OS, hardware keys, or other applications are not reflected until you call `getVolume` again. This function reads a snapshot, not a live subscription.
:::

:::tip
The volume level returned is always a whole number. The underlying Core Audio API may support finer granularity, but this plugin normalizes to an integer 0–100 for consistency with the [setVolume](set-volume.md) API.
:::

:::important
This plugin only controls the **default playback device** master volume. It does not control per-application volume or capture (microphone) volume. If the system has no default playback device configured, `getVolume` returns `null`.
:::

## Danger Avoidance

:::danger
Do not assume the return value is always non-null. Systems without an active playback device will return `null`. Always guard against `null` before using the value, or your application will crash with a TypeError when performing arithmetic on `null`.
:::

:::danger
Do not poll `getVolume` in a rapid loop (e.g. `setInterval` with < 500ms). Each call spawns a synchronous .NET process and queries COM. Excessive polling causes high CPU usage. Use [VolumeMonitor](volume-monitor.md) for event-driven volume tracking instead.
:::
