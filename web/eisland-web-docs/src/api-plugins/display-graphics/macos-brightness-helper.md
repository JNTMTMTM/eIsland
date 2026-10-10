---
watermark: true
title: macOS Brightness Helper
icon: sun
---

# macOS Brightness Helper

`eisland-macos-brightness-helper` · v26.0.2

Native hardware brightness query, control, and monitoring through Swift + C / Node-API.

:::info
This independent plugin lives in `plugins/macos/eisland-macos-brightness-helper`. The eIsland main application still needs platform-specific brightness integration. Creating this package does not enable application-wide macOS support.
:::

## Build / Usage

Requires macOS with arm64 or x64, Node.js 18+ / Node-API 8, and matching prebuilds. The deployment target is macOS 13.0; older OS releases still require runtime verification. Development requires Xcode Command Line Tools and Node.js 22.12+ for the locked Vitest 4.1 toolchain.

```bash
cd plugins/macos/eisland-macos-brightness-helper
npm ci
npm run build
npm test
npm run smoke
npm run build:all
npm pack
```

`build` compiles the host architecture; `build:all` compiles both. `npm pack` runs `build:all` automatically. The build validates Swift C ABI exports and applies ad-hoc signatures. `NODE_INCLUDE_DIR` can point to existing Node-API headers; otherwise node-gyp can download them.

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

## Query and Control API

| API | Result | Behavior |
|-----|--------|----------|
| `getBrightness()` | `BrightnessInfo \| null` | Synchronous reading of the first supported screen |
| `setBrightness(percent)` | `boolean` | Rounds and clamps finite numbers to 0–100; invalid input throws `RangeError` |
| `BrightnessMonitor.start()` | `void` | Baseline read followed by 500 ms polling; throws if initially unavailable |
| `BrightnessMonitor.stop()` | `void` | Clears timer and baseline; retains listeners for restart |
| `BrightnessMonitor.isRunning()` | `boolean` | Whether sampling is active |

| Snapshot field | Meaning |
|----------------|---------|
| `currentBrightness` | Integer percentage, 0–100 |
| `levels` | Explicitly `null`; no discrete WMI-style steps reported |
| `instanceName` | `display:<CGDisplayID>` or Apple Silicon DDC `ioreg:<RegistryEntryID>` |
| `source` | `display-services`, `iokit`, or `ddc-ci` |

System targets are ordered by built-in screen, main screen, then other screens. DisplayServices is tried per display, with an Intel IOKit fallback. If no system target is readable, external DDC/CI brightness VCP `0x10` is attempted using Apple Silicon IOAVService or Intel framebuffer I2C.

Setting writes the first readable system target. A failed system write returns `false` without switching to another screen. DDC fallback attempts all readable DDC targets, scaling against each monitor's reported maximum, and returns whether any write succeeded. The API has no display-selection parameter or software dimming fallback. Successful DDC transmission still needs readback to confirm application by the monitor. Calls are synchronous and may block during DDC transactions.

## Monitoring and Windows Compatibility

`brightness-changed` emits `(level, timestamp)` where the timestamp is Unix milliseconds. It fires on integer percentage changes or selected-device replacement, with no initial event. Start and stop are idempotent. Hardware disappearance and read exceptions stop sampling and emit `error`; attach an error listener and restart explicitly after recovery.

Function names, snapshot field names, percentage units, and event arguments follow the Windows helper. macOS uses different source values and device IDs, always returns `levels: null`, and polls rather than consuming WMI events. Stop retains listeners for restart. Changes occurring between samples may be missed.

## Electron Packaging and Backend Limits

```json
{
  "asarUnpack": ["node_modules/eisland-macos-brightness-helper/prebuilds/**/*"]
}
```

Keep the `.node` and Swift `.dylib` together in their architecture directory. The loader translates `app.asar` to `app.asar.unpacked`. Re-sign native files with the application's Developer ID and validate the installed signed/notarized application.

