---
title: Plugin Commands
icon: plug
---

# Plugin Commands

:::info
This document covers all build, test, and smoke commands for eIsland native plugins. Windows plugins live under `plugins/windows/`; macOS helpers live under `plugins/macos/`. Each plugin has its own `package.json` with independent scripts.
:::

## Overview

All commands are run from the individual plugin directory:

```bash
cd plugins/<platform>/<plugin-name>
npm run <script>
```

| Plugin | Directory | Language | Build Tool | Tests | Smoke |
|--------|-----------|----------|------------|-------|-------|
| **Fullscreen Detector** | `eisland-windows-fullscreen-detector` | C | node-gyp | ✅ | ✅ |
| **Performance Monitor** | `eisland-windows-performance-monitor` | C + C# | node-gyp + dotnet | ✅ | ✅ |
| **Processes Attacker** | `eisland-windows-processes-attacker` | C | node-gyp | ❌ | ❌ |
| **Toast Listener** | `eisland-windows-toast-listener` | C++ | node-gyp | ✅ | ✅ |
| **SMTC Helper** | `eisland-windows-smtc-helper` | C# | dotnet | ✅ | ✅ |
| **macOS Brightness Helper** | `plugins/macos/eisland-macos-brightness-helper` | Swift + C / Node-API | Xcode tools via Node build script | ✅ | ✅ |
| **macOS Media Helper** | `plugins/macos/eisland-macos-media-helper` | Swift + C / Node-API | Xcode tools via Node build script | ✅ | ✅ |
| **Bluetooth Helper** | `eisland-windows-bluetooth-helper` | C# | dotnet | ✅ | ✅ |
| **Brightness Helper** | `eisland-windows-brightness-helper` | C# | dotnet | ✅ | ✅ |
| **Application Icon Helper** | `eisland-windows-application-icon-helper` | C# | dotnet | ✅ | ✅ |
| **Screenshot Helper** | `eisland-windows-screenshot-helper` | C# | dotnet | ✅ | ✅ |

## Common Commands

The following common commands apply to Windows plugins. The macOS helpers use their own build scripts and do not provide `clean` or `rebuild`.

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run build` | Build the plugin | First build, or after source code changes |
| `npm run clean` | Remove build artifacts | Free disk space, or troubleshoot build issues |
| `npm run rebuild` | Clean + build | After modifying `binding.gyp`, `.csproj`, or adding new source files |

:::warning
After modifying `binding.gyp` (e.g., adding a new source file or library), always run `npm run rebuild` — a regular `npm run build` may use cached artifacts.
:::

## Bulk Operations

Run from the **project root** to build or clean the Windows plugins at once. Build the macOS plugin from its own directory.

| Command | Description |
|---------|-------------|
| `npm run plugins:build` | Build the 13 configured Windows plugins sequentially (uses `build:all` where available) |
| `npm run plugins:clean` | Clean the 13 configured Windows plugins in parallel |

:::tip
`plugins:build` automatically uses `build:all` for Bluetooth, Power, SMTC, and WiFi Helpers (which include NativeAOT DLL targets). All other plugins use `build`.
:::

### Individual Plugin Commands

Each plugin also has a dedicated root-level command for targeted builds and cleans:

| Plugin | Build | Clean |
|--------|-------|-------|
| Bluetooth Helper | `npm run plugin:build:bluetooth` | `npm run plugin:clean:bluetooth` |
| Brightness Helper | `npm run plugin:build:brightness` | `npm run plugin:clean:brightness` |
| Power Helper | `npm run plugin:build:power` | `npm run plugin:clean:power` |
| Processes Attacker | `npm run plugin:build:processes` | `npm run plugin:clean:processes` |
| SMTC Helper | `npm run plugin:build:smtc` | `npm run plugin:clean:smtc` |
| Toast Listener | `npm run plugin:build:toast` | `npm run plugin:clean:toast` |
| WiFi Helper | `npm run plugin:build:wifi` | `npm run plugin:clean:wifi` |
| Fullscreen Detector | `npm run plugin:build:fullscreen` | `npm run plugin:clean:fullscreen` |
| Performance Monitor | `npm run plugin:build:perfmon` | `npm run plugin:clean:perfmon` |
| Application Icon Helper | `npm run plugin:build:icon-helper` | `npm run plugin:clean:icon-helper` |
| Screenshot Helper | `npm run plugin:build:screenshot-helper` | `npm run plugin:clean:screenshot-helper` |

:::info NativeAOT Build Requirement
Building NativeAOT DLLs (`npm run build:ctypes` for SMTC, Bluetooth, Power, WiFi helpers) requires `vswhere.exe` in PATH. If the build fails with `'vswhere.exe' is not recognized`, add it:
```bash
export PATH="/c/Program Files (x86)/Microsoft Visual Studio/Installer:$PATH"
```
:::

---

## Windows Fullscreen Detector

**Directory:** `plugins/windows/eisland-windows-fullscreen-detector` &nbsp;|&nbsp; **Language:** C &nbsp;|&nbsp; **Build:** `node-gyp rebuild`

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `node-gyp rebuild` | Compile the native addon |
| `npm run clean` | `node-gyp clean` | Remove `build/` directory |
| `npm run rebuild` | `node-gyp clean && node-gyp rebuild` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All tests — shape validation, export verification |
| `npm run test:polling` | `vitest run test/fullscreen-detector.polling.test.ts` | Polling-mode tests only |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/fullscreen-detector.smoke.ts` | Full smoke — `getFullscreenWindows()`, `isAnyFullscreenWindow()` |
| `npm run smoke:polling` | `node --experimental-strip-types test/fullscreen-detector.polling.smoke.ts` | Polling smoke — multiple reads over time |

