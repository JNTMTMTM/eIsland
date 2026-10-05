---
title: eisland Process Model
icon: arrows-split-up-and-left
---

# eIsland Process Model

:::info
eIsland follows Electron's multi-process architecture with strict separation between the **Main Process** (Node.js), **Preload Bridge** (Context Bridge), and **Renderer Process** (Chromium). This architecture ensures security, stability, and clear responsibility boundaries.
:::

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  eIsland Application                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌────────────────────┐ │
│  │    Main Process      │    │   Preload Bridge     │    │  Renderer Process  │ │
│  │    (Node.js)         │◄──►│   (Context Bridge)   │◄──►│  (Chromium)        │ │
│  │                      │    │                      │    │                    │ │
│  │  • Window Management │    │  • API Exposure      │    │  • React UI        │ │
│  │  • System APIs       │    │  • Type Safety       │    │  • State Management│ │
│  │  • Native Modules    │    │  • Security Bridge   │    │  • DOM Rendering   │ │
│  │  • IPC Handlers      │    │  • Event Routing     │    │  • User Interaction│ │
│  └──────────────────────┘    └──────────────────────┘    └────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Main Process

:::info
The Main Process is the backbone of the application, running in Node.js with full system access. It manages windows, handles system-level operations, and coordinates all IPC communication.
:::

### Responsibilities

| Category | Operations |
|----------|------------|
| **Window Management** | Create, destroy, resize, position, transparency |
| **System Integration** | Clipboard, hotkeys, tray, notifications |
| **Native Modules** | Process control, fullscreen detection, performance monitoring |
| **File Operations** | Read/write files, path resolution, media serving |
| **Network** | HTTP requests, proxy configuration, updates |
| **Security** | CSP enforcement, protocol registration, sandbox control |

### Service Factory Pattern

:::tip
Services are created via factory functions with dependency injection through getter/setter options, enabling loose coupling and easy testing.
:::

```ts
const mainWindowService = createMainWindowService({
  getMainWindow: () => mainWindow,
  setMainWindow: (window) => { mainWindow = window; },
  getIslandPositionOffset: () => islandPositionOffset,
  sizes: { islandWidth: ISLAND_WIDTH, islandHeight: ISLAND_HEIGHT, ... },
});
```

**Benefits:**
- Loose coupling between services
- Easy to mock for testing
- Clear dependency graph
- No circular dependencies

### IPC Handler Registration

Each domain has its own `register*Handlers()` function that receives a configuration object:

```ts
// Clipboard domain
registerClipboardHandlers({ getMainWindow });

// Media domain
registerMediaHandlers({ getMainWindow, getNowPlayingInfo });

// Hotkey domain
registerHotkeyHandlers({ getMainWindow, getIslandPositionOffset });
```

**IPC Domains (25+ modules):**

| Domain | Operations |
|--------|------------|
| **clipboard** | Read/write clipboard, URL detection |
| **capture** | Screen capture, recording |
| **screenshot** | Screenshot with region selection |
| **app** | App lifecycle, restart, quit |
| **system** | System info, environment variables |
| **updater** | Auto-update, version check |
| **download** | File download management |
| **media** | Media playback control |
| **music** | Music player integration |
| **hotkey** | Global shortcut registration |
| **island** | Island window management |
| **theme** | Theme switching |
| **window** | Window state management |
| **wallpaper** | Wallpaper management |
| **mail** | Email operations |
| **store** | Persistent storage |
| **log** | Logging |
| **format-factory** | Media format conversion |
| **image-compression** | Image optimization |
| **net** | Network operations |
| **hide-process** | Process hiding |
| **agent** | AI agent status |

### Native Module Integration

:::warning
Native modules (C/C++ addons) are loaded in the Main Process with sandbox disabled. These modules provide low-level Windows system capabilities. For detailed plugin implementations, see [Plugins Tech Stack](../tech-stack/plugins-tech-stack.md).
:::

| Module | Purpose | Platform |
|--------|---------|----------|
| `@eisland/windows-processes-attacker` | Terminate processes by name/PID | Windows only |
| `@eisland/windows-fullscreen-detector` | Detect fullscreen windows | Windows only |
| `@eisland/windows-performance-monitor` | CPU, memory, temperature snapshots | Windows only |