:::warning
DisplayServices and Apple Silicon IOAVService are private APIs, and Intel display-port mapping uses a legacy API. Symbols are resolved at runtime; missing capabilities return an available fallback or `null`/`false`. Future OS changes can break support. External DDC/CI depends on the monitor and connection path. This backend is intended for distribution outside the Mac App Store. Intel runtime and external DDC hardware have not been verified on the development Mac.
:::

The hardware APIs and DDC protocol were researched using [MonitorControl](https://github.com/MonitorControl/MonitorControl/tree/84ac2d72bfb53b653536e484946f6ed027e4229c) and [m1ddc](https://github.com/waydabber/m1ddc). No upstream application is bundled.

## Test

The 44 Vitest cases cover JS argument handling and monitor cleanup, compiled Swift target selection and write isolation, DDC framing/checksums/ranges/scaling, and the actual Node-API boundary. Swift logic tests inject internal hardware targets without changing physical brightness. Native tests require macOS; `pretest` skips native compilation on other hosts, allowing 25 JS, loader, and build-guard cases to run. Four build-guard regression checks simulate Linux and Windows. Loader cases verify platform and architecture rejection, prebuild lookup, failed loads, caching, and ASAR paths.

On the development arm64 Mac, runtime JS statement, branch, function, and line coverage reached 100%. Owned Swift / C line coverage reached 68.78%; the pure DDC protocol reached 100%. External-display and Intel backends, physical writes, and low-level failures remain partly uncovered. Reports are `coverage/js/index.html` and `coverage/native/html/index.html`. The native command requires `npm run build` and Node headers, creates instrumented binaries under `build/native-coverage/`, and does not replace production prebuilds. Git ignores these generated files. Build scripts and OS frameworks are outside coverage scope.

| Command | Purpose |
|---------|---------|
| `npm test` | Compile native tests and run Vitest |
| `npm run test:coverage` | V8 coverage for the four runtime JS files |
| `npm run test:coverage:native` | Isolated LLVM coverage for owned Swift / C sources on macOS |
| `npm run smoke` | Read actual hardware and print the complete snapshot |
| `npm run smoke:monitor` | Observe changes for 8 seconds |
| `npm run smoke:verify-set` | Change a system target by five percentage points, verify readback and events, and attempt restoration |
| `npm run test:plugins -- brightnessRuntime.test.mjs` | Repository root test command after plugin build |

:::important
The setting smoke rejects DDC fallback because setting can affect multiple displays and the API cannot restore their individual prior values. Keep the selected display connected during testing. The read-only smoke is the default. Development tests and smoke scripts are excluded from the published archive.
:::

The suite passed under Node, Electron in Node mode, and the repository Vitest plugins project. Type declarations, native ad-hoc signatures, npm archive contents, extracted-package loading, and Electron ASAR loading were also checked on arm64.

Real testing on an Apple Silicon Mac running macOS 27.0.1 read 54%, set and observed 59%, received change events, and restored 54%. Both architectures build successfully. Intel runtime, external DDC hardware, older OS releases, hotplug/sleep recovery, and final signed distribution require additional hardware testing.

## Source Files

| File | Responsibility |
|------|---------------|
| `brightness.js` / `brightness-monitor.js` | Public API and timer lifecycle |
| `index.d.ts` / `types.d.ts` | Public TypeScript types |
| `native-loader.js` | Architecture and ASAR loading |
| `src/BrightnessCore.swift` | Selection, normalization, synchronization, and C ABI |
| `src/NativeDisplays.swift` | Hardware API and DDC transport |
| `src/DDCProtocol.swift` | VCP framing and reply validation |
| `src/addon.c` | Node-API 8 exports |
| `scripts/build.mjs` | Native builds, export checks, and ad-hoc signatures |
| `scripts/native-coverage.mjs` | Isolated LLVM instrumentation and coverage reports |
| `test/nativeLoaderRuntime.test.mjs` | Loader platform, architecture, caching, and ASAR tests |
| `test/brightnessRuntime.test.mjs` / `test/NativeCoreTests.swift` | Vitest and native logic tests |
| `test/smoke.cjs` | Real hardware diagnostics |