---

## Windows Performance Monitor

**Directory:** `plugins/windows/eisland-windows-performance-monitor` &nbsp;|&nbsp; **Language:** C + C# &nbsp;|&nbsp; **Build:** `node-gyp rebuild && dotnet build`

:::note
This plugin has a dual build: the C addon is compiled by node-gyp, and the .NET temperature helper is compiled by `dotnet build`.
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `node-gyp rebuild && dotnet build temperature-helper/...csproj -c Release` | Build C addon + .NET helper |
| `npm run clean` | `node-gyp clean && dotnet clean temperature-helper/...csproj` | Remove all build artifacts |
| `npm run rebuild` | `node-gyp clean && node-gyp rebuild && dotnet build temperature-helper/...csproj -c Release` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All tests — CPU, memory, temperature, hardware shape validation |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/performance-monitor.smoke.ts` | Full smoke — `getCpu()`, `getMemory()`, `getTemperature()`, `getHardwareList()` |
| `npm run smoke:polling` | `node --experimental-strip-types test/performance-monitor.polling.smoke.ts` | Polling smoke — multiple reads over time |

---

## Windows Processes Attacker

**Directory:** `plugins/windows/eisland-windows-processes-attacker` &nbsp;|&nbsp; **Language:** C &nbsp;|&nbsp; **Build:** `node-gyp rebuild`

:::warning
This plugin has no automated tests or smoke scripts. Test manually by running the built module.
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `node-gyp rebuild` | Compile the native addon |
| `npm run clean` | `node-gyp clean` | Remove `build/` directory |
| `npm run rebuild` | `node-gyp clean && node-gyp rebuild` | Full clean build |

---

## Windows Toast Listener

**Directory:** `plugins/windows/eisland-windows-toast-listener` &nbsp;|&nbsp; **Language:** C++ &nbsp;|&nbsp; **Build:** `node-gyp rebuild`

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `node-gyp rebuild` | Compile the native addon |
| `npm run clean` | `node-gyp clean` | Remove `build/` directory |
| `npm run rebuild` | `node-gyp clean && node-gyp rebuild` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All tests (polling mode) |
| `npm run test:polling` | `vitest run test/windows-toast-listener.polling.test.ts` | Polling-mode tests only |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/windows-toast-listener.smoke.ts` | Basic smoke — `getNotifications()`, access status |
| `npm run smoke:polling` | `node --experimental-strip-types test/windows-toast-listener.polling.smoke.ts` | Polling smoke — watch for notification changes |
| `npm run smoke:event` | `node --experimental-strip-types test/windows-toast-listener.event.smoke.ts` | Event-driven smoke — `startListening()` callback |
| `npm run smoke:suppression` | `node --experimental-strip-types test/windows-toast-listener.suppression.smoke.ts` | Suppression smoke — `enableSuppression()`/`disableSuppression()` |

