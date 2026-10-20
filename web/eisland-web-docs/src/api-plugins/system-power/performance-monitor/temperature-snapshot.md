---
watermark: true
title: TemperatureSnapshot
icon: fa6-solid:table
---

# TemperatureSnapshot

:::info Introduction
`TemperatureSnapshot` is the immutable data structure returned by the [`getTemperatureAsync()`](./get-temperature.md) function. It contains an array of temperature readings collected from all available hardware sensors via Libre Hardware Monitor, along with a convenience field for the highest temperature across all sensors. Use this interface to monitor CPU, GPU, motherboard, and storage temperatures in real time.
:::

## Interface Introduction

You receive a `TemperatureSnapshot` object every time you call `getTemperatureAsync()`. It tells you whether temperature monitoring is available on the current system, provides the full list of sensor readings, and exposes the maximum temperature observed. If Libre Hardware Monitor is not running or temperature sensors are unavailable, `isAvailable` will be `false` and `readings` will be empty.

## Usage

`getTemperatureAsync()` waits for initial discovery or an expired temperature refresh. Requests share a two-second cache. The synchronous `getTemperature()` returns the frozen cache immediately and starts a refresh when expired; its initial `isAvailable: false` means discovery has not completed. Polling is caller-driven, and helper failures retry after ten seconds.

Call `getTemperatureAsync()` to obtain a snapshot of the current system temperatures. The returned object is a plain data snapshot — it does not set up any listeners or polling. You are responsible for calling it on whatever interval your UI requires.

:::tip Polling Strategy
For a real-time temperature display, call `getTemperatureAsync()` on a 1–2 second interval. For a one-time health check, a single call is sufficient. Avoid calling it more frequently than once per second to minimize overhead.
:::

:::note Libre Hardware Monitor Dependency
The plugin starts the LibreHardwareMonitor helper automatically when discovery or a refresh is needed. Always check `isAvailable` before accessing `readings` or `maxTemperatureCelsius`. See the [system requirements](../README.md) for setup details.
:::

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `isAvailable` | `boolean` | Whether temperature data is available on this system. Returns `false` if Libre Hardware Monitor is not running or no sensors are detected. |
| `readings` | `readonly `[`TemperatureReading`](./temperature-reading.md)`[]` | Array of individual sensor readings. Empty when `isAvailable` is `false`. |
| `maxTemperatureCelsius` | `number \| null` | The highest temperature (in degrees Celsius) across all sensors. Returns `null` when `readings` is empty. |

:::tip Quick Overheat Check
`maxTemperatureCelsius` is a convenience shortcut. Instead of iterating over `readings` to find the peak, you can compare this value directly against your thermal threshold.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { getTemperatureAsync } from '@eisland/windows-performance-monitor';

async function main() {
  // Obtain a snapshot of all hardware temperature sensors
  const snapshot = await getTemperatureAsync();

  // Check whether temperature monitoring is available
  if (snapshot.isAvailable) {
    // Log how many sensors were detected
    console.log(`${snapshot.readings.length} sensor(s) found`);

    // Iterate over each reading to display sensor details
    snapshot.readings.forEach((r) => {
      // Each reading has a label, category, and temperature value
      console.log(`[${r.category}] ${r.label}: ${r.temperatureCelsius}°C`);
    });

    // Use the convenience field for the highest temperature
    if (snapshot.maxTemperatureCelsius !== null) {
      console.log(`Max temperature: ${snapshot.maxTemperatureCelsius}°C`);
    }
  } else {
    // Discovery completed without available temperature readings
    console.log('Temperature data unavailable — check sensor support and helper permissions.');
  }
}

main().catch(console.error);
```

@tab JavaScript

```js
const { getTemperatureAsync } = require('@eisland/windows-performance-monitor');

async function main() {
  // Obtain a snapshot of all hardware temperature sensors
  const snapshot = await getTemperatureAsync();

  // Check whether temperature monitoring is available
  if (snapshot.isAvailable) {
    // Log how many sensors were detected
    console.log(`${snapshot.readings.length} sensor(s) found`);

    // Iterate over each reading to display sensor details
    snapshot.readings.forEach((r) => {
      // Each reading has a label, category, and temperature value
      console.log(`[${r.category}] ${r.label}: ${r.temperatureCelsius}°C`);
    });

    // Use the convenience field for the highest temperature
    if (snapshot.maxTemperatureCelsius !== null) {
      console.log(`Max temperature: ${snapshot.maxTemperatureCelsius}°C`);
    }
  } else {
    // Discovery completed without available temperature readings
    console.log('Temperature data unavailable — check sensor support and helper permissions.');
  }
}

main().catch(console.error);
```

:::

## Notes

:::note Null Maximum Temperature
`maxTemperatureCelsius` is `null` when the `readings` array is empty; in that case `isAvailable` is `false`. Always perform a null check before using this value in calculations or comparisons.
:::

:::note Reading Categories
The `category` field on each [`TemperatureReading`](./temperature-reading.md) is one of `'cpu'`, `'gpu'`, `'motherboard'`, `'storage'`, or `'unknown'`. Use this to group or filter readings by hardware component in your UI.
:::

:::tip Combining with Other Snapshots
You can call `getTemperatureAsync()` alongside [`getCpu()`](./cpu-snapshot.md) and [`getMemory()`](./memory-snapshot.md) in the same polling loop to build a unified system health dashboard.
:::

## Danger Avoidance

:::danger Do Not Ignore `isAvailable`
Accessing `readings` or `maxTemperatureCelsius` without checking `isAvailable` first will not throw, but you may get an empty array and a `null` max value — leading to silent bugs in your UI. Always guard your rendering logic behind the `isAvailable` check.
:::

:::danger Excessive Polling
Calling `getTemperatureAsync()` in a tight loop (e.g., `requestAnimationFrame` or sub-100ms intervals) shares the two-second refresh cache but adds unnecessary JavaScript work. Use an interval of at least one second and avoid overlapping asynchronous callbacks.
:::
