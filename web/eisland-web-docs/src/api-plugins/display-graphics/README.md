---
watermark: true
title: Display & Graphics
icon: display
---

# Display & Graphics

:::important
Screen capture and fullscreen auto-hide run in the Rust desktop backend. They do not require a separate Node.js plugin.
:::

On Windows, fullscreen detection uses Win32/DWM to check visible application windows against the full bounds of each display, with a tolerance of two pixels. It excludes the island itself, desktop surfaces, and minimized, disabled, tool, and cloaked windows.

The existing `auto-hide-fullscreen-windows` setting controls this behavior. Detection uses the existing 2.5-second polling interval and the island's fade animations.
