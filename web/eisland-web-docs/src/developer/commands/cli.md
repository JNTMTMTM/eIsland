---
title: eIsland CLI
icon: terminal
---

# eIsland CLI

:::info
This document covers the `eisland-cli` command line tool in `cli/`. It reads the scripts in the root `package.json` at runtime and runs them through `npm run`, with an interactive picker, grouped listing, shorthand commands, and confirmation before dangerous scripts. For the scripts themselves, see [Development Commands](README.md).
:::

## Installation

The CLI is a private local package. It is not published to npm.

```bash
cd cli
npm install
npm run build
npm link
```

After `npm link`, the `eisland-cli` command is available globally. It works from any directory inside the repository because it walks up to find the root `package.json` (`name: "eisland"`).

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
| `eisland-cli` | Open the interactive dashboard (TTY only; prints help otherwise) |
| `eisland-cli list [group]` | List scripts by group (alias: `ls`) |
| `eisland-cli run <script> [-- args]` | Run a script by its exact name |
| `eisland-cli <seg> [seg...] [-- args]` | Shorthand: segments are joined with `:` |
| `eisland-cli help` | Show help |

```bash
eisland-cli test main                       # npm run test:main
eisland-cli plugin build smtc               # npm run plugin:build:smtc
eisland-cli run test:renderer -- --watch    # npm run test:renderer -- --watch
eisland-cli list plugin                     # list only the plugin group
```

### Options

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation for dangerous scripts |
| `--lang <locale>` | Output language: `zh-CN`, `zh-TW`, `en-US`, `ja-JP` |
| `-h, --help` | Show help |
| `-v, --version` | Show the CLI version |

:::important
Arguments meant for the script must come after `--`. Unknown options before `--` are rejected, so `eisland-cli test --watch` fails while `eisland-cli test -- --watch` works.
:::

### Interactive Dashboard

Running `eisland-cli` with no arguments opens a full-screen welcome screen with the eIsland logo and the main menu. Use `↑` / `↓` and `Enter` to open a feature, or `Esc` to quit. Your previous terminal content comes back when you quit.

