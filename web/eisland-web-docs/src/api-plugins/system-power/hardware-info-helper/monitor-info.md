---
title: MonitorInfo
icon: fa6-solid:table
---

# MonitorInfo

:::info
`MonitorInfo` is an interface representing display monitor information returned by [`getMonitorInfo()`](./get-monitor-info.md). It first attempts to read from `WmiMonitorBasicDisplayParams` (root\wmi namespace) for physical dimensions, then falls back to `Win32_DesktopMonitor` if unavailable.
:::

## Signature

```typescript
interface MonitorInfo {
  name: string | null;
  manufacturer: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  pnpDeviceId: string | null;
  status: string | null;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string \| null` | Monitor name (e.g., `"Monitor 1"`, or from WMI class) |
| `manufacturer` | `string \| null` | Monitor manufacturer from EDID data |
| `screenWidth` | `number \| null` | Physical screen width in centimeters |
| `screenHeight` | `number \| null` | Physical screen height in centimeters |
| `pnpDeviceId` | `string \| null` | PnP device identifier |
| `status` | `string \| null` | Device status (from fallback query only) |

:::note
The `screenWidth` and `screenHeight` values represent the **physical panel size** in centimeters (from EDID), not the pixel resolution. To calculate diagonal inches: `Math.sqrt(width² + height²) / 2.54`.
:::

:::tip
When `WmiMonitorBasicDisplayParams` is available, manufacturer names are resolved from EDID manufacturer codes (e.g., `0x22F0` → `"Hewlett-Packard"`). Some monitors may return `null` if their EDID data is incomplete.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getMonitorInfo, MonitorInfo } from '@eisland/windows-hardware-info-helper';

const monitors: MonitorInfo[] = getMonitorInfo();
console.log(`Found ${monitors.length} monitor(s):`);
for (const monitor of monitors) {
  const diagCm = monitor.screenWidth && monitor.screenHeight
    ? Math.sqrt(monitor.screenWidth ** 2 + monitor.screenHeight ** 2)
    : null;
  const diagInch = diagCm ? (diagCm / 2.54).toFixed(1) : '?';
  console.log(`  ${monitor.name} — ${diagInch}" (${monitor.manufacturer ?? 'Unknown'})`);
}
```

@tab JavaScript

```javascript
const { getMonitorInfo } = require('@eisland/windows-hardware-info-helper');

const monitors = getMonitorInfo();
console.log(`Found ${monitors.length} monitor(s):`);
for (const monitor of monitors) {
  const diagCm = monitor.screenWidth && monitor.screenHeight
    ? Math.sqrt(monitor.screenWidth ** 2 + monitor.screenHeight ** 2)
    : null;
  const diagInch = diagCm ? (diagCm / 2.54).toFixed(1) : '?';
  console.log(`  ${monitor.name} — ${diagInch}" (${monitor.manufacturer ?? 'Unknown'})`);
}
```

:::

:::warning
`WmiMonitorBasicDisplayParams` is not available on all systems (e.g., headless servers, some virtual machines). The fallback `Win32_DesktopMonitor` provides less data — `screenWidth`, `screenHeight`, and `manufacturer` may all be `null`.
:::
