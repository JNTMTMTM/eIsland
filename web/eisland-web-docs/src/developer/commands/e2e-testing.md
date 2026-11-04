---
title: E2E Testing
icon: desktop
---

# E2E Testing

Desktop tests launch the actual Tauri executable and connect to its WebView2 debugging endpoint with Playwright. Data and WebView profiles are isolated from normal application data.

## Prepare and run

Run from the repository root on Windows x64 with Node.js 24.22.1, Rust MSVC, .NET 10, Visual Studio C++ tools and WebView2:

```powershell
npm ci --ignore-scripts
npm run plugins:build
npm run build:e2e
$env:EISLAND_SMOKE_BINARY = "$PWD/src-tauri/target/debug/eisland.exe"
npm run test:e2e
```

`build:e2e` invokes `tauri build --debug --no-bundle`, embedding production renderer pages with `custom-protocol`. A raw Cargo build without that feature expects a development server and cannot run the packaged smoke test.

`test:e2e` runs `scripts/native/smoke.mjs --packaged --music --agent` followed by `test:services`. It covers windows and animation handshakes, music, AI streaming, tool request deduplication, workspace boundaries, HTTP download pause/resume and resource range requests.

## Settings

| Variable | Use |
| --- | --- |
| `EISLAND_SMOKE_BINARY` | Executable path; required for native service tests |
| `EISLAND_SMOKE_OUTPUT` | Smoke screenshots, diagnostics and isolated application data |
| `CARGO_TARGET_DIR` | Cargo output directory; update the binary path accordingly |

Smoke uses port 9224; native service tests use 9225. Run suites sequentially with these ports free. No Chromium download is necessary: Playwright connects to installed WebView2.

```powershell
node scripts/native/smoke.mjs --packaged --music --agent
npm run test:services
npm run typecheck:e2e
```

Standalone service tests skip when `EISLAND_SMOKE_BINARY` is unset. CI sets it explicitly. `typecheck:e2e` checks native test script syntax.

Music network cases need access to the upstream platform. AI streaming and download protocol cases use local HTTP fixtures. Desktop tests do not upload releases or modify a public update feed.
