> **Release Date:** *`2026-08-05`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V26.7.0 brings a brand-new announcement system, payment QR codes, Dynamic Island shape switching, screenshot translation, lyrics karaoke, volume and brightness control, and many other major features. It also introduces new settings pages for network, updates, screenshots, and image translation history, along with comprehensive UI interaction and styling improvements.*

## New Features

- Added announcement slideshow with ad display, fade-in/out effects, and navigation controls.
- Added announcement social config with QQ group QR code display and social link navigation.
- Added video playback in announcements with video toggle and announcement list collapse coordination.
- Added table of contents navigation in announcements with section scroll-to and active state indication.
- Added BILIBILI and GitHub navigation buttons in the announcement header.
- Added WeChat and Alipay QR code payment with payment status polling and order pagination.
- Added network settings page with timeout configuration and data center selection.
- Added update settings page with update source selection and auto-update prompt configuration.
- Added screenshot translation feature with Dynamic Island floating panel, supporting source text and translated text comparison.
- Added screenshot capture toolbar with translation, mosaic, paintbrush, rectangle, and region selection annotation tools.
- Added screenshot settings page with source language configuration for screenshot translation.
- Added image translation history in user settings with pagination, image preview, zoom, drag, and download.
- Added CLI session detection with Claude Code and Codex CLI status monitoring and lifecycle management.
- Added system volume control with playback device volume adjustment and mute toggle.
- Added screen brightness control with DDC/CI protocol and WMI dual-mode support.
- Added Dynamic Island shape switching between notch mode and pill mode with hotkey configuration.
  - Notch mode: Classic Dynamic Island shape adapted to the top notch area, displaying the full feature panel.
  - Pill mode: Compact floating pill shape with drag-to-move support, using streamlined layout for notifications and hover content.
- Added Dynamic Island guide step for shape selection with visual preview and description to help users understand each shape's characteristics.
- Added lyrics display with karaoke support, SilkyWave animation, line-by-line scrolling, and lyrics source switching.
- Added lyrics font customization settings for independent font and size configuration.
- Added customizable font settings for UI and lyrics display independently.
- Added music background wave preview effect.
- Added album thumbnail loading functionality.
- Added build size report workflow and CI deployment workflow.
- Added hardware info query plugin registration.

## Improvements

- Optimized announcement panel layout and styles for more compact and fluid interactions.
- Optimized settings page layout with navigation toggle and responsive adaptation.
- Optimized image translation preview with drag-to-move and cursor style updates.
- Optimized scrollbar styles and spacing consistency in authorization panels.
- Optimized user profile layout and responsive behavior.

## Bug Fixes

- Fixed API base URL from test environment to production server.
- Fixed payment method selection not visible when no pending order exists.
- Fixed payment QR code background color displaying incorrectly.
- Fixed announcement section navigation scroll positioning inaccuracy.
- Fixed window position calculation and animation execution on Dynamic Island shape change.
- Fixed notification container size constraint in pill mode.
- Fixed drag state not resetting correctly after shape mode change.
- Fixed email format validation rules and scrollbar style loss.
- Fixed markdown link check to allow non-strict validation.

## Documentation

- Added plugin creation guidelines and version release specification.
- Added Dynamic Island shape mode usage documentation.
- Automatically updated the changelog with all commit records from PR #159 through #186.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
