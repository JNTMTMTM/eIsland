---
title: Frontend Setup
icon: layer-group
---

# Frontend Setup

:::info
This guide covers the environment configuration for eIsland frontend development, including toolchain installation, project setup, and IDE configuration. For an overview of the frontend technologies, see [Frontend Tech Stack](/introduction/tech-stack/frontend-tech-stack.md).
:::

## Prerequisites

The eIsland frontend is an **Electron + React + TypeScript** desktop application. The following tools are required:

| Tool | Version | Purpose | Recommended |
|------|---------|---------|---------|
| **Node.js** | >= 22.x | JavaScript runtime | 25.6.0 |
| **npm** | >= 10.x | Package manager | 11.15.0 |
| **Git** | Latest | Version control | 2.53.0.windows.2 |
| **VS Build Tools 2022** | Latest | Compile native C/C++ plugins | "Desktop development with C++" workload |
| **.NET 10 SDK** | >= 10.0 | Build temperature-helper | 10.0 |

:::warning
Node.js 22+ is required because the project uses `--experimental-strip-types` for native TypeScript execution in build scripts.
:::

### Installing Node.js

**Windows (recommended — using nvm-windows):**

```bash
# Install nvm-windows from https://github.com/coreybutler/nvm-windows
nvm install 25
nvm use 25
node -v  # Should print v25.x.x
```

