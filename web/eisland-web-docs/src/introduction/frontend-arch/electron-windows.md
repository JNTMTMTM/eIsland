---
title: eIsland Electron Windows
icon: window-restore
---

# Electron Windows

:::info
This document covers all BrowserWindow instances in the eIsland application. The app creates **7 distinct windows** across the Main Process, each serving a specific role in the user experience — from the floating island widget to fullscreen glow overlays.
:::

## Window Overview

| Window | Source File | HTML Entry | Dimensions | Transparent |
|--------|------------|------------|------------|-------------|
| Main Island | `src/main/window/mainWindow.ts` | `DynamicIslandIndex.html` | 260×42 (dynamic) | Yes |
| Splash | `src/main/window/splashWindow.ts` | `DynamicIslandSplash.html` | 600×400 | Yes |
| Guide | `src/main/window/guideWindow.ts` | `DynamicIslandGuide.html` | 860×500 | Yes |
| Standalone | `src/main/window/standaloneWindow.ts` | `DynamicIslandStandalone.html` | 1155×640 | No |
| Capture | `src/main/window/captureWindow.ts` | `resources/capture.html` | Fullscreen | Yes |
| Agent Voice Input | `src/main/index.ts` | `DynamicIslandAibackground.html` | Fullscreen | Yes |
| CLI Glow | `src/main/index.ts` | `DynamicIslandAibackground.html` | Fullscreen | Yes |

:::note
All windows share the same preload script (`../preload/index.js`) except the Capture window, which uses `nodeIntegration: true` for direct Node.js access. The two glow windows (Agent Voice Input and CLI Glow) share the same HTML entry point.
:::

---

## Startup Lifecycle

The windows launch in a specific sequence:

```
1. Splash window created (if startup animation enabled)
2. Main window created (hidden)
3. Main window ready-to-show → waits for splash to finish → shows main window
4. On first launch: Guide window opens, blocks until guide:complete
```

:::important
The Guide window is promise-based — `showGuideWindow()` returns a Promise that resolves only when the user completes setup. The main window remains hidden until this Promise resolves.
:::

---

## Main Island Window

The core floating widget. It floats always-on-top near the top-center of the screen and dynamically resizes between multiple visual states managed by the [State Machine](states.md).

### Configuration

| Option | Value | Purpose |
|--------|-------|---------|
| `frame` | `false` | Frameless chrome |
| `transparent` | `true` | See-through background |
| `alwaysOnTop` | `true` | Highest z-order (`screen-saver` level) |
| `skipTaskbar` | `true` | Hidden from taskbar |
| `resizable` | `false` | Size controlled by state transitions |
| `hasShadow` | `false` | No window shadow |
| `contextIsolation` | `true` | Secure renderer isolation |
| `sandbox` | `false` | Allows preload API access |

### Dynamic Resize States

:::tip
The dimensions below are for **Notch** mode. In **Pill** mode, all heights are slightly larger (e.g., idle is 52 px instead of 42 px). See [Shape Modes](shape-modes.md) for the full dimension comparison.
:::

The main window resizes via IPC channels depending on the current island state:

| State | Width | Height | IPC Channel |
|-------|-------|--------|-------------|
| Idle | 260 | 42 | `window:collapse` |
| Hover / Expanded | 500 | 60 | `window:expand` |
| Notification | 500 | 88 | `window:expand-notification` |
| Lyrics | 500 | 42 | `window:expand-lyrics` |
| Lyrics + Translation | 500 | 60 | `window:expand-lyrics-translation` |
| Full Expanded | 860 | 150 | `window:expand-full` |
| Settings | 860 | 400 | `window:expand-settings` |

### Mouse Passthrough

The main window uses `setIgnoreMouseEvents(true, { forward: true })` by default — transparent areas pass clicks through to underlying windows. The renderer can toggle this via IPC:

| Channel | Direction | Description |
|---------|-----------|-------------|
| `window:enable-mouse-passthrough` | Renderer → Main | Re-enable click-through |
| `window:disable-mouse-passthrough` | Renderer → Main | Disable click-through (interactive mode) |
| `window:passthrough-lock-changed` | Main → Renderer | Passthrough lock state changed |

:::tip
The `forward: true` option in `setIgnoreMouseEvents` allows the renderer to receive mouse move events even when passthrough is active, enabling hover detection on transparent regions.
:::

### Key IPC Channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| `island:show` | Main → Renderer | Signal renderer to display |
| `window:island-position:changed` | Main → Renderer | Position offset changed |
| `nowplaying:info` | Main → Renderer | Music track info update |
| `media:source-switch-request` | Main → Renderer | Playback source switch prompt |
| `settings:changed` | Main → Renderer | Cross-window setting sync |
| `clipboard:urls-detected` | Main → Renderer | Clipboard URL detected |
| `agent-voice-input:state` | Main → Renderer | Agent voice input active/inactive |
| `window:minimize` | Renderer → Main | Minimize window |
| `window:maximize` | Renderer → Main | Maximize/restore window |
| `window:close` | Renderer → Main | Close window |
| `window:hide` | Renderer → Main | Hide window |

