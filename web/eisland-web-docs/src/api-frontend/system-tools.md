---
title: System Tools
icon: screwdriver-wrench
---

# System Tools

:::info
The system tools API provides OS-level capabilities: screenshots, brightness/volume control, performance monitoring, process enumeration, and window management. All methods are exposed on `window.api` via the Electron preload bridge.
:::

## Screenshot

### screenshot

Takes a screenshot of the primary display.

```ts
window.api.screenshot(): Promise<string>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<string>` | Base64-encoded PNG of the screenshot |

---

### startRegionScreenshot

Activates region selection mode for a partial screenshot.

```ts
window.api.startRegionScreenshot(): void
```

:::note
`startRegionScreenshot` opens a transparent overlay where the user can drag to select a region. The result is delivered via IPC events, not as a return value.
:::

## Brightness

| Method | Signature | Description |
|--------|-----------|-------------|
| `getBrightness` | `() => Promise<number>` | Get current display brightness (0–100) |
| `setBrightness` | `(value: number) => Promise<void>` | Set display brightness (0–100) |

:::tip
Brightness control uses the Windows WMI API. It works on most laptops and external monitors that support DDC/CI.
:::

## Volume

| Method | Signature | Description |
|--------|-----------|-------------|
| `getVolume` | `() => Promise<number>` | Get current system volume (0–100) |
| `setVolume` | `(value: number) => Promise<void>` | Set system volume (0–100) |

## Performance Monitoring

### getPerformanceSnapshot

Returns a snapshot of system performance metrics.

```ts
window.api.getPerformanceSnapshot(
  selection?: PerformanceHardwareSelection,
  includeHardwareOptions?: boolean
): Promise<PerformanceSnapshot>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `selection` | `PerformanceHardwareSelection` | Optional: which hardware metrics to include |
| `includeHardwareOptions` | `boolean` | Optional: include available hardware options in response |

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<PerformanceSnapshot>` | CPU, memory, temperature, and hardware data |

## Process & Window Enumeration

### getRunningNonSystemProcesses

Returns a list of running non-system processes.

```ts
window.api.getRunningNonSystemProcesses(): Promise<RunningProcessInfo[]>
```

---

### getRunningNonSystemProcessesWithIcons

Returns running non-system processes with their icon data.

```ts
window.api.getRunningNonSystemProcessesWithIcons(): Promise<RunningProcessInfo[]>
```

---

### getOpenWindowsWithIcons

Returns all open windows with their icons.

```ts
window.api.getOpenWindowsWithIcons(): Promise<RunningWindowInfo[]>
```

---

### getFocusedWindow

Returns information about the currently focused window.

```ts
window.api.getFocusedWindow(): Promise<RunningWindowInfo | null>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<RunningWindowInfo \| null>` | Focused window info, or `null` if no window is focused |

## Process Hiding

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `hideProcessListGet` | `hideProcessListSet` | `string[]` | List of process names to hide from the island UI |
| `autoHideFullscreenWindowsGet` | `autoHideFullscreenWindowsSet` | `boolean` | Auto-hide island when a fullscreen window is detected |

## CLI Glow

### cliGlowShow

Shows the CLI glow overlay effect (used when a new CLI session is detected).

```ts
window.api.cliGlowShow(): void
```

---

### cliGlowHide

Hides the CLI glow overlay effect.

```ts
window.api.cliGlowHide(): void
```

## Task Manager

### openTaskManager

Opens the Windows Task Manager.

```ts
window.api.openTaskManager(): void
```

## File Utilities

### getPathForFile

Returns the file system path for a `File` object (uses Electron's `webUtils.getPathForFile`).

```ts
window.api.getPathForFile(file: File): string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `File` | A `File` object from drag-and-drop or file input |

**Returns:**

| Type | Description |
|------|-------------|
| `string` | Absolute file system path |

:::warning
This method must be called in the renderer process. It converts a web `File` object to a native path that can be passed to main process APIs.
:::
