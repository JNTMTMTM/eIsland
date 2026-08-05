> **Release Date:** *`2026-08-06`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V26.7.1 introduces multi-display screenshot support with engine selection, and brings QQ group invitation with feedback history features, along with fixes for screen brightness and volume control compatibility in Electron packaging environments.*

## New Features

- Added multi-display screenshot support, enabling simultaneous capture of all displays and saving as images.
- Added screenshot engine selection and configuration options, allowing users to switch between different capture methods.
- Added QQ group invitation feature, allowing users to view and join the official QQ group from the About page.
- Added feedback history page, allowing users to view past feedback records.

## Improvements

- Enhanced screenshot capture logic for improved stability across different environments.
- Optimized virtual screen bounds calculation for better efficiency in multi-display scenarios.
- Improved QQ group config fetching with enhanced error handling and exception feedback.
- Simplified QQ group configuration structure by removing redundant QR code image URL field.
- Optimized QQ group button styling and layout for clearer presentation.
- Improved environment-specific API base URL handling for better compatibility.

## Bug Fixes

- Fixed screen brightness helper not loading correctly in Electron packaging environments, added legacy fallback mechanism.
- Fixed volume control helper not loading correctly in Electron packaging environments, added legacy fallback mechanism.
- Fixed potential error when checking window existence in the dev renderer process.
- Fixed API base URL not correctly switching between different environments.

## Documentation

- Automatically updated the changelog with all commit records from PR #187 through #188.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
