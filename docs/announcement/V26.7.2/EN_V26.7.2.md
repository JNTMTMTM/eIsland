> **Release Date:** *`2026-08-10`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V26.7.2 introduces two new dynamic modes for the Music Marquee — Rhythm and Amplitude — along with a Volume Analyzer plugin supporting currently-playing audio process detection and mute control, and a local OCR text recognition feature powered by Tesseract.js with history management. This release also optimizes window geometry adjustment logic and refactors the island dimensions calculation architecture.*

## New Features

- Added Rhythm mode for the Music Marquee, triggering pulse animation effects based on audio beats.
- Added Amplitude mode for the Music Marquee, driving marquee visual effects in real time based on audio amplitude.
- Added Music Marquee mode settings, allowing users to switch between Normal, Rhythm, and Amplitude modes in the settings page.
- Added Volume Analyzer plugin, supporting audio process capture for currently playing applications.
- Added volume mute control, supporting get and set operations for system mute state.
- Added local OCR text recognition powered by Tesseract.js for extracting text from images.
- Added OCR recognition panel with engine selection, result display, and custom scrollbar styles.
- Added OCR history management with viewing, deleting, and downloading of recognition records, supporting paginated browsing.
- Added CLI session limits and pagination for better multi-session management.

## Improvements

- Optimized Music Marquee beat synchronization and pulse triggering logic for more accurate rhythm effects.
- Optimized amplitude calculation method and adjusted music glow inset distance for more refined visuals.
- Optimized window movement logic with post-animation position correction for shape changes.
- Optimized window resizing logic with new shape adjustment and shrink delay parameters for smoother animation transitions.
- Optimized window geometry IPC handling for better size adaptation during shape changes.
- Refactored island dimensions calculation into a shared module for unified dimension references across components.
- Refactored audio capture and activation flow for improved process loopback audio analysis.

## Bug Fixes

- Fixed music glow style visibility and animation timing issues in rhythm mode.
- Fixed sidebar badge type definitions changed from enum to interface for better type compatibility.
- Fixed Windows Volume Analyzer icon display error in the sidebar.
- Fixed an issue where the application could not be updated properly.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
