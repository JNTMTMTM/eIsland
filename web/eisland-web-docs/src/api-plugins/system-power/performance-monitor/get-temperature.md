---
watermark: true
title: getTemperature / getTemperatureAsync
icon: fa6-solid:code
---

# getTemperature / getTemperatureAsync

```typescript
function getTemperature(): TemperatureSnapshot
function getTemperatureAsync(): Promise<TemperatureSnapshot>
```

Since 26.1.0, `getTemperature()` immediately returns an immutable cached snapshot and starts an asynchronous refresh if it has expired. The first call returns `{ isAvailable: false, readings: [], maxTemperatureCelsius: null }`. Call `getTemperatureAsync()` to wait for initial discovery or an expired snapshot to refresh. Both functions share a two-second cache and deduplicate concurrent requests with hardware-list queries.

The helper reads CPU, GPU, motherboard, and storage sensors through LibreHardwareMonitor. It initializes hardware once per session, reads sensors only on demand, and exits after 15 seconds without a collection request. No interval runs inside the helper. A request timeout or process failure clears cached temperatures and returns an unavailable snapshot; subsequent calls retry after ten seconds. Initial discovery has a five-second timeout and does not block the JavaScript event loop.

## Example

```typescript
import { getTemperatureAsync, dispose } from '@eisland/windows-performance-monitor';

try {
  const snapshot = await getTemperatureAsync();
  if (snapshot.isAvailable) {
    console.log(snapshot.maxTemperatureCelsius);
    snapshot.readings.forEach(reading => console.log(reading.label, reading.temperatureCelsius));
  }
} finally {
  dispose();
}
```

## Return value

See [TemperatureSnapshot](temperature-snapshot.md) and [TemperatureReading](temperature-reading.md). `maxTemperatureCelsius` is calculated from valid finite sensor readings and is `null` when none are available. Sensor support and access permissions vary by hardware; always check `isAvailable`. Cached objects and arrays are frozen; copy them before modification.

## Migration from 26.0.x

Replace a cold `getTemperature()` call with `await getTemperatureAsync()` when the caller needs to wait for fresh data. Periodic UI polling can keep using `getTemperature()` to display the latest cache while refreshing in the background. The plugin starts and stops its helper automatically; do not manually launch a helper for this API.