---

## Splash Window

A startup splash screen that plays a video animation while the main window loads. After the video completes (or a 5-second timeout), it fades out and closes.

### Configuration

| Option | Value | Purpose |
|--------|-------|---------|
| `frame` | `false` | Frameless chrome |
| `transparent` | `true` | See-through background |
| `alwaysOnTop` | `true` | Highest z-order |
| `skipTaskbar` | `true` | Hidden from taskbar |
| `focusable` | `false` | Does not steal focus |
| `hasShadow` | `true` | Subtle shadow effect |
| `sandbox` | `true` | Sandboxed renderer |
| `movable` | `true` | User can drag |

### Lifecycle IPC

| Channel | Direction | Description |
|---------|-----------|-------------|
| `splash:renderer-ready` | Renderer → Main | Renderer loaded, ready to play |
| `splash:play-video` | Main → Renderer | Start video playback |
| `splash:video-ended` | Renderer → Main | Video finished |
| `splash:fade-out` | Main → Renderer | Trigger fade-out animation |

:::warning
The splash window has fallback timeouts — 1500ms for `renderer-ready` and 5000ms for `video-ended`. If the renderer does not respond within these limits, the splash proceeds to the next phase automatically.
:::

### Lifecycle Sequence

```
1. Window created → center() → removeMenu() → showInactive()
2. Wait for splash:renderer-ready (or 1.5s timeout)
3. Send splash:play-video → wait for splash:video-ended (or 5s timeout)
4. Delay 1s → send splash:fade-out → wait 300ms → close window
5. Main window becomes visible
```

---

## Guide Window

A first-launch configuration wizard shown after the splash animation on first run. It blocks the main window from displaying until the user completes setup.

### Configuration

| Option | Value | Purpose |
|--------|-------|---------|
| `frame` | `false` | Frameless chrome |
| `transparent` | `true` | See-through background |
| `resizable` | `false` | Fixed size |
| `movable` | `true` | User can drag |
| `thickFrame` | `false` | No thick frame border |
| `hasShadow` | `false` | No window shadow |
| `center` | `true` | Centered on screen |
| `sandbox` | `true` | Sandboxed renderer |

### IPC

| Channel | Direction | Description |
|---------|-----------|-------------|
| `guide:complete` | Renderer → Main | One-shot signal — setup done, close window |

:::important
The guide window is promise-based. `showGuideWindow()` returns a Promise that resolves when `guide:complete` is received. The main window remains hidden until this Promise resolves. If the window is already open, calling `showGuideWindow()` focuses the existing window instead of creating a duplicate.
:::

### Guide Steps

