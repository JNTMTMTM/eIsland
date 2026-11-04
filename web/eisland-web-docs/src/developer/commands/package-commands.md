---
title: Package Commands
icon: box-archive
---

# Package Commands

Run these commands from the **repository root**. Tauri builds the Windows application and its NSIS installer. See [Development Commands](dev-commands.md) for local setup and [Release Commands](release-commands.md) for distribution.

## Build the installer

```powershell
npm run package
```

The command performs two stages:

1. `npm run plugins:build` publishes the native helpers and stages FFmpeg.
2. `npx tauri build` builds the renderer, Rust host and NSIS installer.

On a clean checkout, install dependencies first. Native resource preparation downloads FFmpeg automatically when missing:

```powershell
npm ci --ignore-scripts
npm run package
```

Building native resources requires .NET 10, the Rust MSVC toolchain and Visual Studio 2022 C++ build tools. WebView2 is required to run the desktop application. Node.js is a build tool and is not bundled as an application runtime.

With the default Cargo target directory, outputs include:

```text
out/renderer/                                             # Embedded renderer assets
src-tauri/resources/native/                                # Prepared native resources
src-tauri/target/release/eisland.exe                        # Native executable
src-tauri/target/release/bundle/nsis/eIsland_<version>_x64-setup.exe
```

If `CARGO_TARGET_DIR` is set, the executable and installer are under that target directory instead. The installer version comes from the application version configuration. Keep `package.json` and `src-tauri/tauri.conf.json` versions aligned.

## Use resources prepared earlier

```powershell
npm run plugins:build
npm run test:api
npm run test:rust
npx tauri build
```

`npx tauri build` invokes Tauri directly and consumes the prepared resources. This is the CI sequence: native resources are built once, tests run, and the installer is built without repeating the plugin stage. Tauri's application build hook runs only `npm run build:web`.

`npm run build` builds the native executable without an installer. `npm run build:web` builds only renderer assets.

## Dependency installation

The root `postinstall` installs the independent CLI package with `npm ci --prefix cli --ignore-scripts`. Native resources are prepared separately. With `npm ci --ignore-scripts`, install CLI dependencies explicitly when running CLI tests:

```powershell
npm ci --prefix cli --ignore-scripts
```

## Prepare an update manifest

```powershell
node scripts/native/create-update-manifest.mjs
```

The generator reads the existing NSIS installer, checks the Windows executable header and writes `release/bundle/tauri-latest.json` under the Cargo target directory. The manifest includes the native runtime, version, notes, installer URL, exact byte length and SHA-512 digest. `CARGO_TARGET_DIR` selects the build directory; `EISLAND_TAURI_RELEASE_BASE_URL` selects the public installer URL prefix.

Generating this JSON does not upload an installer or publish an update feed. Review the URL and notes before using the [release upload commands](release-commands.md).

## Troubleshooting

- A failed FFmpeg download requires checking network access before retrying `npm run plugins:build`.
- A missing plugin output requires `npm run plugins:build` with the correct .NET SDK and target architecture.
- Resolve installer-name or version mismatches before generating or uploading an update manifest.