### CLI Tools

| Command | Script | Description |
|---------|--------|-------------|
| `npm run cli:suppression` | `node --experimental-strip-types test/windows-toast-listener.suppression.cli.ts` | Interactive CLI for toast suppression testing |

---

## Windows SMTC Helper

**Directory:** `plugins/windows/eisland-windows-smtc-helper` &nbsp;|&nbsp; **Language:** C# (.NET) &nbsp;|&nbsp; **Build:** `dotnet build` / `dotnet publish`

:::info
This is a pure .NET plugin with two build targets: a console exe (for Node.js) and a NativeAOT DLL (for Python ctypes / FFI).
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet build src/eIslandSmtcHelper.csproj -c Release` | Build the .NET console exe |
| `npm run build:ctypes` | `dotnet publish smtc-ctypes/eIslandSmtcCtypes.csproj -c Release -r win-x64` | Build the NativeAOT DLL for ctypes |
| `npm run build:all` | `npm run build && npm run build:ctypes` | Build both exe and DLL |
| `npm run clean` | `dotnet clean src/... + dotnet clean smtc-ctypes/...` | Remove all build artifacts |
| `npm run rebuild` | `npm run clean && npm run build:all` | Full clean build (exe + DLL) |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All tests — export verification, status shape, all commands |
| `npm run test:play` | `vitest run test/smtc-helper.play.test.ts` | Play command tests only |
| `npm run test:pause` | `vitest run test/smtc-helper.pause.test.ts` | Pause command tests only |
| `npm run test:next` | `vitest run test/smtc-helper.next.test.ts` | Next command tests only |
| `npm run test:previous` | `vitest run test/smtc-helper.previous.test.ts` | Previous command tests only |
| `npm run test:timestamp` | `vitest run test/smtc-helper.timestamp.test.ts` | Timestamp (getTimestamp) tests |
| `npm run test:ctypes` | `python test/smtc_ctypes_test.py` | Python ctypes test (requires `build:ctypes` first) |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/smtc-helper.smoke.ts` | Full smoke — all 5 commands + formatted output |
| `npm run smoke:play` | `node --experimental-strip-types test/smtc-helper.play.smoke.ts` | Play smoke — `getStatus()` → `play()` → `getStatus()` |
| `npm run smoke:pause` | `node --experimental-strip-types test/smtc-helper.pause.smoke.ts` | Pause smoke — `getStatus()` → `pause()` → `getStatus()` |
| `npm run smoke:next` | `node --experimental-strip-types test/smtc-helper.next.smoke.ts` | Next smoke — `getStatus()` → `next()` → `getStatus()` |
| `npm run smoke:previous` | `node --experimental-strip-types test/smtc-helper.previous.smoke.ts` | Previous smoke — `getStatus()` → `previous()` → `getStatus()` |
| `npm run smoke:status` | `node --experimental-strip-types test/smtc-helper.status.smoke.ts` | Status-only smoke — `getStatus()` with formatted output |
| `npm run smoke:seek` | `node --experimental-strip-types test/smtc-helper.seek.smoke.ts` | Seek + extended controls — seek, stop, shuffle, repeat, rate |
| `npm run smoke:monitor` | `node --experimental-strip-types test/smtc-helper.monitor.smoke.ts` | Monitor smoke — event-driven session tracking for 8s |
| `npm run smoke:timestamp` | `node --experimental-strip-types test/smtc-helper.timestamp.smoke.ts` | Timestamp smoke — lightweight timestamp query, compares with `getStatus()` |

---

## macOS Brightness Helper

**Directory:** `plugins/macos/eisland-macos-brightness-helper` &nbsp;|&nbsp; **Package:** `eisland-macos-brightness-helper` &nbsp;|&nbsp; **Language:** Swift + C / Node-API

:::info
See the [API reference](../../api-plugins/display-graphics/macos-brightness-helper.md) for target selection, polling, DDC limits, and Electron packaging. Development requires Xcode Command Line Tools and Node.js 22.12+ for the locked Vitest toolchain.
:::

