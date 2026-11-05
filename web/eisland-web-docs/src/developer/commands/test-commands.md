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
| `npm run test:services` | Native streams/files/network/images and real toolbox download/history interactions |
| `npm run test:coverage` | Coverage for active Vitest projects |
| `npm run test:toolbox` | All toolbox renderer and dedicated API tests |
| `npm run test:toolbox:coverage` | Complete toolbox JavaScript scope, with four overall 99% gates |
| `npm run test:toolbox:rust:prepare` | Isolated instrumented Rust tests and desktop build |
| `npm run test:toolbox:rust:env` | Print the matching PowerShell environment for native scenarios |
| `npm run test:toolbox:coverage:rust` | Merge native profiles and report Rust line/function/region coverage |
| `npm run test:discovery` | Verify active source/plugin tests are collected once |
| `npm run lint:config:test` | Lint rules, workflow classification and CI behavior |

API and release tests use Node's test runner. Rust tests require the MSVC toolchain. Release tests replace storage/CDN boundaries and do not publish files.

Toolbox coverage includes all production files under the toolbox, tools and dedicated API directories, even when tests do not import them. JavaScript lines, statements, functions and branches must each reach 99% overall; per-file values remain diagnostic. Reports include JSON, HTML, LCOV, file inventory and uncovered locations under `coverage/toolbox/renderer/`.

Native coverage is separate. Stable LLVM reports Rust lines, functions and regions; branch coverage is unsupported and explicitly reported without a percentage. Build the latest renderer, prepare the isolated native target, run real scenarios with the printed `LLVM_PROFILE_FILE` environment, and exit the application normally before generating reports. Native metrics below 99% still fail even if JavaScript passes. See the repository's `docs/TOOLBOX_COVERAGE.md` for the exact scope and commands.

## Windows plugin integration

```powershell
npm run test:plugins:build
npm run test:plugins
```

Preparation builds the 13 plugins used by the Node integration suite and checks required DLL, EXE and Node addon outputs. It is separate from `plugins:build`, which prepares components bundled with Tauri. Integration requires Windows x64, Node.js 24.22.1, .NET 10 and Visual Studio C++ build tools.

`test:plugins:integration` runs only real-device tests. These query hardware, screenshots and media state. Brightness tests restore the initial level. Notification tests check access before reading; missing permission means unavailable data, while unexpected read failures still fail.

See [E2E Testing](e2e-testing.md) for the debug build and binary selection. `test:services` uses the default debug executable or `EISLAND_SMOKE_BINARY`; a missing executable fails the tests. Native test files execute sequentially so the application's single-instance lock does not conflict between scenarios.
