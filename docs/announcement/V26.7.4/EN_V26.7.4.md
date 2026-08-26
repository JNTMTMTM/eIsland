> **Release Date:** *`2026-08-27`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V26.7.4 introduces 8 brand-new feature modules — Questionnaire system, Calculator, TodoList, Thinking Reasoning display, Liquid Orb WebGPU rendering, Qishui Music lyrics sync, Wallpaper Market search, and Extension Management — along with music marquee rhythm mode and multiple interaction experience improvements.*

## New Features

- Added Questionnaire system with multi-questionnaire browsing, history viewing, submission deletion, and issue reporting, providing reward banner and table-of-contents navigation.
- Added Calculator module with sidebar mode switching and scientific calculation support, featuring SVG icon buttons and expandable layout.
- Added TodoList component with task progress tracking and auto-collapse functionality, integrated into the message timeline.
- Added Thinking Reasoning display component with persisted duration timing and computed callback, integrated into the message timeline.
- Added Liquid Orb WebGPU rendering with color customization, preview loading, and STT interface toggle, providing an orb style settings page.
- Added Qishui Music lyrics sync with scrolling lyrics display, translation handling, and authentication tracking.
- Added Wallpaper Market search functionality with detail panel toggle and animation effects.
- Added Extension Management page with volume and brightness helper extensions, remote version fetching, and ESA CDN cache purging.

## Improvements

- Optimized music marquee rhythm mode with amplitude mode and beat synchronization, enhancing glow visual effects.
- Optimized questionnaire component animations and layout, providing completed state styles and scroll navigation experience.
- Optimized Wallpaper Market refresh button state management, automatically disabling refresh when the detail panel is open.
- Optimized settings page spacing and layout for a more balanced interface display.
- Added country flag icons to language selection buttons for more intuitive language switching.

## Bug Fixes

- Fixed cache management and signature generation logic in the Codex status service.
- Fixed pluralization display for questionnaire reward Pro days.
- Fixed type definitions and error handling in the WebGPU renderer, adding defensive checks for GPU device destruction.
- Fixed ESLint rule detection matching issues in the code quality review workflow.
- Fixed spacing issues in the settings page index card layout.

## Documentation

- Automatically updated the changelog with all commit records from PR #203 through #207.
- Updated CodeGraph documentation with plugin versioning and agent prompt synchronization guidelines.
- Updated state machine documentation with music provider login state details.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