```ts
// Loading native modules in Main Process
const detector = require('@eisland/windows-fullscreen-detector');

if (detector.isAnyFullscreenWindow()) {
  mainWindow.hide(); // Auto-hide when fullscreen app detected
}
```

### Window Architecture

:::info
eIsland uses multiple transparent, frameless, always-on-top windows for different visual contexts.
:::

```ts
const mainWindow = new BrowserWindow({
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  hasShadow: false,
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false, // Required for native modules
  },
});
```

**Window Types:**

| Window | Properties | Purpose |
|--------|------------|---------|
| **Main Island** | `transparent`, `frameless`, `alwaysOnTop` | Primary dynamic island UI |
| **Agent Voice Input** | `fullscreen`, `transparent`, `setIgnoreMouseEvents(true)` | Voice input overlay |
| **CLI Glow Overlay** | `transparent`, `alwaysOnTop` | Terminal glow effect |
| **Standalone Widget** | Separate HTML entry | Independent widget window |
| **Splash Screen** | `frameless`, `transparent`, `alwaysOnTop`, `show: false` | Startup video playback with IPC synchronization |

#### Splash Window Lifecycle

:::important
The splash window uses an **IPC-based ready synchronization** pattern to ensure the renderer has mounted and subscribed to playback commands before the main process sends them.
:::

The splash window lifecycle follows a two-phase approach:

**Phase 1 — Creation & Ready Sync:**

1. Main process creates the splash window with `show: false`
2. A `splashReadyPromise` is created with a 1500ms fallback timer
3. Renderer mounts, subscribes to `splash:play-video`, then sends `splash:renderer-ready`
4. On receiving `splash:renderer-ready` (or fallback timeout), the window is revealed

**Phase 2 — Playback & Close:**

1. Main process waits for `splashReadyPromise` to resolve
2. Sends `splash:play-video` to renderer
3. Sets a 5000ms playback fallback timer
4. On video end (IPC) or playback timeout → wait 1s → fade out → close

```ts
// Renderer side — signal readiness after mounting
useEffect(() => {
  const remove = ipcRenderer.on('splash:play-video', () => {
    videoRef.current?.play().catch(() => {});
  });
  ipcRenderer.send('splash:renderer-ready'); // Signal main process
  return remove;
}, []);
```

:::tip
The dual-fallback design (ready timeout + playback timeout) ensures the main window is never permanently blocked, even if the renderer fails to load or the video resource is unavailable.
:::

### Custom Protocol

A custom `eisland-media://` protocol safely serves local wallpaper media files:

```ts
protocol.registerFileProtocol('eisland-media', (request, callback) => {
  const url = request.url.replace('eisland-media://', '');
  const filePath = join(app.getPath('userData'), 'wallpapers', url);
  // Path sandboxing: only serve files from userData/wallpapers
  callback({ path: filePath });
});
```

### Chromium Performance Flags

Applied before `app.whenReady()`:

```ts
function applyChromiumPerformanceFlags(app: Electron.App) {
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
  app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
}
```

## Preload Bridge

:::info
The Preload Bridge is the secure communication layer between Main and Renderer processes. It runs in a privileged context with access to both Node.js APIs and the DOM.
:::

### Context Bridge Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Preload Script                             │
│                                                                 │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │   Node.js APIs  │              │   DOM APIs      │           │
│  │   (ipcRenderer) │              │   (window)      │           │
│  └────────┬────────┘              └────────┬────────┘           │
│           │                                │                    │
│           └──────────┬─────────────────────┘                    │
│                      │                                          │
│              ┌───────▼───────┐                                  │
│              │ contextBridge │                                  │
│              │ exposeInMain  │                                  │
│              │ World('api')  │                                  │
│              └───────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ window.api      │
                    │ (Renderer)      │
                    └─────────────────┘
