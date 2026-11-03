---
title: Package Commands
icon: box-archive
---

# Package Commands

:::info
This document covers the packaging and lifecycle commands for building distributable installers and managing native modules. For development commands (dev, build, preview), see [Development Commands](dev-commands.md).
:::

All commands are run from the `web/` directory:

```bash
cd web
npm run <script>
```

## `npm run package`

Builds the application and packages it into a Windows NSIS installer.

```bash
npm run package
```

**Under the hood:**

```text
1. electron-vite build        → out/
2. electron-builder           → dist/eIsland-{version}-Setup.exe
```

**Output:** `dist/eIsland-{version}-Setup.exe`

:::warning
This command requires **Visual Studio Build Tools 2022** with the "Desktop development with C++" workload and **.NET 10 SDK** for compiling native modules. See [Frontend Setup — Install Dependencies](/developer/environment-setup/frontend-setup.md#install-dependencies).
:::

**When to use:**
- Local testing — verify the installer builds correctly on your machine
- Before a release — ensure the installer is functional

## `postinstall`

Runs automatically after `npm install`. You should never run this manually.

```bash
# This runs automatically — do not invoke manually
npm run postinstall
```

**Under the hood:** `electron-builder install-app-deps && npm ci --prefix cli --ignore-scripts`

**What it does:**
- Rebuilds native modules (e.g., `eisland-windows-smtc-helper`, `eisland-windows-fullscreen-detector`) for Electron's Node.js version
- Ensures native addons are ABI-compatible with the Electron runtime
- Installs the dependencies of the `cli/` package, so the root `npm test` can run the CLI test project without a separate install

:::note
CI installs with `npm ci --ignore-scripts`, so this hook does not run there. The test workflow installs `cli/` dependencies only in the `cli` matrix job.
:::

:::warning
If you see native module errors after `npm install`, the `postinstall` hook may have failed. Run `npx electron-builder install-app-deps` manually to rebuild. See [Frontend Setup — Native Module Errors](/developer/environment-setup/frontend-setup.md#native-module-errors).
:::

## Troubleshooting

### `npm run package` Fails

**Missing build tools:**

:::warning
`npm run package` requires Visual Studio Build Tools 2022 with the "Desktop development with C++" workload and .NET 10 SDK. See [Frontend Setup — Install Dependencies](/developer/environment-setup/frontend-setup.md#install-dependencies).
:::

```bash
# Verify build tools are installed
# 1. Open Visual Studio Installer
# 2. Check "Desktop development with C++" workload is installed
# 3. Install .NET 10 SDK from https://dotnet.microsoft.com/download/dotnet/10.0

# Then retry
npm run package
```

### Native Module Errors After `npm install`

```bash
# Rebuild native modules for Electron
npx electron-builder install-app-deps
```
