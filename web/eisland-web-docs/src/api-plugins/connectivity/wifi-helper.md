---
watermark: true
title: Windows WiFi Helper
icon: wifi
---

# Windows WiFi Helper

`@eisland/windows-wifi-helper` · v26.0.0

WiFi connection status and monitoring via .NET NativeAOT DLL (koffi FFI).

:::note
The `WifiMonitor` class provides real-time connectivity change events. Use it to detect network switches without polling `getWifiInfo` repeatedly.
:::

## Enums

| Enum | Description |
|------|-------------|
| [ConnectivityLevel](wifi-helper/connectivity-level.md) | Network connectivity level |

## Interfaces

| Interface | Description |
|-----------|-------------|
| [WifiInfo](wifi-helper/wifi-info.md) | WiFi connection data structure |

## Functions

| Function | Description |
|----------|-------------|
| [getWifiInfo](wifi-helper/get-wifi-info.md) | Get current WiFi connection snapshot |

## Classes

| Class | Description |
|-------|-------------|
| [WifiMonitor](wifi-helper/wifi-monitor.md) | Real-time WiFi change monitor |