### Build / Usage

| Command | Script | Description |
|---------|--------|-------------|
| `npm ci` | npm dependency installation | Install locked development dependencies |
| `npm run build` | `node scripts/build.mjs` | Build host architecture and native logic tests |
| `npm run build:all` | `node scripts/build.mjs --all` | Build arm64 and x64 prebuilds |
| `npm pack` | Runs `prepack` | Build both architectures and create the npm archive |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | Vitest after native test compilation on macOS | Run 33 checks on macOS; 15 JS and build-guard checks on other hosts |
| `npm run smoke` | `node test/smoke.cjs` | Print the real hardware brightness snapshot |
| `npm run smoke:monitor` | `node test/smoke.cjs --monitor` | Observe manual changes for 8 seconds |
| `npm run smoke:verify-set` | `node test/smoke.cjs --verify-set` | Verify a five-point system brightness change, events, and restoration |
| `npm run test:plugins -- brightnessRuntime.test.mjs` | Root Vitest plugins project | Run after building the plugin |

:::note
The default smoke only reads. The setting smoke attempts restoration even after failure, and rejects DDC fallback because it may affect multiple displays. Native tests require macOS. Development tests and smoke scripts are excluded from the npm archive.
:::

### Source Files

| File | Responsibility |
|------|---------------|
| `src/BrightnessCore.swift` | Hardware target selection and normalization |
| `src/NativeDisplays.swift` / `src/DDCProtocol.swift` | Native backends, DDC transfer, and protocol validation |
| `src/addon.c` | Node-API binding |
| `test/brightnessRuntime.test.mjs` / `test/NativeCoreTests.swift` | Vitest and compiled Swift tests |
| `test/smoke.cjs` | Hardware diagnostics and reversible setting verification |

---

## macOS Media Helper

**Directory:** `plugins/macos/eisland-macos-media-helper` &nbsp;|&nbsp; **Package:** `eisland-macos-media-helper` &nbsp;|&nbsp; **Language:** Swift + C / Node-API

:::info
See the [API reference](../../api-plugins/media-notifications/macos-media-helper.md) for configuration, artwork, event handling, Electron packaging, and differences from Windows SMTC. Development requires Xcode Command Line Tools; use Node.js 22.12+ for Vitest 4.1 and its locked toolchain.
:::

### Build / Usage

