---
title: Electron E2E Testing
icon: desktop
---

# Electron E2E Testing

:::info
The Playwright suite launches the real Electron main process and built React UI on Windows and macOS. It exercises the preload bridge, IPC handlers, and file storage. See [Testing Commands](test-commands.md) for the separate Vitest suite.
:::

## Install and Run

Run these commands from the repository root with Node.js 25, matching the E2E CI workflow:

```bash
npm ci --ignore-scripts --force
node node_modules/electron/install.js
npm run typecheck:e2e
npm run test:e2e
```

The local Windows plugin packages declare OS and CPU restrictions. `--force` allows dependency installation for the macOS test build, while `--ignore-scripts` skips native installation scripts. Install the Electron binary explicitly afterward. The ordinary `e2e` build substitutes the directly imported Windows plugins.

For the full Windows x64 suite, install the .NET 10 SDK and the Visual Studio C++ build tools required by Native AOT, then run:

```bash
npm run test:e2e:windows
```

This command builds the four native helpers, verifies their output paths, builds Electron with `--mode e2e-windows`, and runs all scenarios with real plugins. The ordinary `e2e` build uses plugin substitutes. To require working audio and brightness devices rather than allow device-dependent skips, set `EISLAND_E2E_REQUIRE_DEVICES=1` before running the Windows suite.

