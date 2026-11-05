---
watermark: true
title: Windows Screenshot Helper
icon: camera
---

# Windows Screenshot Helper

`@eisland/windows-screenshot-helper` · v26.0.5

:::info
Capture the primary display as PNG and enumerate visible windows via .NET Native AOT DLL (koffi FFI). This plugin provides lightweight, high-performance screen capture using Windows GDI APIs (`BitBlt` with `SRCCOPY | CAPTUREBLT`) and window enumeration using `EnumWindows` with DWM extended frame bounds.
:::

## Tauri screenshot mode

Select **Settings → Screenshot Settings → Screenshot Engine → Plugin Mode**. Both primary-display capture and the region-selection overlay read the existing `screenshot-engine` setting. Plugin mode reuses this plugin's Native AOT DLL; if loading, capture or PNG metadata validation fails, Tauri automatically falls back to the existing compatibility backend. The overlay badge reports the backend that actually succeeded.

The historical `js` setting value and JS Mode label remain compatible with existing settings; in the Tauri application this mode uses the native xcap backend. Both backends retain multi-monitor physical coordinates, annotation, OCR, translation, save and copy behavior. Real mixed-DPI and negative-origin monitor setups still depend on the current Windows display layout.

`npm run plugins:build` publishes `native/<rid>/screenshot/eIslandScreenshotHelper.dll`; `npm run package` and the Windows CI resource step invoke that same build. Tauri calls `sc_capture_primary_display_png_bytes` and `sc_capture_all_displays_png_bytes` directly with Rust libloading, validates buffer size and PNG dimensions, and releases the buffers through `sc_free_string`. It does not load Node, koffi or Electron. Calls are serialized and the Native AOT DLL stays loaded until application exit.

## Interfaces

| Interface | Description |
|-----------|-------------|
| [ScreenshotResult](screenshot-helper/screenshot-result.md) | Screenshot data structure |
| [VisibleWindowBounds](screenshot-helper/visible-window-bounds.md) | Visible window bounding rectangle and metadata |

## Functions

| Function | Description |
|----------|-------------|
| [capturePrimaryDisplayPng](screenshot-helper/capture-primary-display-png.md) | Capture the primary display as PNG |
| [getVisibleWindows](screenshot-helper/get-visible-windows.md) | Enumerate visible windows and return their bounds |
| [getLastError](screenshot-helper/get-last-error.md) | Get the last error message from the DLL |

:::tip
`capturePrimaryDisplayPng` returns `ScreenshotResult | null`. The result contains a PNG buffer with the full primary display content. Returns `null` when the capture fails — use `getLastError` to retrieve the error message. `getVisibleWindows` returns `VisibleWindowBounds[]` with the position and size of every visible application window, enabling window-aware screenshot selection.
:::

## Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet publish -c Release -r win-x64` | Build Native AOT DLL |
| `npm run clean` | `dotnet clean` | Clean build artifacts |
| `npm run rebuild` | `npm run clean && npm run build` | Clean and rebuild |

:::tip
This plugin is automatically built when running `npm run plugins:build` from the project root. You do not need to build it separately unless working on the plugin in isolation.
:::

:::warning
The build requires .NET 10 SDK and Visual Studio Build Tools with C++ workload installed. The Windows SDK path must be correctly configured.
:::

## Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | Run all unit tests |
| `npm run test:screenshot` | `vitest run test/screenshot.test.ts` | Run screenshot tests only |
| `npm run smoke` | `node test/screenshot.smoke.ts` | Run smoke test |

:::note
Smoke tests require manual execution and display results in the console. Unit tests run automatically via Vitest.
:::

## Source Files

| File | Responsibility |
|------|---------------|
| `index.js` | Main entry point, exports all functions |
| `index.d.ts` | TypeScript type declarations |
| `ffi-loader.js` | koffi FFI bridge to Native AOT DLL |
| `src/ScreenCapture.cs` | Core screen capture logic (Win32 GDI APIs) |
| `src/WindowBounds.cs` | Visible window enumeration (EnumWindows + DWM) |
| `src/ScExports.cs` | C ABI exports for FFI |
| `src/Program.cs` | Native AOT library entry point |
| `src/eIslandScreenshotHelper.csproj` | .NET 10 Native AOT project |

:::important
The DLL uses Win32 GDI `BitBlt` with `SRCCOPY | CAPTUREBLT` flags to capture the primary display. The result is returned as a base64-encoded PNG string through the FFI boundary, then decoded into a Node.js `Buffer`. Window enumeration uses `EnumWindows` with `DwmGetWindowAttribute` for accurate bounds and cloaking detection.
:::
