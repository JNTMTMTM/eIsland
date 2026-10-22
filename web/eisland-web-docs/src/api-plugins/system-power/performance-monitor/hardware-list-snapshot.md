---
watermark: true
title: HardwareListSnapshot
icon: fa6-solid:table
---

# HardwareListSnapshot

:::info Introduction
`HardwareListSnapshot` is a data structure returned by [`getHardwareListAsync()`](./get-hardware-list.md). It provides a snapshot of all detected CPU and GPU hardware devices on the system, powered by the Libre Hardware Monitor backend. Use this interface to enumerate available hardware before querying per-device metrics such as temperature readings.
:::

## Interface Introduction

You receive a `HardwareListSnapshot` object every time you call `getHardwareListAsync()`. It tells you whether the hardware detection backend is available, and lists all discovered CPUs and GPUs as [`HardwareDevice`](./hardware-device.md) arrays. This is the entry point for mapping temperature readings (from [`TemperatureReading`](./temperature-reading.md)) back to the physical hardware they belong to.

```ts
// The shape returned by getHardwareListAsync()
interface HardwareListSnapshot {
  readonly isAvailable: boolean;        // true if Libre Hardware Monitor backend responded
  readonly cpus: readonly HardwareDevice[];      // all detected CPU devices
  readonly gpus: readonly HardwareDevice[];      // all detected GPU devices
}
```

## Usage

`getHardwareListAsync()` waits for initial discovery, then reuses the frozen hardware-list cache. The synchronous `getHardwareList()` returns the cache immediately and starts discovery while no available list is cached; its initial `isAvailable: false` does not establish that hardware is unsupported. Discovery shares requests with temperature refreshes, including their two-second cache and ten-second failure backoff. Call `dispose()` when finished to stop the helper and clear both caches.

The typical workflow is:

1. Await `getHardwareListAsync()` to obtain the snapshot.
2. Check `isAvailable` — if `false`, the backend is not running or lacks permissions.
3. Iterate over `cpus` and `gpus` to discover hardware identifiers.
4. Use the device `id` values to correlate with temperature readings from `getTemperature()`.

:::tip Combine with Temperature Data
After retrieving the hardware list, cross-reference the `id` of each device with `TemperatureReading.id` from `getTemperature()` to attach thermal data to specific hardware.
:::

:::note Backend Availability
`isAvailable` is `false` when Libre Hardware Monitor is not installed, not running, or the process lacks administrative privileges. Always guard your code with this check before accessing the arrays.
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `isAvailable` | `boolean` | Whether the Libre Hardware Monitor backend is available and responsive. |
| `cpus` | [`HardwareDevice[]`](./hardware-device.md) | Array of detected CPU hardware devices. May be empty even when `isAvailable` is `true` if no CPUs were enumerable. |
| `gpus` | [`HardwareDevice[]`](./hardware-device.md) | Array of detected GPU hardware devices. May be empty even when `isAvailable` is `true` if no GPUs were enumerable. |

:::warning Empty Arrays
When `isAvailable` is `true`, the `cpus` and `gpus` arrays are still guaranteed to be valid arrays, but they may be empty. Always check `.length` before accessing elements by index.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getHardwareListAsync } from '@eisland/windows-performance-monitor';

async function main() {
  // Retrieve the current hardware list snapshot
  const hw = await getHardwareListAsync();

  // Check if the backend is available
  if (!hw.isAvailable) {
    console.log('Hardware detection unavailable — check Libre Hardware Monitor');
  } else {
    // Iterate over detected CPUs
    for (const cpu of hw.cpus) {
      // Each device has an id, name, category, and hardwareType
      console.log(`CPU: ${cpu.name} (${cpu.hardwareType}), id=${cpu.id}`);
    }

    // Iterate over detected GPUs
    for (const gpu of hw.gpus) {
      console.log(`GPU: ${gpu.name} (${gpu.hardwareType}), id=${gpu.id}`);
    }

    // Summary counts
    console.log(`Total: ${hw.cpus.length} CPU(s), ${hw.gpus.length} GPU(s)`);
  }
}

main().catch(console.error);
```

@tab JavaScript

```js
const { getHardwareListAsync } = require('@eisland/windows-performance-monitor');

async function main() {
  // Retrieve the current hardware list snapshot
  const hw = await getHardwareListAsync();

  // Check if the backend is available
  if (!hw.isAvailable) {
    console.log('Hardware detection unavailable — check Libre Hardware Monitor');
  } else {
    // Iterate over detected CPUs
    for (const cpu of hw.cpus) {
      // Each device has an id, name, category, and hardwareType
      console.log(`CPU: ${cpu.name} (${cpu.hardwareType}), id=${cpu.id}`);
    }

    // Iterate over detected GPUs
    for (const gpu of hw.gpus) {
      console.log(`GPU: ${gpu.name} (${gpu.hardwareType}), id=${gpu.id}`);
    }

    // Summary counts
    console.log(`Total: ${hw.cpus.length} CPU(s), ${hw.gpus.length} GPU(s)`);
  }
}

main().catch(console.error);
```

:::

## Notes

:::note Source Field
Every [`HardwareDevice`](./hardware-device.md) in the snapshot has `source: 'libre-hardware-monitor'`. This is a constant identifying the data origin and can be used for filtering if multiple data sources are introduced in the future.
:::

:::tip Polling Frequency
After discovery, both hardware-list APIs reuse the cached list without enumerating hardware again. Call `dispose()` to clear the list before requesting rediscovery.
:::

:::note Correlating with Temperature Data
Use the `id` field from each `HardwareDevice` to match against `TemperatureReading.id` returned by `getTemperature()`. This allows you to display temperature values alongside the correct hardware device name.
:::

## Danger Avoidance

:::danger Always Check `isAvailable`
Accessing `cpus` or `gpus` when `isAvailable` is `false` returns empty arrays, so it will not crash — but your application logic will silently receive no hardware data. Always gate feature UI behind the `isAvailable` check to avoid presenting a blank screen to the user.
:::

:::danger Administrative Privileges
Libre Hardware Monitor requires elevated privileges to access low-level hardware sensors. If the application is not running with administrator rights, `isAvailable` will be `false` and no hardware or temperature data will be returned. Ensure your application requests the necessary permissions or guides the user accordingly.
:::
