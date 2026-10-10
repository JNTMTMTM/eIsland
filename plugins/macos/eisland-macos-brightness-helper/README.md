# eisland-macos-brightness-helper

Native macOS hardware brightness query, control, and monitoring through Swift + Node-API. Version **26.0.1**.

## Requirements and build

- macOS; deployment target 13.0 (older supported releases still require runtime verification).
- Separate arm64 and x64 prebuilds; Node.js 18+ / Node-API 8 for consumers.
- Development requires Xcode Command Line Tools and Node.js 22.12+ for Vitest 4.1 and the locked toolchain.
- The published package contains prebuilds and needs no compiler at runtime.

```bash
cd plugins/macos/eisland-macos-brightness-helper
npm ci
npm run build
npm test
npm run smoke
npm run build:all
npm pack
```

`build` compiles the current architecture; `build:all` compiles both. `npm pack` runs `build:all` through `prepack`. The build checks C ABI exports and applies ad-hoc signatures. Set `NODE_INCLUDE_DIR` to a directory containing `node_api.h` to use existing headers; otherwise node-gyp can download headers.

## API

```javascript
const { getBrightness, setBrightness, BrightnessMonitor } = require('eisland-macos-brightness-helper');
const info = getBrightness();
console.log(info);
if (info) console.log(setBrightness(info.currentBrightness));

const monitor = new BrightnessMonitor();
monitor.on('error', console.error);
monitor.on('brightness-changed', (level, timestamp) => console.log(level, timestamp));
monitor.start();
process.once('SIGINT', () => monitor.stop());
```

| API | Result | Behavior |
|-----|--------|----------|
| `getBrightness()` | `BrightnessInfo \| null` | Synchronously reads the first supported screen |
| `setBrightness(percent)` | `boolean` | Rounds finite numbers and clamps to 0–100; invalid input throws `RangeError` |
| `BrightnessMonitor.start()` | `void` | Reads a baseline, then polls every 500 ms; unavailable baseline throws |
| `BrightnessMonitor.stop()` | `void` | Clears its timer and baseline; retains listeners for restart |
| `BrightnessMonitor.isRunning()` | `boolean` | Whether the timer is active |

```typescript
interface BrightnessInfo {
  currentBrightness: number; // Integer percentage, 0–100
  levels: null;
  instanceName: string;
  source: 'display-services' | 'iokit' | 'ddc-ci';
}
```

`levels` is explicitly `null`, because these backends do not report Windows WMI-style brightness steps. System targets use `display:<CGDisplayID>` identifiers; Apple Silicon DDC targets use `ioreg:<RegistryEntryID>`. These IDs describe the current device enumeration, not persistent user preferences.

`brightness-changed` provides `(level: number, timestamp: number)` with a Unix millisecond timestamp. There is no initial event. A percentage change or selected-device change triggers an event. Unavailable hardware or read exceptions stop polling and emit `error`; attach an error listener. Start and stop are idempotent, and separate monitor instances own separate timers. Polling observes integer percentages; intermediate changes between samples may be missed.

## Target selection and Windows differences

1. System screens are ordered by built-in screen, main screen, then other screens.
2. DisplayServices is tried first for each screen; Intel also has an IOKit brightness fallback.
3. If no system screen provides a valid reading, external DDC/CI brightness (VCP `0x10`) is tried. Apple Silicon uses external DCP services through IOAVService; Intel uses framebuffer I2C interfaces.

Reading returns the first supported target. Setting writes the first readable system target. If that write fails, it returns `false` without changing another screen. With DDC fallback, setting attempts **all readable DDC targets** and returns `true` if any write succeeds, matching the Windows fallback's aggregate success behavior. DDC values are normalized using each monitor's reported maximum. Successful transmission does not prove the monitor applied the value; read back to confirm.

The public function names, percentage units, snapshot field names, and event signature follow the Windows plugin. Differences include macOS `source` values and device identifiers, `levels: null`, polling instead of WMI events, finite-number validation, and retaining listeners after `stop()`. There is no public display-selection parameter, per-display enumeration, gamma dimming, or screen overlay. Calls are synchronous and DDC transactions may block the calling JS thread.

This is an independent plugin. The main eIsland application's brightness IPC still needs platform-specific integration before this package enables application brightness control on macOS.

## Test and smoke commands

