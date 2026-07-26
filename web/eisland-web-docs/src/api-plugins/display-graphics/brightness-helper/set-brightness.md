---
watermark: true
title: setBrightness
icon: fa6-solid:code
---

# setBrightness

:::info
`setBrightness` is a function that sets the screen brightness to a specified percentage. It first attempts WMI (Windows Management Instrumentation) for built-in displays, then falls back to DDC/CI for external monitors. It accepts a value from 0 to 100 and returns a boolean indicating whether the brightness was applied successfully. This is the primary write API in the brightness-helper plugin, complementing the read-only [getBrightness](get-brightness.md) function.
:::

## Signature

```typescript
function setBrightness(brightness: number): boolean
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `brightness` | `number` | Target brightness percentage (0--100). Values outside this range are clamped by the WMI provider. |

## Return Value

Returns `true` if the brightness was set successfully, `false` otherwise. A `false` return typically means neither WMI nor DDC/CI could apply the change — the display device may be inaccessible or unsupported.

:::warning
Always check the return value before assuming the brightness changed. A `false` result does not throw -- it silently signals failure. Use [getBrightness](get-brightness.md) afterward to confirm the actual brightness if certainty is required.
:::

## Usage

Call `setBrightness` whenever you need to change the screen brightness programmatically -- for example in response to a user slider adjustment, a time-of-day schedule, or an ambient light sensor reading. The change takes effect immediately and persists until the next call or until the system enters sleep.

:::tip
After calling `setBrightness`, verify the result by calling [getBrightness](get-brightness.md) and checking the `currentBrightness` field. This is especially important in automated scripts where the user cannot visually confirm the change.
:::

:::tip
If you need to restore the original brightness later (e.g. on app exit), read it with [getBrightness](get-brightness.md) **before** overwriting and save the value. There is no built-in restore mechanism.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { setBrightness, getBrightness } from '@eisland/windows-brightness-helper';

// Save the current brightness before changing it
const original = getBrightness();
const savedBrightness = original ? original.currentBrightness : null;

// Set brightness to 75%
const success = setBrightness(75);

// Log whether the brightness change succeeded
console.log(success ? 'Brightness updated' : 'Failed to set brightness');

// Verify by reading the current brightness back
const info = getBrightness();
if (info) {
  // currentBrightness is a percentage from 0 to 100
  console.log(`Now at: ${info.currentBrightness}%`);
}

// Later, restore the original brightness if it was saved
if (savedBrightness !== null) {
  setBrightness(savedBrightness);
}
```

@tab JavaScript

```js
const { setBrightness, getBrightness } = require('@eisland/windows-brightness-helper');

// Save the current brightness before changing it
const original = getBrightness();
const savedBrightness = original ? original.currentBrightness : null;

// Set brightness to 75%
const success = setBrightness(75);

// Log whether the brightness change succeeded
console.log(success ? 'Brightness updated' : 'Failed to set brightness');

// Verify by reading the current brightness back
const info = getBrightness();
if (info) {
  // currentBrightness is a percentage from 0 to 100
  console.log(`Now at: ${info.currentBrightness}%`);
}

// Later, restore the original brightness if it was saved
if (savedBrightness !== null) {
  setBrightness(savedBrightness);
}
```

:::

## Notes

:::note
Brightness changes are applied immediately and persist until the next change or system sleep. There is no built-in "restore to previous value" mechanism -- if you need to restore the original brightness, read it with [getBrightness](get-brightness.md) before overwriting.
:::

:::note
The `brightness` parameter accepts whole numbers. Fractional values will be truncated by the underlying WMI provider.
:::

:::note
This function first tries WMI (`WmiMonitorBrightnessMethods`) for built-in displays, then falls back to DDC/CI (`dxva2.dll`) for external monitors. WMI requires sufficient privileges; DDC/CI works on most external monitors connected via HDMI, DisplayPort, or USB-C. If both providers fail, the function returns `false`.
:::

## Danger Avoidance

:::danger
Setting brightness to `0` will turn the screen completely dark, making it very difficult to interact with the application or adjust the value back. Always enforce a sensible minimum (e.g. 5--10) in your UI when offering user-controlled brightness sliders.
:::

:::danger
Do not call `setBrightness` in a tight loop (e.g. on every mouse-move event of a slider). Rapidly issuing WMI brightness commands can cause visual flickering and may temporarily freeze the display. Debounce calls to at most one per 50--100 ms.
:::
