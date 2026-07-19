---
title: Windows Hardware Info Helper
icon: microchip
---

# Windows Hardware Info Helper

:::info
`@eisland/windows-hardware-info-helper` is a plugin that queries static hardware information from the local machine via WMI (Windows Management Instrumentation). It uses a C# EXE helper with `System.Management` to retrieve details about CPU, GPU, memory, disks, network adapters, Bluetooth devices, motherboard, and monitors.
:::

## Overview

This plugin provides synchronous query functions for reading hardware specifications. Unlike the [Performance Monitor](./performance-monitor.md), which tracks real-time resource usage (CPU load, memory usage, temperatures), this plugin returns **static hardware details** such as model names, core counts, clock speeds, capacities, and serial numbers.

:::tip
Use this plugin when you need to display hardware specifications in a settings page or system info panel. For real-time monitoring data, use [Performance Monitor](./performance-monitor.md) instead.
:::

## Installation

```bash
npm install @eisland/windows-hardware-info-helper
```

:::warning
This plugin only works on Windows. It requires the .NET 10.0 runtime to be installed for building from source (`dotnet build`).
:::

## Features

| Function | Description |
|----------|-------------|
| [`getCpuInfo()`](./hardware-info-helper/get-cpu-info.md) | Query CPU details (name, cores, threads, clock speed, cache) |
| [`getGpuInfo()`](./hardware-info-helper/get-gpu-info.md) | Query GPU details (name, VRAM, driver, resolution) |
| [`getMemoryInfo()`](./hardware-info-helper/get-memory-info.md) | Query memory slot details (capacity, speed, type, manufacturer) |
| [`getDiskInfo()`](./hardware-info-helper/get-disk-info.md) | Query disk details (model, size, interface, serial number) |
| [`getNetworkAdapterInfo()`](./hardware-info-helper/get-network-adapter-info.md) | Query network adapter details (name, MAC, speed, type) |
| [`getBluetoothDevices()`](./hardware-info-helper/get-bluetooth-devices.md) | Query Bluetooth PnP devices via WMI (radios, HCI, protocol drivers, and user-paired peripherals) |
| [`getMotherboardInfo()`](./hardware-info-helper/get-motherboard-info.md) | Query motherboard details (manufacturer, model, serial) |
| [`getMonitorInfo()`](./hardware-info-helper/get-monitor-info.md) | Query monitor details (name, manufacturer, physical size) |

## Data Types

| Interface | Description |
|-----------|-------------|
| [`CpuInfo`](./hardware-info-helper/cpu-info.md) | CPU hardware information |
| [`GpuInfo`](./hardware-info-helper/gpu-info.md) | GPU hardware information |
| [`MemorySlotInfo`](./hardware-info-helper/memory-slot-info.md) | Physical memory slot information |
| [`DiskInfo`](./hardware-info-helper/disk-info.md) | Physical disk drive information |
| [`NetworkAdapterInfo`](./hardware-info-helper/network-adapter-info.md) | Physical network adapter information |
| [`BluetoothDeviceInfo`](./hardware-info-helper/bluetooth-device-info.md) | Bluetooth PnP device information (radios, adapters, stack components, user-paired peripherals) |
| [`MotherboardInfo`](./hardware-info-helper/motherboard-info.md) | Motherboard (baseboard) information |
| [`MonitorInfo`](./hardware-info-helper/monitor-info.md) | Display monitor information |

## Architecture

:::details Internal Mechanism
The plugin spawns a C# console EXE (`eIslandHardwareInfoReader.exe`) as a child process via `spawnSync`. The EXE uses `System.Management` to execute WQL queries against WMI classes (`Win32_Processor`, `Win32_VideoController`, etc.) and outputs JSON to stdout. The Node.js layer parses the JSON and returns typed arrays.
:::

## Source Files

| File | Responsibility |
|------|---------------|
| `index.js` | Node.js entry point; spawns EXE helper and parses JSON output |
| `index.d.ts` | TypeScript type declarations for all interfaces and functions |
| `src/Program.cs` | C# EXE entry point; WMI query logic for all 8 hardware categories |
| `src/eIslandHardwareInfoReader.csproj` | .NET project file targeting `net10.0` with `System.Management` |

## Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet build src/eIslandHardwareInfoReader.csproj -c Release` | Build the C# EXE helper |
| `npm run clean` | `dotnet clean src/eIslandHardwareInfoReader.csproj` | Clean build artifacts |
| `npm run rebuild` | `npm run clean && npm run build` | Full rebuild |

## Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run --config vitest.config.ts` | Run unit tests |
| `npm run smoke` | `node test/hardware-info.smoke.ts` | Run smoke test |

:::note
The `postinstall` script automatically runs `dotnet build` when the package is installed via npm.
:::
