---
title: Test Commands
icon: flask
---

# Test Commands

Run from the repository root. Install root and CLI dependencies before the full suite:

```powershell
npm ci --ignore-scripts
npm ci --prefix cli --ignore-scripts
npm test
```

`npm test` runs active Vitest projects, native API and release tooling tests, then Rust service tests.

| Command | Coverage |
| --- | --- |
| `npm run test:unit` | Shared, renderer, CLI and plugin unit tests |
| `npm run test:shared` | Shared TypeScript modules |
| `npm run test:renderer` | Renderer components and behavior |
| `npm run test:cli` | Repository development CLI |
| `npm run test:plugins:unit` | Plugin tests with fixtures and mocks |
| `npm run test:api` | Native API, runtime entry points and release tooling |
| `npm run test:release` | Installer, upload ordering, manifest and cache refresh behavior |
| `npm run test:rust` | Rust native services |
| `npm run test:e2e` | Tauri in real WebView2, followed by native service tests |
| `npm run test:services` | Native download/resume and local resource streams |
| `npm run test:coverage` | Coverage for active Vitest projects |
| `npm run test:discovery` | Verify active source/plugin tests are collected once |
| `npm run lint:config:test` | Lint rules, workflow classification and CI behavior |

API and release tests use Node's test runner. Rust tests require the MSVC toolchain. Release tests replace storage/CDN boundaries and do not publish files.

## Windows plugin integration

```powershell
npm run test:plugins:build
npm run test:plugins
```

Preparation builds the 13 plugins used by the Node integration suite and checks required DLL, EXE and Node addon outputs. It is separate from `plugins:build`, which prepares components bundled with Tauri. Integration requires Windows x64, Node.js 24.22.1, .NET 10 and Visual Studio C++ build tools.

`test:plugins:integration` runs only real-device tests. These query hardware, screenshots and media state. Brightness tests restore the initial level. Notification tests check access before reading; missing permission means unavailable data, while unexpected read failures still fail.

See [E2E Testing](e2e-testing.md) for the debug build and binary selection. Standalone `test:services` skips without `EISLAND_SMOKE_BINARY`; CI explicitly sets it to exercise the native process.
