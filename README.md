<div align="center">

<img src="assets/readme/banner.svg" alt="eIsland" width="100%" />

# eIsland — A Dynamic Island for your Windows desktop

[![Release](https://img.shields.io/github/v/release/JNTMTMTM/eIsland?style=flat-square&color=5be6da&label=release)](https://github.com/JNTMTMTM/eIsland/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-8da8ff?style=flat-square)](#getting-started)
[![License](https://img.shields.io/badge/license-GPL--3.0-b08fd8?style=flat-square)](LICENSE)

[**Download**](https://github.com/JNTMTMTM/eIsland/releases/latest) · [Website](https://www.pyisland.com) · [Developer docs](https://eisland-dev.pyisland.com) · [Changelog](docs/CHANGE_LOG.md)

</div>

> [!NOTE]
> eIsland is open source under GPLv3 with additional terms. See [License](#license) before redistributing.

## One island, four states

<p align="center">
  <img src="assets/readme/states.webp" alt="eIsland idle, hover, expanded and max expand states" width="100%" />
</p>

<p align="center"><b>Idle</b> → <b>Hover</b> → <b>Expanded</b> → <b>Max Expand</b><br/><sub>Rest the cursor on the island to peek, scroll the wheel to go deeper.</sub></p>

## Gallery

<table>
  <tr>
    <td width="50%"><img src="assets/readme/pill.webp" alt="Lyrics, quick tools and weather inside the pill" /><p align="center"><b>Lyrics & hover views</b></p></td>
    <td width="50%"><img src="assets/readme/music.webp" alt="Music player with synced lyrics" /><p align="center"><b>Music & lyrics</b></p></td>
  </tr>
  <tr>
    <td><img src="assets/readme/ai-chat.webp" alt="AI agent chat" /><p align="center"><b>AI agent</b></p></td>
    <td><img src="assets/readme/todo.webp" alt="Todo list" /><p align="center"><b>Todo</b></p></td>
  </tr>
  <tr>
    <td><img src="assets/readme/countdown.webp" alt="Countdown events on a NASA wallpaper" /><p align="center"><b>Countdown & wallpapers</b></p></td>
    <td><img src="assets/readme/wallpaper-market.webp" alt="Wallpaper market" /><p align="center"><b>Wallpaper market</b></p></td>
  </tr>
  <tr>
    <td><img src="assets/readme/calculator.webp" alt="Graphing calculator" /><p align="center"><b>Graphing calculator</b></p></td>
    <td><img src="assets/readme/world-clock.webp" alt="World clock" /><p align="center"><b>World clock</b></p></td>
  </tr>
  <tr>
    <td><img src="assets/readme/toolbox.webp" alt="Toolbox" /><p align="center"><b>Toolbox</b></p></td>
    <td><img src="assets/readme/mini-game.webp" alt="2048 mini game" /><p align="center"><b>Mini games</b></p></td>
  </tr>
  <tr>
    <td><img src="assets/readme/settings.webp" alt="Settings quick navigation" /><p align="center"><b>Settings</b></p></td>
    <td><img src="assets/readme/light-calendar.webp" alt="Calendar in light theme" /><p align="center"><b>Light theme</b></p></td>
  </tr>
  <tr>
    <td colspan="2"><img src="assets/readme/standalone.webp" alt="Standalone window with URL favorites" /><p align="center"><b>Standalone window</b></p></td>
  </tr>
</table>

## Getting started

Use a published Windows x64 installer from [Releases](https://github.com/JNTMTMTM/eIsland/releases/latest), or build the native installer below. Native packages are named `eIsland_<version>_x64-setup.exe`. eIsland runs on Windows 10 22H2 or later (x64).

### Build from source

Requirements: Node.js `24.22.1` (see [`.nvmrc`](.nvmrc)), Rust with the Windows MSVC toolchain, WebView2, the .NET 10 SDK and Visual Studio C++ build tools for the native plugins.

```sh
git clone https://github.com/JNTMTMTM/eIsland.git
cd eIsland
npm ci --ignore-scripts
npm ci --prefix cli --ignore-scripts
npm ci --prefix temp/app --ignore-scripts
npm run plugins:build # build native plugins separately
npm run dev                 # start Tauri with hot reload
npm run package             # Tauri NSIS and same-version migration adapter
```

The desktop runtime, native services, tests and CI use Tauri. Packaging requires an updater signing identity; see [release commands and upgrade compatibility](docs/TAURI_RELEASE.md) and the [refactor verification and coverage audit](docs/RUST_TAURI_REFACTOR.md).

The release version starts at `27.0.2`. Keep the root `package.json`, Tauri configuration and Cargo version in sync; packaging automatically synchronizes the migration adapter version. Configure the production Tauri signing identity, COS/OSS/R2 credentials and ESA cache settings in the root `.env`, then run these commands from the repository root:

```sh
npm run package                         # build both applications without uploading
npm run release:upload-only -- --dry-run # inspect the paired release plan
npm run release:upload-only              # upload both applications and their feeds
# Or build and upload both in one command:
npm run release
```

Electron uses `latest.yml` to download `eIsland-<version>-Setup.exe`, the migration adapter. Tauri and the adapter use `tauri-latest.yml` to download `eIsland_<version>_x64-setup.exe`; this feed contains official Tauri JSON despite its `.yml` filename. Existing JSON feed URLs remain available. All installers, signatures and blockmaps are uploaded before the feeds; the Electron feed is updated last.

The default local upload publishes only to COS, OSS, optional MinIO and ESA, and never touches GitHub. GitHub publication is part of the `--r2-only` CI path: enable `EISLAND_GITHUB_RELEASE_UPLOAD=1`, set `GITHUB_REPOSITORY=JNTMTMTM/eIsland` and `EISLAND_GITHUB_RELEASE_TAG=v<version>`, and authenticate `gh`. Create one published stable Release with that tag before uploading. Both applications and both feeds are attached to that same Release. Every upload refuses to replace a feed that advertises a newer version, and restores the previous feeds if any feed write fails.

Pushing a `v<version>` tag only builds both applications as review artifacts. To publish to R2 and GitHub, run the release workflow manually on that tag with `publish` enabled. Release builds must use a commit reachable from `main`, and the signing and storage secrets belong to the protected `release` environment.

`npm run check` runs lint, type checks and tests. The [developer docs](https://eisland-dev.pyisland.com) cover the architecture, IPC APIs and plugins.

### Built with

[![Tauri](https://img.shields.io/badge/Tauri-24C8D8?style=flat-square&logo=tauri&logoColor=white)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-443E38?style=flat-square)](https://github.com/pmndrs/zustand)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![i18next](https://img.shields.io/badge/i18next-26A69A?style=flat-square&logo=i18next&logoColor=white)](https://www.i18next.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square)](https://playwright.dev/)

## Community

Bug reports and feature requests are welcome in [Issues](https://github.com/JNTMTMTM/eIsland/issues). Please follow the [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Credits

Icons come from [iconfont](https://www.iconfont.cn/). The built-in wallpapers are Artemis II mission photos from [NASA](https://www.nasa.gov/):

| Wallpaper | File | Capture device | Source |
|-----------|------|----------------|--------|
| Spaceship Earth | `art002e008487-orig.jpg` | iPhone 17 Pro Max | [images.nasa.gov](https://images.nasa.gov/details/art002e008487) |
| A Crescent Earth | `art002e004441-orig.jpg` | NIKON Z9 35mm f/2 | [images.nasa.gov](https://images.nasa.gov/details/art002e004441) |
| Thinking of You, Earth | `art002e008486-orig.jpg` | iPhone 17 Pro Max | [images.nasa.gov](https://images.nasa.gov/details/art002e008486) |

NASA images are used under NASA's image usage policy and do not imply NASA endorsement of this project. More Artemis II images: [images.nasa.gov](https://images.nasa.gov/) · [Artemis II mobile wallpapers](https://www.nasa.gov/artemis-ii-mobile-wallpapers/).

The music, todos, chat and wallpaper market listings shown in the screenshots are demo data.

## Legal

- [Terms of Service](docs/LEGAL/TERMS_OF_SERVICE.md)
- [Privacy Policy](docs/LEGAL/PRIVACY_POLICY.md)
- [Billing & Refund Policy](docs/LEGAL/BILLING_REFUND_POLICY.md)

## License

This project is released under **GNU General Public License v3.0 (GPLv3)** or later (`GPL-3.0-or-later`).

Under GPLv3 Section 7(b), limited additional terms apply: the following author attributions must be retained in all copies, modified versions, and any Appropriate Legal Notices displayed by the program:

- Copyright (C) 2026-present JNTMTMTM (https://github.com/JNTMTMTM)
- Copyright (C) 2026-present pyisland.com (https://pyisland.com)

For full terms (including the standard GPLv3 text and additional clauses), see the [`LICENSE`](LICENSE) file in the repository root.