The guide window renders two setup steps (see [DynamicIslandGuidePages](#)):

1. **Language Selection** — picks the UI locale (Chinese, English; others defined but disabled)
2. **SMTC Media Test** — tests Windows media integration by detecting playing media

---

## Standalone Window

A resizable, frameless desktop window for countdown days, TODOs, and application settings. This is the only window with a dark (non-transparent) background.

### Configuration

| Option | Value | Purpose |
|--------|-------|---------|
| `frame` | `false` | Frameless chrome |
| `transparent` | `false` | Solid dark background |
| `backgroundColor` | `'#000000'` | Black background |
| `resizable` | `true` | User can resize |
| `minWidth` | `1155` | Minimum width |
| `minHeight` | `640` | Minimum height |
| `sandbox` | `false` | Allows preload API access |

### IPC

| Channel | Direction | Description |
|---------|-----------|-------------|
| `app:open-standalone-window` | Renderer → Main | Open the standalone window |
| `app:close-standalone-window` | Renderer → Main | Close the standalone window |
| `show-settings-window-hotkey` | Internal | Hotkey-triggered open with settings tab |
| `store:standalone-window-active-tab` | Main → Renderer | Set active tab after hotkey open |
| `window:minimize` | Renderer → Main | Minimize window |
| `window:maximize` | Renderer → Main | Maximize/restore window |
| `window:close` | Renderer → Main | Close window |

:::tip
If the standalone window is already open, `openStandaloneWindow()` calls `focus()` on the existing window instead of creating a duplicate. The window reference is cleaned up on the `closed` event.
:::

---

## Capture Window

A fullscreen transparent overlay for region screenshot selection with annotation tools (mosaic, line, rectangle, arrow, text). It covers the entire primary display.

### Configuration

| Option | Value | Purpose |
|--------|-------|---------|
| `fullscreen` | `true` | Covers entire display |
| `transparent` | `true` | See-through overlay |
| `frame` | `false` | Frameless |
| `alwaysOnTop` | `true` | Above all windows |
| `resizable` | `false` | Fixed to screen size |
| `movable` | `false` | Cannot be moved |
| `skipTaskbar` | `true` | Hidden from taskbar |
| `nodeIntegration` | `true` | Direct Node.js access |
| `contextIsolation` | `false` | No context isolation |

:::danger
The Capture window is the only window with `nodeIntegration: true` and `contextIsolation: false`. This is intentional — it uses `desktopCapturer` directly in the renderer for native-resolution screen capture. All other windows use the secure preload bridge pattern.
:::

### IPC

| Channel | Direction | Description |
|---------|-----------|-------------|
| `system:screenshot:region:start` | Invoke | Trigger region capture flow |
| `system:screenshot` | Invoke | Full screenshot, returns base64 |
| `capture-image` | Main → Renderer | Send screenshot bytes, display info, scale |
| `capture-complete` | Renderer → Main | Selection done, copy to clipboard |
| `capture-save` | Renderer → Main | User wants to save, show dialog |
| `capture-cancel` | Renderer → Main | User cancelled capture |

### Lifecycle

```
1. Main window hidden
2. Capture window created at fullscreen
3. User selects region → capture-complete or capture-save
4. Capture window closed
5. Main window re-shown and re-pinned with setAlwaysOnTop(true, 'screen-saver')
```

---

## Agent Voice Input Window

A fullscreen transparent overlay displaying an Apple Intelligence-style animated neon edge glow effect during Agent voice input. Activated by holding a hotkey.

### Configuration

| Option | Value | Purpose |
|--------|-------|---------|
| `fullscreen` | `true` | Covers entire display |
| `transparent` | `true` | See-through overlay |
| `frame` | `false` | Frameless |
| `alwaysOnTop` | `true` | Above all windows |
| `skipTaskbar` | `true` | Hidden from taskbar |
| `resizable` | `false` | Fixed to screen size |
| `focusable` | `false` | Does not steal focus |
| `type` | `'toolbar'` | Toolbar window type |

### Behavior

- Shown on hotkey hold, hidden on hotkey release
- `setIgnoreMouseEvents(true)` — completely click-through
- Skipped if the island is in `expanded` or `maxExpand` state
- Hide triggers `startFadeOut()` via `executeJavaScript`, then closes after 450ms
- Main window is re-pinned on top after this window shows

:::note
The Agent Voice Input window does not use the shared preload script. It communicates state changes to the main window renderer via the `agent-voice-input:state` IPC channel.
:::

---

## CLI Glow Window

A fullscreen transparent overlay displaying the same neon edge glow effect as the Agent Voice Input window, triggered by external CLI tool detection (e.g., Claude Code). Stays visible until the user responds to a prompt.

### Configuration

The configuration is identical to the Agent Voice Input window — both share the same HTML entry point (`DynamicIslandAibackground.html`).

### IPC

| Channel | Direction | Description |
|---------|-----------|-------------|
| `cli-glow:show` | Invoke | Show the glow window |
| `cli-glow:hide` | Invoke | Hide with fade-out animation |

:::warning
Both glow windows (Agent Voice Input and CLI Glow) share the same HTML entry point and visual effect. The difference is in their trigger mechanism — hotkey hold vs. external CLI detection — and their dismiss behavior.
:::

---

## Cross-Window Communication

### Broadcast Utility

Settings changes are broadcast across all windows via `broadcastSettingChange()` in `src/main/utils/broadcast.ts`. It iterates `BrowserWindow.getAllWindows()` and sends `settings:changed` to every window except the sender.

| Sender ID | Behavior |
|-----------|----------|
| Specific webContents ID | Broadcast to all windows except sender |
| `-1` | Broadcast to all windows |

### Shared Preload Bridge

Four windows (Main, Splash, Guide, Standalone) use the shared preload script at `src/preload/index.ts`, which exposes:

- `window.electron` — raw Electron API
- `window.api` — custom application API (IPC invoke wrappers, event listeners, store access)

The Capture window bypasses this with direct `nodeIntegration`. The two glow windows use minimal IPC without the shared preload.

:::details Security Model — Window Isolation

| Window | contextIsolation | nodeIntegration | Preload |
|--------|-----------------|-----------------|---------|
| Main Island | `true` | `false` | Shared |
| Splash | `true` | `false` | Shared |
| Guide | `true` | `false` | Shared |
| Standalone | `true` | `false` | Shared |
| Capture | `false` | `true` | None |
| Agent Voice Input | `true` | `false` | Default |
| CLI Glow | `true` | `false` | Default |

The Capture window is the only exception to the secure isolation pattern, justified by its need for direct `desktopCapturer` access.
:::
