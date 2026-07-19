---
title: getMotherboardInfo
icon: fa6-solid:code
---

# getMotherboardInfo

:::info
`getMotherboardInfo` is a synchronous query function that returns motherboard (baseboard) information. It spawns the C# helper EXE which queries `Win32_BaseBoard` via WMI, returning an array of [`MotherboardInfo`](./motherboard-info.md) objects.
:::

## Signature

```typescript
function getMotherboardInfo(): MotherboardInfo[];
```

## Return Value

| Type | Description |
|------|-------------|
| [`MotherboardInfo[]`](./motherboard-info.md) | Array of motherboard information objects |

:::warning
Most consumer systems return a single entry. Dual-socket server boards or systems with daughterboards may return multiple entries.
:::

## Usage

Use this function to identify the motherboard model, check the manufacturer, or display system board information.

:::note
This returns baseboard information only. For BIOS/UEFI version details, a separate WMI query on `Win32_BIOS` would be needed (not provided by this plugin).
:::

:::tip
Combine with [`getCpuInfo()`](./get-cpu-info.md) to build a complete system identification summary.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getMotherboardInfo } from '@eisland/windows-hardware-info-helper';

const boards = getMotherboardInfo();
if (boards.length > 0) {
  const mb = boards[0];
  console.log(`Motherboard: ${mb.manufacturer} ${mb.product}`);
  console.log(`Version: ${mb.version ?? 'N/A'}`);
}
```

@tab JavaScript

```javascript
const { getMotherboardInfo } = require('@eisland/windows-hardware-info-helper');

const boards = getMotherboardInfo();
if (boards.length > 0) {
  const mb = boards[0];
  console.log(`Motherboard: ${mb.manufacturer} ${mb.product}`);
  console.log(`Version: ${mb.version ?? 'N/A'}`);
}
```

:::

## Notes

:::note
The `serialNumber` field is often `null` on consumer boards. Some manufacturers do not program the serial number into BIOS.
:::

:::tip
The `product` field contains the marketing model name (e.g., `"ROG CROSSHAIR X870E HERO"`), which is the most useful identifier for user-facing displays.
:::

:::important
WMI `Win32_BaseBoard` is populated by the BIOS/UEFI. If the board manufacturer did not fill in the SMBIOS data, some fields may be generic or `null`.
:::

## Danger Avoidance

:::danger
Do not rely on `serialNumber` for unique identification. Some manufacturers use placeholder values like `"To Be Filled By O.E.M."` or leave it empty.
:::