| Command | Script | Description |
|---------|--------|-------------|
| `npm ci` | npm dependency installation | Install the locked development dependencies |
| `npm run build` | `node scripts/build.mjs` | Build the host architecture |
| `npm run build:all` | `node scripts/build.mjs --all` | Build separate arm64 and x64 prebuilds |
| `npm pack` | Runs `prepack` automatically | Build both architectures and create the npm archive |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run --config vitest.config.mjs` | Run 15 tests using the real Swift / Node-API layer and isolated Perl fixtures |
| `npm run smoke` | `node test/smoke.cjs` | Read real metadata, artwork preview, playback state, duration, and position |
| `npm run test:plugins -- mediaHelperRuntime.test.mjs` | Root Vitest plugins project | Run the same tests from the repository root after building the plugin |

:::note
The smoke script sends no playback commands. `thumbnailPreview` contains up to the first 120 characters of the artwork Data URL plus `...` when truncated; `thumbnailLength` is the full Data URL character count. Fixture tests do not establish whether a real player executes playback controls. Scripts under `test/` are repository development tools and are not included in the published package.
:::

### Source Files

| File | Responsibility |
|------|---------------|
| `src/MediaCore.swift` | Cached media state, timeline interpolation, and MediaRemote bridge requests |
| `src/addon.c` | Node-API exports, asynchronous request completion, and environment cleanup |
| `test/mediaHelperRuntime.test.mjs` | Vitest metadata, command mapping, monitoring, timeout, and Worker lifecycle checks |
| `test/smoke.cjs` | Read-only system metadata and artwork diagnostics |

---

## Windows Bluetooth Helper

**Directory:** `plugins/windows/eisland-windows-bluetooth-helper` &nbsp;|&nbsp; **Language:** C# (.NET) &nbsp;|&nbsp; **Build:** `dotnet build` / `dotnet publish`

:::info
This is a pure .NET plugin with two build targets: a class library (for development) and a NativeAOT DLL (for Node.js via koffi FFI).
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet build src/eIslandBluetoothHelper.csproj -c Release` | Build the .NET class library |
| `npm run build:ctypes` | `dotnet publish bt-ctypes/eIslandBluetoothCtypes.csproj -c Release -r win-x64` | Build the NativeAOT DLL for koffi FFI |
| `npm run build:all` | `npm run build && npm run build:ctypes` | Build both |
| `npm run clean` | `dotnet clean src/... + dotnet clean bt-ctypes/...` | Remove all build artifacts |
| `npm run rebuild` | `npm run clean && npm run build:all` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All tests — export verification, shape validation, monitor tests |
| `npm run test:query` | `vitest run test/bluetooth.test.ts` | Query function tests only |
| `npm run test:monitor` | `vitest run test/bluetooth.monitor.test.ts` | Monitor tests only |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/bluetooth.smoke.ts` | Full smoke — all query functions + formatted output |
| `npm run smoke:monitor` | `node --experimental-strip-types test/bluetooth.monitor.smoke.ts` | Monitor smoke — event-driven device tracking for 8s |

---

## Windows Power Helper

**Directory:** `plugins/windows/eisland-windows-power-helper` &nbsp;|&nbsp; **Language:** C# (.NET) &nbsp;|&nbsp; **Build:** `dotnet build` / `dotnet publish`

:::info
This plugin follows the same dual-build pattern as the Bluetooth Helper: a .NET class library for development and a NativeAOT DLL for Node.js via koffi FFI.
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet build src/eIslandPowerHelper.csproj -c Release` | Build the .NET class library |
| `npm run build:ctypes` | `dotnet publish pw-ctypes/eIslandPowerCtypes.csproj -c Release -r win-x64` | Build the NativeAOT DLL for koffi FFI |
| `npm run build:all` | `npm run build && npm run build:ctypes` | Build both |
| `npm run clean` | `dotnet clean src/... + dotnet clean pw-ctypes/...` | Remove all build artifacts |
| `npm run rebuild` | `npm run clean && npm run build:all` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All tests — shape validation, consistency, monitor tests |
| `npm run test:query` | `vitest run test/power.test.ts` | Query function tests only |
| `npm run test:monitor` | `vitest run test/power.monitor.test.ts` | Monitor tests only |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/power.smoke.ts` | Full smoke — query power info with formatted output |
| `npm run smoke:monitor` | `node --experimental-strip-types test/power.monitor.smoke.ts` | Monitor smoke — event-driven power tracking for 8s |

---

## Windows WiFi Helper

**Directory:** `plugins/windows/eisland-windows-wifi-helper` &nbsp;|&nbsp; **Language:** C# (.NET) &nbsp;|&nbsp; **Build:** `dotnet build` / `dotnet publish`

:::info
This plugin follows the same dual-build pattern as the Bluetooth and Power Helpers: a .NET class library for development and a NativeAOT DLL for Node.js via koffi FFI.
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet build src/eIslandWifiHelper.csproj -c Release` | Build the .NET class library |
| `npm run build:ctypes` | `dotnet publish wf-ctypes/eIslandWifiCtypes.csproj -c Release -r win-x64` | Build the NativeAOT DLL for koffi FFI |
| `npm run build:all` | `npm run build && npm run build:ctypes` | Build both |
| `npm run clean` | `dotnet clean src/... + dotnet clean wf-ctypes/...` | Remove all build artifacts |
| `npm run rebuild` | `npm run clean && npm run build:all` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All tests — shape validation, consistency, monitor tests |
| `npm run test:query` | `vitest run test/wifi.test.ts` | Query function tests only |
| `npm run test:monitor` | `vitest run test/wifi.monitor.test.ts` | Monitor tests only |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/wifi.smoke.ts` | Full smoke — query WiFi info with formatted output |
| `npm run smoke:monitor` | `node --experimental-strip-types test/wifi.monitor.smoke.ts` | Monitor smoke — event-driven WiFi tracking for 8s |

---

## Windows Brightness Helper

**Directory:** `plugins/windows/eisland-windows-brightness-helper` &nbsp;|&nbsp; **Language:** C# (.NET) &nbsp;|&nbsp; **Build:** `dotnet build`

:::info
This is a pure .NET plugin that spawns a console EXE for WMI brightness operations. Unlike the Bluetooth/Power/WiFi Helpers, it does not use NativeAOT or koffi FFI — `System.Management` (WMI) is incompatible with NativeAOT.
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet build src/eIslandBrightnessReader.csproj -c Release` | Build the .NET console exe |
| `npm run clean` | `dotnet clean src/eIslandBrightnessReader.csproj` | Remove build artifacts |
| `npm run rebuild` | `npm run clean && npm run build` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All tests — export verification, shape validation, boundary values, monitor tests |
| `npm run test:query` | `vitest run test/brightness.test.ts` | Query function tests only |
| `npm run test:monitor` | `vitest run test/brightness.monitor.test.ts` | Monitor tests only |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/brightness.smoke.ts` | Full smoke — `getBrightness()`, `setBrightness()` |
| `npm run smoke:monitor` | `node --experimental-strip-types test/brightness.monitor.smoke.ts` | Monitor smoke — WMI event tracking for 15s |

---

## Windows Application Icon Helper

**Directory:** `plugins/windows/eisland-windows-application-icon-helper` &nbsp;|&nbsp; **Language:** C# (.NET) &nbsp;|&nbsp; **Build:** `dotnet publish`

:::info
This is a pure .NET NativeAOT plugin that extracts Windows application icons using Shell32 APIs. It uses koffi FFI to call the native DLL from Node.js.
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet publish src/eIslandAppIconHelper.csproj -c Release -r win-x64` | Build NativeAOT DLL |
| `npm run clean` | `dotnet clean src/eIslandAppIconHelper.csproj` | Remove build artifacts |
| `npm run rebuild` | `npm run clean && npm run build` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All unit tests |
| `npm run test:icon` | `vitest run test/icon.test.ts` | Icon function tests only |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/icon.smoke.ts` | Full smoke — all icon functions |
| `npm run smoke:process-name` | `node --experimental-strip-types test/icon.by-process-name.smoke.ts` | Process name lookup |
| `npm run smoke:pid` | `node --experimental-strip-types test/icon.by-pid.smoke.ts` | PID lookup |
| `npm run smoke:path` | `node --experimental-strip-types test/icon.by-path.smoke.ts` | Path lookup |
| `npm run smoke:shortcut` | `node --experimental-strip-types test/icon.by-shortcut.smoke.ts` | Shortcut lookup |

---

## Windows Screenshot Helper

**Directory:** `plugins/windows/eisland-windows-screenshot-helper` &nbsp;|&nbsp; **Language:** C# (.NET) &nbsp;|&nbsp; **Build:** `dotnet publish`

:::info
This is a pure .NET NativeAOT plugin that captures the primary display as PNG using Win32 GDI APIs. It uses koffi FFI to call the native DLL from Node.js.
:::

### Build

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `dotnet publish src/eIslandScreenshotHelper.csproj -c Release -r win-x64` | Build NativeAOT DLL |
| `npm run clean` | `dotnet clean src/eIslandScreenshotHelper.csproj` | Remove build artifacts |
| `npm run rebuild` | `npm run clean && npm run build` | Full clean build |

### Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` | `vitest run` | All unit tests |
| `npm run test:screenshot` | `vitest run test/screenshot.test.ts` | Screenshot function tests only |

