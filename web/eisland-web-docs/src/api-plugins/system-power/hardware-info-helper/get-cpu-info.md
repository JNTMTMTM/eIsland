---
title: getCpuInfo
icon: fa6-solid:code
---

# getCpuInfo

:::info
`getCpuInfo` is a synchronous query function that returns CPU hardware information. It spawns the C# helper EXE which queries `Win32_Processor` via WMI, returning an array of [`CpuInfo`](./cpu-info.md) objects.
:::

## Signature

```typescript
function getCpuInfo(): CpuInfo[];
```

## Return Value

| Type | Description |
|------|-------------|
| [`CpuInfo[]`](./cpu-info.md) | Array of CPU information objects (one per physical processor) |

:::warning
All properties in the returned objects may be `null` if the corresponding WMI property is not available on the system.
:::

## Usage

Use this function to display CPU specifications in a system information panel, hardware inventory, or diagnostic tool.

:::note
This function returns static hardware specifications (model name, core count, max clock speed), not real-time metrics like current CPU usage. For real-time CPU monitoring, use [`getCpu()`](../performance-monitor/get-cpu.md) from the Performance Monitor plugin.
:::

:::tip
On most consumer systems, the returned array contains exactly one element. Multi-socket server boards may return multiple entries.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getCpuInfo } from '@eisland/windows-hardware-info-helper';

const cpus = getCpuInfo();
if (cpus.length > 0) {
  const cpu = cpus[0];
  console.log(`${cpu.name}`);
  console.log(`${cpu.numberOfCores} cores / ${cpu.numberOfLogicalProcessors} threads`);
  console.log(`Up to ${cpu.maxClockSpeedMhz} MHz`);
}
```

@tab JavaScript

```javascript
const { getCpuInfo } = require('@eisland/windows-hardware-info-helper');

const cpus = getCpuInfo();
if (cpus.length > 0) {
  const cpu = cpus[0];
  console.log(`${cpu.name}`);
  console.log(`${cpu.numberOfCores} cores / ${cpu.numberOfLogicalProcessors} threads`);
  console.log(`Up to ${cpu.maxClockSpeedMhz} MHz`);
}
```

:::

## Notes

:::note
The function synchronously spawns a child process. Typical execution time is 200-500ms. Avoid calling it in tight loops or on every frame.
:::

:::tip
Cache the result if you need to display it in multiple places — the hardware configuration does not change during a session.
:::

:::important
This function requires the .NET runtime and the built C# EXE. If the EXE is not found, the function returns an empty array `[]`.
:::

## Danger Avoidance

:::danger
Do not call `getCpuInfo()` in a polling loop or animation frame. Each call spawns a new process, which is expensive. Cache the result and reuse it.
:::
