---
watermark: true
title: setMute
icon: fa6-solid:code
---

# setMute

:::info
`setMute` sets the mute state of the default Windows playback device via Core Audio COM. It accepts a boolean value and returns a boolean indicating whether the mute state was applied successfully. This is the mute control counterpart to [setVolume](set-volume.md) in the volume-helper plugin.
:::

## Signature

```typescript
function setMute(muted: boolean): boolean
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `muted` | `boolean` | `true` to mute the device, `false` to unmute. |

## Usage

Call `setMute` whenever you need to toggle the system mute state programmatically — for example in response to a mute button click, a keyboard shortcut, or an automation rule. The change takes effect immediately on the default playback device.

:::tip
After calling `setMute`, verify the result by calling [getMute](get-mute.md) and checking the returned state. This is especially important in automated scripts where the user cannot audibly confirm the change.
:::

:::note
If you need to restore the original mute state later (e.g. on app exit), read it with [getMute](get-mute.md) **before** overwriting and save the value. There is no built-in restore mechanism.
:::

## Return Value

Returns `true` if the mute state was set successfully, `false` otherwise. A `false` return typically means no playback device is available, the COM call failed, or the input was not a boolean.

| Type | Description |
|------|-------------|
| `boolean` | `true` if mute state was applied, `false` on failure |

:::warning
Always check the return value before assuming the mute state changed. A `false` result does not throw — it silently signals failure. Use [getMute](get-mute.md) afterward to confirm the actual state if certainty is required.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { setMute, getMute } from '@eisland/windows-volume-helper';

// Save the current mute state before changing it
const wasMuted = getMute();

// Mute the system
const success = setMute(true);

// Log whether the mute command succeeded
console.log(success ? 'System muted' : 'Failed to mute');

// Verify by reading the current mute state
const muted = getMute();
if (muted !== null) {
  console.log(`Muted: ${muted}`);
}

// Later, restore the original mute state if it was saved
if (wasMuted !== null) {
  setMute(wasMuted);
}
```

@tab JavaScript

```js
const { setMute, getMute } = require('@eisland/windows-volume-helper');

// Save the current mute state before changing it
const wasMuted = getMute();

// Mute the system
const success = setMute(true);

// Log whether the mute command succeeded
console.log(success ? 'System muted' : 'Failed to mute');

// Verify by reading the current mute state
const muted = getMute();
if (muted !== null) {
  console.log(`Muted: ${muted}`);
}

// Later, restore the original mute state if it was saved
if (wasMuted !== null) {
  setMute(wasMuted);
}
```

:::

## Notes

:::note
Mute state changes are applied immediately to the default playback device. There is no built-in "restore to previous state" mechanism — if you need to restore the original mute state, read it with [getMute](get-mute.md) before overwriting.
:::

:::tip
Passing a non-boolean value (e.g. a number or string) to `setMute` will return `false` without changing the mute state. Always pass an explicit `true` or `false`.
:::

:::important
This plugin only controls the **default playback device** mute state. It does not control per-application mute or capture (microphone) mute. If the system has no default playback device, `setMute` returns `false`.
:::

## Danger Avoidance

:::danger
Do not call `setMute` in a tight loop. Each call spawns a synchronous .NET process and queries COM. Rapidly issuing mute commands causes unnecessary system overhead. Call it once per user action.
:::

:::danger
Muting the system while audio is playing can confuse users if there is no visual indicator. If your UI triggers `setMute(true)`, ensure a mute icon or visual feedback is displayed so the user understands why audio has stopped.
:::