```

### API Exposure

The preload script exposes a unified API object through `contextBridge.exposeInMainWorld`:

```ts
contextBridge.exposeInMainWorld('api', {
  // Fire-and-forget (one-way)
  expandWindow: () => ipcRenderer.send('expandWindow'),
  collapseWindow: () => ipcRenderer.send('collapseWindow'),
  enableMousePassthrough: () => ipcRenderer.send('enableMousePassthrough'),

  // Request-response (two-way)
  getMousePosition: () => ipcRenderer.invoke('getMousePosition'),
  storeRead: (key: string) => ipcRenderer.invoke('storeRead', key),
  hotkeySet: (action: string, accelerator: string) =>
    ipcRenderer.invoke('hotkeySet', action, accelerator),

  // Event subscriptions (with unsubscribe)
  onNowPlayingInfo: (callback: (info: NowPlayingInfo) => void) => {
    const handler = (_event: any, info: NowPlayingInfo) => callback(info);
    ipcRenderer.on('nowPlayingInfo', handler);
    return () => ipcRenderer.removeListener('nowPlayingInfo', handler);
  },
  onSettingsChanged: (callback: (settings: Settings) => void) => { ... },
});
```

### IPC Communication Patterns

:::tip
eIsland implements three distinct IPC communication patterns, each optimized for specific use cases.
:::

#### 1. Fire-and-Forget (One-Way)

**Direction:** Renderer → Main

**Method:** `ipcRenderer.send()` / `ipcMain.on()`

**Use Case:** Window control, one-way notifications, actions that don't require a response.

```ts
// Renderer Process
window.api.expandWindow();
window.api.collapseWindow();
window.api.enableMousePassthrough();

// Main Process (handler)
ipcMain.on('expandWindow', () => {
  mainWindow.setSize(860, 150);
});
```

**Characteristics:**
- No return value
- Non-blocking
- No confirmation of receipt
- Used for: window control, notifications, logging

---

#### 2. Request-Response (Two-Way)

**Direction:** Renderer → Main → Renderer

**Method:** `ipcRenderer.invoke()` / `ipcMain.handle()`

**Use Case:** Data queries, operations with return values, operations requiring confirmation.

```ts
// Renderer Process
const mousePos = await window.api.getMousePosition();
const storedValue = await window.api.storeRead('key');

// Main Process (handler)
ipcMain.handle('getMousePosition', () => {
  return screen.getCursorScreenPoint();
});

ipcMain.handle('storeRead', (_event, key) => {
  return store.get(key);
});
```

**Characteristics:**
- Returns a Promise
- Async/await support
- Error propagation
- Used for: data queries, file operations, system info

---

#### 3. Event Subscription (Push-Based)

**Direction:** Main → Renderer (continuous)

**Method:** `ipcRenderer.on()` + `ipcMain.webContents.send()`

**Use Case:** Real-time updates, state changes, continuous data streams.

```ts
// Renderer Process (subscription)
const unsubscribe = window.api.onNowPlayingInfo((info) => {
  setNowPlaying(info);
});

// Cleanup on unmount
useEffect(() => {
  return () => unsubscribe();
}, []);

