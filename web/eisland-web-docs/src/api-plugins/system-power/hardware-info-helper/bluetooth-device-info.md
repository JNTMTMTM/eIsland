---
title: BluetoothDeviceInfo
icon: fa6-solid:table
---

# BluetoothDeviceInfo

:::info
`BluetoothDeviceInfo` is an interface representing Bluetooth Plug and Play (PnP) entities returned by [`getBluetoothDevices()`](./get-bluetooth-devices.md). It enumerates all devices known to the system via WMI `Win32_PnPEntity` with `PNPClass = 'Bluetooth'`, including radios, adapters, stack components, and user-paired peripherals. This is a simplified view — for full Bluetooth monitoring with connection state tracking, use the [Bluetooth Helper](../../connectivity/bluetooth-helper.md) plugin instead.
:::

## Signature

```typescript
interface BluetoothDeviceInfo {
  name: string | null;
  deviceId: string | null;
  pnpDeviceId: string | null;
  status: string | null;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string \| null` | Device display name (e.g., `"Bose Mini II SoundLink"`) |
| `deviceId` | `string \| null` | Windows device identifier |
| `pnpDeviceId` | `string \| null` | PnP device identifier |
| `status` | `string \| null` | Device status (e.g., `"OK"`, `"Error"`) |

:::note
This interface provides basic Bluetooth device enumeration via WMI. It does not include connection state, signal strength, or battery level. Use [`@eisland/windows-bluetooth-helper`](../../connectivity/bluetooth-helper.md) for richer Bluetooth data.
:::

:::tip
Use this function for quick device listing in a system info panel. For real-time connection monitoring, use `BluetoothMonitor` from the Bluetooth Helper plugin.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getBluetoothDevices, BluetoothDeviceInfo } from '@eisland/windows-hardware-info-helper';

const devices: BluetoothDeviceInfo[] = getBluetoothDevices();
console.log(`Found ${devices.length} Bluetooth device(s):`);
for (const device of devices) {
  console.log(`  ${device.name ?? 'Unknown'} — ${device.status}`);
}
```

@tab JavaScript

```javascript
const { getBluetoothDevices } = require('@eisland/windows-hardware-info-helper');

const devices = getBluetoothDevices();
console.log(`Found ${devices.length} Bluetooth device(s):`);
for (const device of devices) {
  console.log(`  ${device.name ?? 'Unknown'} — ${device.status}`);
}
```

:::

:::warning
This returns all Bluetooth PnP entities, including Bluetooth radios and HCI devices, not just user-paired peripherals. Filter by `status === 'OK'` for active devices.
:::
