---
title: eIsland CLI
icon: terminal
---

# eIsland CLI

:::info
This document covers the `eisland` command line tool in `cli/`. It reads the scripts in the root `package.json` at runtime and runs them through `npm run`, with an interactive picker, grouped listing, shorthand commands, and confirmation before dangerous scripts. For the scripts themselves, see [Development Commands](README.md).
:::

## Installation

The CLI is a private local package. It is not published to npm.

```bash
cd cli
npm install
npm run build
npm link
```

After `npm link`, the `eisland` command is available globally. It works from any directory inside the repository because it walks up to find the root `package.json` (`name: "eisland"`).

:::tip
Run `npm run dev` inside `cli/` to rebuild on every change (`vite build --watch`). The linked command picks up the new build right away.
:::

### Package Scripts

| Command | Script | Description |
|---------|--------|-------------|
| `npm run build` | `vite build` | Bundle `src/index.ts` into `dist/index.js` (Vite SSR build, Node 24 target) |
| `npm run dev` | `vite build --watch` | Rebuild on change |
| `npm run typecheck` | `tsc -p tsconfig.json --noEmit` | Type-check only; `tsc` does not emit |
| `npm test` | `vitest run` | Run CLI tests with the CLI's own Vitest config |
| `npm run test:watch` | `vitest` | Run CLI tests in watch mode |

## Usage

| Command | Description |
|---------|-------------|
| `eisland` | Open the interactive picker (TTY only; prints help otherwise) |
| `eisland list [group]` | List scripts by group (alias: `ls`) |
| `eisland run <script> [-- args]` | Run a script by its exact name |
| `eisland <seg> [seg...] [-- args]` | Shorthand: segments are joined with `:` |
| `eisland help` | Show help |

```bash
eisland test main                       # npm run test:main
eisland plugin build smtc               # npm run plugin:build:smtc
eisland run test:renderer -- --watch    # npm run test:renderer -- --watch
eisland list plugin                     # list only the plugin group
```

### Options

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation for dangerous scripts |
| `--lang <locale>` | Output language: `zh-CN`, `zh-TW`, `en-US`, `ja-JP` |
| `-h, --help` | Show help |
| `-v, --version` | Show the CLI version |

:::important
Arguments meant for the script must come after `--`. Unknown options before `--` are rejected, so `eisland test --watch` fails while `eisland test -- --watch` works.
:::

### Interactive Picker

Type to filter by script name or description (several space-separated keywords must all match). Use `↑` / `↓` to move, `Enter` to run, and `Esc` or `Ctrl+C` to cancel. Scripts without a translated description show their raw command instead.

### Name Resolution

| Input | Result |
|-------|--------|
| Exact match after joining with `:` | The script runs |
| Prefix of existing scripts, e.g. `eisland plugin build` | Lists the matching scripts and exits with code `1` |
| Typo, e.g. `eisland tset main` | Suggests similar names ("Did you mean") and exits with code `1` |

:::note
Groups are the first segment of each script name (`test`, `lint`, `plugin`, `release`, ...). The script list is never hard-coded, so a new root script works in the CLI right away.
:::

### Exit Codes

| Code | Meaning |
|------|---------|
| Script exit code | Passed through unchanged from `npm run` |
| `1` | Invalid arguments, unknown script or group, refused dangerous script, or `npm` failed to start |
| `130` | Cancelled by the user, or the script was terminated by a signal |

## Dangerous Script Protection

Scripts matching `release:upload*` and `esa:purge*` upload release artifacts or purge CDN cache. They are marked `[dangerous]` in the list and picker.

| Environment | Behavior |
|-------------|----------|
| Interactive terminal | Asks `(y/N)`; only `y` continues, and `Enter` defaults to No |
| Non-interactive (CI, pipes) | Refuses with exit code `1` unless `--yes` is passed |
| `--yes` | Runs without asking |

:::danger
These scripts act on production resources and cannot be undone. Only pass `--yes` in automation that is meant to publish.
:::

npm lifecycle scripts such as `postinstall` are hidden from the list and picker, but you can still run them explicitly with `eisland run postinstall`.

## Internationalization

The output language is chosen in this order: `--lang` > the `EISLAND_LANG` environment variable > the system locale > `en-US`. Translations live in `cli/i18n/{zh-CN,zh-TW,en-US,ja-JP}.json` and are separate from the app's `i18n/` files.

:::warning
Every root `package.json` script needs a `scripts.<name>` description in all four CLI locale files. `npm run test:cli` fails when a description is missing, and `npm run i18n:check` checks key alignment, `t()` references, hard-coded Chinese, and that the CLI covers every app locale.
:::

## Test

| Command | Script | Description |
|---------|--------|-------------|
| `npm test` (inside `cli/`) | `vitest run` | Run CLI tests on their own |
| `npm run test:cli` | `vitest run --project cli` | Run CLI tests from the repository root |

`cli/vitest.config.ts` is the single source of the CLI test settings (`src/**/*.test.{ts,tsx}`, Node environment, mocks cleared and restored). The root `vitest.config.mts` references that file as a project path, so `npm test` at the root also runs the CLI tests. In CI, the CLI runs as its own matrix job, which installs `cli/` dependencies with `npm ci --prefix cli`.

:::tip
Change CLI test settings only in `cli/vitest.config.ts`. The root config does not use `extends: true` for this project, so root-level options such as coverage settings do not apply to it.
:::

## Source Files

| File | Responsibility |
|------|---------------|
| `cli/src/index.ts` | Entry point; sets the process exit code |
| `cli/src/app.ts` | Command dispatch, help and list output, dangerous script gate |
| `cli/src/core/args.ts` | Argument parsing with `util.parseArgs` and `--` passthrough |
| `cli/src/core/scripts.ts` | Load, group, resolve, suggest, and filter scripts |
| `cli/src/core/projectRoot.ts` | Find the repository root by walking up directories |
| `cli/src/core/runner.ts` | Run `npm run` via `cross-spawn` and pass the exit code through |
| `cli/src/core/i18n.ts` | Locale detection and i18next setup |
| `cli/src/ui/scriptPicker.tsx` | Ink searchable script picker |
| `cli/src/ui/confirmPrompt.tsx` | Ink `(y/N)` confirmation prompt |

:::details Technology Stack
- **Ink 8 + React 19** for the interactive UI
- **Vite 8** SSR build into a single ESM file; runtime dependencies stay external
- **i18next** for translations
- **cross-spawn** to run `npm` safely on Windows (avoids `EINVAL` when spawning `.cmd` files and handles argument quoting)
:::
