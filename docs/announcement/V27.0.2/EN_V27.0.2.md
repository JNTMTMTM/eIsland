> **Release Date:** *`2026-11-09`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V27.0.2 moves the Windows desktop app to Tauri and introduces a dedicated migration assistant with verified backups, a choice of installation directory, and optional removal of the previous version, alongside improvements to lyric synchronization, screenshots, and system media controls.*

## New Features

- The Windows desktop app now uses Tauri while retaining the island interface and existing feature entry points.
- Added a migration assistant that creates and verifies a separate backup before upgrading while preserving the original data.
- Choose where to install the new app and whether to open the previous version's uninstaller after successful installation, with the previous version kept by default.
- Added audio and video track extraction to the toolbox, with output saved to a selected location.
- Added YouTube Music to the music player whitelist.
- Added an interactive command line task panel with concurrent tasks, output viewing, and confirmation before running scripts.
- Added command line support for viewing stored data and deleting selected entries after confirmation.

## Improvements

- The migration assistant now provides separate ESA, Cloudflare R2, and GitHub download source buttons.
- Updated the migration wizard layout, button icons, and error messages, with dismissible errors that return to the previous step.
- Improved the migration assistant's language menu with Simplified Chinese, Traditional Chinese, English, Japanese, and keyboard navigation.
- Improved screenshots and screenshot settings with native Windows capture support.
- Improved window ordering and effects to reduce overlap between the island, shadows, and separate windows.
- Improved media session detection and playback synchronization so lyric animations pause with playback.
- Reduced unnecessary translation requests when lyric translation is disabled.
- Improved system volume, screen brightness, and keyboard shortcut handling.
- Updates verify installer signatures and stop installation if a download is incomplete or verification fails.

## Bug Fixes

- Fixed incomplete parsing of symbol-only lyric lines, punctuation, and word timing information.
- Fixed file drop targets not being registered correctly in some cases.
- Fixed failures when reading some file icons.
- Fixed backup path checks involving directory aliases and links, and blocked backups inside the original data directory.
- Fixed checking removal results before the previous version's uninstaller had finished.
- Fixed the migration assistant attempting downloads or installation without a production update public key.
- Fixed update failures caused by mismatched download URLs and file paths on some sources.

## Documentation

- Updated packaging, release, testing, and command line documentation for the new build and publication process.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
