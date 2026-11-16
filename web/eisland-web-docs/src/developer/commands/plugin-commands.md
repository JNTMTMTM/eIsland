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
| **Processes Attacker** | `eisland-windows-processes-attacker` | C | node-gyp | ❌ | ❌ |
| **Toast Listener** | `eisland-windows-toast-listener` | C++ | node-gyp | ✅ | ✅ |
| **macOS Media Helper** | `plugins/macos/eisland-macos-media-helper` | Swift + C / Node-API | Xcode tools via Node build script | ✅ | ✅ |
| **Bluetooth Helper** | `eisland-windows-bluetooth-helper` | C# | dotnet | ✅ | ✅ |

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
| `npm run test:plugins:build` | Prepare the Windows plugins used by the integration tests |
| `npm run plugins:clean` | Clean configured Windows plugins in parallel |
| `npm run plugins:build` | Prepare FFmpeg and ffprobe for the Windows bundle |
| `npm run native` | Compatibility alias for `plugins:build`; only builds native helpers |

`plugins:build` downloads FFmpeg when missing. The individual `plugin:build:*` commands remain available for plugin development.

Development and direct Tauri builds consume prepared native resources; `package` runs `plugins:build` automatically. Run `plugins:build` on first setup and after changing the migrated plugin sources or target architecture. Music services run natively in Rust; no Node music helper is bundled.

### Individual Plugin Commands

Each plugin also has a dedicated root-level command for targeted builds and cleans:

| Plugin | Build | Clean |
|--------|-------|-------|
| Bluetooth Helper | `npm run plugin:build:bluetooth` | `npm run plugin:clean:bluetooth` |
| Power Helper | `npm run plugin:build:power` | `npm run plugin:clean:power` |
| Processes Attacker | `npm run plugin:build:processes` | `npm run plugin:clean:processes` |
| Toast Listener | `npm run plugin:build:toast` | `npm run plugin:clean:toast` |
| WiFi Helper | `npm run plugin:build:wifi` | `npm run plugin:clean:wifi` |

:::info NativeAOT Build Requirement
Building NativeAOT DLLs (`npm run build:ctypes` for Bluetooth, Power, WiFi helpers) requires `vswhere.exe` in PATH. If the build fails with `'vswhere.exe' is not recognized`, add it:
```bash
export PATH="/c/Program Files (x86)/Microsoft Visual Studio/Installer:$PATH"
```
:::

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

## macOS Media Helper

**Directory:** `plugins/macos/eisland-macos-media-helper` &nbsp;|&nbsp; **Package:** `eisland-macos-media-helper` &nbsp;|&nbsp; **Language:** Swift + C / Node-API

:::info
See the [API reference](../../api-plugins/media-notifications/macos-media-helper.md) for configuration, artwork, event handling, native packaging, and differences from Windows SMTC. Development requires Xcode Command Line Tools; use Node.js 24.22.1 for Vitest 4.1 and its locked toolchain.
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
| `npm test` | `vitest run --config vitest.config.mjs` | Run 57 tests: 33 JS/API/loader checks and 24 macOS native fixture checks |
| `npm run test:coverage` | `vitest run --config vitest.config.mjs --coverage` | Report runtime JS coverage under `coverage/js/` |
| `npm run test:coverage:native` | `node scripts/native-coverage.mjs` | Build isolated Swift / C instrumentation and report LLVM coverage under `coverage/native/` (macOS only) |
| `npm run smoke` | `node test/smoke.cjs` | Read real metadata, artwork preview, playback state, duration, and position |
| `npm run test:plugins -- mediaHelperRuntime.test.mjs` | Root Vitest plugins project | Run the same tests from the repository root after building the plugin |

:::note
The smoke script sends no playback commands. `thumbnailPreview` contains up to the first 120 characters of the artwork Data URL plus `...` when truncated; `thumbnailLength` is the full Data URL character count. Fixture tests do not establish whether a real player executes playback controls. Scripts under `test/` are repository development tools and are not included in the published package.
:::

Native coverage requires an existing host build and Node headers (`npm run build`). Instrumented files stay in `build/native-coverage/`; production prebuilds remain unchanged. Reports exclude build scripts, vendor code, and OS frameworks.

### Source Files

| File | Responsibility |
|------|---------------|
| `scripts/native-coverage.mjs` | LLVM instrumentation and separate native reports |
| `test/mediaJsRuntime.test.mjs` / `test/nativeLoaderRuntime.test.mjs` | Cross-platform API, monitor, and loader tests |
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

## Quick Reference

### All Build Commands

| Plugin | Command |
|--------|---------|
| Processes Attacker | `cd plugins/windows/eisland-windows-processes-attacker && npm run build` |
| Toast Listener | `cd plugins/windows/eisland-windows-toast-listener && npm run build` |
| Bluetooth Helper (exe) | `cd plugins/windows/eisland-windows-bluetooth-helper && npm run build` |
| Bluetooth Helper (DLL) | `cd plugins/windows/eisland-windows-bluetooth-helper && npm run build:ctypes` |
| Bluetooth Helper (all) | `cd plugins/windows/eisland-windows-bluetooth-helper && npm run build:all` |
| Power Helper (exe) | `cd plugins/windows/eisland-windows-power-helper && npm run build` |
| Power Helper (DLL) | `cd plugins/windows/eisland-windows-power-helper && npm run build:ctypes` |
| Power Helper (all) | `cd plugins/windows/eisland-windows-power-helper && npm run build:all` |
| WiFi Helper (exe) | `cd plugins/windows/eisland-windows-wifi-helper && npm run build` |
| WiFi Helper (DLL) | `cd plugins/windows/eisland-windows-wifi-helper && npm run build:ctypes` |
| WiFi Helper (all) | `cd plugins/windows/eisland-windows-wifi-helper && npm run build:all` |
| **All plugins** | `npm run plugins:build` (from root — builds all 10 plugins) |

### All Test Commands

| Plugin | Commands |
|--------|----------|
| Processes Attacker | _(no tests)_ |
| Toast Listener | `npm test` · `npm run test:polling` |
| Bluetooth Helper | `npm test` · `npm run test:query` · `npm run test:monitor` |
| Power Helper | `npm test` · `npm run test:query` · `npm run test:monitor` |
| WiFi Helper | `npm test` · `npm run test:query` · `npm run test:monitor` |

### All Smoke Commands

| Plugin | Commands |
|--------|----------|
| Processes Attacker | _(no smoke)_ |
| Toast Listener | `npm run smoke` · `npm run smoke:polling` · `npm run smoke:event` · `npm run smoke:suppression` |
| Bluetooth Helper | `npm run smoke` · `npm run smoke:monitor` |
| Power Helper | `npm run smoke` · `npm run smoke:monitor` |
| WiFi Helper | `npm run smoke` · `npm run smoke:monitor` |