// Main Process (sender)
mainWindow.webContents.send('nowPlayingInfo', {
  title: 'Song Title',
  artist: 'Artist Name',
  coverUrl: '...',
});
```

**Characteristics:**
- Continuous updates
- Unsubscribe function returned
- Used for: media info, settings changes, notifications, state updates

### Security Model

:::danger
The Preload Bridge enforces security by controlling what APIs are exposed to the Renderer process. Direct access to Node.js APIs is blocked.
:::

**Security Boundaries:**

| Layer | Access | Purpose |
|-------|--------|---------|
| **Main Process** | Full Node.js, Native Modules | System operations, file I/O, native addons |
| **Preload Bridge** | Limited Node.js, Context Bridge | Secure API exposure, type safety |
| **Renderer Process** | DOM, window.api only | UI rendering, user interaction |

**Key Security Features:**

1. **Context Isolation**: Renderer cannot access Node.js APIs directly
2. **Sandbox Control**: Preload runs with controlled permissions
3. **API Whitelisting**: Only exposed APIs are accessible
4. **Type Safety**: TypeScript definitions for all IPC calls
5. **Input Validation**: Main Process validates all incoming data

## Renderer Process

:::info
The Renderer Process runs the React UI in a Chromium environment. It handles all visual rendering, user interactions, and client-side state management.
:::

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | Component-based UI |
| **TypeScript** | Type safety |
| **Zustand** | Global state management |
| **Tailwind CSS v4** | Utility-first styling |
| **GSAP** | Programmatic animations |
| **i18next** | Internationalization |

### React Architecture

#### Coordinator Hook Pattern

:::tip
The island UI is orchestrated by a single **coordinator hook** (`useDynamicIslandCoordinator`) that composes approximately 16 specialized hooks, each managing one concern.
:::

```ts
function useDynamicIslandCoordinator() {
  // Shell morphing state machine
  const { state, shellClassName, shellStyle, handleIslandClick } =
    useDynamicIslandShell();

  // Media synchronization
  const { nowPlaying } = useIslandNowPlayingSync();
  const dominantColor = useIslandDominantColor(nowPlaying?.coverUrl);

  // Time display
  const { timeStr, dayStr, fullTimeStr, lunarStr } = useIslandTimeStrings();

  // Settings synchronization
  useIslandSettingsSync();

  // Auto-dimming
  useIslandAutoDim();

  // State bridges (auto-transitions)
  useIslandStateBridges();

  // Hover interaction
  useIslandHoverInteraction();

  return {
    shellClassName, shellStyle, handleIslandClick,
    timeStr, dayStr, fullTimeStr, lunarStr,
  };
}
```

**Hook Responsibilities:**

| Hook | Responsibility |
|------|---------------|
| `useDynamicIslandShell` | Morphing state machine, click behavior, glow effect |
| `useIslandNowPlayingSync` | SMTC media info synchronization |
| `useIslandDominantColor` | Extract dominant color from album art |
| `useIslandTimeStrings` | Formatted time/date/lunar strings |
| `useIslandTimerAndAlarm` | Timer countdown and alarm logic |
| `useIslandSettingsSync` | IPC settings change listener |
| `useIslandAutoDim` | Auto-dimming after idle period |
| `useIslandStateBridges` | Auto-transitions (e.g., lyrics when music plays) |
| `useIslandHoverInteraction` | Mouse enter/leave with debounced timers |
| `useIslandShellPresentation` | CSS class/style computation |

### State-Based Component Rendering

Components are rendered based on the current island state (see [State Machine](states.md) for the full state definitions):

```tsx
function DynamicIsland() {
  const coordinator = useDynamicIslandCoordinator();

  return (
    <div className={coordinator.shellClassName} style={coordinator.shellStyle}
         onClick={coordinator.handleIslandClick}>
      {state === 'idle' && <IdleState />}
      {state === 'hover' && <HoverState />}
      {state === 'notification' && <NotificationState />}
      {state === 'expanded' && <ExpandedState />}
      {state === 'maxExpand' && <MaxExpandState />}
      {state === 'lyrics' && <LyricsState />}
      {state === 'login' && <LoginState />}
      {state === 'register' && <RegisterState />}
      {state === 'agent' && <AgentState />}
      {state === 'agentVoiceInput' && <AgentVoiceInputState />}
      {state === 'cli' && <CliState />}
      {/* ... other states */}
    </div>
  );
}
```

### State Management

:::info
The application uses **Zustand** with a **slice composition pattern** for global state management. Seven domain-specific slices are composed into a single store.
:::

```ts
import { create } from 'zustand';
import type { IIslandStore } from '../types';

