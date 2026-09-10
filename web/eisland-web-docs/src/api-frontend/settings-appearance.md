---
title: Settings & Appearance
icon: sliders
---

# Settings & Appearance

:::info
The settings & appearance API controls the island's visual style, behavior toggles, hotkeys, animation, and autostart. All methods are exposed on `window.api` via the Electron preload bridge. Most follow the get/set pair pattern.
:::

## Theme

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `themeModeGet` | `themeModeSet` | `string` | Theme mode: `'light'`, `'dark'`, or `'system'` |

## Island Appearance

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `islandOpacityGet` | `islandOpacitySet` | `number` | Island opacity (0.0 to 1.0) |
| `shapeModeGet` | `shapeModeSet` | `string` | Shape mode: `'notch'` or `'pill'` |

### onShapeModeChanged

Listens for shape mode changes.

```ts
window.api.onShapeModeChanged(callback: (mode: string) => void): () => void
```

:::tip
The shape mode affects the island's dimensions. Notch mode uses the default size; pill mode uses a narrower, rounded shape. See [Shape Modes](../introduction/frontend-arch/shape-modes.md) for details.
:::

## Behavior Toggles

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `expandMouseleaveIdleGet` | `expandMouseleaveIdleSet` | `boolean` | Return to idle on mouse leave from expanded state |
| `maxexpandMouseleaveIdleGet` | `maxexpandMouseleaveIdleSet` | `boolean` | Return to idle on mouse leave from maxExpand state |
| `idleClickExpandGet` | `idleClickExpandSet` | `boolean` | Click on idle state triggers hover expansion |

## Animation

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `springAnimationGet` | `springAnimationSet` | `boolean` | Enable spring physics animation |
| `animationSpeedGet` | `animationSpeedSet` | `string` | Animation speed: `'slow'`, `'medium'`, or `'fast'` |

:::note
Animation speeds map to durations: `slow` = 1100ms, `medium` = 550ms, `fast` = 280ms. See [State Machine — Animation System](../introduction/frontend-arch/states.md#animation-system) for details.
:::

## Autostart

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `autostartGet` | `autostartSet` | `boolean` | Launch eIsland on Windows startup |

## Navigation Order

### navOrderGet / navOrderSet

Gets or sets the widget navigation order in the expanded state.

```ts
window.api.navOrderGet(): Promise<NavOrderPayload>
window.api.navOrderSet(payload: NavOrderPayload): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `NavOrderPayload` | Ordered array of widget identifiers |

## Settings Preview

### settingsPreview

Sends a preview value to the main process for live preview before committing.

```ts
window.api.settingsPreview(channel: string, value: unknown): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel` | `string` | Settings channel identifier |
| `value` | `unknown` | Preview value |

---

### onSettingsChanged

Listens for settings changes from the main process.

```ts
window.api.onSettingsChanged(callback: (data: { channel: string, value: unknown }) => void): () => void
```

## Hotkeys

:::info
All hotkey settings follow the same get/set pattern. Each hotkey is stored as a string representation of the key combination (e.g., `'Ctrl+Shift+I'`).
:::

| Getter | Setter | Description |
|--------|--------|-------------|
| `hotkeyGet` | `hotkeySet` | Toggle island visibility |
| `quitHotkeyGet` | `quitHotkeySet` | Quit application |
| `screenshotHotkeyGet` | `screenshotHotkeySet` | Take screenshot |
| `nextSongHotkeyGet` | `nextSongHotkeySet` | Skip to next song |
| `playPauseSongHotkeyGet` | `playPauseSongHotkeySet` | Toggle play/pause |
| `resetPositionHotkeyGet` | `resetPositionHotkeySet` | Reset island position |
| `toggleTrayHotkeyGet` | `toggleTrayHotkeySet` | Toggle tray visibility |
| `showSettingsWindowHotkeyGet` | `showSettingsWindowHotkeySet` | Open settings window |
| `openClipboardHistoryHotkeyGet` | `openClipboardHistoryHotkeySet` | Open clipboard history |
| `togglePassthroughHotkeyGet` | `togglePassthroughHotkeySet` | Toggle mouse passthrough |
| `toggleUiLockHotkeyGet` | `toggleUiLockHotkeySet` | Toggle UI lock |
| `toggleShapeModeHotkeyGet` | `toggleShapeModeHotkeySet` | Toggle notch/pill shape |
| `agentVoiceInputHotkeyGet` | `agentVoiceInputHotkeySet` | Activate voice input |

### Hotkey Lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `hotkeySuspend` | `() => void` | Temporarily disable all hotkeys (e.g., during text input) |
| `hotkeyResume` | `() => void` | Re-enable all hotkeys |

:::warning
Forgetting to call `hotkeyResume` after `hotkeySuspend` will leave all hotkeys disabled until the app restarts. Always pair suspend/resume calls.
:::
