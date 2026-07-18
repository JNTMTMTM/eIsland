---
title: CpuInfo
icon: fa6-solid:table
---

# CpuInfo

:::info
`CpuInfo` is an interface representing CPU hardware information returned by [`getCpuInfo()`](./get-cpu-info.md). It contains details about the processor including name, core count, clock speeds, and cache sizes, populated from the WMI class `Win32_Processor`.
:::

## Signature

```typescript
interface CpuInfo {
  name: string | null;
  manufacturer: string | null;
  numberOfCores: number | null;
  numberOfLogicalProcessors: number | null;
  maxClockSpeedMhz: number | null;
  currentClockSpeedMhz: number | null;
  socketDesignation: string | null;
  architecture: string | null;
  l2CacheSizeKb: number | null;
  l3CacheSizeKb: number | null;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string \| null` | Full processor name (e.g., `"AMD Ryzen 9 9950X3D 16-Core Processor"`) |
| `manufacturer` | `string \| null` | CPU manufacturer (e.g., `"AuthenticAMD"`, `"GenuineIntel"`) |
| `numberOfCores` | `number \| null` | Physical core count |
| `numberOfLogicalProcessors` | `number \| null` | Logical processor count (includes hyperthreading) |
| `maxClockSpeedMhz` | `number \| null` | Maximum clock speed in MHz |
| `currentClockSpeedMhz` | `number \| null` | Current clock speed in MHz |
| `socketDesignation` | `string \| null` | CPU socket type (e.g., `"AM5"`, `"LGA1700"`) |
| `architecture` | `string \| null` | Processor architecture (e.g., `"x64"`, `"ARM64"`, `"x86"`) |
| `l2CacheSizeKb` | `number \| null` | L2 cache size in kilobytes |
| `l3CacheSizeKb` | `number \| null` | L3 cache size in kilobytes |

:::note
The `architecture` field is mapped from WMI numeric codes to human-readable strings. Values include `"x86"`, `"x64"`, `"ARM"`, `"ARM64"`, `"MIPS"`, `"Alpha"`, `"PowerPC"`, and `"ia64"`.
:::

:::tip
To distinguish physical cores from logical processors, compare `numberOfCores` with `numberOfLogicalProcessors`. If they differ, the CPU supports simultaneous multithreading (SMT/Hyper-Threading).
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getCpuInfo, CpuInfo } from '@eisland/windows-hardware-info-helper';

const cpus: CpuInfo[] = getCpuInfo();
for (const cpu of cpus) {
  console.log(`CPU: ${cpu.name}`);
  console.log(`  Cores: ${cpu.numberOfCores} / Threads: ${cpu.numberOfLogicalProcessors}`);
  console.log(`  Max Clock: ${cpu.maxClockSpeedMhz} MHz`);
  console.log(`  Architecture: ${cpu.architecture}`);
}
```

@tab JavaScript

```javascript
const { getCpuInfo } = require('@eisland/windows-hardware-info-helper');

const cpus = getCpuInfo();
for (const cpu of cpus) {
  console.log(`CPU: ${cpu.name}`);
  console.log(`  Cores: ${cpu.numberOfCores} / Threads: ${cpu.numberOfLogicalProcessors}`);
  console.log(`  Max Clock: ${cpu.maxClockSpeedMhz} MHz`);
  console.log(`  Architecture: ${cpu.architecture}`);
}
```

:::

:::warning
On multi-socket systems, `getCpuInfo()` returns one entry per physical processor. Most consumer systems have a single CPU, so the array typically contains one element.
:::
