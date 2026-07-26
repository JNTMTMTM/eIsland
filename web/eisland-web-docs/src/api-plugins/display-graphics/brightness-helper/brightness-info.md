---
watermark: true
title: BrightnessInfo
icon: fa6-solid:table
---

# BrightnessInfo

:::info
`BrightnessInfo` is a data structure returned by the [getBrightness](./get-brightness.md) function. It contains the current screen brightness percentage, an optional list of supported brightness levels, the display monitor's instance name, and the brightness control source. You never construct this object yourself — it comes from querying the system's WMI or DDC/CI brightness provider.
:::

## Interface Introduction

You encounter `BrightnessInfo` whenever you call `getBrightness()`. The returned object tells you the brightness right now, which discrete levels the display supports (if reported by hardware), which physical monitor the data came from, and whether the data was obtained via WMI or DDC/CI. If no compatible display is found, `getBrightness()` returns `null` instead.

```ts
export interface BrightnessInfo {
  /** Current brightness percentage (0-100) */
  currentBrightness: number;
  /** Display-supported brightness levels (0-100), null if unavailable */
  levels: number[] | null;
  /** Display monitor instance name, null if unavailable */
  instanceName: string | null;
  /** Brightness control source: 'wmi' for built-in displays, 'ddc-ci' for external monitors */
  source?: 'wmi' | 'ddc-ci';
}
```

## Usage

Call `getBrightness()` to receive a `BrightnessInfo` object or `null`. The `currentBrightness` field is always populated when the object is non-null. The `levels` and `instanceName` fields may be `null` depending on the display hardware and the brightness provider (WMI or DDC/CI). The `source` field indicates which provider was used.

:::tip Use `currentBrightness` for quick checks
If you only need the current brightness value, access `currentBrightness` directly — no need to inspect the other fields. The value is always a whole number between 0 and 100 inclusive.
:::

```ts
import { getBrightness } from '@eisland/windows-brightness-helper';

// Receive a BrightnessInfo object or null
const info = getBrightness();
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentBrightness` | `number` | Current brightness percentage (0-100) |
| `levels` | `number[] \| null` | Supported brightness levels (0-100), `null` if unavailable |
| `instanceName` | `string \| null` | Display monitor instance name, `null` if unavailable |
| `source` | `'wmi' \| 'ddc-ci'` | Brightness control source: `'wmi'` for built-in displays, `'ddc-ci'` for external monitors |

:::note `levels` may be empty or null
The `levels` field is `null` when the display does not report its supported brightness steps through WMI. Even when non-null, the array may be empty on certain hardware. Always guard before calling array methods like `.length` or `.includes()`.
:::

:::tip Use `instanceName` to identify the monitor
On multi-monitor setups, `instanceName` lets you distinguish which physical display the brightness data belongs to. Store it if you need to correlate brightness queries across sessions.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getBrightness } from '@eisland/windows-brightness-helper';

// Query the current screen brightness
const info = getBrightness();

// getBrightness() returns null when no WMI-compatible display is found
if (info) {
  // currentBrightness is a whole number from 0 to 100
  console.log(`Brightness: ${info.currentBrightness}%`);

  // levels lists discrete steps the display supports; may be null
  if (info.levels) {
    console.log(`Supported levels: ${info.levels.join(', ')}`);
  }

  // instanceName identifies the physical monitor; may be null
  if (info.instanceName) {
    console.log(`Monitor: ${info.instanceName}`);
  }
} else {
  // No WMI-compatible display detected
  console.log('Brightness info unavailable');
}
```

@tab JavaScript

```js
const { getBrightness } = require('@eisland/windows-brightness-helper');

// Query the current screen brightness
const info = getBrightness();

// getBrightness() returns null when no WMI-compatible display is found
if (info) {
  // currentBrightness is a whole number from 0 to 100
  console.log(`Brightness: ${info.currentBrightness}%`);

  // levels lists discrete steps the display supports; may be null
  if (info.levels) {
    console.log(`Supported levels: ${info.levels.join(', ')}`);
  }

  // instanceName identifies the physical monitor; may be null
  if (info.instanceName) {
    console.log(`Monitor: ${info.instanceName}`);
  }
} else {
  // No WMI-compatible display detected
  console.log('Brightness info unavailable');
}
```

:::

## Notes

:::note Multiple displays
If the system has multiple monitors, `getBrightness()` returns brightness data for the first available display — WMI built-in displays are checked first, then DDC/CI external monitors. The `instanceName` field identifies which monitor the data belongs to, and `source` indicates the provider. Use [BrightnessMonitor](./brightness-monitor.md) to track changes on the same display.
:::

:::note WMI and DDC/CI fallback
`BrightnessInfo` data comes from either Windows WMI (`WmiMonitorBrightness`) for built-in displays or DDC/CI (`dxva2.dll`) for external monitors. The plugin tries WMI first; if it returns no results (e.g. desktop monitors, external displays), it falls back to DDC/CI. Systems where both providers are unavailable will return `null` from `getBrightness()`.
:::

:::tip Combining with `setBrightness`
After reading `currentBrightness` from a `BrightnessInfo` object, you can pass a new value to [setBrightness](./set-brightness.md) to adjust the screen. The value range is the same 0-100 scale used by `currentBrightness`.
:::

## Danger Avoidance

:::danger Do not assume `getBrightness()` always returns a value
`getBrightness()` returns `null` when neither WMI nor DDC/CI can read brightness — this happens with virtual displays, systems with both providers disabled, or monitors that do not support brightness control. Accessing `.currentBrightness` on `null` throws a `TypeError`. Always check for `null` before reading any property.
:::

:::danger Do not mutate the returned object
The `BrightnessInfo` object returned by `getBrightness()` is meant to be read-only. Mutating its properties has no effect on the actual screen brightness and may cause confusion if the object is referenced elsewhere. Use [setBrightness](./set-brightness.md) to change brightness.
:::
