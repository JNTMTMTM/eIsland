---
watermark: true
title: Windows Performance Monitor
icon: gauge-high
---

# Windows Performance Monitor

`@eisland/windows-performance-monitor` · v26.1.0

CPU, memory, and hardware temperature monitoring via C N-API native addon + .NET helper.

:::warning
Temperature readings depend on hardware sensor availability. Not all systems expose temperature data — `getTemperature` may return an empty readings array on virtual machines or systems without supported sensors.
:::

## Type Aliases

| Type | Description |
|------|-------------|
| [TemperatureCategory](performance-monitor/temperature-category.md) | Temperature reading category |

## Interfaces

| Interface | Description |
|-----------|-------------|
| [CpuSnapshot](performance-monitor/cpu-snapshot.md) | CPU usage data |
| [MemorySnapshot](performance-monitor/memory-snapshot.md) | Memory usage data |
| [TemperatureReading](performance-monitor/temperature-reading.md) | Single temperature reading |
| [TemperatureSnapshot](performance-monitor/temperature-snapshot.md) | Temperature readings collection |
| [HardwareDevice](performance-monitor/hardware-device.md) | Hardware device info |
| [HardwareListSnapshot](performance-monitor/hardware-list-snapshot.md) | CPU/GPU device list |

## Functions

| Function | Description |
|----------|-------------|
| [getCpu](performance-monitor/get-cpu.md) | Get CPU usage |
| [getMemory](performance-monitor/get-memory.md) | Get memory usage |
| [getTemperature](performance-monitor/get-temperature.md) | Get hardware temperatures |
| [getHardwareList](performance-monitor/get-hardware-list.md) | Get CPU/GPU device list |

## Asynchronous collection (26.1.0)

`getTemperature()` and `getHardwareList()` now return immutable cached snapshots immediately and start discovery or refresh in the background. The first call returns `isAvailable: false`. Use `await getTemperatureAsync()` or `await getHardwareListAsync()` when the first result must include hardware discovery.

Concurrent temperature and hardware requests share one helper request. Temperatures are cached for two seconds, and the device list is retained until `dispose()` or a subsequent discovery. The helper initializes hardware once per session, performs no background polling, and exits after 15 seconds without a collection request. Failed or timed-out requests return an unavailable temperature snapshot and use a ten-second retry delay. Queries time out after five seconds.

Call `dispose()` to stop the helper and clear caches when monitoring is no longer needed. CPU and memory snapshots continue to use direct Win32 calls.
