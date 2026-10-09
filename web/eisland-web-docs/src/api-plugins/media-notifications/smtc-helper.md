---
watermark: true
title: Windows SMTC Helper
icon: music
---

# Windows SMTC Helper

`@eisland/windows-smtc-helper` · v26.0.1

System Media Transport Controls via .NET NativeAOT DLL (koffi FFI).

:::note
SMTC commands (`play`, `pause`, `next`, `previous`, `seek`, `stop`) only work when a media session is active. Call `getStatus` first to verify a session exists before issuing commands.
:::

:::info macOS counterpart
See [macOS Media Helper](macos-media-helper.md) for the Swift + Node-API plugin and its compatibility table. macOS commands return Promises, queries read a cache, and session enumeration contains at most the system current source. Neither plugin exposes a public playback command accepting a source ID.
:::

## Interfaces

| Interface | Description |
|-----------|-------------|
| [TimelineProperties](smtc-helper/timeline-properties.md) | Media timeline bounds |
| [PlaybackControls](smtc-helper/playback-controls.md) | Available playback controls |
| [MediaStatus](smtc-helper/media-status.md) | Full media status snapshot |
| [CommandResult](smtc-helper/command-result.md) | Command execution result |
| [TimestampInfo](smtc-helper/timestamp-info.md) | Lightweight timestamp data |
| [MediaProps](smtc-helper/media-props.md) | Media metadata properties |
| [PlaybackInfo](smtc-helper/playback-info.md) | Playback state info |
| [TimelineProps](smtc-helper/timeline-props.md) | Timeline position/duration |
| [SessionSnapshot](smtc-helper/session-snapshot.md) | Media session snapshot |

## Functions

| Function | Description |
|----------|-------------|
| [play](smtc-helper/play.md) | Resume playback |
| [pause](smtc-helper/pause.md) | Pause playback |
| [next](smtc-helper/next.md) | Next track |
| [previous](smtc-helper/previous.md) | Previous track |
| [getStatus](smtc-helper/get-status.md) | Get full media status |
| [getTimestamp](smtc-helper/get-timestamp.md) | Get lightweight timestamp |
| [seek](smtc-helper/seek.md) | Seek to position |
| [stop](smtc-helper/stop.md) | Stop playback |
| [setShuffle](smtc-helper/set-shuffle.md) | Toggle shuffle mode |
| [setRepeatMode](smtc-helper/set-repeat-mode.md) | Set repeat mode |
| [setPlaybackRate](smtc-helper/set-playback-rate.md) | Set playback rate |

## Classes

| Class | Description |
|-------|-------------|
| [SmtcMonitor](smtc-helper/smtc-monitor.md) | Real-time media session monitor |
