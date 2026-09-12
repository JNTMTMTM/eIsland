---
title: App Lifecycle
icon: power-off
---

# App Lifecycle

:::info
The app lifecycle API controls application-level operations: quitting, restarting, file picking, file I/O, and standalone window management. All methods are exposed on `window.api` via the Electron preload bridge.
:::

## Application Control

### quitApp

Quits the application.

```ts
window.api.quitApp(): void
```

:::warning
This is a fire-and-forget call. The main process will perform cleanup (save settings, close windows) before exiting.
:::

---

### restartApp

Restarts the application.

```ts
window.api.restartApp(): Promise<void>
```

---

### guideReset

Resets the first-run guide state, so the guide will show again on next launch.

```ts
window.api.guideReset(): void
```

## Log Management

### openLogsFolder

Opens the logs directory in the system file explorer.

```ts
window.api.openLogsFolder(): void
```

---

### clearLogsCache

Clears cached log files.

```ts
window.api.clearLogsCache(): void
```

## File Pickers

:::tip
All file picker methods open the native OS dialog and return the selected path(s). They return `null` or an empty array if the user cancels.
:::

| Method | Returns | Description |
|--------|---------|-------------|
| `pickFeedbackLogFile` | `Promise<string \| null>` | Pick a log file for feedback |
| `pickFeedbackScreenshotFile` | `Promise<string \| null>` | Pick a screenshot for feedback |
| `pickLocalSearchDirectory` | `Promise<string \| null>` | Pick a directory for local file search |
| `pickSkillFile` | `Promise<string \| null>` | Pick a skill file |

## File I/O

### readTextFile

Reads a text file from the file system.

```ts
window.api.readTextFile(filePath: string): Promise<string>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Absolute path to the file |

---

### saveTextFile

Saves text content to a file.

```ts
window.api.saveTextFile(payload: SaveTextFilePayload): Promise<SaveTextFileResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `SaveTextFilePayload` | `{ filePath, content }` |

---

### searchLocalFiles

Searches for files in a directory.

```ts
window.api.searchLocalFiles(options: SearchLocalFilesOptions): Promise<SearchLocalFileResult[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `SearchLocalFilesOptions` | Directory, query, and filter options |

## File Operations

| Method | Signature | Description |
|--------|-----------|-------------|
| `getFileIcon` | `(filePath: string) => Promise<string>` | Get base64 icon for a file |
| `openFile` | `(filePath: string) => void` | Open a file with the default app |
| `openInExplorer` | `(filePath: string) => void` | Reveal a file in File Explorer |
| `pickFileForHash` | `() => Promise<string \| null>` | Pick a file to compute hash |
| `computeFileHash` | `(filePath: string) => Promise<ComputeFileHashResult>` | Compute SHA-256 hash of a file |
| `resolveShortcut` | `(filePath: string) => Promise<ResolveShortcutResult>` | Resolve a .lnk shortcut to its target |

## Image & Media

### saveImageAs

Saves an image to a user-selected location.

```ts
window.api.saveImageAs(data: string, defaultName?: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `string` | Base64-encoded image data |
| `defaultName` | `string` | Optional: suggested filename |

---

### openImageDialog / openVideoDialog / openFontDialog

Opens native file pickers for specific media types.

```ts
window.api.openImageDialog(): Promise<string | null>
window.api.openVideoDialog(): Promise<string | null>
window.api.openFontDialog(): Promise<string | null>
```

---

### readFontFile

Reads a font file and returns its data.

```ts
window.api.readFontFile(filePath: string): Promise<ArrayBuffer>
```

## Standalone Window

:::info
Standalone windows are independent BrowserWindow instances used for tools like the image compressor or format factory.
:::

### openStandaloneWindow

Opens a standalone tool window.

```ts
window.api.openStandaloneWindow(windowId: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `windowId` | `string` | Window identifier (e.g., `'image-compression'`, `'format-factory'`) |

---

### closeStandaloneWindow

Closes a standalone tool window.

```ts
window.api.closeStandaloneWindow(windowId: string): void
```

## Wallpaper

| Method | Signature | Description |
|--------|-----------|-------------|
| `loadWallpaperFile` | `(path: string) => Promise<string>` | Load and cache a wallpaper file |
| `loadAlbumThumbnail` | `(path: string) => Promise<string>` | Load album art thumbnail |
| `clearWallpaperCache` | `() => Promise<void>` | Clear cached wallpaper files |
| `setSystemDesktopWallpaper` | `(payload: SetWallpaperPayload) => Promise<void>` | Set the Windows desktop wallpaper |
| `wallpaperVideoCover` | `(path: string) => Promise<string>` | Extract a cover frame from a video wallpaper |
| `readLocalFileAsBuffer` | `(path: string) => Promise<ArrayBuffer>` | Read a local file as raw buffer |

:::note
Wallpaper operations are resource-intensive. The main process caches processed wallpapers to avoid re-processing on each load.
:::
