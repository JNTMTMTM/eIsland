---
title: Media Control
icon: music
---

# Media Control

:::info
The media control API provides playback control, volume management, now-playing info, music provider integration (Qishui/Soda Music), lyrics settings, and SMTC (System Media Transport Controls) interaction. All methods are exposed on `window.api` via the Electron preload bridge.
:::

## Playback Control

### mediaPlayPause

Toggles play/pause for the current media session.

```ts
window.api.mediaPlayPause(): void
```

---

### mediaNext

Skips to the next track.

```ts
window.api.mediaNext(): void
```

---

### mediaPrev

Returns to the previous track.

```ts
window.api.mediaPrev(): void
```

---

### mediaSeek

Seeks to a specific position in the current track.

```ts
window.api.mediaSeek(positionMs: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `positionMs` | `number` | Target position in milliseconds |

:::note
Playback control methods use SMTC (System Media Transport Controls) to interact with the active media player. They work with any SMTC-compatible player (Spotify, Chrome, Windows Media Player, etc.).
:::

## Volume Control

### mediaGetVolume

Returns the current system volume level.

```ts
window.api.mediaGetVolume(): Promise<number>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<number>` | Volume level (0.0 to 1.0) |

---

### mediaSetVolume

Sets the system volume level.

```ts
window.api.mediaSetVolume(volume: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `volume` | `number` | Volume level (0.0 to 1.0) |

---

### mediaGetMuted

Returns whether the system audio is muted.

```ts
window.api.mediaGetMuted(): Promise<boolean>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<boolean>` | `true` if muted |

---

### mediaToggleMuted

Toggles the system mute state.

```ts
window.api.mediaToggleMuted(): void
```

## Now Playing

### mediaCurrentInfoGet

Returns the current now-playing information from SMTC.

```ts
window.api.mediaCurrentInfoGet(): Promise<NowPlayingInfo | null>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<NowPlayingInfo \| null>` | Current track info, or `null` if nothing is playing |

---

### onNowPlayingInfo

Listens for real-time now-playing info updates.

```ts
window.api.onNowPlayingInfo(callback: (info: NowPlayingInfo) => void): () => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(info: NowPlayingInfo) => void` | Called when track info changes |

**Returns:** Unsubscribe function.

:::tip
Use `onNowPlayingInfo` for reactive UI updates instead of polling `mediaCurrentInfoGet`. The event fires on track change, play/pause, and progress updates.
:::

## Source Switching

### onSourceSwitchRequest

Listens for requests to switch the media source (e.g., when another app starts playing).

```ts
window.api.onSourceSwitchRequest(callback: (data: SourceSwitchRequestData) => void): () => void
```

---

### mediaAcceptSourceSwitch

Accepts a pending source switch request.

```ts
window.api.mediaAcceptSourceSwitch(): void
```

---

### mediaRejectSourceSwitch

Rejects a pending source switch request.

```ts
window.api.mediaRejectSourceSwitch(): void
```

## Music Provider Auth (QR Code Login)

:::info
Music provider authentication uses a polling-based QR code flow. The user scans a QR code on their phone to authorize the provider. See [State Machine — musicProvidersLogin](../introduction/frontend-arch/states.md#musicproviderslogin) for the full flow diagram.
:::

### musicProviderAuthStatus

Checks if a music provider is already authenticated.

```ts
window.api.musicProviderAuthStatus(): Promise<MusicProviderAuthStatus>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<MusicProviderAuthStatus>` | Current auth status for the provider |

---

### musicProviderAuthCreateQr

Generates a new QR code for music provider login.

```ts
window.api.musicProviderAuthCreateQr(): Promise<MusicProviderQrCodeResult>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<MusicProviderQrCodeResult>` | QR code token and scan URL |

---

### musicProviderAuthCheckQr

Polls the QR code scan status.

```ts
window.api.musicProviderAuthCheckQr(token: string): Promise<MusicProviderAuthStatus>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | QR code token from `musicProviderAuthCreateQr` |

---

### musicProviderAuthClear

Clears the stored auth session for the music provider.

```ts
window.api.musicProviderAuthClear(): Promise<void>
```

## Qishui (Soda Music) Business API

:::warning
The Qishui API is only available when the user has authenticated via QR code login. All methods return `QishuiBusinessStatus`-compatible results.
:::

| Method | Signature | Description |
|--------|-----------|-------------|
| `qishuiStatus` | `() => Promise<QishuiBusinessStatus>` | Check Qishui auth status |
| `qishuiSearch` | `(keyword: string) => Promise<QishuiSongsResult>` | Search for songs |
| `qishuiFeed` | `() => Promise<QishuiSongsResult>` | Get personalized feed |
| `qishuiPlaylists` | `() => Promise<QishuiBusinessResult>` | Get user playlists |
| `qishuiPlaylistTracks` | `(playlistId: string) => Promise<QishuiSongsResult>` | Get tracks in a playlist |
| `qishuiLyrics` | `(songId: string) => Promise<QishuiLyricsResult>` | Get lyrics for a song |
| `qishuiSongUrl` | `(songId: string) => Promise<QishuiSongUrlResult>` | Get playback URL |
| `qishuiComments` | `(songId: string) => Promise<QishuiBusinessResult>` | Get song comments |
| `qishuiCreateComment` | `(songId: string, content: string) => Promise<QishuiBusinessResult>` | Post a comment |
| `qishuiCheckLiked` | `(songId: string) => Promise<QishuiBusinessResult>` | Check if user liked the song |
| `qishuiLike` | `(songId: string) => Promise<QishuiBusinessResult>` | Toggle like on a song |
| `qishuiCollectPlaylist` | `(playlistId: string) => Promise<QishuiBusinessResult>` | Collect a playlist |
| `qishuiCollectAlbum` | `(albumId: string) => Promise<QishuiBusinessResult>` | Collect an album |
| `qishuiAddSong` | `(songId: string) => Promise<QishuiBusinessResult>` | Add song to library |
| `qishuiRecentPlay` | `() => Promise<QishuiSongsResult>` | Get recently played songs |

## Lyrics Settings

:::tip
All lyrics settings follow the get/set pair pattern. Changes take effect immediately and are persisted by the main process.
:::

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `musicLyricsEnabledGet` | `musicLyricsEnabledSet` | `boolean` | Enable/disable lyrics display |
| `musicLyricsTranslationEnabledGet` | `musicLyricsTranslationEnabledSet` | `boolean` | Enable/disable translation overlay |
| `musicLyricsKaraokeGet` | `musicLyricsKaraokeSet` | `boolean` | Enable/disable karaoke (word-by-word) mode |
| `musicLyricsClockGet` | `musicLyricsClockSet` | `boolean` | Show time in lyrics state |
| `musicLyricsSourceGet` | `musicLyricsSourceSet` | `string` | Lyrics provider preference |
| `musicLyricsCalibrateEnabledGet` | `musicLyricsCalibrateEnabledSet` | `boolean` | Enable manual timing calibration |
| `musicLyricsCalibrateDelayGet` | `musicLyricsCalibrateDelayGet` | `number` | Calibration delay in milliseconds |

## Provider Mode

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `musicProviderModeGet` | `musicProviderModeSet` | `string` | Music provider mode (e.g., `'smtc'`, `'qishui'`) |

## SMTC Advanced

| Method | Signature | Description |
|--------|-----------|-------------|
| `musicSmtcUnsubscribeMsGet` | `() => Promise<number>` | Get SMTC unsubscribe delay (ms) |
| `musicSmtcUnsubscribeMsSet` | `(ms: number) => Promise<void>` | Set SMTC unsubscribe delay |
| `musicDetectSourceAppId` | `() => Promise<DetectSourceAppIdResult>` | Detect which app is the current SMTC source |
| `smtcGetTimestamp` | `() => Promise<SmtcTimestampResult>` | Get current SMTC playback timestamp |

## Music Whitelist

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `musicWhitelistGet` | `musicWhitelistSet` | `string[]` | List of app names allowed to trigger lyrics display |

:::note
The whitelist controls which media players can activate the lyrics state. If the whitelist is empty, all SMTC-compatible players are allowed.
:::