### Smoke

| Command | Script | Description |
|---------|--------|-------------|
| `npm run smoke` | `node --experimental-strip-types test/screenshot.smoke.ts` | Full smoke — capture and validate PNG |

---

## Quick Reference

### All Build Commands

| Plugin | Command |
|--------|---------|
| Fullscreen Detector | `cd plugins/windows/eisland-windows-fullscreen-detector && npm run build` |
| Performance Monitor | `cd plugins/windows/eisland-windows-performance-monitor && npm run build` |
| Processes Attacker | `cd plugins/windows/eisland-windows-processes-attacker && npm run build` |
| Toast Listener | `cd plugins/windows/eisland-windows-toast-listener && npm run build` |
| SMTC Helper (exe) | `cd plugins/windows/eisland-windows-smtc-helper && npm run build` |
| SMTC Helper (DLL) | `cd plugins/windows/eisland-windows-smtc-helper && npm run build:ctypes` |
| SMTC Helper (all) | `cd plugins/windows/eisland-windows-smtc-helper && npm run build:all` |
| Bluetooth Helper (exe) | `cd plugins/windows/eisland-windows-bluetooth-helper && npm run build` |
| Bluetooth Helper (DLL) | `cd plugins/windows/eisland-windows-bluetooth-helper && npm run build:ctypes` |
| Bluetooth Helper (all) | `cd plugins/windows/eisland-windows-bluetooth-helper && npm run build:all` |
| Power Helper (exe) | `cd plugins/windows/eisland-windows-power-helper && npm run build` |
| Power Helper (DLL) | `cd plugins/windows/eisland-windows-power-helper && npm run build:ctypes` |
| Power Helper (all) | `cd plugins/windows/eisland-windows-power-helper && npm run build:all` |
| WiFi Helper (exe) | `cd plugins/windows/eisland-windows-wifi-helper && npm run build` |
| WiFi Helper (DLL) | `cd plugins/windows/eisland-windows-wifi-helper && npm run build:ctypes` |
| WiFi Helper (all) | `cd plugins/windows/eisland-windows-wifi-helper && npm run build:all` |
| Brightness Helper | `cd plugins/windows/eisland-windows-brightness-helper && npm run build` |
| Application Icon Helper | `cd plugins/windows/eisland-windows-application-icon-helper && npm run build` |
| Screenshot Helper | `cd plugins/windows/eisland-windows-screenshot-helper && npm run build` |
| **All plugins** | `npm run plugins:build` (from root — builds all 10 plugins) |