**Windows (alternative — direct download):**
:::note
Download the recommended version's installer from [nodejs.org v25.6.0](https://nodejs.org/en/blog/release/v25.6.0) and run it.
:::
:::important
Directly download Node.js v25.6.0 from [node-v25.6.0-x64.msi](https://nodejs.org/dist/v25.6.0/node-v25.6.0-x64.msi) and run it.
:::

**Verify installation:**

```bash
node -v   # v25.6.0 or later
npm -v    # 11.x.x or later
```

## Project Setup

### Fork the Repository

:::tip
1. Visit [https://github.com/JNTMTMTM/eIsland](https://github.com/JNTMTMTM/eIsland)
2. Click the **Fork** button in the top-right corner
:::

:::note
This creates a personal copy of the repository under your account (`your-username/eIsland`).
:::

:::caution
You **must** fork the repository before cloning. Do not clone the original `JNTMTMTM/eIsland` repository directly — you will not have push access and cannot create pull requests.
:::

### Clone Your Fork

```bash
# Clone your fork (NOT the original repository)
git clone https://github.com/your-username/eIsland.git
cd eIsland
```

:::warning
Replace `your-username` with your actual GitHub username. Do not clone the original repository directly — you will not be able to push changes.
:::

### Add Upstream Remote

```bash
# Add the original repository as "upstream"
git remote add upstream https://github.com/JNTMTMTM/eIsland.git

# Verify remotes
git remote -v
# origin    https://github.com/your-username/eIsland.git (fetch)
# origin    https://github.com/your-username/eIsland.git (push)
# upstream  https://github.com/JNTMTMTM/eIsland.git (fetch)
# upstream  https://github.com/JNTMTMTM/eIsland.git (push)
```

### Switch to Dev Branch

```bash
# Fetch latest branches from upstream
git fetch upstream

# Switch to dev branch (main development branch)
git checkout dev

# Keep your local dev branch in sync with upstream
git pull upstream dev
```

:::info
The `dev` branch is the main development branch. All feature branches should be created from `dev`, and pull requests should target `dev`.
:::

### Push and Create Pull Request

After completing your changes, push to **your fork** (`origin`) and create a Pull Request on GitHub:

```bash
# Create a feature branch from dev
git checkout -b feat/your-feature-name

# ... make your changes and commit ...

# Push to YOUR fork (NOT upstream)
git push origin feat/your-feature-name
```

Then on GitHub:

1. Visit your fork: `https://github.com/your-username/eIsland`
2. Click **Compare & pull request**
3. Set the base repository to `JNTMTMTM/eIsland` and base branch to `dev`
4. Fill in the PR title and description, then submit

:::caution
Always push to `origin` (your fork), never to `upstream` (the main repository). You do not have push access to the main repository. All contributions must go through Pull Request review.
:::

### Install Dependencies

```bash
npm install
```

:::tip
The `postinstall` script automatically runs `electron-builder install-app-deps` to rebuild native modules for Electron's Node.js version.
:::

:::warning
`npm install` will automatically compile four native C/C++ plugins (`eisland-windows-fullscreen-detector`, `eisland-windows-performance-monitor`, `windows-toast-listener`, `windows-processes-attacker`) and one .NET helper (`temperature-helper`). This requires:

- **Visual Studio Build Tools 2022** — with the **"Desktop development with C++"** workload installed
- **.NET 10 SDK** — required for building the `eIslandTemperatureReader` helper

If you see `MSB8036: The Windows SDK version was not found` or `node-gyp` build errors, install the build tools:

1. Download [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. In the installer, select **"Desktop development with C++"** workload
3. Install [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
4. Restart your terminal and run `npm install` again
:::

## Development Commands

### Development

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run dev` | Start electron-vite dev mode with hot reload | Daily development — launches the app with React Fast Refresh and auto-restart on main process changes |
| `npm run build` | Build all three targets (main, preload, renderer) into `out/` | Before testing the production build, or when CI needs a clean build artifact |
| `npm run preview` | Preview the built application without dev server | Verify the production build works correctly before packaging |

:::info
**`npm run dev` internals:**

1. Compiles `src/main/` → `out/main/` (Node.js main process)
2. Compiles `src/preload/` → `out/preload/` (context bridge)
3. Starts a Vite dev server for `src/renderer/` with React Fast Refresh
4. Launches Electron pointing at the dev server
:::

### Testing

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run test` | Run all tests once (`vitest run`) | Before committing code, or in CI pipelines |
| `npm run test:preload` | Run only `src/preload/index.test.ts` | When modifying preload bridge code — faster than running the full suite |
| `npm run test:coverage` | Run all tests with Istanbul coverage report | Before opening a PR to verify coverage thresholds, or periodically to audit test gaps |

:::tip
For iterative development, run `npx vitest` (without `run`) to start Vitest in **watch mode** — it re-runs affected tests on file save.
:::

**Test configuration:** Vitest with `node` environment, `clearMocks: true`, `restoreMocks: true`. Test files follow the pattern `src/**/*.test.ts`.

### Packaging & Release

:::danger
These commands are for **testing and maintainer use only**. Regular developers do not have permission to upload build artifacts to remote storage (COS / MinIO). Use `npm run package` locally to verify the installer build, but do not run `release:upload*` commands.
:::

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run package` | Build + package into NSIS installer (`dist/eIsland-{version}-Setup.exe`) | Local testing — verify the installer builds correctly on your machine |
| `release:upload` | Package + upload release artifacts to COS (Cloud Object Storage) | **Maintainer only** — publish a new release to CDN |
| `release:upload-only` | Upload existing build artifacts to COS without rebuilding | **Maintainer only** — re-upload a previously built package |
| `release:upload-minio` | Upload artifacts to MinIO storage (`--minio-only`) | **Maintainer only** — internal/self-hosted release distribution |
| `release:notes` | Generate incremental release notes from git history since last tag | After merging PRs — outputs `RELEASE_NOTES_SINCE_LAST_TAG.md` |
| `changelog:generate` | Generate full changelog from git history | Periodic maintenance — regenerates `docs/CHANGE_LOG.md` |

### Code Quality

| Command | Description | When to Use |
|---------|-------------|-------------|
| `lint` | Run ESLint on the entire project (`eslint . --max-warnings=0`) | Before every commit — catches JS/TS, React, import, and JSDoc violations |
| `lint:fix` | Run ESLint with auto-fix | After pulling upstream changes or when lint reports fixable issues |
| `lint:css` | Run Stylelint on all CSS/SCSS files | After modifying styles — enforces property order, selector limits, and naming |
| `lint:css:fix` | Run Stylelint with auto-fix | When Stylelint reports fixable CSS issues |
| `lint:html` | Validate HTML files against project standards | After modifying HTML files — enforces doctype, lang, and accessibility rules |
| `lint:all` | Run all checks in parallel (ESLint + Stylelint + HTML + i18n) | Before opening a PR — comprehensive quality gate |
| `comment:check` | Validate source files comply with comment standards | Before committing — ensures JSDoc headers and inline comments follow conventions |
| `i18n:check` | Validate i18n completeness — all `t()` keys in both locale files | After any UI change that adds or modifies `t()` translation calls |

:::warning
`comment:check` and `i18n:check` use `--experimental-strip-types` (Node.js 22+ native TS execution). Ensure your Node.js version meets the requirement. See [Quality Commands](/developer/commands/quality-commands.md) for full details.
:::

### Lifecycle Hooks

| Command | Description | When to Use |
|---------|-------------|-------------|
| `postinstall` | Runs `electron-builder install-app-deps` automatically after `npm install` | Automatic — rebuilds native modules (e.g., `windows-smtc-monitor`) for Electron's Node.js version. Never run manually.

## Build System

### Electron-Vite Configuration

The project uses **electron-vite** to manage three separate build targets:

| Target | Entry | Output | Description |
|--------|-------|--------|-------------|
| **main** | `src/main/index.ts`, `src/main/smtcWorker.ts` | `out/main` | Node.js main process |
| **preload** | `src/preload/index.ts` | `out/preload` | Context bridge |
| **renderer** | `index.html`, `standalone.html`, `splash.html`, `AIbackground.html` | `out/renderer` | React UI (4 HTML entries) |

### Key Build Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `electron-vite` | ^3.0.0 | Unified build toolchain |
| `vite` | ^6.3.5 | Build engine |
| `@vitejs/plugin-react` | ^4.5.2 | React Fast Refresh |
| `@tailwindcss/vite` | ^4.2.2 | Tailwind CSS v4 integration |
| `electron-builder` | ^26.0.12 | Application packaging |

### Packaging

```bash
npm run package
```

This runs `electron-vite build` followed by `electron-builder` to produce a Windows NSIS installer in the `dist/` directory.

**Output:** `dist/eIsland-{version}-Setup.exe`

## TypeScript Configuration

The project uses a **multi-config** setup with project references:

| Config | Scope | Description |
|--------|-------|-------------|
| `tsconfig.json` | Root | References `tsconfig.node.json` and `tsconfig.web.json` |
| `tsconfig.node.json` | Main + Preload | Node.js target, CommonJS modules |
| `tsconfig.web.json` | Renderer | Browser target, `react-jsx`, bundler module resolution |

**Renderer path alias:**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/renderer/*"]
    }
  }
}
```

Usage in renderer code:

```ts
import { useIslandStore } from '@/store/useIslandStore';
```

## IDE Configuration

### VS Code (Recommended)

**Required extensions:**

| Extension | Purpose |
|-----------|---------|
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | JavaScript/TypeScript linting |
| [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | Code formatting |
| [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) | Tailwind class autocomplete |
| [Vitest](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) | Test runner UI |

**Recommended settings (`.vscode/settings.json`):**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Verifying the Setup

After completing the setup, verify everything works:

```bash
# 1. Check Node.js version
node -v  # Should be v22+ (project uses v25.6.0)

# 2. Install dependencies
npm install

# 3. Run tests
npm run test

# 4. Start development mode
npm run dev
```

:::tip
If `npm run dev` launches the Electron window with the dynamic island visible, your frontend development environment is ready.
:::

## Troubleshooting

### Native Module Errors

If you see errors about native modules (e.g., `@coooookies/windows-smtc-monitor`):

```bash
# Rebuild native modules for Electron
npx electron-builder install-app-deps
```

### TypeScript Errors After Pull

If you see TypeScript errors after pulling new changes:

```bash
# Clean build artifacts and reinstall
rm -rf out/ node_modules/
npm install
npm run build
```

### Electron Launch Fails

If Electron fails to launch in dev mode:

```bash
# Check if port is in use (default: 5173 for renderer)
netstat -ano | findstr :5173

# Kill the process if needed, then retry
npm run dev
```
