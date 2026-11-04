# Electron retirement

The active desktop runtime is Tauri. Original Electron functions, signatures and tests remain in source with `@deprecated` annotations as migration references. The copyright headers are preserved. Existing business behavior is implemented by native Rust services and the Tauri API; the active application does not import the old main/preload modules or launch a Node helper.

## Application commands

| Command | Current behavior |
| --- | --- |
| `npm run dev` / `dev:tauri` | Start Tauri and the renderer development server |
| `npm run build` | Build the native Tauri application without an installer |
| `npm run package` / `build:tauri` | Build the native application and NSIS installer |
| `npm run plugins:build:tauri` | Explicitly build native plugins; application hooks do not rebuild them |
| `npm run native:tauri` | Compatibility alias for native plugin preparation |
| `npm run preview` | Disabled legacy Electron preview |
| `music:build:tauri` | Disabled; Rust owns music services |
| Old Electron E2E, legacy tests and upload commands | Fail with a localized retirement message |

`package.json.deprecatedElectron` records the old commands, dependency versions and configuration paths. These records are data, not executable npm scripts. Electron, its toolkit, builder, updater and Electron Vite are no longer active dependencies. The old source can be read without installing or launching the runtime.

## Tests

- `test:unit` runs shared, renderer, CLI and plugin unit tests.
- `test:tauri:api` verifies the native frontend contract and disabled Electron command guards.
- `test:rust` checks Rust service behavior; `test:tauri` runs both native test layers.
- `test:e2e:tauri` starts the built debug Tauri application in real WebView2, using isolated app data. It does not launch Electron.
- `test:main` and `test:preload` point at the Rust and native API tests respectively.

Old Electron browser fixture callbacks are preserved with skipped test registrations. The old main/preload Vitest projects remain discoverable for source auditing but are excluded from the default CI project matrix. Their commands remain disabled so a test selection cannot silently restore the old runtime.

## GitHub CI

The unit workflow runs active projects and native API guards. Desktop E2E installs Rust and .NET tooling, prepares native plugins as a separate step, builds a debug Tauri application and exercises the same WebView2 smoke script used locally. The renderer size report measures Vite renderer output.

The release workflow builds Tauri NSIS installers, generates `tauri-latest.json` with a byte length and SHA-512 digest, and uploads both as Actions artifacts for review. Old Electron CDN uploads and `latest.yml`/blockmap publishing are disabled; those metadata formats are not reused for Tauri distribution. Previous workflows are retained under `.github/legacy-workflows/*.disabled` and cannot be executed by GitHub Actions.

The native updater accepts `runtime: "tauri"`, a `version`, `notes`, and `platforms.windows-x86_64` containing `format: "nsis"`, an HTTPS `url`, `size`, and `sha512` (base64 or hex). Installer names follow `eIsland_<version>_x64-setup.exe`. The build workflow only prepares artifacts; the JSON and installer must be published together before online updates can work. Missing native manifests return `NATIVE_UPDATE_MANIFEST_UNAVAILABLE` rather than falling back to Electron update metadata. `EISLAND_TAURI_UPDATE_R2_URL`, `EISLAND_TAURI_UPDATE_ESA_URL`, and `EISLAND_TAURI_UPDATE_GITHUB_URL` select the native feed endpoints; `EISLAND_TAURI_RELEASE_BASE_URL` selects the installer URL prefix when generating a manifest.

## Local setup

Use Node.js 24.22.1, Rust MSVC, WebView2, .NET 10 and the Visual Studio C++ build tools on Windows x64:

```powershell
npm ci --ignore-scripts
npm ci --prefix cli --ignore-scripts
node node_modules/ffmpeg-static/install.js
npm run plugins:build:tauri
npm run dev
```

After building embedded debug pages, use `npm run test:e2e:tauri`. `EISLAND_SMOKE_BINARY` can point at a separately built test executable. Application startup and packaging consume prepared native resources; rebuild plugins when their sources or target architecture change.

Business data uses an existing Tauri `eIsland_store` first, otherwise reuses `%APPDATA%/eIsland/eIsland_store` from Electron when present, and defaults to the new Tauri directory for new users; debug `EISLAND_DATA_DIR` takes precedence, without copying/moving user data or reusing the Chromium profile.
