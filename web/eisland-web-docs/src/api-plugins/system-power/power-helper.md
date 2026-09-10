---
watermark: true
title: Windows Power Helper
icon: battery-half
---

# Windows Power Helper

`@eisland/windows-power-helper` · v26.0.0

Battery and power status monitoring via .NET NativeAOT DLL (koffi FFI).

:::note
`PowerMonitor` fires events on battery level changes, charge state transitions, and power source switches. Subscribe once at app startup and keep the listener active.
:::

## Enums

| Enum | Description |
|------|-------------|
| [BatteryStatus](power-helper/battery-status.md) | Battery charge status |
| [PowerSupplyStatus](power-helper/power-supply-status.md) | Power supply status |
| [EnergySaverStatus](power-helper/energy-saver-status.md) | Energy saver status |

## Interfaces

| Interface | Description |
|-----------|-------------|
| [PowerInfo](power-helper/power-info.md) | Power status data structure |

## Functions

| Function | Description |
|----------|-------------|
| [getPowerInfo](power-helper/get-power-info.md) | Get current power status snapshot |

## Classes

| Class | Description |
|-------|-------------|
| [PowerMonitor](power-helper/power-monitor.md) | Real-time power change monitor |
