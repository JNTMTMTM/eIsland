---
title: Window Management
icon: window-restore
---

# Window Management

:::info
The window management API controls the floating island window's shape, position, visibility, and display selection. All methods are exposed on `window.api` via the Electron preload bridge. Most use `ipcRenderer.send` (fire-and-forget) for window operations and `ipcRenderer.invoke` (request/response) for queries.
:::

## Window State Control

### expandWindow

Expands the island to the standard expanded state (860×150 px).

```ts
window.api.expandWindow(): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| *(none)* | — | — |

:::note
This is a fire-and-forget call (`ipcRenderer.send`). The main process handles the resize and animation.
:::

---

### expandWindowFull

Expands the island to the maximum expanded state (860×400 px).

```ts
window.api.expandWindowFull(): void
```

---

### expandWindowNotification

Expands the island to the notification state (500×88 px).

```ts
window.api.expandWindowNotification(): void
```

---

### expandWindowLyrics

Expands the island to the lyrics state (500×42 px).

```ts
window.api.expandWindowLyrics(): void
```

---

### expandWindowLyricsTranslation

Expands the island to the lyrics-with-translation state (500×60 px).

```ts
window.api.expandWindowLyricsTranslation(): void
```

---

### expandWindowSettings

Expands the island to the settings/maxExpand state (860×400 px).

```ts
window.api.expandWindowSettings(): void
```

---

### collapseWindow

Collapses the island back to the idle state (260×42 px).

```ts
window.api.collapseWindow(): void
```

---

### hideWindow

Hides the island window completely.

```ts
window.api.hideWindow(): void
```

:::tip
Use `hideWindow` when the user requests to hide the island (e.g., from the hover state action buttons). The island can be restored via the global hotkey.
:::

## Window Movement

### moveWindowDelta

Moves the island window by a relative pixel offset.

```ts
window.api.moveWindowDelta(dx: number, dy: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dx` | `number` | Horizontal offset in pixels (positive = right) |
| `dy` | `number` | Vertical offset in pixels (positive = down) |

:::important
This is a fire-and-forget call. The main process applies the offset to the current window position atomically.
:::

## Mouse Passthrough

### enableMousePassthrough

Enables mouse pass-through mode — mouse events pass through the island to underlying windows.

```ts
window.api.enableMousePassthrough(): void
```

---

### disableMousePassthrough

Disables mouse pass-through mode — the island captures mouse events.

```ts
window.api.disableMousePassthrough(): void
```

:::note
Mouse passthrough is automatically managed by the state machine. Manual calls are only needed for special cases like lock toggles.
:::

## Window Queries

### getMousePosition

Returns the current mouse cursor position in screen coordinates.

```ts
window.api.getMousePosition(): Promise<Point>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<Point>` | `{ x: number, y: number }` — cursor position in screen pixels |

---

### getMouseWindowState

Returns whether the mouse is currently over the island window.

```ts
window.api.getMouseWindowState(): Promise<boolean>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<boolean>` | `true` if the mouse is over the island window |

---

### getWindowBounds

Returns the current island window bounds.

```ts
window.api.getWindowBounds(): Promise<Bounds>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<Bounds>` | `{ x, y, width, height }` — window position and size in screen pixels |

## Display Selection

### getIslandDisplays

Returns information about all available displays for island placement.

```ts
window.api.getIslandDisplays(): Promise<IslandDisplayInfo[]>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<IslandDisplayInfo[]>` | Array of display info objects |

---

### getIslandDisplaySelection

Returns the currently selected display for the island.

```ts
window.api.getIslandDisplaySelection(): Promise<number>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<number>` | Display ID of the selected display |

---

### setIslandDisplaySelection

Sets the display the island should appear on.

```ts
window.api.setIslandDisplaySelection(displayId: number): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `displayId` | `number` | Target display ID from `getIslandDisplays` |

---

### getIslandPositionOffset

Returns the manual position offset applied to the island.

```ts
window.api.getIslandPositionOffset(): Promise<Point>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<Point>` | `{ x: number, y: number }` — current offset in pixels |

---

### setIslandPositionOffset

Sets a manual position offset for the island.

```ts
window.api.setIslandPositionOffset(offset: Point): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `offset` | `Point` | `{ x: number, y: number }` — offset in pixels |

## Window Chrome

:::warning
These methods control the settings/standalone window chrome, not the floating island itself. The island has no standard window chrome (no title bar, no close button).
:::

### windowMinimize

Minimizes the current settings window.

```ts
window.api.windowMinimize(): void
```

---

### windowMaximize

Toggles maximize on the current settings window.

```ts
window.api.windowMaximize(): void
```

---

### windowClose

Closes the current settings window.

```ts
window.api.windowClose(): void
```

## Events

### onIslandPositionOffsetChanged

Listens for changes to the island's position offset.

```ts
window.api.onIslandPositionOffsetChanged(callback: (offset: Point) => void): () => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(offset: Point) => void` | Called with the new offset when changed |

**Returns:** Unsubscribe function.

---

### onPassthroughLockChanged

Listens for changes to the passthrough lock state.

```ts
window.api.onPassthroughLockChanged(callback: (locked: boolean) => void): () => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(locked: boolean) => void` | Called when passthrough lock changes |

**Returns:** Unsubscribe function.

:::tip
All `on*` event listeners return an unsubscribe function. Call it in `useEffect` cleanup to prevent memory leaks.
:::