:::important
Local tests require a logged-in graphical desktop session. Electron opens visible windows and supplies its own Chromium binary; this suite does not require `playwright install`.
:::

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run build:e2e` | `electron-vite build --mode e2e` | Build the main process, preload, and renderer into `e2e/out/` |
| `npm run build:e2e:windows:native` | `node e2e/build-windows-native.mjs` | Build real Windows volume, brightness, SMTC, and icon helpers |
| `npm run build:e2e:windows` | Native helper build and `electron-vite build --mode e2e-windows` | Build the isolated Windows application with real plugins |
| `npm run test:e2e:windows` | Windows build and `test:e2e:run` | Run the complete Windows suite |
| `npm run test:e2e` | `npm run build:e2e && npm run test:e2e:run` | Rebuild and run the complete desktop suite |
| `npm run test:e2e:run` | `playwright test --config e2e/playwright.config.ts` | Run the existing E2E build |
| `npm run typecheck:e2e` | `tsc --noEmit -p e2e/tsconfig.json` | Check E2E TypeScript files and `electron.vite.config.ts` |

To filter or debug an existing build:

```bash
npm run build:e2e
npm run test:e2e:run -- --grep "restores"
npm run test:e2e:run -- --debug
```

Rebuild after changing application code, the E2E entry, or build configuration. `test:e2e:run` does not rebuild automatically.

## Current Coverage

`e2e/desktop.spec.ts` contains five scenarios:

| Scenario | Assertions |
|----------|------------|
| Startup and standalone navigation | Isolated application profile, real preload API, standalone window, and Todo/Countdown tab switching |
| Todo lifecycle and restart | Add, edit, complete, restore after restarting Electron, and delete; verify the actual `todos.json` file |
| Cross-window synchronization | Write through the main window's preload API and verify the standalone Todo UI and stored file update |
| Standalone close and reopen | Close the actual BrowserWindow, reopen it, and verify the saved Todo UI |
| Countdown lifecycle and restart | Add, edit, restore after restart, and delete; verify `countdown-dates.json` and the restored standalone tab |

Windows also runs seven dedicated scenarios:

| Source | Assertions |
|--------|------------|
| `e2e/windows.spec.ts` | Inspect the actual HWND clipping region after expansion/collapse, preserve horizontal center, and verify always-on-top |
| `e2e/windows.spec.ts` | Move the real desktop cursor into the island and outside the visible region to verify hover/leave and resize |
| `e2e/windows.spec.ts` | Register a dedicated global shortcut through IPC, send actual Windows keyboard input while the standalone window has focus, hide/restore the island, and unregister the shortcut |
| `e2e/windows-native.spec.ts` | Extract and validate a PNG from the Electron executable through the actual native icon DLL; verify a missing path returns null |
| `e2e/windows-native.spec.ts` | Query actual SMTC session status and validate the available or unavailable response |
| `e2e/windows-native.spec.ts` | Query volume/mute and write back the current volume through the real audio helper |
| `e2e/windows-native.spec.ts` | Query brightness and write back the current brightness through the real display helper |

Input tests restore the original cursor and unregister their shortcut during cleanup. Hardware tests attach the helper probe results to the report; helper execution errors fail the tests. A missing default playback endpoint or unsupported WMI/DDC-CI display produces an explicit skip unless `EISLAND_E2E_REQUIRE_DEVICES=1`. SMTC queries do not control personal media playback.

Tests use English accessible names from `i18n/en-US.json` and assert that no renderer page errors were recorded. The configuration runs one worker, disables parallel execution, and uses zero retries. Each test has a 60-second timeout; assertions have a 10-second timeout.

:::note
The Windows suite covers native window regions, cursor input, global shortcuts, actual DLL loading, and available audio/display controls. Controlled media playback, installers, and updates need additional scenarios. Running the UI suite on macOS does not establish macOS support for the released application.
:::

## Source Files

All E2E source files, configuration, build output, and diagnostics are located in the repository-root `e2e/` directory.

| File | Responsibility |
|------|----------------|
| `e2e/desktop.spec.ts` | Desktop interaction, persistence, and cross-window scenarios |
| `e2e/windows.spec.ts` | Windows region, cursor, and global-shortcut scenarios |
| `e2e/windows-input.ps1` | Built-in Windows PowerShell 5.1 Win32 input and clipping-region probe with DPI awareness; saved as UTF-8 with BOM |
| `e2e/windows-native.spec.ts` | Real native plugin IPC scenarios and device diagnostics |
| `e2e/build-windows-native.mjs` | Native helper compilation and artifact checks |
| `e2e/fixtures.ts` | Launch Electron, seed an isolated profile, open the standalone window, restart, and collect diagnostics |
| `e2e/main.mjs` | Set isolated Electron paths and a session network boundary before loading `src/main/index.ts` |
| `e2e/native.ts` | Substitutes for SMTC, volume, brightness, and application-icon native modules |
| `e2e/playwright.config.ts` | Test collection, serial execution, timeouts, and report locations |
| `e2e/tsconfig.json` | E2E type checking, including the Electron-Vite configuration |
| `electron.vite.config.ts` | Select E2E entries, native aliases, the startup flag, and output directories |
| `.github/workflows/e2e.yml` | Windows and macOS CI jobs and diagnostic artifact uploads |

## Isolation and Build Behavior

The fixture creates a temporary `userData` directory per test and seeds English settings, empty Todo and Countdown lists, and the Todo standalone tab. `e2e/main.mjs` sets both `userData` and `sessionData` before importing the application entry. A restart keeps the same profile within that test; teardown closes Electron and deletes the profile.

The E2E startup path skips the tray, onboarding, splash, clipboard watcher, Agent status services, default global shortcuts, and updater initialization. Window creation and IPC registration still use application code. The Windows shortcut scenario registers its own shortcut through IPC. Native substitute queries report unavailable data and control operations throw an explicit unsupported-operation error; the Windows native build retains actual plugin imports. Native scenarios inspect the application's build marker to prevent substitute builds from passing as native validation.

HTTP and HTTPS requests through Electron's default session are blocked. This boundary does not intercept arbitrary Node.js networking. Future network-dependent scenarios should use a deliberate local service boundary.

| Workflow | Behavior |
|----------|----------|
| E2E build | Uses `--mode e2e` or `--mode e2e-windows`, enables the test startup path, and writes to `e2e/out/` |
| Normal development and production build | Keep the regular application entries and native modules; the E2E startup flag is compiled as disabled |
| Installer and build-size collection | Read regular `out/` artifacts; E2E output lives outside that directory |
| Existing validation scripts | `test`, `typecheck`, and `check` do not automatically run E2E; invoke the E2E commands explicitly |
| Release workflow | Continues to use the existing packaging and upload steps |

## Add a Scenario

Add a `*.spec.ts` file under `e2e/` and import `test` and `expect` from `./fixtures`. Use `desktop.main` for the island page, `desktop.openStandalone()` for the standalone page, and `desktop.restart()` to verify persistence across a real application restart.

Prefer accessible roles and translated names for UI interaction. Assert observable behavior and, for persistence tests, inspect the file under `desktop.userData` so a renderer fallback cannot hide an IPC failure. Use Playwright assertions or `expect.poll` to wait for state changes.

:::tip
Keep each scenario independent: the fixture already supplies a fresh profile. Run `npm run typecheck:e2e` and `npm run test:e2e` before submitting a new scenario.
:::

## CI and Diagnostics

The `Electron E2E` workflow runs all 12 scenarios on `windows-latest`, setting up .NET 10 and building real helpers. The `macos-latest` job runs the five UI scenarios with plugin substitutes and skips the seven Windows scenarios. It triggers on pull requests affecting application source, translations, resources, plugins, E2E files, root dependencies, Electron-Vite configuration, TypeScript configuration, or the workflow itself. It also supports manual `workflow_dispatch`. Each job has a 20-minute timeout and repository read permissions. Hosted Windows runners without audio or brightness hardware explicitly skip those two device-dependent scenarios.

Diagnostics are uploaded with `if: always()` when files exist:

| Location | Contents |
|----------|----------|
| `e2e/playwright-report/` | Playwright HTML report |
| `e2e/test-results/<test-directory>/electron.log` | Electron stdout and stderr |
| `e2e/test-results/<test-directory>/trace-1.zip` | Trace from the first launch; subsequent launches use increasing numbers |
| `e2e/test-results/<test-directory>/window-*.png` | Window screenshots on test or setup failure, when a window is available |

```bash
npx playwright show-report e2e/playwright-report
npx playwright show-trace e2e/test-results/<test-directory>/trace-1.zip
```

The build, report, and result directories are ignored by Git.
