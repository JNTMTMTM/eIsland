---
title: getNetworkAdapterInfo
icon: fa6-solid:code
---

# getNetworkAdapterInfo

:::info
`getNetworkAdapterInfo` is a synchronous query function that returns physical network adapter information. It spawns the C# helper EXE which queries `Win32_NetworkAdapter` with `PhysicalAdapter = TRUE` via WMI, returning an array of [`NetworkAdapterInfo`](./network-adapter-info.md) objects.
:::

## Signature

```typescript
function getNetworkAdapterInfo(): NetworkAdapterInfo[];
```

## Return Value

| Type | Description |
|------|-------------|
| [`NetworkAdapterInfo[]`](./network-adapter-info.md) | Array of physical network adapter information |

:::warning
Virtual adapters (VPN tunnels, Hyper-V virtual switches, WSL adapters) are filtered out. Only physical hardware adapters are returned.
:::

## Usage

Use this function to enumerate physical network interfaces, display MAC addresses, or check link speeds.

:::note
This returns adapter hardware information, not network configuration (IP addresses, DNS, gateway). For network configuration, use Node.js `os.networkInterfaces()`.
:::

:::tip
The `netConnectionStatus` field is a boolean (`true` = connected). This is derived from WMI's numeric status code (`2` = connected).
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getNetworkAdapterInfo } from '@eisland/windows-hardware-info-helper';

const adapters = getNetworkAdapterInfo();
for (const adapter of adapters) {
  const speedMbps = adapter.speedBps ? `${(adapter.speedBps / 1000000).toFixed(0)} Mbps` : 'N/A';
  console.log(`${adapter.name}`);
  console.log(`  MAC: ${adapter.macAddress ?? 'N/A'}, Speed: ${speedMbps}`);
  console.log(`  Connected: ${adapter.netConnectionStatus ? 'Yes' : 'No'}`);
}
```

@tab JavaScript

```javascript
const { getNetworkAdapterInfo } = require('@eisland/windows-hardware-info-helper');

const adapters = getNetworkAdapterInfo();
for (const adapter of adapters) {
  const speedMbps = adapter.speedBps ? `${(adapter.speedBps / 1000000).toFixed(0)} Mbps` : 'N/A';
  console.log(`${adapter.name}`);
  console.log(`  MAC: ${adapter.macAddress ?? 'N/A'}, Speed: ${speedMbps}`);
  console.log(`  Connected: ${adapter.netConnectionStatus ? 'Yes' : 'No'}`);
}
```

:::

## Notes

:::note
Wi-Fi adapters appear alongside Ethernet adapters. The `adapterType` field distinguishes them (e.g., `"以太网 802.3"` for Ethernet, `"IEEE 802.11"` for Wi-Fi).
:::

:::tip
Disconnected adapters may report `null` for `speedBps` and `macAddress`. Always null-check before formatting.
:::

:::important
The `speedBps` value is the current negotiated link speed, not the adapter's maximum theoretical speed. A 2.5 Gbps adapter connected to a 1 Gbps switch reports `1000000000`.
:::

## Danger Avoidance

:::danger
Do not use `pnpDeviceId` as a stable identifier across reboots. PnP IDs can change if hardware is moved to different slots or ports.
:::
