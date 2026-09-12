---
title: API Frontend
icon: display
---

# API Frontend

:::info
This section documents the eIsland frontend API surface, including the Electron preload bridge (`window.api`), IPC channels, and renderer-side utilities exposed to the application.
:::

## Overview

The eIsland frontend runs in Electron's renderer process with a secure preload bridge (`window.api`) that wraps IPC communication with the main process. The bridge exposes approximately **170 methods** organized into functional categories. This API surface includes window management, media controls, AI agent integration, system tools, settings, and network utilities.

:::tip
All `window.api` methods use one of three IPC transport patterns: `invoke` (request/response, returns `Promise`), `send` (fire-and-forget), or `on` (event subscription, returns unsubscribe function).
:::

## API Categories

| Category | Description |
|----------|-------------|
| [Window Management](window-management.md) | Island window shape, position, visibility, display selection, and mouse passthrough |
| [App Lifecycle](app-lifecycle.md) | Application quit/restart, file pickers, file I/O, standalone windows, and wallpaper |
| [Media Control](media-control.md) | Playback control, volume, now-playing info, music provider auth, Qishui API, and lyrics settings |
| [AI & Agent](ai-agent.md) | AI assistant chat, Ollama local LLM, custom API direct chat, Claude Code monitoring, and Codex integration |
| [System Tools](system-tools.md) | Screenshots, brightness, performance monitoring, process enumeration, and CLI glow |
| [Settings & Appearance](settings-appearance.md) | Theme, shape mode, behavior toggles, animation, hotkeys, and autostart |
| [Network & Storage](network-storage.md) | CORS-free fetch, clipboard, downloads, image compression, file store, mail, and auto-updater |

## IPC Transport Patterns

| Pattern | Method | Returns | Use Case |
|---------|--------|---------|----------|
| Request/Response | `ipcRenderer.invoke` | `Promise<T>` | Most API calls; waits for main process result |
| Fire-and-Forget | `ipcRenderer.send` | `void` | Window control, logging, app quit |
| Event Subscription | `ipcRenderer.on` | `() => void` (unsubscribe) | Real-time updates from main process |

:::warning
Always unsubscribe from `on*` event listeners when the component unmounts. Failing to do so causes memory leaks and stale callbacks.
:::
