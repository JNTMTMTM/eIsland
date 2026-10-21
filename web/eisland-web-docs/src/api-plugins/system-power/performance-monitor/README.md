---
watermark: true
title: Windows Performance Monitor
icon: gauge-high
---

# Windows Performance Monitor

`@eisland/windows-performance-monitor` · v26.1.0

:::info
CPU, memory, and hardware temperature monitoring via C N-API native addon + .NET helper.
:::

## API Reference

| Type | Name | Description |
|------|------|-------------|
| Type Alias | [TemperatureCategory](temperature-category.md) | Temperature reading category |
| Interface | [CpuSnapshot](cpu-snapshot.md) | CPU usage data |
| Interface | [MemorySnapshot](memory-snapshot.md) | Memory usage data |
| Interface | [TemperatureReading](temperature-reading.md) | Single temperature reading |
| Interface | [TemperatureSnapshot](temperature-snapshot.md) | Temperature readings collection |
| Interface | [HardwareDevice](hardware-device.md) | Hardware device info |
| Interface | [HardwareListSnapshot](hardware-list-snapshot.md) | CPU/GPU device list |
| Function | [getCpu](get-cpu.md) | Get CPU usage |
| Function | [getMemory](get-memory.md) | Get memory usage |
| Function | [getTemperature](get-temperature.md) | Get hardware temperatures |
| Function | [getHardwareList](get-hardware-list.md) | Get CPU/GPU device list |

## Asynchronous collection (26.1.0)

`getTemperature()` and `getHardwareList()` now return immutable cached snapshots immediately and start discovery or refresh in the background. The first call returns `isAvailable: false`. Use `await getTemperatureAsync()` or `await getHardwareListAsync()` when the first result must include hardware discovery.

Concurrent temperature and hardware requests share one helper request. Temperatures are cached for two seconds, and the device list is retained until `dispose()` or a subsequent discovery. The helper initializes hardware once per session, performs no background polling, and exits after 15 seconds without a collection request. Failed or timed-out requests return an unavailable temperature snapshot and use a ten-second retry delay. Queries time out after five seconds.

Call `dispose()` to stop the helper and clear caches when monitoring is no longer needed. CPU and memory snapshots continue to use direct Win32 calls.
