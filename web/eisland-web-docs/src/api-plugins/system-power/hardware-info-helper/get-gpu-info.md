---
title: getGpuInfo
icon: fa6-solid:code
---

# getGpuInfo

:::info
`getGpuInfo` is a synchronous query function that returns GPU hardware information. It spawns the C# helper EXE which queries `Win32_VideoController` via WMI, returning an array of [`GpuInfo`](./gpu-info.md) objects.
:::

## Signature

```typescript
function getGpuInfo(): GpuInfo[];
```

## Return Value

| Type | Description |
|------|-------------|
| [`GpuInfo[]`](./gpu-info.md) | Array of GPU information objects (one per video controller) |

:::warning
Virtual display adapters (emulators, remote desktop, Hyper-V) are included in the results. Filter by checking `adapterRamBytes !== null` to identify physical GPUs.
:::

## Usage

Use this function to display GPU specifications, identify installed graphics hardware, or check driver versions.

:::note
This returns video controller data, not display output information. For connected display details, use [`getMonitorInfo()`](./get-monitor-info.md).
:::

:::tip
Systems with hybrid graphics (integrated + discrete) return multiple entries. The discrete GPU typically has a larger `adapterRamBytes` value.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getGpuInfo } from '@eisland/windows-hardware-info-helper';

const gpus = getGpuInfo();
for (const gpu of gpus) {
  if (gpu.adapterRamBytes === null) continue; // skip virtual adapters
  const vramGB = (gpu.adapterRamBytes / 1073741824).toFixed(1);
  console.log(`${gpu.name} — ${vramGB} GB VRAM`);
  console.log(`Driver: ${gpu.driverVersion} (${gpu.driverDate})`);
}
```

@tab JavaScript

```javascript
const { getGpuInfo } = require('@eisland/windows-hardware-info-helper');

const gpus = getGpuInfo();
for (const gpu of gpus) {
  if (gpu.adapterRamBytes === null) continue; // skip virtual adapters
  const vramGB = (gpu.adapterRamBytes / 1073741824).toFixed(1);
  console.log(`${gpu.name} — ${vramGB} GB VRAM`);
  console.log(`Driver: ${gpu.driverVersion} (${gpu.driverDate})`);
}
```

:::

## Notes

:::note
The `driverDate` field is formatted as `YYYY-MM-DD`. WMI stores dates in a proprietary format — the EXE helper handles the conversion.
:::

:::tip
Compare `driverDate` against the latest available driver version to determine if an update is needed.
:::

:::important
`adapterRamBytes` may report a capped value (e.g., 4 GB) for GPUs with more VRAM due to WMI limitations. For accurate VRAM on NVIDIA/AMD GPUs, use vendor-specific APIs.
:::

## Danger Avoidance

:::danger
Do not assume `adapterRamBytes` is always accurate. Some drivers report truncated values. Always treat it as an approximation.
:::
