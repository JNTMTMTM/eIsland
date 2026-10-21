---
watermark: true
title: HardwareDevice
icon: fa6-solid:table
---

# HardwareDevice

:::info Introduction
`HardwareDevice` is an interface representing a detected hardware device (CPU or GPU) on the system. It is returned as part of the [HardwareListSnapshot](hardware-list-snapshot.md) when you call [`getHardwareListAsync()`](get-hardware-list.md), providing identification and classification of each discovered piece of hardware.
:::

## Interface Introduction

The `HardwareDevice` interface describes a single hardware component discovered by LibreHardwareMonitor. You will encounter these objects inside the `cpus` and `gpus` arrays of the [HardwareListSnapshot](hardware-list-snapshot.md) returned by [`getHardwareListAsync()`](get-hardware-list.md). Each device carries a unique identifier, a human-readable name, and metadata indicating whether it is a CPU or GPU along with its hardware type string from the underlying monitoring library.

:::tip Use IDs for Correlation
The `id` field is a stable identifier for a hardware device. Use it as a key when tracking device state across multiple polling cycles or when correlating hardware entries with temperature readings from [`getTemperature()`](get-temperature.md).
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique hardware identifier assigned by LibreHardwareMonitor |
| `name` | `string` | Human-readable device name (e.g., `"Intel Core i7-12700K"`, `"NVIDIA GeForce RTX 3080"`) |
| `category` | `'cpu' \| 'gpu'` | Device category — always either `"cpu"` or `"gpu"` |
| `hardwareType` | `string` | Hardware type string from LibreHardwareMonitor describing the device class |
| `source` | `'libre-hardware-monitor'` | Data source identifier — always `"libre-hardware-monitor"` |

:::note Category Is Exhaustive
The `category` field is a union type limited to `'cpu' | 'gpu'`. Other hardware components such as motherboards, storage drives, or memory modules are not included in the hardware list — they may appear in temperature readings but not as `HardwareDevice` entries.
:::

:::note Hardware Type String
The `hardwareType` value comes directly from LibreHardwareMonitor's internal type classification. It may vary across different hardware vendors and is intended for display or filtering purposes rather than strict programmatic branching. Prefer using `category` for CPU/GPU branching logic.
:::

## Usage

`getHardwareListAsync()` waits for initial discovery, then reuses the frozen hardware-list cache. The synchronous `getHardwareList()` returns the cache immediately and starts discovery while no available list is cached; its initial `isAvailable: false` does not establish that hardware is unsupported. Discovery shares requests with temperature refreshes, including their two-second cache and ten-second failure backoff. Call `dispose()` when finished to stop the helper and clear both caches.

The typical workflow for working with `HardwareDevice` is:

1. Await [`getHardwareListAsync()`](get-hardware-list.md) to retrieve the current hardware snapshot.
2. Check the `isAvailable` flag on the returned snapshot to confirm LibreHardwareMonitor is running.
3. Iterate over `cpus` and `gpus` arrays to access individual `HardwareDevice` objects.
4. Use the `id` to correlate devices with temperature readings or to build a device registry.

:::tip Single Device Per Category
Most consumer systems have exactly one CPU and one GPU in the hardware list. If you only need the primary CPU or GPU, access `cpus[0]` or `gpus[0]` directly after checking the array is non-empty.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getHardwareListAsync } from '@eisland/windows-performance-monitor';
import type { HardwareDevice, HardwareListSnapshot } from '@eisland/windows-performance-monitor';

async function main() {
  // Retrieve the current hardware list snapshot
  const hw: HardwareListSnapshot = await getHardwareListAsync();

  // Check if LibreHardwareMonitor is available
  if (hw.isAvailable) {
    // Iterate over detected CPU devices
    hw.cpus.forEach((cpu: HardwareDevice) => {
      console.log(`CPU: ${cpu.name}`);           // Log the device name
      console.log(`  ID: ${cpu.id}`);            // Log the unique identifier
      console.log(`  Type: ${cpu.hardwareType}`); // Log the hardware type string
    });

    // Iterate over detected GPU devices
    hw.gpus.forEach((gpu: HardwareDevice) => {
      console.log(`GPU: ${gpu.name}`);           // Log the device name
      console.log(`  ID: ${gpu.id}`);            // Log the unique identifier
      console.log(`  Type: ${gpu.hardwareType}`); // Log the hardware type string
    });
  } else {
    // Discovery completed without available hardware
    console.warn('Hardware list is not available.');
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

  // Check if LibreHardwareMonitor is available
  if (hw.isAvailable) {
    // Iterate over detected CPU devices
    hw.cpus.forEach(cpu => {
      console.log(`CPU: ${cpu.name}`);           // Log the device name
      console.log(`  ID: ${cpu.id}`);            // Log the unique identifier
      console.log(`  Type: ${cpu.hardwareType}`); // Log the hardware type string
    });

    // Iterate over detected GPU devices
    hw.gpus.forEach(gpu => {
      console.log(`GPU: ${gpu.name}`);           // Log the device name
      console.log(`  ID: ${gpu.id}`);            // Log the unique identifier
      console.log(`  Type: ${gpu.hardwareType}`); // Log the hardware type string
    });
  } else {
    // Discovery completed without available hardware
    console.warn('Hardware list is not available.');
  }
}

main().catch(console.error);
```

:::

## Notes

:::note Snapshot vs. Live Data
`HardwareDevice` objects represent a snapshot of detected hardware at the time of the `getHardwareListAsync()` call. The discovered list remains cached until `dispose()` clears it; stopping the helper does not refresh or invalidate that list.
:::

:::tip Combining with Temperature Data
You can cross-reference `HardwareDevice.id` with temperature readings from [`getTemperature()`](get-temperature.md) to associate specific devices with their thermal data. This is useful for building unified hardware dashboards.
:::

:::note Empty Arrays
If no CPU or GPU devices are detected (for example, when LibreHardwareMonitor lacks permissions for certain device classes), the corresponding `cpus` or `gpus` array will be empty. Always check array length before accessing elements by index.
:::

## Danger Avoidance

:::danger Do Not Use Without Checking Availability
Calling `getHardwareListAsync()` and immediately accessing `cpus` or `gpus` without checking `isAvailable` may result in empty arrays if LibreHardwareMonitor is not running. Always guard your code with an `isAvailable` check to avoid runtime errors from iterating over or indexing into empty arrays.
:::

:::danger Do Not Assume Fixed Hardware Count
Do not hardcode assumptions about the number of CPUs or GPUs. Some systems may have multiple GPUs (e.g., integrated + discrete) or multiple CPU sockets. Always iterate over the arrays rather than accessing fixed indices like `gpus[1]`.
:::
