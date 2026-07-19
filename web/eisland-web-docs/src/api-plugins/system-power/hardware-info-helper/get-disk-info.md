---
title: getDiskInfo
icon: fa6-solid:code
---

# getDiskInfo

:::info
`getDiskInfo` is a synchronous query function that returns physical disk drive information. It spawns the C# helper EXE which queries `Win32_DiskDrive` via WMI, returning an array of [`DiskInfo`](./disk-info.md) objects.
:::

## Signature

```typescript
function getDiskInfo(): DiskInfo[];
```

## Return Value

| Type | Description |
|------|-------------|
| [`DiskInfo[]`](./disk-info.md) | Array of physical disk information objects |

:::warning
This returns physical disks, not logical volumes. A single disk with 3 partitions still appears as one entry.
:::

## Usage

Use this function to list installed storage devices, check disk models and sizes, or build a hardware inventory.

:::note
This function returns disk hardware information (model, capacity, interface). It does not report partition layouts, file systems, or free space.
:::

:::tip
Use `partitions` to determine if a disk is in use. A disk with 0 partitions is likely unallocated or raw.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getDiskInfo } from '@eisland/windows-hardware-info-helper';

const disks = getDiskInfo();
for (const disk of disks) {
  const sizeGB = (disk.sizeBytes ?? 0) / 1073741824;
  const sizeStr = sizeGB >= 1024 ? `${(sizeGB / 1024).toFixed(1)} TB` : `${sizeGB.toFixed(0)} GB`;
  console.log(`${disk.model} — ${sizeStr}`);
  console.log(`  Interface: ${disk.interfaceType}, Partitions: ${disk.partitions}`);
}
```

@tab JavaScript

```javascript
const { getDiskInfo } = require('@eisland/windows-hardware-info-helper');

const disks = getDiskInfo();
for (const disk of disks) {
  const sizeGB = (disk.sizeBytes ?? 0) / 1073741824;
  const sizeStr = sizeGB >= 1024 ? `${(sizeGB / 1024).toFixed(1)} TB` : `${sizeGB.toFixed(0)} GB`;
  console.log(`${disk.model} — ${sizeStr}`);
  console.log(`  Interface: ${disk.interfaceType}, Partitions: ${disk.partitions}`);
}
```

:::

## Notes

:::note
NVMe drives report `interfaceType` as `"SCSI"` because Windows routes NVMe through the SCSI subsystem. This is expected behavior.
:::

:::tip
USB external drives are included if they report as physical disks. Filter by `interfaceType` if you need only internal drives.
:::

:::important
The `serialNumber` field may be `null` for some drives, especially USB-attached ones or older models that do not expose serial numbers via WMI.
:::

## Danger Avoidance

:::danger
Do not use `sizeBytes` for precise byte-level calculations. WMI reports nominal capacity (e.g., 2TB = 2,000,000,000,000 bytes), which differs from the OS-reported usable capacity due to base-10 vs base-2 conversion.
:::
