---
watermark: true
title: Display & Graphics
icon: display
---

# Display & Graphics

Screen capture and fullscreen auto-hide run in the Rust desktop backend. They do not require a separate Node.js plugin.

Fullscreen detection uses Win32/DWM on Windows and CoreGraphics on macOS. The detector checks visible application windows against the full bounds of each display, with a tolerance of two coordinate units. It excludes the island itself and desktop surfaces; Windows also filters minimized, disabled, tool, and cloaked windows. macOS uses onscreen, normal-layer windows in global logical coordinates and does not read window titles.

The existing `auto-hide-fullscreen-windows` setting controls this behavior. Detection uses the existing 2.5-second polling interval and the island's fade animations.
