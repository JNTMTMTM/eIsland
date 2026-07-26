---
watermark: true
title: getBrightness
icon: fa6-solid:code
---

# getBrightness

:::info
`getBrightness` queries the current screen brightness through WMI (Windows Management Instrumentation) for built-in displays, falling back to DDC/CI for external monitors. It returns a [BrightnessInfo](brightness-info.md) object containing the brightness percentage, display metadata, and the control source, or `null` if no compatible display is available. This is a synchronous one-shot read — it does not subscribe to changes.
:::

## Signature

```typescript
function getBrightness(): BrightnessInfo | null;
```

## Usage

Call `getBrightness` when you need to read the current screen brightness — for example, to display the value in a UI slider, log the state, or decide whether to adjust brightness based on ambient conditions. The function first attempts WMI (for built-in displays) and falls back to DDC/CI (for external monitors). Because this is a synchronous one-shot query, it does not reflect external changes made after the call returns. For real-time monitoring, use [BrightnessMonitor](brightness-monitor.md) instead.

:::tip
If you only need the brightness value once at startup or on demand, `getBrightness` is the simplest choice. If you need to react to every brightness change (e.g. hardware buttons, OS adjustments), prefer [BrightnessMonitor](brightness-monitor.md) for event-driven tracking without polling overhead.
:::

## Return Value

Returns a [BrightnessInfo](brightness-info.md) object, or `null` if brightness cannot be read (e.g. no WMI-compatible or DDC/CI-capable display, or the query failed).

The `BrightnessInfo` object has the following shape:

| Property | Type | Description |
| --- | --- | --- |
| `currentBrightness` | `number` | Current brightness percentage (0–100) |
| `levels` | `number[] \| null` | Array of brightness levels supported by the display, or `null` if unavailable |
| `instanceName` | `string \| null` | Monitor instance name (WMI) or description (DDC/CI), or `null` if unavailable |
| `source` | `'wmi' \| 'ddc-ci'` | Brightness control source: `'wmi'` for built-in displays, `'ddc-ci'` for external monitors |

:::warning
The return value can be `null`. Systems where neither WMI nor DDC/CI can read brightness (e.g. virtual displays, unsupported monitors) will return `null`. Always check for `null` before accessing properties on the result.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getBrightness } from '@eisland/windows-brightness-helper';

// Query the current screen brightness
const info = getBrightness();

if (info) {
  // Brightness is a percentage from 0 to 100
  console.log(`Current brightness: ${info.currentBrightness}%`);
  // Log the supported brightness levels (if available)
  if (info.levels) {
    console.log(`Supported levels: ${info.levels.join(', ')}`);
  }
} else {
  // No WMI-compatible display found or query failed
  console.log('Unable to read brightness');
}
```

@tab JavaScript

```js
const { getBrightness } = require('@eisland/windows-brightness-helper');

// Query the current screen brightness
const info = getBrightness();

if (info) {
  // Brightness is a percentage from 0 to 100
  console.log(`Current brightness: ${info.currentBrightness}%`);
  // Log the supported brightness levels (if available)
  if (info.levels) {
    console.log(`Supported levels: ${info.levels.join(', ')}`);
  }
} else {
  // No WMI-compatible display found or query failed
  console.log('Unable to read brightness');
}
```

:::

## Notes

:::note
This function performs a synchronous query — WMI first, then DDC/CI if WMI returns no results. While the call is fast on most systems, avoid calling it in a tight loop; cache the result and re-query only when needed, or use [BrightnessMonitor](brightness-monitor.md) for continuous tracking.
:::

:::note
External brightness changes made by the OS, hardware buttons, or other applications are not reflected until you call `getBrightness` again. This function reads a snapshot, not a live subscription.
:::

:::tip
The `levels` and `instanceName` fields may be `null` on some hardware even when `currentBrightness` is available. Guard against `null` on each field individually if you plan to use them.
:::

## Danger Avoidance

:::danger
Do not assume the return value is always non-null. Systems where neither WMI nor DDC/CI can read brightness (e.g. virtual displays, some external monitors) will return `null`. Always guard against `null` before accessing properties like `currentBrightness`, or your application will crash with a TypeError.
:::

:::danger
Do not poll `getBrightness` in a rapid loop (e.g. `setInterval` with < 500ms). Each call triggers a WMI query which involves COM initialization and system-level IPC. Excessive polling can cause high CPU usage and WMI provider contention. Use [BrightnessMonitor](brightness-monitor.md) for event-driven brightness tracking instead.
:::
