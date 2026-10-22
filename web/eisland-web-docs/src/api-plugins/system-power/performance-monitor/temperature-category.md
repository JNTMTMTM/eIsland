---
watermark: true
title: TemperatureCategory
icon: fa6-solid:list
---

# TemperatureCategory

:::info Introduction
`TemperatureCategory` is a string literal union type that classifies hardware temperature sensors reported by the Windows performance monitor. It is used as a field on the [TemperatureReading](temperature-reading.md) interface to indicate which part of the system a given temperature reading originates from -- CPU, GPU, motherboard, storage device, or an unclassified sensor.
:::

## Values

| Value | Description |
|-------|-------------|
| `"cpu"` | CPU temperature sensor -- reports temperatures from processor thermal zones |
| `"gpu"` | GPU temperature sensor -- reports temperatures from discrete or integrated graphics hardware |
| `"motherboard"` | Motherboard chipset sensor -- reports temperatures from the motherboard chipset or VRM area |
| `"storage"` | Storage device sensor -- reports temperatures from HDD or SSD drives |
| `"unknown"` | Unclassified sensor -- a sensor whose hardware source could not be identified |

:::note
Categories are determined automatically by the underlying LibreHardwareMonitor library based on hardware sensor metadata. You cannot manually assign or override a sensor's category.
:::

## Usage

Use `await getTemperatureAsync()` for initial discovery. The synchronous `getTemperature()` returns a frozen cache immediately, starts refreshes in the background when the two-second cache expires, and initially reports `isAvailable: false` while discovery is pending.

You will encounter `TemperatureCategory` when working with temperature data returned by the [getTemperatureAsync()](get-temperature.md) function. Each element in the `readings` array of the returned [TemperatureSnapshot](temperature-snapshot.md) carries a `category` field of this type.

Typical use cases include:

- **Filtering readings by hardware type** -- isolate CPU temps for a dashboard widget, or check storage temps for a health alert.
- **Grouping readings for display** -- organize sensor data into sections on a UI panel.
- **Threshold logic** -- apply different warning thresholds per category (e.g., CPU critical at 90C, storage warning at 55C).

:::tip
When building UI components, use `TemperatureCategory` to create grouped displays. For example, show all `"cpu"` readings in one section and `"gpu"` readings in another, so users can quickly scan thermal conditions per subsystem.
:::

## Example

Await `getTemperatureAsync()` for initial discovery. The synchronous `getTemperature()` returns a frozen cache immediately and starts refreshes in the background when the two-second cache expires. Its initial `isAvailable: false` means discovery is still pending.

::: code-tabs

@tab TypeScript

```ts
import { getTemperatureAsync } from '@eisland/windows-performance-monitor';
import type { TemperatureCategory, TemperatureReading } from '@eisland/windows-performance-monitor';

async function main() {
  // Fetch the current temperature snapshot from all sensors
  const snapshot = await getTemperatureAsync();

  // Check if temperature monitoring is available on this system
  if (snapshot.isAvailable) {
    // Define a helper to filter readings by a specific category
    const filterByCategory = (
      readings: readonly TemperatureReading[],
      category: TemperatureCategory
    ): TemperatureReading[] => {
      return readings.filter((r) => r.category === category);
    };

    // Get only CPU-related temperature readings
    const cpuReadings = filterByCategory(snapshot.readings, 'cpu');

    // Print each CPU sensor's label and current temperature
    cpuReadings.forEach((r) => {
      console.log(`${r.label}: ${r.temperatureCelsius}°C`);
    });

    // Get only GPU-related temperature readings
    const gpuReadings = filterByCategory(snapshot.readings, 'gpu');

    // Print each GPU sensor's label and current temperature
    gpuReadings.forEach((r) => {
      console.log(`${r.label}: ${r.temperatureCelsius}°C`);
    });
  }
}

main().catch(console.error);
```

@tab JavaScript

```js
const { getTemperatureAsync } = require('@eisland/windows-performance-monitor');

async function main() {
  // Fetch the current temperature snapshot from all sensors
  const snapshot = await getTemperatureAsync();

  // Check if temperature monitoring is available on this system
  if (snapshot.isAvailable) {
    // Define a helper to filter readings by a specific category
    const filterByCategory = (readings, category) => {
      return readings.filter((r) => r.category === category);
    };

    // Get only CPU-related temperature readings
    const cpuReadings = filterByCategory(snapshot.readings, 'cpu');

    // Print each CPU sensor's label and current temperature
    cpuReadings.forEach((r) => {
      console.log(`${r.label}: ${r.temperatureCelsius}°C`);
    });

    // Get only GPU-related temperature readings
    const gpuReadings = filterByCategory(snapshot.readings, 'gpu');

    // Print each GPU sensor's label and current temperature
    gpuReadings.forEach((r) => {
      console.log(`${r.label}: ${r.temperatureCelsius}°C`);
    });
  }
}

main().catch(console.error);
```

:::

## Notes

:::note
A single system may report multiple readings within the same category. For example, a multi-core CPU often exposes several temperature sensors (per-core, package, etc.), all categorized as `"cpu"`. Use the `id` field on [TemperatureReading](temperature-reading.md) to distinguish individual sensors.
:::

:::tip
If you only care about the highest temperature across all sensors, use the `maxTemperatureCelsius` field on [TemperatureSnapshot](temperature-snapshot.md) instead of manually iterating and comparing readings. It is `null` when no readings are available.
:::

:::note
The `"unknown"` category appears when LibreHardwareMonitor cannot determine which hardware component a sensor belongs to. This is uncommon on modern hardware but may occur with proprietary or embedded sensors. Treat unknown readings as informational only -- do not rely on them for critical thermal throttling decisions.
:::

## Danger Avoidance

:::danger
Never assume a specific category is always present on every system. Not all hardware exposes temperature sensors for every category -- a fanless tablet may have no `"gpu"` sensors, and a virtual machine may have no temperature readings at all. Always check `snapshot.isAvailable` and handle cases where a filtered category returns an empty array.
:::

:::danger
Do not use `TemperatureCategory` string values as unique identifiers. Multiple sensors can share the same category. If you need to track a specific sensor over time (e.g., for charting), use the `id` field from [TemperatureReading](temperature-reading.md), not the `category` value. Relying on category alone will cause data collisions when multiple sensors share the same classification.
:::
