---
title: MemorySlotInfo
icon: fa6-solid:table
---

# MemorySlotInfo

:::info
`MemorySlotInfo` is an interface representing physical memory slot information returned by [`getMemoryInfo()`](./get-memory-info.md). Each entry corresponds to one installed RAM stick, populated from the WMI class `Win32_PhysicalMemory`.
:::

## Signature

```typescript
interface MemorySlotInfo {
  deviceLocator: string | null;
  manufacturer: string | null;
  capacityBytes: number | null;
  speedMhz: number | null;
  memoryType: string | null;
  formFactor: string | null;
  dataWidth: number | null;
  partNumber: string | null;
  serialNumber: string | null;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `deviceLocator` | `string \| null` | Physical slot location (e.g., `"DIMM 1"`, `"DIMM A1"`) |
| `manufacturer` | `string \| null` | RAM manufacturer (e.g., `"G Skill Intl"`, `"Corsair"`) |
| `capacityBytes` | `number \| null` | Module capacity in bytes |
| `speedMhz` | `number \| null` | Rated speed in MHz (e.g., `4800`, `6000`) |
| `memoryType` | `string \| null` | Memory type: `"DDR"`, `"DDR2"`, `"DDR3"`, `"DDR4"`, `"DDR5"` |
| `formFactor` | `string \| null` | Physical form factor: `"DIMM"` (desktop) or `"SODIMM"` (laptop) |
| `dataWidth` | `number \| null` | Data bus width in bits (e.g., `64`) |
| `partNumber` | `string \| null` | Manufacturer part number |
| `serialNumber` | `string \| null` | Module serial number |

:::note
The `memoryType` field is mapped from WMI numeric codes to human-readable strings. DDR4 = `26`, DDR5 = `30`. Some systems may return the raw numeric code if the mapping is unknown.
:::

:::tip
To calculate total installed RAM, sum the `capacityBytes` of all entries: `getMemoryInfo().reduce((sum, m) => sum + (m.capacityBytes ?? 0), 0)`.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getMemoryInfo, MemorySlotInfo } from '@eisland/windows-hardware-info-helper';

const slots: MemorySlotInfo[] = getMemoryInfo();
let totalBytes = 0;
for (const slot of slots) {
  const gb = slot.capacityBytes ? (slot.capacityBytes / 1073741824).toFixed(0) : '?';
  console.log(`${slot.deviceLocator}: ${gb} GB ${slot.memoryType ?? ''} @ ${slot.speedMhz ?? '?'} MHz`);
  totalBytes += slot.capacityBytes ?? 0;
}
console.log(`Total: ${(totalBytes / 1073741824).toFixed(0)} GB across ${slots.length} slot(s)`);
```

@tab JavaScript

```javascript
const { getMemoryInfo } = require('@eisland/windows-hardware-info-helper');

const slots = getMemoryInfo();
let totalBytes = 0;
for (const slot of slots) {
  const gb = slot.capacityBytes ? (slot.capacityBytes / 1073741824).toFixed(0) : '?';
  console.log(`${slot.deviceLocator}: ${gb} GB ${slot.memoryType ?? ''} @ ${slot.speedMhz ?? '?'} MHz`);
  totalBytes += slot.capacityBytes ?? 0;
}
console.log(`Total: ${(totalBytes / 1073741824).toFixed(0)} GB across ${slots.length} slot(s)`);
```

:::

:::warning
Empty DIMM slots are not reported — only physically installed modules appear. If you have 4 slots but 2 sticks, the array length is 2.
:::
