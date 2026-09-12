---
watermark: true
title: Windows Fullscreen Detector
icon: maximize
---

# Windows Fullscreen Detector

`@eisland/windows-fullscreen-detector` · v26.0.1

Fullscreen window detection via C N-API native addon.

:::tip
Use `isAnyFullscreenWindow` for quick boolean checks. Only call `getFullscreenWindows` when you need the actual window list — it returns more data and is slightly more expensive.
:::

## Interfaces

| Interface | Description |
|-----------|-------------|
| [NativeRect](fullscreen-detector/native-rect.md) | Rectangle bounds structure |
| [NativeMonitorInfo](fullscreen-detector/native-monitor-info.md) | Monitor information with bounds |
| [FullscreenWindowInfo](fullscreen-detector/fullscreen-window-info.md) | Fullscreen window details |

## Functions

| Function | Description |
|----------|-------------|
| [getForegroundFullscreenWindow](fullscreen-detector/get-foreground-fullscreen-window.md) | Get foreground window if fullscreen |
| [getFullscreenWindows](fullscreen-detector/get-fullscreen-windows.md) | Get all fullscreen windows |
| [isAnyFullscreenWindow](fullscreen-detector/is-any-fullscreen-window.md) | Quick boolean fullscreen check |
