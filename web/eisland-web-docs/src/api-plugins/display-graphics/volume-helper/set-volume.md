---
watermark: true
title: setVolume
icon: fa6-solid:code
---

# setVolume

:::info
`setVolume` sets the master volume of the default Windows playback device to a specified percentage via Core Audio COM. It accepts a value from 0 to 100 and returns a boolean indicating whether the volume was applied successfully. This is the primary write API in the volume-helper plugin, complementing the read-only [getVolume](get-volume.md) function.
:::

## Signature

```typescript
function setVolume(level: number): boolean
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | `number` | Target volume percentage (0–100). Values outside this range are clamped to 0 or 100. Non-integer values are rounded. |

## Usage

Call `setVolume` whenever you need to change the system volume programmatically — for example in response to a user slider adjustment, a keyboard shortcut, or an automation rule. The change takes effect immediately on the default playback device.

:::tip
After calling `setVolume`, verify the result by calling [getVolume](get-volume.md) and checking the returned level. This is especially important in automated scripts where the user cannot audibly confirm the change.
:::

:::note
If you need to restore the original volume later (e.g. on app exit), read it with [getVolume](get-volume.md) **before** overwriting and save the value. There is no built-in restore mechanism.
:::

## Return Value

Returns `true` if the volume was set successfully, `false` otherwise. A `false` return typically means no playback device is available or the COM call failed.

| Type | Description |
|------|-------------|
| `boolean` | `true` if volume was applied, `false` on failure |

:::warning
Always check the return value before assuming the volume changed. A `false` result does not throw — it silently signals failure. Use [getVolume](get-volume.md) afterward to confirm the actual volume if certainty is required.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { setVolume, getVolume } from '@eisland/windows-volume-helper';

// Save the current volume before changing it
const savedLevel = getVolume();

// Set volume to 75%
const success = setVolume(75);

// Log whether the volume change succeeded
console.log(success ? 'Volume updated' : 'Failed to set volume');

// Verify by reading the current volume back
const level = getVolume();
if (level !== null) {
  console.log(`Now at: ${level}%`);
}

// Later, restore the original volume if it was saved
if (savedLevel !== null) {
  setVolume(savedLevel);
}
```

@tab JavaScript

```js
const { setVolume, getVolume } = require('@eisland/windows-volume-helper');

// Save the current volume before changing it
const savedLevel = getVolume();

// Set volume to 75%
const success = setVolume(75);

// Log whether the volume change succeeded
console.log(success ? 'Volume updated' : 'Failed to set volume');

// Verify by reading the current volume back
const level = getVolume();
if (level !== null) {
  console.log(`Now at: ${level}%`);
}

// Later, restore the original volume if it was saved
if (savedLevel !== null) {
  setVolume(savedLevel);
}
```

:::

## Notes

:::note
Volume changes are applied immediately to the default playback device. There is no built-in "restore to previous value" mechanism — if you need to restore the original volume, read it with [getVolume](get-volume.md) before overwriting.
:::

:::tip
The `level` parameter accepts any number. Values below 0 are clamped to 0, values above 100 are clamped to 100, and fractional values are rounded to the nearest integer. `NaN` and non-finite values cause the function to return `false` without changing the volume.
:::

:::important
This plugin only controls the **default playback device** master volume. It does not control per-application volume or capture (microphone) volume. If the system has no default playback device, `setVolume` returns `false`.
:::

## Danger Avoidance

:::danger
Setting volume to `0` will mute the system completely. If your UI offers a user-controlled volume slider, consider whether muting is the intended behavior or if a minimum threshold (e.g. 5–10) is more appropriate for the use case.
:::

:::danger
Do not call `setVolume` in a tight loop (e.g. on every mouse-move event of a slider). Rapidly issuing COM volume commands can cause audio glitches and unnecessary system overhead. Debounce calls to at most one per 50–100 ms.
:::
