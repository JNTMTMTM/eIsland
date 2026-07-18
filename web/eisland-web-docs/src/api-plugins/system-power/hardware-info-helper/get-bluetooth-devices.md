---
title: getBluetoothDevices
icon: fa6-solid:code
---

# getBluetoothDevices

:::info
`getBluetoothDevices` is a synchronous query function that returns Bluetooth device information via WMI. It spawns the C# helper EXE which queries `Win32_PnPEntity` with `PNPClass = 'Bluetooth'`, returning an array of [`BluetoothDeviceInfo`](./bluetooth-device-info.md) objects.
:::

## Signature

```typescript
function getBluetoothDevices(): BluetoothDeviceInfo[];
```

## Return Value

| Type | Description |
|------|-------------|
| [`BluetoothDeviceInfo[]`](./bluetooth-device-info.md) | Array of Bluetooth device information |

:::warning
This returns all Bluetooth PnP entities — including Bluetooth radios, HCI devices, and protocol drivers — not just user-paired peripherals.
:::

## Usage

Use this function for a quick overview of Bluetooth devices on the system. For richer data (connection state, signal strength, battery level), use [`@eisland/windows-bluetooth-helper`](../../connectivity/bluetooth-helper.md).

:::note
This is a lightweight query using WMI, suitable for system info panels. The Bluetooth Helper plugin uses WinRT APIs for more detailed enumeration and real-time monitoring.
:::

:::tip
Filter by `status === 'OK'` to show only active, functioning devices.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getBluetoothDevices } from '@eisland/windows-hardware-info-helper';

const devices = getBluetoothDevices();
const active = devices.filter(d => d.status === 'OK');
console.log(`Bluetooth devices: ${active.length} active / ${devices.length} total`);
for (const device of active) {
  console.log(`  ${device.name ?? 'Unknown device'}`);
}
```

@tab JavaScript

```javascript
const { getBluetoothDevices } = require('@eisland/windows-hardware-info-helper');

const devices = getBluetoothDevices();
const active = devices.filter(d => d.status === 'OK');
console.log(`Bluetooth devices: ${active.length} active / ${devices.length} total`);
for (const device of active) {
  console.log(`  ${device.name ?? 'Unknown device'}`);
}
```

:::

## Notes

:::note
The `deviceId` and `pnpDeviceId` fields are typically identical for Bluetooth PnP entities.
:::

:::tip
For real-time Bluetooth monitoring (device connect/disconnect events), use the `BluetoothMonitor` class from `@eisland/windows-bluetooth-helper`.
:::

:::important
This function queries the `Win32_PnPEntity` WMI class, not the WinRT `Windows.Devices.Bluetooth` API. It provides a system-level view of Bluetooth stack components.
:::

## Danger Avoidance

:::danger
Do not use this function as the sole source for user-facing Bluetooth device lists. It includes low-level Bluetooth stack components (radios, HCI, protocol drivers) that users don't expect to see. Filter by name patterns or use the Bluetooth Helper plugin for user-facing lists.
:::
