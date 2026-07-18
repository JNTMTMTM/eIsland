---
title: NetworkAdapterInfo
icon: fa6-solid:table
---

# NetworkAdapterInfo

:::info
`NetworkAdapterInfo` is an interface representing physical network adapter information returned by [`getNetworkAdapterInfo()`](./get-network-adapter-info.md). Only physical adapters are included (virtual adapters are filtered out), populated from the WMI class `Win32_NetworkAdapter` with `PhysicalAdapter = TRUE`.
:::

## Signature

```typescript
interface NetworkAdapterInfo {
  name: string | null;
  manufacturer: string | null;
  macAddress: string | null;
  adapterType: string | null;
  speedBps: number | null;
  netConnectionStatus: boolean | null;
  pnpDeviceId: string | null;
  status: string | null;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string \| null` | Adapter name (e.g., `"Intel(R) Ethernet Controller I226-V"`) |
| `manufacturer` | `string \| null` | Adapter manufacturer (e.g., `"Intel"`, `"Realtek"`) |
| `macAddress` | `string \| null` | MAC address in `XX:XX:XX:XX:XX:XX` format |
| `adapterType` | `string \| null` | Adapter type (e.g., `"以太网 802.3"`, `"IEEE 802.11"`) |
| `speedBps` | `number \| null` | Link speed in bits per second |
| `netConnectionStatus` | `boolean \| null` | `true` if connected, `false` if disconnected |
| `pnpDeviceId` | `string \| null` | PnP device identifier |
| `status` | `string \| null` | Device status (e.g., `"OK"`) |

:::note
The `speedBps` field represents the current negotiated link speed, not the adapter's maximum capability. A 1 Gbps adapter connected at 100 Mbps will report `100000000`.
:::

:::tip
Virtual adapters (VPN, Hyper-V, WSL) are excluded by the `PhysicalAdapter = TRUE` filter. If you need virtual adapters, use the raw WMI class directly.
:::

## Example

::: code-tabs

@tab TypeScript

```typescript
import { getNetworkAdapterInfo, NetworkAdapterInfo } from '@eisland/windows-hardware-info-helper';

const adapters: NetworkAdapterInfo[] = getNetworkAdapterInfo();
for (const adapter of adapters) {
  const speedMbps = adapter.speedBps ? (adapter.speedBps / 1000000).toFixed(0) : '?';
  console.log(`${adapter.name}`);
  console.log(`  MAC: ${adapter.macAddress}, Speed: ${speedMbps} Mbps`);
  console.log(`  Connected: ${adapter.netConnectionStatus}`);
}
```

@tab JavaScript

```javascript
const { getNetworkAdapterInfo } = require('@eisland/windows-hardware-info-helper');

const adapters = getNetworkAdapterInfo();
for (const adapter of adapters) {
  const speedMbps = adapter.speedBps ? (adapter.speedBps / 1000000).toFixed(0) : '?';
  console.log(`${adapter.name}`);
  console.log(`  MAC: ${adapter.macAddress}, Speed: ${speedMbps} Mbps`);
  console.log(`  Connected: ${adapter.netConnectionStatus}`);
}
```

:::

:::warning
Disconnected adapters may return `null` for `speedBps` and `macAddress`. Always null-check before using these values.
:::
