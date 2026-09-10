---
title: Development Commands
icon: code
---

# Development Commands

:::info
This document covers the core development commands for building, running, and previewing the eIsland application. For environment setup and prerequisites, see [Frontend Setup](/developer/environment-setup/frontend-setup.md).
:::

All commands are run from the `web/` directory:

```bash
cd web
npm run <script>
```

## `npm run dev`

Starts the application in development mode with hot reload.

```bash
npm run dev
```

**Under the hood:**

| Step | Process | Output |
|------|---------|--------|
| 1 | Compiles `src/main/` with electron-vite | `out/main/` |
| 2 | Compiles `src/preload/` with electron-vite | `out/preload/` |
| 3 | Starts Vite dev server for `src/renderer/` | `http://localhost:5173` |
| 4 | Launches Electron pointing at the dev server | Desktop window |

:::tip
The renderer uses **React Fast Refresh** — component state is preserved across edits. Main process changes trigger an automatic Electron restart.
:::

**Common issues:**

| Problem | Cause | Solution |
|---------|-------|----------|
| Port 5173 in use | Another process is occupying the port | `netstat -ano \| findstr :5173` then `taskkill /PID <pid> /F` |
| White screen | Renderer dev server not ready | Wait a few seconds; Vite needs time to bundle on first run |
| Native module errors | Modules not rebuilt for Electron | Run `npx electron-builder install-app-deps` |

## `npm run build`

Builds all three targets (main, preload, renderer) into the `out/` directory.

```bash
npm run build
```

**Output structure:**

```text
out/
├── main/          # Compiled main process (Node.js)
├── preload/       # Compiled preload scripts
└── renderer/      # Compiled React UI (4 HTML entries)
```

:::info
This command produces a production-ready build but does **not** create an installer. Use `npm run package` to produce a distributable `.exe` installer. See [Package Commands](package-commands.md).
:::

**When to use:**
- Before running `npm run preview` to verify the production build
- When CI needs a clean build artifact
- To debug production-only issues locally

## `npm run preview`

Previews the built application without the Vite dev server.

```bash
npm run preview
```

:::important
You must run `npm run build` first. `npm run preview` serves the pre-built files from `out/` — it does not rebuild.
:::

**When to use:**
- Verify the production build works correctly before packaging
- Debug issues that only appear outside of dev mode (e.g., CSP violations, missing assets)

## Troubleshooting

### `npm run dev` Fails to Start

**Port already in use:**

```bash
netstat -ano | findstr :5173
taskkill /PID <process-id> /F
npm run dev
```

**Native module errors:**

```bash
npx electron-builder install-app-deps
npm run dev
```

### TypeScript Errors After Pull

```bash
rm -rf out/ node_modules/
npm install
npm run build
```
