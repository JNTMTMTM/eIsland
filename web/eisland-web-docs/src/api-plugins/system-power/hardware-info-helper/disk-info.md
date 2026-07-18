---
title: DiskInfo
icon: fa6-solid:table
---

# DiskInfo

:::info
`DiskInfo` is an interface representing physical disk drive information returned by [`getDiskInfo()`](./get-disk-info.md). Each entry corresponds to one physical disk (HDD, SSD, NVMe), populated from the WMI class `Win32_DiskDrive`.
:::

## Signature

```typescript
interface DiskInfo {
  model: string | null;
  manufacturer: string | null;
  sizeBytes: number | null;
  mediaType: string | null;
  interfaceType: string | null;
  partitions: number | null;
  serialNumber: string | null;
  status: string | null;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `model` | `string \| null` | Disk model name (e.g., `"Samsung SSD 9100 PRO 2TB"`) |
| `manufacturer` | `string \| null` | Manufacturer string from WMI |
| `sizeBytes` | `number \| null` | Total disk size in bytes |
| `mediaType` | `string \| null` | Media type (e.g., `"Fixed hard disk media"`) |
| `interfaceType` | `string \| null` | Interface type (e.g., `"SCSI"`, `"USB"`) |
| `partitions` | `number \| null` | Number of partitions on the disk |
| `serialNumber` | `string \| null` | Disk serial number |
| `status` | `string \| null` | Device status (e.g., `"OK"`) |

:::note
NVMe drives typically report `interfaceType` as `"SCSI"` because Windows routes them through the SCSI subsystem. Use the `model` string to identify NVMe drives specifically.
:::

:::tip
To display human-readable sizes, convert `sizeBytes`: `(sizeBytes / 1099511627776).toFixed(1) + ' TB'` for terabytes or `(sizeBytes / 1073741824).toFixed(0) + ' GB'` for gigabytes.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getDiskInfo, DiskInfo } from '@eisland/windows-hardware-info-helper';

const disks: DiskInfo[] = getDiskInfo();
for (const disk of disks) {
  const sizeGB = disk.sizeBytes ? (disk.sizeBytes / 1073741824).toFixed(0) : '?';
  console.log(`${disk.model} — ${sizeGB} GB`);
  console.log(`  Interface: ${disk.interfaceType}, Partitions: ${disk.partitions}`);
}
```

@tab JavaScript

```javascript
const { getDiskInfo } = require('@eisland/windows-hardware-info-helper');

const disks = getDiskInfo();
for (const disk of disks) {
  const sizeGB = disk.sizeBytes ? (disk.sizeBytes / 1073741824).toFixed(0) : '?';
  console.log(`${disk.model} — ${sizeGB} GB`);
  console.log(`  Interface: ${disk.interfaceType}, Partitions: ${disk.partitions}`);
}
```

:::

:::warning
This returns physical disk drives, not logical volumes. A single physical disk may contain multiple partitions/drives (C:, D:, etc.). Use `partitions` to see how many.
:::
