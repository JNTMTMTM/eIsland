---
title: getMonitorInfo
icon: fa6-solid:code
---

# getMonitorInfo

:::info
`getMonitorInfo` is a synchronous query function that returns display monitor information. It spawns the C# helper EXE which first queries `WmiMonitorBasicDisplayParams` (root\wmi) for physical dimensions, then falls back to `Win32_DesktopMonitor`, returning an array of [`MonitorInfo`](./monitor-info.md) objects.
:::

## Signature

```typescript
function getMonitorInfo(): MonitorInfo[];
```

## Return Value

| Type | Description |
|------|-------------|
| [`MonitorInfo[]`](./monitor-info.md) | Array of monitor information objects |

:::warning
`WmiMonitorBasicDisplayParams` is not available on all systems. Headless servers and some virtual machines may only return data from the fallback `Win32_DesktopMonitor` query, which provides less information.
:::

## Usage

Use this function to enumerate connected monitors, determine physical screen sizes, or identify monitor manufacturers.

:::note
This returns monitor hardware information (physical size, manufacturer), not display settings (resolution, refresh rate). For resolution data, see [`getGpuInfo()`](./get-gpu-info.md) which reports `currentHorizontalResolution` and `currentVerticalResolution`.
:::

:::tip
Calculate the diagonal screen size from `screenWidth` and `screenHeight` (in centimeters): `Math.sqrt(w * w + h * h) / 2.54` gives inches.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getMonitorInfo } from '@eisland/windows-hardware-info-helper';

const monitors = getMonitorInfo();
console.log(`${monitors.length} monitor(s) detected:`);
for (const m of monitors) {
  const diag = m.screenWidth && m.screenHeight
    ? `${(Math.sqrt(m.screenWidth ** 2 + m.screenHeight ** 2) / 2.54).toFixed(1)}"`
    : 'size unknown';
  console.log(`  ${m.name} — ${m.manufacturer ?? 'Unknown'} (${diag})`);
}
```

@tab JavaScript

```javascript
const { getMonitorInfo } = require('@eisland/windows-hardware-info-helper');

const monitors = getMonitorInfo();
console.log(`${monitors.length} monitor(s) detected:`);
for (const m of monitors) {
  const diag = m.screenWidth && m.screenHeight
    ? `${(Math.sqrt(m.screenWidth ** 2 + m.screenHeight ** 2) / 2.54).toFixed(1)}"`
    : 'size unknown';
  console.log(`  ${m.name} — ${m.manufacturer ?? 'Unknown'} (${diag})`);
}
```

:::

## Notes

:::note
The `screenWidth` and `screenHeight` values are the **physical panel dimensions** in centimeters, not pixel resolution. These come from the monitor's EDID data via WMI.
:::

:::tip
Monitor manufacturer names are resolved from EDID manufacturer codes (e.g., `0x22F0` → `"Hewlett-Packard"`, `0x26CD` → `"Dell"`). Unknown codes display as `"Unknown (0xNNNN)"`.
:::

:::important
Not all monitors report EDID data correctly. Some generic or older monitors may return `null` for manufacturer and dimensions.
:::

## Danger Avoidance

:::danger
Do not assume `screenWidth` and `screenHeight` are always populated. On systems without `WmiMonitorBasicDisplayParams` support, these fields are `null`. Always null-check before calculations.
:::
