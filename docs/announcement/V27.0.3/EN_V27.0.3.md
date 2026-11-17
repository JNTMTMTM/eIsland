> **Release Date:** *`2026-11-18`*
> **GitHub Repository:** [`https://github.com/JNTMTMTM/eIsland`](https://github.com/JNTMTMTM/eIsland)

*V27.0.3 adds a File Shelf and a switch for the lyrics feature, moves volume, brightness, screenshots, fullscreen detection, and hardware temperatures to built-in implementations, and improves instrumental track detection and lyric state recovery after pausing.*

## New Features

- Added the File Shelf: drag files onto the island to hold them, then drag them out to other apps, open them, or show them in their folder.
- Added an Enable lyrics switch under Settings → Music → Lyrics; when it is off, no lyrics are requested and the island shows the song title instead.
- When Soda Music marks a track as instrumental, the island shows an "Instrumental" notice and no longer queries other lyrics sources.
- Right-click during a screenshot to cancel it.
- The assistant can now look up built-in feature descriptions to answer usage questions more accurately.

## Improvements

- System volume, screen brightness, screenshots, fullscreen detection, and hardware temperature readings are now built in and no longer require extra extensions.
- The screenshot window now appears only once its image is ready, reducing flicker and waiting.
- When no lyrics are found, the island shows the song title in the intro style instead of returning to idle.
- The instrumental notice follows the interface language and no longer triggers lyrics calibration.
- The File Shelf now appears immediately when files are dragged in while performance mode is on.
- Updated the installer and uninstaller icons.
- Removed the Mimo and MiniMax model options.

## Bug Fixes

- Fixed the island returning to idle instead of the previous lyrics state when leaving hover after pausing playback.
- Fixed pressing Esc to leave hover always returning to idle.
- Fixed some custom fonts failing to load.

## Documentation

- Removed documentation for retired extensions and updated the development standards and pull request merge guidelines.

Thank you for your continued feedback and support. If you encounter new issues after upgrading, please continue to report them — we will follow up as soon as possible.
