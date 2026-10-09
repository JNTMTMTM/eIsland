---
watermark: true
title: Plugin API Reference
icon: plug
---

# Plugin API Reference

:::info
Complete API reference for all eIsland native plugins. Windows plugins provide system capabilities through Node.js; the independent macOS Media Helper provides current-source media metadata and controls on macOS. Platform support is documented per plugin.
:::

## Plugin Categories

### Display & Graphics

| Plugin | Description |
|--------|-------------|
| [Windows Brightness Helper](display-graphics/brightness-helper.md) | Screen brightness monitoring and control |
| [Windows Fullscreen Detector](display-graphics/fullscreen-detector.md) | Fullscreen window detection |
| [Windows Screenshot Helper](display-graphics/screenshot-helper.md) | Primary display screen capture |
| [Windows Volume Helper](display-graphics/volume-helper.md) | Playback device volume and mute control |

### Connectivity

| Plugin | Description |
|--------|-------------|
| [Windows Bluetooth Helper](connectivity/bluetooth-helper.md) | Bluetooth device management and monitoring |
| [Windows WiFi Helper](connectivity/wifi-helper.md) | WiFi connection status and monitoring |

### System & Power

| Plugin | Description |
|--------|-------------|
| [Windows Power Helper](system-power/power-helper.md) | Battery and power status monitoring |
| [Windows Performance Monitor](system-power/performance-monitor.md) | CPU, memory, and temperature monitoring |
| [Windows Processes Attacker](system-power/processes-attacker.md) | Process termination utilities |
| [Windows Application Icon Helper](system-power/application-icon-helper.md) | Application icon extraction |
| [Windows Hardware Info Helper](system-power/hardware-info-helper.md) | Static hardware information query (CPU, GPU, memory, disk, etc.) |

### Media & Notifications

| Plugin | Description |
|--------|-------------|
| [Windows SMTC Helper](media-notifications/smtc-helper.md) | System Media Transport Controls |
| [macOS Media Helper](media-notifications/macos-media-helper.md) | Current Now Playing source, artwork, timeline, and asynchronous controls |
| [Windows Toast Listener](media-notifications/toast-listener.md) | Toast notification listening and suppression |
| [Windows Volume Analyzer](media-notifications/volume-analyzer.md) | Process-specific audio analysis (frequency, amplitude, beat) |