| Menu entry | Description |
|------------|-------------|
| Repository | The task view for root `package.json` scripts (the CLI's first feature) |
| Local tests | Checks of system features on this machine; see [Local Tests](#local-tests) |

:::important
Going back to the main menu does not stop running tasks. They keep running and are still listed when you open Repository again. Quitting from the main menu asks first if any task is still running.
:::

The task view uses a top/bottom layout:

| Area | Content |
|------|---------|
| Top | Output of the current task, following the latest line by default |
| Bottom left box | Task list (`●` running, `✔` done, `✖` failed, `■` ended); older tasks collapse when space runs out |
| Bottom right box | The actions, script picker, or confirmation prompt |

:::note
The bottom panel takes 40% of the terminal height (at least 10 rows), and the output panel gets the rest. The task box has a fixed width of 32 columns, and long task names are truncated. The action box gets the remaining width. If the terminal is narrower than the logo, the welcome screen shows a plain `eIsland` title instead.
:::

| Action | Description |
|--------|-------------|
| Run script... | Open the picker. Type to filter by name or description; several space-separated keywords must all match. The `[dangerous]` tag comes first in the description column, and the selected row's description scrolls when it does not fit |
| End current task | Kill the current task's whole process tree (shown while it is running) |
| Close current task | Remove a finished task from the list |
| Back to main menu | Return to the welcome screen; running tasks keep running |
| Quit | End all running tasks (asks first if any are running) and restore the terminal |

| Key | Effect |
|-----|--------|
| `↑` / `↓`, `Enter` | Choose and confirm an action or script |
| `Esc` | Leave the picker and return to the actions |
| `Tab` / `Shift+Tab` | Switch the task shown in the output panel |
| `PgUp` / `PgDn` | Scroll output by one page (the view stays put while new output arrives) |
| `Home` / `End` | Jump to the first line / resume following the latest output |
| `Ctrl+C` | Quit (in the picker: go back) |

Several tasks can run at the same time, for example `dev` alongside a test run. Each task keeps its last 5000 lines. The script list is reloaded each time the picker opens. Dangerous scripts ask for `(y/N)` confirmation in the bottom panel unless you started with `--yes`.

:::warning
In the dashboard, scripts write to a pipe, not the terminal. Colors are forced on with `FORCE_COLOR=1`, but scripts that read keyboard input (such as Vitest watch-mode shortcuts) receive none. Run those with a direct command instead, for example `eisland-cli run test -- --watch`.
:::

:::tip
"End current task" uses `taskkill /T /F` on Windows and signals the process group elsewhere, so grandchild processes such as the Electron window from `dev` also stop. Direct commands such as `eisland-cli test main` keep the plain terminal output and exit after one run, so they stay safe to chain in shells and CI.
:::

### Local Tests

The Local tests screen lists tests that check system features of this machine. Pick one with `Enter`, press `Esc` to leave a running test, and press `Esc` again (or choose "Back to main menu") to return to the welcome screen.

| Test | Description |
|------|-------------|
| SMTC | Lists every media session from Windows System Media Transport Controls and refreshes them every second: source app, playback status, title, artist, album, and progress |

:::info
The SMTC test uses the repository's own plugin, `plugins/windows/eisland-windows-smtc-helper`. The CLI loads it at runtime from the repository root (it is a CommonJS package that loads a native DLL through koffi, so it is not bundled into the CLI). The test starts the plugin's `SmtcMonitor`, calls `getMediaSessions()` once per second, and stops the monitor when you leave the test.
:::

:::warning
The plugin's DLL must be built first. If the test reports `Unable to find eIslandSmtcHelper.dll`, run `npm install` (its `postinstall` builds the DLL) or `npm run build` inside `plugins/windows/eisland-windows-smtc-helper`. Building requires the .NET SDK.
:::

:::note
Some apps do not report a timeline. For those, the progress row says so instead of drawing a bar. While media is playing, the position is extrapolated from the plugin's sample time (`sampledAtMs`), so the bar keeps moving between updates. Sessions that do not fit on the screen are cut off at the bottom. On macOS and Linux the test shows that SMTC is Windows-only and starts nothing.
:::

### Name Resolution

| Input | Result |
|-------|--------|
| Exact match after joining with `:` | The script runs |
| Prefix of existing scripts, e.g. `eisland-cli plugin build` | Lists the matching scripts and exits with code `1` |
| Typo, e.g. `eisland-cli tset main` | Suggests similar names ("Did you mean") and exits with code `1` |

:::note
Groups are the first segment of each script name (`test`, `lint`, `plugin`, `release`, ...). The script list is never hard-coded, so a new root script works in the CLI right away.
:::

### Exit Codes

| Code | Meaning |
|------|---------|
| Script exit code | Passed through unchanged from `npm run` |
| `1` | Invalid arguments, unknown script or group, refused dangerous script, or `npm` failed to start |
| `0` | Quit from the interactive dashboard |
| `130` | Dangerous script confirmation declined (direct commands), or the script was terminated by a signal |

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

npm lifecycle scripts such as `postinstall` are hidden from the list and picker, but you can still run them explicitly with `eisland-cli run postinstall`.

## Internationalization

The output language is chosen in this order: `--lang` > the `EISLAND_LANG` environment variable > the system locale > `en-US`. Translations live in the `devCli` namespace of the root `i18n/{zh-CN,zh-TW,en-US,ja-JP}.json` files, shared with the app. The CLI imports only that namespace, so the bundle does not carry the app's translations.

:::warning
Every root `package.json` script needs a `devCli.scripts.<name>` description in all four locale files. `npm run test:cli` fails when a description is missing, and `npm run i18n:check` scans `cli/src/` for key alignment, `t()` references, and hard-coded Chinese. Always call `t()` with the full `devCli.` key so the check can resolve it.
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
| `cli/src/core/runner.ts` | Run `npm run` via `cross-spawn` with inherited stdio for direct commands |
| `cli/src/core/taskManager.ts` | Concurrent dashboard tasks: output capture, process tree kill, change subscription |
| `cli/src/core/outputBuffer.ts` | Split piped output into lines and strip cursor control sequences |
| `cli/src/core/i18n.ts` | Locale detection and i18next setup for the `devCli` namespace |
| `cli/src/core/smtc.ts` | Loads the SMTC helper plugin from the repository, converts its session snapshots, and polls all sessions |

The Ink UI in `cli/src/ui/` follows the project's module layout:

| Path | Responsibility |
|------|---------------|
| `ui/index.ts` | Module entry; exports `runDashboard` and `confirm` |
| `ui/types/uiTypes.ts` | Dashboard mode and action types, layout, hook return types, all component props |
| `ui/config/uiConfig.ts` | Layout ratios and row budgets, task status styles, welcome logo |
| `ui/utils/uiUtils.ts` | Pure layout, output window, paging, task switching, and picker window math |
| `ui/hooks/useDashboard.ts` | Task subscription, current task, panel mode, scrolling, and keyboard handling |
| `ui/hooks/useScriptPicker.ts` | Picker filtering, cursor, and keyboard handling |
| `ui/hooks/useConfirmInput.ts`, `useWelcome.ts`, `useAppScreen.ts` | Confirm keys, main menu cursor and quit confirmation, screen switching |
| `ui/hooks/useLocalTest.ts`, `useSmtc.ts` | Local test list, SMTC monitor lifecycle and live session state |
| `ui/components/launchers.tsx` | Mount Ink for the full-screen dashboard and for direct-command confirmation |
| `ui/components/interactiveApp.tsx` | Switches between the main menu, the dashboard, and local tests |
| `ui/components/dashboard.tsx` | Top/bottom task view composed from the components below |
| `ui/components/welcome.tsx` | Welcome screen with the eIsland logo and main menu |
| `ui/components/localTest.tsx` | Local test list |
| `ui/components/smtcView.tsx`, `smtcSessionInfo.tsx`, `smtcField.tsx` | SMTC test screen, one block per session, session fields and progress |
| `ui/components/outputPanel.tsx`, `taskList.tsx`, `actionMenu.tsx` | Output panel with paging, task list, action list |
| `ui/components/scriptPicker.tsx`, `pickerRow.tsx` | Searchable script picker and its rows |
| `ui/components/confirmPrompt.tsx` | `(y/N)` confirmation prompt |

:::note
Component files use camelCase names (such as `taskList.tsx`), as required by the frontend standards (§3.20.5) and the `project/filename` lint rule.
:::

:::details Technology Stack
- **Ink 8 + React 19** for the interactive UI
- **Vite 8** SSR build into a single ESM file; runtime dependencies stay external
- **i18next** for translations
- **cross-spawn** to run `npm` safely on Windows (avoids `EINVAL` when spawning `.cmd` files and handles argument quoting)
:::