| Command | Purpose |
|---------|---------|
| `npm test` | Compile native logic tests on macOS; run 33 cases on macOS or 15 on other hosts |
| `npm run smoke` | Read actual hardware and print all snapshot fields |
| `npm run smoke:monitor` | Listen for 8 seconds while brightness is changed manually |
| `npm run smoke:verify-set` | Adjust a system target by five percentage points, check readback and events, then restore the initial percentage |
| `npm run test:plugins -- brightnessRuntime.test.mjs` | Run from the repository root after building the plugin |

The setting smoke always attempts restoration, including after a failed check. It rejects DDC fallback because the public API can write multiple displays but cannot snapshot and restore their individual brightness values. Do not disconnect or switch screens during this test. Automatic brightness adjustments may affect readback.

The suite passed under Node, Electron in Node mode, and the repository Vitest plugins project. Type declarations, both ad-hoc signatures, npm archive contents, extracted-package loading, and Electron ASAR loading were also checked on arm64.

The 33 cases cover the JS API, timer lifecycle, missing devices, error cleanup, restart, multiple monitors, real compiled Swift selection/write logic, DDC framing/checksums/ranges/scaling, and actual Node-API validation. Hardware targets are injected into internal Swift tests; no test-only backend is shipped. Only native test cases require macOS. The `pretest` hook skips native compilation on other hosts, allowing the 15 JS and build-guard cases to run. Four regression checks simulate Linux and Windows to verify the test-only path and the native-build platform restriction. These tests do not establish external DDC hardware compatibility.

On the development Apple Silicon Mac (macOS 27.0.1), the setting smoke read 54%, wrote and observed 59%, received monitor events, and restored 54%. Intel builds are cross-compiled; Intel runtime, external monitors, hotplug/sleep recovery, older OS releases, and final signed distribution still require hardware testing. Repository tests and smoke scripts are not included in the npm archive.

Example read-only output:

```json
{
  "platform": "darwin",
  "arch": "arm64",
  "napi": "10",
  "brightness": {
    "currentBrightness": 54,
    "levels": null,
    "instanceName": "display:1",
    "source": "display-services"
  }
}
```

## Electron packaging and backend limits

Unpack the addon and its Swift library together:

```json
{
  "asarUnpack": ["node_modules/eisland-macos-brightness-helper/prebuilds/**/*"]
}
```

The loader translates `app.asar` paths to `app.asar.unpacked`. Keep `brightness.node` and `libEislandBrightnessCore.dylib` in the same architecture directory. Distribution must re-sign native code with the application's Developer ID and validate the signed/notarized installed application.

DisplayServices, Apple Silicon IOAVService, and Intel's legacy display-port mapping are dynamically resolved. These private or legacy APIs can change across macOS releases. Missing symbols degrade to an available fallback or `null`/`false`. This implementation is intended for distribution outside the Mac App Store. It does not require Screen Recording or Accessibility permission for the implemented brightness APIs.

External hardware must support DDC/CI brightness and enable DDC/CI in its on-screen settings. Docks, adapters, HDMI paths, and DisplayLink configurations can prevent access. There is no claim that every external screen is supported.

Implementation references: [MonitorControl](https://github.com/MonitorControl/MonitorControl/tree/84ac2d72bfb53b653536e484946f6ed027e4229c) and [m1ddc](https://github.com/waydabber/m1ddc) for the macOS hardware APIs and DDC protocol. This package implements its own Swift core and does not bundle either upstream application. eIsland source is GPL-3.0-or-later.

## Source files

| File | Responsibility |
|------|---------------|
| `index.js` / `index.d.ts` | Public exports |
| `brightness.js` / `brightness.d.ts` / `types.d.ts` | Synchronous API and types |
| `brightness-monitor.js` / `brightness-monitor.d.ts` | Timer and event lifecycle |
| `native-loader.js` | Architecture and ASAR path resolution |
| `src/BrightnessCore.swift` | Target selection, normalization, serial hardware access, C ABI |
| `src/NativeDisplays.swift` | DisplayServices, Intel IOKit, and DDC transports |
| `src/DDCProtocol.swift` | Brightness VCP packets and reply validation |
| `src/addon.c` | Node-API binding |
| `scripts/build.mjs` | Dual architecture build, symbol checks, signing, native test compilation |
| `test/brightnessRuntime.test.mjs` / `test/NativeCoreTests.swift` | Vitest and compiled Swift tests |
| `test/smoke.cjs` | Actual hardware readback and monitoring |
