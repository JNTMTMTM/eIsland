---
watermark: true
title: Windows Bluetooth Helper
icon: bluetooth
---

# Windows Bluetooth Helper

`@eisland/windows-bluetooth-helper` · v26.0.0

Bluetooth device management and monitoring via .NET NativeAOT DLL (koffi FFI).

:::tip
The `BluetoothMonitor` class provides real-time device change events. Use it to react to connect/disconnect/pair events without polling.
:::

## Interfaces

| Interface | Description |
|-----------|-------------|
| [BluetoothDeviceInfo](bluetooth-helper/bluetooth-device-info.md) | Bluetooth device data structure |

## Functions

| Function | Description |
|----------|-------------|
| [getPairedDevices](bluetooth-helper/get-paired-devices.md) | Get all paired devices |
| [getConnectedDevices](bluetooth-helper/get-connected-devices.md) | Get currently connected devices |
| [getAllDevices](bluetooth-helper/get-all-devices.md) | Get all visible devices |
| [getDevice](bluetooth-helper/get-device.md) | Get single device snapshot |

## Classes

| Class | Description |
|-------|-------------|
| [BluetoothMonitor](bluetooth-helper/bluetooth-monitor.md) | Real-time device change monitor |
