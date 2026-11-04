# Tauri runtime

The application uses a Rust Tauri host and React in WebView2. Native services handle windows, media, hardware, music, files, downloads, mail, OCR, AI and CLI status. Build and test tooling lives in `scripts/native/`.

## Commands

| Command | Behavior |
| --- | --- |
| `npm run dev` | Start Vite and the desktop application with reload |
| `npm run preview` | Start the desktop application without watching host changes |
| `npm run build` | Build an executable with embedded pages, without an installer |
| `npm run plugins:build` / `native` | Prepare native resources |
| `npm run package` | Prepare native resources, then build the NSIS installer |
| `npm run release` / `release:upload` | Package, upload the release and refresh ESA |
| `npm run release:upload-only` | Upload an existing package and refresh ESA, without rebuilding |
| `npm run release:upload-minio` | Upload an existing package to MinIO only |

`dev` and `build` consume prepared native resources. `package` runs `plugins:build` before `tauri build`. Application hooks only serve or build the renderer. Resource preparation publishes the volume, brightness, SMTC and temperature components and downloads FFmpeg when missing; first setup requires network access.

## Local setup

Use Node.js 24.22.1, Rust MSVC, WebView2, .NET 10 and Visual Studio C++ build tools on Windows x64:

```powershell
npm ci --ignore-scripts
npm ci --prefix cli --ignore-scripts
npm run plugins:build
npm run dev
```

Rebuild native resources after changing their sources or architecture. `package` prepares them automatically. The default executable is `src-tauri/target/release/eisland.exe`; the installer is `src-tauri/target/release/bundle/nsis/eIsland_<version>_x64-setup.exe`. Cargo configuration or `CARGO_TARGET_DIR` can relocate the target directory. Keep `package.json` and `src-tauri/tauri.conf.json` versions aligned.

## Tests and CI

- `test:unit` runs shared, renderer, CLI and plugin unit tests.
- `test:api` verifies native APIs, runtime entry points and release tooling.
- `test:rust` tests Rust services.
- `test:e2e` tests the built debug application in WebView2, then native service streams with isolated application data.
- `test:services` runs native download/resume and local resource tests. Set `EISLAND_SMOKE_BINARY` to a built executable with `custom-protocol`; without it, the standalone service test is skipped.

Build the desktop test executable with `npm run build:e2e` after preparing resources. Set `EISLAND_SMOKE_BINARY` for a nondefault target directory. `test:discovery` checks collection coverage; `lint:config:test` checks lint rules and CI behavior.

Desktop CI prepares resources once, runs API/Rust tests and calls `npx tauri build --debug --no-bundle`. Installer CI similarly calls `npx tauri build` directly after preparation. CI stores installer, notes and manifest as Actions artifacts. It does not invoke the uploader, publish a GitHub Release or update a CDN feed. A generated download URL does not mean the asset exists publicly.

## Native release chain

`scripts/native/upload-release.mjs` uses AWS CLI v2 and configured COS/OSS destinations, with optional MinIO. It validates an existing installer and generates a manifest from its version, exact size and SHA-512. It reads `RELEASE_NOTES.md`, falling back to `RELEASE_NOTES_SINCE_LAST_TAG.md`.

Default object keys are `tauri/eIsland_<version>_x64-setup.exe` and `tauri/latest.json`. `EISLAND_TAURI_UPLOAD_PREFIX` changes the prefix. Every selected destination receives the installer before any manifest is updated; ESA refreshes the exact manifest and installer URLs after successful uploads. MinIO-only uploads do not refresh ESA. Failures are reported; this is not a transactional rollback across providers.

The cloud manifest uses a relative installer filename for downloads from each mirror's own origin. `EISLAND_TAURI_RELEASE_BASE_URL` can specify an HTTPS installer directory. Application feed overrides are `EISLAND_TAURI_UPDATE_R2_URL`, `EISLAND_TAURI_UPDATE_ESA_URL` and `EISLAND_TAURI_UPDATE_GITHUB_URL`.

The uploader does not publish directly to R2 or GitHub Releases. Any existing MinIO-to-R2 or other replication process must synchronize the `tauri/` objects. ESA origin rewrites are external infrastructure and are not verified by the local build. Storage and ESA credentials continue to come from the root `.env` or terminal environment; missing values fail explicitly. A successful package build does not validate credentials or establish a working public update feed.

```powershell
# Validate and print the existing package plan; no AWS call, upload or CDN refresh:
node scripts/native/upload-release.mjs --dry-run
node scripts/native/upload-release.mjs --dry-run --target-dir C:/build/eisland
```

The uploader and `scripts/native/create-update-manifest.mjs` support `--target-dir <Cargo target>` or `--dist <NSIS directory>` (`-d`), otherwise using Cargo's target directory. The standalone generator defaults to a GitHub URL and writes `release/bundle/tauri-latest.json` without publishing it. Online updates require the installer and matching feed to be published together; an unavailable feed returns `NATIVE_UPDATE_MANIFEST_UNAVAILABLE`.

See [release commands](../web/eisland-web-docs/src/developer/commands/release-commands.md) for credentials and publication options. No remote publication has been performed as part of this work.

## Application data

Business data uses an existing Tauri `eIsland_store` first, otherwise `%APPDATA%/eIsland/eIsland_store` when present, and defaults to the new Tauri directory for new users. `EISLAND_DATA_DIR` overrides this for isolated runs. This lookup does not copy or move data or reuse the browser profile.
