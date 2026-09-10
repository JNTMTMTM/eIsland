---
title: Network & Storage
icon: network-wired
---

# Network & Storage

:::info
The network & storage API provides CORS-free HTTP requests, clipboard management, download management, image compression, file store, mail, and auto-update capabilities. All methods are exposed on `window.api` via the Electron preload bridge.
:::

## Network Proxy

### netFetch

Performs an HTTP request through the main process, bypassing CORS restrictions.

```ts
window.api.netFetch(url: string, options?: NetFetchOptions): Promise<NetFetchResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | Target URL |
| `options` | `NetFetchOptions` | Optional: method, headers, body, timeout |

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<NetFetchResult>` | `{ status, headers, body }` |

:::important
`netFetch` runs in the main process Node.js context, so it is not subject to browser CORS restrictions. Use it for API calls to third-party services that don't set CORS headers.
:::

## Clipboard

### clipboardReadText

Reads text from the system clipboard.

```ts
window.api.clipboardReadText(): Promise<string>
```

---

### clipboardWriteText

Writes text to the system clipboard.

```ts
window.api.clipboardWriteText(text: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | Text to write to clipboard |

### URL Monitor

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `clipboardUrlMonitorGet` | `clipboardUrlMonitorSet` | `boolean` | Enable/disable clipboard URL monitoring |
| `clipboardUrlDetectModeGet` | `clipboardUrlDetectModeSet` | `string` | URL detection mode |
| `clipboardUrlBlacklistGet` | `clipboardUrlBlacklistSet` | `string[]` | Domains to ignore when monitoring URLs |

### clipboardUrlBlacklistAddDomain

Adds a domain to the clipboard URL blacklist.

```ts
window.api.clipboardUrlBlacklistAddDomain(domain: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `domain` | `string` | Domain to add (e.g., `'example.com'`) |

### onClipboardUrlsDetected

Listens for URLs detected in the clipboard.

```ts
window.api.onClipboardUrlsDetected(callback: (data: ClipboardUrlsDetectedData) => void): () => void
```

---

### clipboardOpenUrl

Opens a URL from the clipboard in the default browser.

```ts
window.api.clipboardOpenUrl(url: string): void
```

## Download Manager

:::info
The download manager provides a full download lifecycle: start, pause, resume, cancel, and remove. Downloads are managed by the main process and tracked via events.
:::

### downloadStart

Starts a new download.

```ts
window.api.downloadStart(payload: DownloadStartPayload): Promise<DownloadStartResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `DownloadStartPayload` | URL, filename, and save path |

---

### downloadCancel

Cancels a running download.

```ts
window.api.downloadCancel(taskId: string): void
```

---

### downloadPause

Pauses a running download.

```ts
window.api.downloadPause(taskId: string): void
```

---

### downloadResume

Resumes a paused download.

```ts
window.api.downloadResume(taskId: string): void
```

---

### downloadRemove

Removes a download task from the list.

```ts
window.api.downloadRemove(taskId: string): void
```

---

### downloadList

Returns all download tasks.

```ts
window.api.downloadList(): Promise<DownloadTask[]>
```

---

### downloadPickSavePath

Opens a folder picker for selecting the download save location.

```ts
window.api.downloadPickSavePath(): Promise<string | null>
```

---

### downloadGetDefaultDir

Returns the default download directory.

```ts
window.api.downloadGetDefaultDir(): Promise<string>
```

---

### onDownloadTaskUpdated

Listens for download task state changes.

```ts
window.api.onDownloadTaskUpdated(callback: (task: DownloadTask) => void): () => void
```

## Image Compression

| Method | Signature | Description |
|--------|-----------|-------------|
| `imageCompressionPickImages` | `() => Promise<string[]>` | Open file picker for images |
| `imageCompressionPickOutputDir` | `() => Promise<string \| null>` | Open folder picker for output |
| `imageCompressionStart` | `(payload: ImageCompressionStartPayload) => Promise<ImageCompressionStartResult>` | Start compression |
| `imageCompressionList` | `() => Promise<ImageCompressionTask[]>` | List all compression tasks |
| `imageCompressionRemove` | `(taskId: string) => void` | Remove a task |

### onImageCompressionTaskUpdated

```ts
window.api.onImageCompressionTaskUpdated(callback: (task: ImageCompressionTask) => void): () => void
```

## Format Factory

| Method | Signature | Description |
|--------|-----------|-------------|
| `pickVideoForExtract` | `() => Promise<PickVideoForExtractResult>` | Open file picker for video |
| `extractVideoTrack` | `(options: ExtractVideoTrackOptions) => Promise<ExtractVideoTrackResult>` | Extract video track |

## File Store

:::note
The file store provides simple key-value persistence in the main process. It is used for settings that don't need to be synced across devices.
:::

| Method | Signature | Description |
|--------|-----------|-------------|
| `storeRead` | `(key: string) => Promise<unknown>` | Read a value by key |
| `storeWrite` | `(key: string, data: unknown) => Promise<void>` | Write a value by key |

## Mail

### mailInboxList

Fetches the user's inbox.

```ts
window.api.mailInboxList(configOrLimit?: number | object, limit?: number): Promise<MailInboxResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `configOrLimit` | `number \| object` | Optional: limit or config object |
| `limit` | `number` | Optional: max items to return |

## Auto Updater

:::warning
The auto updater downloads updates in the background. The update is not installed until the user explicitly calls `updaterInstall`, which triggers a restart.
:::

| Method | Signature | Description |
|--------|-----------|-------------|
| `updaterCheck` | `() => Promise<UpdaterCheckResult>` | Check for available updates |
| `updaterDownload` | `() => void` | Start downloading the update |
| `updaterInstall` | `() => void` | Install and restart |
| `updaterVersion` | `() => Promise<string>` | Get current app version |

### Updater Events

| Event | Callback Type | Description |
|-------|--------------|-------------|
| `onUpdaterProgress` | `UpdaterProgress` | Download progress updates |
| `onUpdaterDownloaded` | `UpdaterDownloadedData` | Update download completed |
| `onUpdaterAvailable` | `UpdaterAvailableData` | Update available notification |
| `onUpdaterNotAvailable` | `UpdaterNotAvailableData` | No update available |
| `onUpdaterStartupAutoCheckRequest` | `UpdaterStartupAutoCheckRequestData` | Startup auto-check triggered |

## Logging

### logWrite

Writes a log entry in the main process.

```ts
window.api.logWrite(level: string, message: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | `string` | Log level: `'info'`, `'warn'`, `'error'`, `'debug'` |
| `message` | `string` | Log message |

:::note
This is a fire-and-forget call. The main process writes to its log file. Use `openLogsFolder` (from the App Lifecycle API) to view logs.
:::
