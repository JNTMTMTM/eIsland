---
title: MotherboardInfo
icon: fa6-solid:table
---

# MotherboardInfo

:::info
`MotherboardInfo` is an interface representing motherboard (baseboard) information returned by [`getMotherboardInfo()`](./get-motherboard-info.md). It contains manufacturer, model, serial number, and version, populated from the WMI class `Win32_BaseBoard`.
:::

## Signature

```typescript
interface MotherboardInfo {
  manufacturer: string | null;
  product: string | null;
  serialNumber: string | null;
  version: string | null;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `manufacturer` | `string \| null` | Motherboard manufacturer (e.g., `"ASUSTeK COMPUTER INC."`) |
| `product` | `string \| null` | Product/model name (e.g., `"ROG CROSSHAIR X870E HERO"`) |
| `serialNumber` | `string \| null` | Board serial number |
| `version` | `string \| null` | Board revision/version |

:::note
Most consumer systems return a single entry. Dual-socket server boards may return multiple entries — one per baseboard.
:::

:::tip
Combine `manufacturer` and `product` for a display string: `` `${mb.manufacturer} ${mb.product}` ``.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getMotherboardInfo, MotherboardInfo } from '@eisland/windows-hardware-info-helper';

const boards: MotherboardInfo[] = getMotherboardInfo();
for (const board of boards) {
  console.log(`Motherboard: ${board.manufacturer} ${board.product}`);
  console.log(`  Version: ${board.version}`);
  console.log(`  Serial: ${board.serialNumber}`);
}
```

@tab JavaScript

```javascript
const { getMotherboardInfo } = require('@eisland/windows-hardware-info-helper');

const boards = getMotherboardInfo();
for (const board of boards) {
  console.log(`Motherboard: ${board.manufacturer} ${board.product}`);
  console.log(`  Version: ${board.version}`);
  console.log(`  Serial: ${board.serialNumber}`);
}
```

:::

:::warning
Some manufacturers do not populate the `serialNumber` field in BIOS. If `serialNumber` is `null`, it is not available from WMI.
:::
