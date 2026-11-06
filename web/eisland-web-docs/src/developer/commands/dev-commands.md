---
title: Development Commands
icon: code
---

# Development Commands

Run application commands from the **repository root**, where the application `package.json` lives. The desktop runtime is Tauri with a React renderer in WebView2. Rust implements the native services.

## First setup

Windows x64 requires Node.js 24.22.1, Rust with the MSVC toolchain, Visual Studio 2022 C++ build tools, .NET 10 SDK and WebView2.

```powershell
npm ci --ignore-scripts
npm ci --prefix cli --ignore-scripts
npm run plugins:build
```

`plugins:build` publishes the volume, brightness, SMTC and temperature components and stages native FFmpeg in `src-tauri/resources/native/`. Missing FFmpeg is downloaded automatically; first setup requires network access. Repeat preparation after changing plugin sources or target architecture. Development and direct Tauri builds consume these resources.

## Start the desktop application

```powershell
npm run dev
```

Tauri runs `npm run dev:web`, starts Vite at `http://localhost:1420`, compiles the Rust host and opens the desktop windows. React edits use Fast Refresh; Rust edits rebuild the host. Native plugin changes require the separate preparation command.

`npm run dev:web` starts only the renderer server. Native desktop APIs require the Tauri host.

## Build and run production pages

```powershell
npm run build
```

This runs `tauri build --no-bundle`: Vite writes `out/renderer/`, and Cargo builds the native executable without creating an installer. With the default Cargo target directory, the executable is `src-tauri/target/release/eisland.exe`.

Run that executable directly to inspect the embedded production pages. `npm run preview` starts Tauri with host watching disabled and uses the renderer development server.

```powershell
npm run build:web        # Renderer assets only
npx tauri build      # Native application and NSIS installer; resources must be prepared
npm run package          # Prepare native resources, then build the application and installer
```

See [Package Commands](package-commands.md) for installer outputs and [Release Commands](release-commands.md) for uploading an existing build.

## Native tests

```powershell
npm run test:api
npm run test:rust
npm run build:e2e
npm run test:e2e   # Real WebView2, music, AI and native service tests
```

The desktop tests use isolated data directories. Set `EISLAND_SMOKE_BINARY` when the executable is outside the default debug target directory. A direct Cargo build used for these tests must enable the `custom-protocol` feature so it embeds the production pages.

## Troubleshooting

- If port 1420 is occupied, inspect `netstat -ano | findstr :1420` and stop the development process that owns it before restarting.
- If native resources are missing, run `npm run plugins:build`; its first run may download FFmpeg.
- If Cargo cannot link, check the MSVC toolchain and the Visual Studio C++ workload. A renderer-only build does not validate the Rust executable or native plugins.
- `CARGO_TARGET_DIR` can relocate Cargo output. Update `EISLAND_SMOKE_BINARY` to the resulting executable path when running desktop tests.
