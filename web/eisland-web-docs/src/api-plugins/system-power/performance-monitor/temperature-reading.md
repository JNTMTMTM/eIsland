---
watermark: true
title: TemperatureReading
icon: fa6-solid:table
---

# TemperatureReading

:::info
`TemperatureReading` is an interface representing a single temperature sensor reading from the host machine. Each reading corresponds to one physical sensor (CPU die, GPU hotspot, motherboard chipset, storage device, etc.) and is returned as part of a [TemperatureSnapshot](temperature-snapshot.md) from the `getTemperatureAsync()` function.
:::

## Interface Introduction

You encounter `TemperatureReading` objects inside the `readings` array of a [TemperatureSnapshot](temperature-snapshot.md). Every sensor detected by the underlying LibreHardwareMonitor library produces one `TemperatureReading` entry. Use this interface to inspect individual sensor temperatures, filter by hardware [category](temperature-category.md), or build temperature monitoring dashboards.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for this sensor, stable across calls within the same session |
| `label` | `string` | Human-readable sensor name (e.g. `"CPU Package"`, `"GPU Core"`) |
| `category` | [TemperatureCategory](temperature-category.md) | Hardware category this sensor belongs to |
| `temperatureCelsius` | `number` | Current temperature in degrees Celsius |
| `source` | `"libre-hardware-monitor"` | Fixed data source identifier, always `"libre-hardware-monitor"` |

:::note
The `id` string is derived from the sensor's internal path in LibreHardwareMonitor. It remains consistent across consecutive calls but may change if the hardware topology changes (e.g. a USB device is plugged in).
:::

:::tip
Use the `category` property to group readings by hardware type rather than parsing the `label` string. The [TemperatureCategory](temperature-category.md) enum provides well-defined values (`"cpu"`, `"gpu"`, `"motherboard"`, `"storage"`, `"unknown"`) that are more reliable than label-based heuristics.
:::

## Usage

`getTemperatureAsync()` waits for initial discovery or an expired temperature refresh. Requests share a two-second cache. The synchronous `getTemperature()` returns the frozen cache immediately and starts a refresh when expired; its initial `isAvailable: false` means discovery has not completed. Polling is caller-driven, and helper failures retry after ten seconds.

`TemperatureReading` objects are read-only snapshots. You do not create them yourself; instead, call `getTemperatureAsync()` and iterate over the `readings` array of the returned [TemperatureSnapshot](temperature-snapshot.md).

A typical workflow:

1. Await `getTemperatureAsync()` to obtain the current [TemperatureSnapshot](temperature-snapshot.md).
2. Check `snapshot.isAvailable` to confirm LibreHardwareMonitor is running.
3. Access `snapshot.readings` to get the array of `TemperatureReading` objects.
4. Filter or display readings by `category`, `label`, or `temperatureCelsius`.

:::tip
Temperature values are floating-point numbers in Celsius. To convert to Fahrenheit, use `temp * 9 / 5 + 32`. Avoid rounding before comparison to preserve precision.
:::

:::warning
When `isAvailable` is `false` on the parent [TemperatureSnapshot](temperature-snapshot.md), the `readings` array will be empty. Always check `isAvailable` before iterating.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getTemperatureAsync, type TemperatureReading } from '@eisland/windows-performance-monitor';

async function main() {
  // Query the current temperature snapshot
  const snapshot = await getTemperatureAsync();

  // Check if temperature data is available (requires LibreHardwareMonitor)
  if (!snapshot.isAvailable) {
    console.log('Temperature data unavailable — check sensor support and helper permissions.');
  } else {
    // Iterate over all sensor readings
    snapshot.readings.forEach((r: TemperatureReading) => {
      // Pick a display icon based on the sensor category
      const icon = r.category === 'cpu' ? '[CPU]'
                 : r.category === 'gpu' ? '[GPU]'
                 : r.category === 'storage' ? '[STO]'
                 : '[HW]';
      // Print the sensor label and current temperature
      console.log(`${icon} ${r.label}: ${r.temperatureCelsius}°C`);
    });

    // Filter readings to CPU sensors only
    const cpuReadings: TemperatureReading[] = snapshot.readings.filter(
      (r: TemperatureReading) => r.category === 'cpu'
    );
    console.log(`CPU sensors: ${cpuReadings.length}`);
  }
}

main().catch(console.error);
```

@tab JavaScript

```js
const { getTemperatureAsync } = require('@eisland/windows-performance-monitor');

async function main() {
  // Query the current temperature snapshot
  const snapshot = await getTemperatureAsync();

  // Check if temperature data is available (requires LibreHardwareMonitor)
  if (!snapshot.isAvailable) {
    console.log('Temperature data unavailable — check sensor support and helper permissions.');
  } else {
    // Iterate over all sensor readings
    snapshot.readings.forEach((r) => {
      // Pick a display icon based on the sensor category
      const icon = r.category === 'cpu' ? '[CPU]'
                 : r.category === 'gpu' ? '[GPU]'
                 : r.category === 'storage' ? '[STO]'
                 : '[HW]';
      // Print the sensor label and current temperature
      console.log(`${icon} ${r.label}: ${r.temperatureCelsius}°C`);
    });

    // Filter readings to CPU sensors only
    const cpuReadings = snapshot.readings.filter(
      (r) => r.category === 'cpu'
    );
    console.log(`CPU sensors: ${cpuReadings.length}`);
  }
}

main().catch(console.error);
```

:::

## Notes

:::note
The `source` field is currently always `"libre-hardware-monitor"`. Future versions may introduce additional data sources. Treat the value as a string rather than hard-coding equality checks if you want forward compatibility.
:::

:::note
Temperature queries share a two-second cache; `getTemperatureAsync()` waits for a refresh only when needed. There is no built-in polling or event-based update mechanism. To track temperature changes over time, call `getTemperatureAsync()` on your own interval.
:::

:::tip
If you only need the highest temperature across all sensors (for example, to display a single "system hot" indicator), use the `maxTemperatureCelsius` field on the parent [TemperatureSnapshot](temperature-snapshot.md) instead of computing it yourself from the `readings` array.
:::

## Danger Avoidance

:::danger
Do not assume `temperatureCelsius` is always a reasonable value. LibreHardwareMonitor may report `0` or negative values for sensors that are not actively reading. Always validate against expected ranges before using the value in threshold-based alerts or UI displays.
:::

:::danger
Calling `getTemperatureAsync()` in a tight loop (e.g. inside `requestAnimationFrame` or a zero-delay `setInterval`) still shares the two-second refresh cache but causes unnecessary JavaScript calls. Use an interval that matches the two-second cache and avoid overlapping asynchronous callbacks. Poll at intervals of 1 second or longer.
:::
