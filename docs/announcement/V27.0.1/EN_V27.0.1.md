> **Release Date:** *`2026-11-01`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V27.0.1 delivers a comprehensive Calculator upgrade and introduces the Song page, Agent Usage statistics, Performance Monitor, a custom tray menu, and island corner styles, along with numerous improvements to AI chat, lyrics playback, loading states, and transition animations, plus significant gains in resource usage and runtime stability.*

## New Features

- Added complex-number arithmetic with polar form display to the Calculator.
- Added equation solving to the Calculator, supporting both analytic and numerical methods.
- Added matrix operations and linear-system solving to the Calculator, with directly editable matrix cells.
- Added function graphing to the Calculator, supporting multiple curves, coordinate tracking, tangent analysis, and domain and range analysis.
- Added unit conversion to the Calculator, covering seven common unit categories.
- Added calculation history to the Calculator, with persistent storage, editing, pagination, and math rendering.
- Added angle unit switching, full-precision Ans chained calculations, one-click copying of formulas and results, and explanations for math errors to the Calculator.
- Added the Song page, featuring a 3D lyric wheel, bilingual lyrics, karaoke word-by-word highlighting, a playback progress bar, and volume control.
- Added playback seeking, allowing you to jump to any position from the Lyrics page and the tray music card.
- Added the Agent Usage page to track Claude Code and Codex token usage, with an optional usage widget for the Overview page.
- Added the Performance Monitor widget to view CPU, memory, and other system metrics on the Overview page.
- Added a custom tray menu with a user card, a music control card, and common menu items.
- Added island corner style settings, supporting a concave notch style and music glow effect, synchronized across windows.
- Added island scale settings with persistent scale ratio.
- Added fade transitions when showing and hiding the island.
- Added animation settings that take effect immediately.
- Switched AI web search to SearXNG.
- Added a standalone macOS Brightness Helper plugin for developer integration.

## Improvements

- Improved AI chat with virtualized rendering for long conversations, smoother scrolling, and more stable message display when switching sessions.
- Improved AI chat loading skeletons and fixed the authorization prompt overlapping the model card.
- Improved AI local tool execution to prevent tools from running multiple times on duplicate requests.
- Improved AI theme switching to ensure the theme applies correctly across all windows.
- Improved playback progress on the Lyrics page, showing the current lyric and a clearer time format.
- Improved scrolling display for long song titles.
- Improved media session management and playback calibration for more accurate lyric synchronization.
- Improved tray menu loading speed with background preloading and skeleton placeholders.
- Improved loading skeletons for user settings, the wallpaper market, and the Performance Monitor.
- Improved drawer backdrop and shadow effects in the light theme.
- Improved island expand and collapse transition animations, and fixed blurry text during animations.
- Improved Calculator sidebar, toolbar, history panel, and scrollbar styles for a more consistent interface.
- Improved session refresh and user profile synchronization after login, with automatic login renewal at startup.
- Improved the install and upgrade process to more reliably detect and terminate processes in use.
- Improved updater service and update notification handling.
- Improved mail loading by fetching message summaries first and loading bodies on demand.
- Improved album browsing with virtualized display for large image sets and reduced media cache usage.
- Improved chat history loading by reading session history on demand and saving streaming conversation progress independently.
- Improved resource usage by pausing animations and background videos when windows are hidden.
- Improved reminder scheduling to trigger at the due time instead of continuous polling.
- Improved background services for volume, brightness, media, and process detection to reduce stutter and resource usage.
- Improved startup speed by loading standalone window pages on demand.
- Simplified the descriptions for alarm and sound settings.

## Bug Fixes

- Fixed the island disappearing off the right side of the screen in pill mode.
- Fixed Calculator scientific keys overlapping the history panel.
- Fixed the Calculator not starting a fresh Ans expression when typing after pressing equals.
- Fixed concave notch window position calculation not accounting for the work area on macOS.
- Fixed the album failing to read original image dimensions correctly.
- Fixed broken legacy reminder icon paths.
- Fixed notification canvas state being lost before the window is first shown.
- Fixed multiple known issues to improve overall stability.

## Documentation

- Added documentation for the macOS Brightness Helper plugin.
- Removed the outdated performance audit report.
- Automatically updated the changelog with all commit records from PR #229 through #302.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
