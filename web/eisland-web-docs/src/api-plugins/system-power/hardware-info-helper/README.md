---
title: Windows Hardware Info Helper
icon: microchip
---

# Windows Hardware Info Helper

:::info
This section documents the `@eisland/windows-hardware-info-helper` plugin API, including all query functions and data interfaces for reading static hardware specifications.
:::

## Interfaces

- [`CpuInfo`](./cpu-info.md) — CPU hardware information
- [`GpuInfo`](./gpu-info.md) — GPU hardware information
- [`MemorySlotInfo`](./memory-slot-info.md) — Physical memory slot information
- [`DiskInfo`](./disk-info.md) — Physical disk drive information
- [`NetworkAdapterInfo`](./network-adapter-info.md) — Physical network adapter information
- [`BluetoothDeviceInfo`](./bluetooth-device-info.md) — Paired Bluetooth device information
- [`MotherboardInfo`](./motherboard-info.md) — Motherboard (baseboard) information
- [`MonitorInfo`](./monitor-info.md) — Display monitor information

## Functions

- [`getCpuInfo()`](./get-cpu-info.md) — Query CPU details
- [`getGpuInfo()`](./get-gpu-info.md) — Query GPU details
- [`getMemoryInfo()`](./get-memory-info.md) — Query memory slot details
- [`getDiskInfo()`](./get-disk-info.md) — Query disk details
- [`getNetworkAdapterInfo()`](./get-network-adapter-info.md) — Query network adapter details
- [`getBluetoothDevices()`](./get-bluetooth-devices.md) — Query paired Bluetooth devices
- [`getMotherboardInfo()`](./get-motherboard-info.md) — Query motherboard details
- [`getMonitorInfo()`](./get-monitor-info.md) — Query monitor details

:::tip
All functions return arrays. A component with multiple physical units (e.g., two RAM sticks or three monitors) will return multiple items.
:::
