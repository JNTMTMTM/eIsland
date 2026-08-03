> **Release Date:** *`2026-07-18`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V26.6.5 introduces 7 brand-new feature modules — URL Favorites management, Mail sending/receiving, Memo editing, Local File Search, Todo list, Countdown timer, and Clipboard History — along with expanded Gitee and KOOK third-party login support, and brings an album viewer with multiple interaction experience improvements.*

## New Features

- Added Gitee third-party login support, available on the login screen and in user settings for Gitee account authorization.
- Added KOOK third-party login support, available on the login screen and in user settings for KOOK account authorization.
- Added WeChat third-party login support, available on the login screen and in user settings for WeChat account authorization.
- Added Microsoft third-party login support, available on the login screen and in user settings for Microsoft account authorization.
- Added GitHub third-party login support, available on the login screen and in user settings for GitHub account authorization.

## Improvements

- Refactor URL Favorites management module with add, edit, delete, and search capabilities, supporting drag-and-drop sorting and import/export functionality.
- Refactor Mail module with multi-account inbox management, supporting mail list browsing and mail detail reading.
- Refactor Memo module with create, edit, delete, and search capabilities, providing sidebar navigation and empty state guidance.
- Refactor Local File Search module with local file retrieval and configuration management, providing search results display and transition animation effects.
- Refactor Todo module with task creation, editing, and management capabilities.
- Refactor Countdown module with countdown event creation and management, providing calendar view and card display.
- Refactor Clipboard History module with clipboard record viewing and management, providing expanded mode and detail display.
- Refactor Album Viewer module with grid display, metadata viewing, and batch selection operations for album images.
- Optimized Local File Search configuration panel transition animations and layout effects for smoother interactions.
- Optimized album component file handling and data management for more responsive operations.
- Optimized Memo editor interface layout and transition effects for a more natural editing experience.
- Optimized login panel width adaptation for a more balanced interface display.

## Bug Fixes

- Fixed layout issues caused by insufficient login panel width.
- Fixed incorrect import path for background media preview URL in the album viewer component.
- Fixed race condition during mail module initialization that could cause old requests to overwrite new account data when switching accounts quickly.

## Documentation

- Automatically updated the changelog with all commit records from PR #149 through #158.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
