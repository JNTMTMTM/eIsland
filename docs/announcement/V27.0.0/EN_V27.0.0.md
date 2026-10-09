> **Release Date:** *`2026-10-09`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V27.0.0 introduces app navigation mode, Calendar, and World Clock, expands alarm management in the overview, improves Todo, Countdown, theme transitions, and performance mode, and fixes issues with lyrics, search results, music sign-in, and alarm triggering.*

## New Features

- Added app navigation mode with a grid of feature icons, long-press drag-and-drop reordering, and a drop zone for hiding entries.
- Added Calendar with continuous scrolling, month and year overview switching, and a shortcut to return to today.
- Added calendar date details showing lunar dates, holidays for the selected region, Todo items, and Countdown events.
- Added World Clock with city selection, multiple time zones, and analog clock displays.
- Added a World Clock overview widget with two configurable time zones and direct navigation to the World Clock page.
- Added an alarm overview widget for checking alarm status and quickly opening alarm management.
- Added position locking in pill mode to keep the Dynamic Island in a fixed location.
- Added a standalone macOS media helper plugin exposing now-playing information, artwork, playback progress, status monitoring, and media controls for developer integration.

## Improvements

- Improved Todo with task due dates and direct editing of task and subtask titles.
- Improved Todo detail layouts and expand animations to make descriptions, subtasks, and delete actions clearer.
- Improved the Countdown editor layout for backgrounds, borders, and colors, with clearer selection feedback in cards and calendars.
- Improved scrolling and dragging in the alarm time picker and added clearer alarm synchronization failure feedback.
- Improved hover, long-press, and drag feedback in app navigation, along with large-screen layouts and page transitions.
- Improved Toolbox navigation by saving entry order and visibility settings and providing feedback when saving fails.
- Improved theme transitions and expanded content animations, with clearer loading feedback in performance mode.
- Improved Dynamic Island window sizing and dragging behavior for better expanded-page display.
- Improved weather location resolution for custom coordinates by filling in region and country information.
- Updated market categories and settings layouts for better display at different window sizes.

## Bug Fixes

- Fixed missing syllable information when automatically parsing certain word-synced lyrics.
- Fixed incorrect truncation of song titles containing special Unicode characters.
- Fixed Spotify lyrics retrieval failures with certain authentication key lengths.
- Fixed recurring alarm triggering across dates and incorrect calculations of the next ringing date.
- Fixed incorrect trimming of integer digits or scientific notation exponents when displaying long numbers in Calculator.
- Fixed earlier results overwriting the latest results during successive local file or stock searches.
- Fixed stale requests interfering with the current screen when refreshing music sign-in QR codes or changing sign-in state.
- Fixed failure feedback and retry behavior when copying speech-to-text output.
- Fixed valid favorites being discarded when cached data contained some invalid entries.
- Fixed unfinished data collection restoring results after performance monitoring had been stopped.
- Fixed errors during AI chat initialization and tool execution result handling.
- Fixed running-app detection during overwrite installation and improved pre-installation process checks.
- Fixed the default F11 fullscreen shortcut disrupting the Dynamic Island window layout.

## Documentation

- Expanded frontend API documentation covering AI chat, media controls, system tools, window management, and settings.
- Added macOS media plugin usage, build, packaging, and main-app integration documentation.
- Updated developer testing and quality-check guides with Electron end-to-end testing instructions.
- Added Terms of Service, Privacy Policy, and Billing Refund Policy documents.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
