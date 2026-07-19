---
title: GpuInfo
icon: fa6-solid:table
---

# GpuInfo

:::info
`GpuInfo` is an interface representing GPU hardware information returned by [`getGpuInfo()`](./get-gpu-info.md). It contains details about each video controller including name, VRAM, driver version, and current display resolution, populated from the WMI class `Win32_VideoController`.
:::

## Signature

```typescript
interface GpuInfo {
  name: string | null;
  manufacturer: string | null;
  adapterRamBytes: number | null;
  driverVersion: string | null;
  driverDate: string | null;
  videoProcessor: string | null;
  currentHorizontalResolution: number | null;
  currentVerticalResolution: number | null;
  currentRefreshRate: number | null;
  status: string | null;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string \| null` | GPU name (e.g., `"NVIDIA GeForce RTX 4090"`) |
| `manufacturer` | `string \| null` | Adapter compatibility string (e.g., `"NVIDIA"`, `"Advanced Micro Devices"`) |
| `adapterRamBytes` | `number \| null` | Dedicated video memory in bytes |
| `driverVersion` | `string \| null` | Installed driver version string |
| `driverDate` | `string \| null` | Driver release date in `YYYY-MM-DD` format |
| `videoProcessor` | `string \| null` | Video processor model (e.g., `"NVIDIA GeForce RTX 4090"`) |
| `currentHorizontalResolution` | `number \| null` | Current horizontal resolution in pixels |
| `currentVerticalResolution` | `number \| null` | Current vertical resolution in pixels |
| `currentRefreshRate` | `number \| null` | Current refresh rate in Hz |
| `status` | `string \| null` | Device status (e.g., `"OK"`) |

:::note
The `driverDate` field is reformatted from WMI datetime format (`YYYYMMDDHHMMSS.ffffff+ZZZ`) to `YYYY-MM-DD`. Virtual display adapters (e.g., MuMu, Hyper-V) may return `null` for `adapterRamBytes`.
:::

:::tip
Systems with multiple GPUs (e.g., integrated + discrete) return one entry per video controller. Use `adapterRamBytes` to identify the discrete GPU.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getGpuInfo, GpuInfo } from '@eisland/windows-hardware-info-helper';

const gpus: GpuInfo[] = getGpuInfo();
for (const gpu of gpus) {
  console.log(`GPU: ${gpu.name}`);
  console.log(`  VRAM: ${gpu.adapterRamBytes ? `${(gpu.adapterRamBytes / 1073741824).toFixed(1)} GB` : 'N/A'}`);
  console.log(`  Driver: ${gpu.driverVersion}`);
  console.log(`  Resolution: ${gpu.currentHorizontalResolution}x${gpu.currentVerticalResolution}`);
}
```

@tab JavaScript

```javascript
const { getGpuInfo } = require('@eisland/windows-hardware-info-helper');

const gpus = getGpuInfo();
for (const gpu of gpus) {
  console.log(`GPU: ${gpu.name}`);
  console.log(`  VRAM: ${gpu.adapterRamBytes ? `${(gpu.adapterRamBytes / 1073741824).toFixed(1)} GB` : 'N/A'}`);
  console.log(`  Driver: ${gpu.driverVersion}`);
  console.log(`  Resolution: ${gpu.currentHorizontalResolution}x${gpu.currentVerticalResolution}`);
}
```

:::

:::warning
Virtual display adapters (emulators, remote desktop) may appear in the results. Filter by checking if `adapterRamBytes` is non-null to identify physical GPUs.
:::
