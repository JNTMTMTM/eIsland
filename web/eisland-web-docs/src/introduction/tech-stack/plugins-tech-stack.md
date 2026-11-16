---
title: Native Desktop Tech Stack
icon: toolbox
---

# Native Desktop Tech Stack

## Performance Monitoring and Brightness

On Windows, the Rust desktop performance monitor reads CPU, memory, and disk usage. It reads CPU clocks through PowrProf, GPU inventory and usage through DXGI and PDH, and available temperatures through ACPI, WDDM, and storage drivers. Unavailable readings remain empty.

The Rust desktop app controls brightness on Windows through WMI for internal displays and DXVA2 for compatible external displays.

## Native Fullscreen Detection

Fullscreen auto-hide on Windows runs in Rust. `features/windowing/auto_hide.rs` calls `infrastructure/platform/fullscreen`, which compares Win32/DWM window bounds with display bounds using a 2-pixel tolerance.

## Desktop screenshots

On Windows, the Rust desktop uses Win32 GDI and automatically retries with xcap in compatibility mode when GDI fails. The application encodes primary display and region captures as PNG and preserves the desktop layout across monitors.

## Windows Media Sessions

The Rust desktop host subscribes to Windows Media Control (SMTC) session changes and reads metadata, playback state, timeline, and artwork. Media commands target the selected session. The development CLI reads the same WinRT data through the desktop executable.