### All Test Commands

| Plugin | Commands |
|--------|----------|
| Fullscreen Detector | `npm test` · `npm run test:polling` |
| Performance Monitor | `npm test` |
| Processes Attacker | _(no tests)_ |
| Toast Listener | `npm test` · `npm run test:polling` |
| SMTC Helper | `npm test` · `npm run test:play` · `npm run test:pause` · `npm run test:next` · `npm run test:previous` · `npm run test:timestamp` · `npm run test:ctypes` |
| Bluetooth Helper | `npm test` · `npm run test:query` · `npm run test:monitor` |
| Power Helper | `npm test` · `npm run test:query` · `npm run test:monitor` |
| WiFi Helper | `npm test` · `npm run test:query` · `npm run test:monitor` |
| Brightness Helper | `npm test` · `npm run test:query` · `npm run test:monitor` |
| Application Icon Helper | `npm test` · `npm run test:icon` |
| Screenshot Helper | `npm test` · `npm run test:screenshot` |

### All Smoke Commands

| Plugin | Commands |
|--------|----------|
| Fullscreen Detector | `npm run smoke` · `npm run smoke:polling` |
| Performance Monitor | `npm run smoke` · `npm run smoke:polling` |
| Processes Attacker | _(no smoke)_ |
| Toast Listener | `npm run smoke` · `npm run smoke:polling` · `npm run smoke:event` · `npm run smoke:suppression` |
| SMTC Helper | `npm run smoke` · `npm run smoke:play` · `npm run smoke:pause` · `npm run smoke:next` · `npm run smoke:previous` · `npm run smoke:status` · `npm run smoke:seek` · `npm run smoke:monitor` · `npm run smoke:timestamp` |
| Bluetooth Helper | `npm run smoke` · `npm run smoke:monitor` |
| Power Helper | `npm run smoke` · `npm run smoke:monitor` |
| WiFi Helper | `npm run smoke` · `npm run smoke:monitor` |
| Brightness Helper | `npm run smoke` · `npm run smoke:monitor` |
| Application Icon Helper | `npm run smoke` · `npm run smoke:process-name` · `npm run smoke:pid` · `npm run smoke:path` · `npm run smoke:shortcut` |
| Screenshot Helper | `npm run smoke` |
