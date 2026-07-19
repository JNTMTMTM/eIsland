---
title: getMemoryInfo
icon: fa6-solid:code
---

# getMemoryInfo

:::info
`getMemoryInfo` is a synchronous query function that returns physical memory slot information. It spawns the C# helper EXE which queries `Win32_PhysicalMemory` via WMI, returning an array of [`MemorySlotInfo`](./memory-slot-info.md) objects.
:::

## Signature

```typescript
function getMemoryInfo(): MemorySlotInfo[];
```

## Return Value

| Type | Description |
|------|-------------|
| [`MemorySlotInfo[]`](./memory-slot-info.md) | Array of memory slot information (one per installed RAM stick) |

:::warning
Empty DIMM slots are not reported. A system with 4 slots and 2 sticks returns an array of length 2.
:::

## Usage

Use this function to display installed RAM details, check memory configuration, or verify that all slots are populated.

:::note
This returns physical memory module data, not runtime memory usage. For current memory utilization, use [`getMemory()`](../performance-monitor/get-memory.md) from the Performance Monitor plugin.
:::

:::tip
Sum `capacityBytes` across all entries to calculate total installed RAM.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getMemoryInfo } from '@eisland/windows-hardware-info-helper';

const slots = getMemoryInfo();
let totalGB = 0;
for (const slot of slots) {
  const gb = (slot.capacityBytes ?? 0) / 1073741824;
  totalGB += gb;
  console.log(`${slot.deviceLocator}: ${gb.toFixed(0)} GB ${slot.memoryType ?? ''} @ ${slot.speedMhz ?? '?'} MHz`);
}
console.log(`\nTotal: ${totalGB.toFixed(0)} GB across ${slots.length} module(s)`);
```

@tab JavaScript

```javascript
const { getMemoryInfo } = require('@eisland/windows-hardware-info-helper');

const slots = getMemoryInfo();
let totalGB = 0;
for (const slot of slots) {
  const gb = (slot.capacityBytes ?? 0) / 1073741824;
  totalGB += gb;
  console.log(`${slot.deviceLocator}: ${gb.toFixed(0)} GB ${slot.memoryType ?? ''} @ ${slot.speedMhz ?? '?'} MHz`);
}
console.log(`\nTotal: ${totalGB.toFixed(0)} GB across ${slots.length} module(s)`);
```

:::

## Notes

:::note
The `memoryType` field is mapped from WMI codes to strings: `"DDR"`, `"DDR2"`, `"DDR3"`, `"DDR4"`, `"DDR5"`. Unknown codes fall back to the raw number.
:::

:::tip
Use `partNumber` to look up the exact module specifications from the manufacturer's website.
:::

:::important
`speedMhz` is the rated speed, not the actual running speed. XMP/EXPO profiles may cause the actual speed to differ from the JEDEC specification.
:::

## Danger Avoidance

:::danger
Do not assume all modules have the same speed or capacity. Mixed configurations are common. Always iterate over all entries rather than reading only the first one.
:::