const useIslandStore = create<IIslandStore>()((set, get, store) => ({
  ...createIslandSlice(set, get, store),
  ...createWeatherSlice(set, get, store),
  ...createTimerSlice(set, get, store),
  ...createNotificationSlice(set, get, store),
  ...createMediaSlice(set, get, store),
  ...createAiSlice(set, get, store),
  ...createPomodoroSlice(set, get, store),
}));
```

**Store Slices:**

| Slice | State Managed |
|-------|---------------|
| `IslandSlice` | Island state machine, UI state |
| `WeatherSlice` | Weather data and location |
| `TimerSlice` | Timers and alarms |
| `NotificationSlice` | Notification queue |
| `MediaSlice` | Music playback, now playing |
| `AiSlice` | AI chat sessions, configuration |
| `PomodoroSlice` | Pomodoro timer state |

### HTML Entry Points

:::warning
The renderer supports multiple HTML entry points for different visual contexts:
:::

| Entry | File | Purpose |
|-------|------|---------|
| **Main Island** | `index.html` | Primary dynamic island window |
| **Standalone Widget** | `standalone.html` | Independent widget window |
| **Splash Screen** | `splash.html` | Startup video playback window |
| **AI Background** | `AIbackground.html` | AI assistant background effects |

## Data Flow

### Request-Response Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Renderer   │         │   Preload    │         │    Main      │
│              │         │   Bridge     │         │   Process    │
│ window.api   │────────►│ ipcRenderer  │────────►│ ipcMain      │
│ .invoke()    │         │ .invoke()    │         │ .handle()    │
│              │         │              │         │              │
│ ◄────────────│◄────────│ ◄────────────│◄────────│ return       │
│ Promise      │         │ Promise      │         │ result       │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Event Subscription Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Renderer   │         │   Preload    │         │    Main      │
│              │         │   Bridge     │         │   Process    │
│ window.api   │────────►│ ipcRenderer  │         │              │
│ .onXxx()     │         │ .on()        │         │              │
│              │         │              │         │ webContents  │
│ callback()   │◄────────│ ◄────────────│◄────────│ .send()      │
│              │         │ handler      │         │              │
│ unsubscribe  │────────►│ remove       │         │              │
│              │         │ Listener     │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Fire-and-Forget Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Renderer   │         │   Preload    │         │    Main      │
│              │         │   Bridge     │         │   Process    │
│ window.api   │────────►│ ipcRenderer  │────────►│ ipcMain      │
│ .send()      │         │ .send()      │         │ .on()        │
│              │         │              │         │              │
│ (no response)│         │ (no response)│         │ execute      │
└──────────────┘         └──────────────┘         └──────────────┘
```

## Build Configuration

:::info
The project uses **electron-vite** to configure three separate build targets with a single configuration file.
:::

```ts
// electron.vite.config.ts
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: 'src/main/index.ts', smtcWorker: 'src/main/smtcWorker.ts' },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: { index: 'index.html', standalone: 'standalone.html', splash: 'splash.html', AIbackground: 'AIbackground.html' },
      },
    },
  },
});
```

**Build Targets:**

| Target | Entry | Output | Description |
|--------|-------|--------|-------------|
| **main** | `src/main/index.ts`, `src/main/smtcWorker.ts` | `out/main` | Node.js main process with SMTC worker |
| **preload** | `src/preload/index.ts` | `out/preload` | Context bridge between main and renderer |
| **renderer** | `src/renderer/html/DynamicIsland{Index,Standalone,Splash,Aibackground,Guide}.html` | `out/renderer/html` | Chromium renderer with 5 HTML entry points; assets in `out/renderer/assets` |

**Key Features:**
- **externalizeDepsPlugin**: Excludes Node.js dependencies from main/preload bundles
- **@vitejs/plugin-react**: React Fast Refresh for development
- **@tailwindcss/vite**: Tailwind CSS v4 integration (no separate config file)
- **Multiple HTML entries**: Supports main island window, standalone widget, splash screen, and AI background

## SMTC Worker

:::tip
A dedicated **SMTC (System Media Transport Controls) Worker** runs as a separate entry point in the Main Process for media synchronization.
:::

```ts
// main: {
//   rollupOptions: {
//     input: { index: 'src/main/index.ts', smtcWorker: 'src/main/smtcWorker.ts' },
//   },
// },
```

**Purpose:**
- Runs in a separate thread
- Handles SMTC events from Windows
- Reports media info to main process
- Prevents main thread blocking

## Performance Optimizations

### Window Management

- **Mouse passthrough**: Idle states use `setIgnoreMouseEvents(true)` to reduce event processing
- **Instant resize**: Larger-to-smaller transitions skip animation to avoid visual glitches
- **Debounced hover**: Mouse enter/leave uses debounced timers to prevent rapid state changes

### State Management

- **Conditional transitions**: Guard logic prevents unnecessary re-renders
- **Deferred persistence**: AI slice defers localStorage writes during streaming
- **Cross-tab sync**: Storage events synchronize config across windows

### Build Optimization

- **Code splitting**: Multiple HTML entries enable lazy loading
- **External dependencies**: Main/preload bundles exclude Node.js modules
- **Tree shaking**: Vite eliminates unused exports
- **GPU rasterization**: Chromium flags enable hardware acceleration
