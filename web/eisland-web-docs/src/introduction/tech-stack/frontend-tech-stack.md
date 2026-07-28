---
title: Frontend Tech Stack
icon: layer-group
---

# Frontend Tech Stack

:::info
This document provides an overview of the frontend technologies used in the eIsland application.
:::

## Core Framework

### Electron + React + TypeScript

The eIsland frontend is built with **Electron** as the desktop shell, **React 19** for the UI layer, and **TypeScript** for type safety. The application follows a multi-process architecture with strict separation between main process, preload bridge, and renderer process.

**Key Dependencies:**

| Category | Package | Purpose |
|----------|---------|---------|
| **Runtime** | `electron` | Desktop application shell |
| **UI Framework** | `react`, `react-dom` | Component-based UI |
| **Language** | `typescript` | Static type checking |
| **Build** | `electron-vite`, `vite` | Build toolchain |
| **State** | `zustand` | Global state management |
| **Styling** | `tailwindcss` | Utility-first CSS |
| **Animation** | `gsap`, `@gsap/react` | Programmatic animations |
| **i18n** | `i18next`, `react-i18next` | Internationalization |
| **Icons** | `lucide-react` | Icon library |
| **Charts** | `highcharts`, `highcharts-react-official` | Data visualization |
| **Markdown** | `react-markdown`, `remark-gfm`, `dompurify` | Markdown rendering |
| **Testing** | `vitest`, `@testing-library/jest-dom` | Unit testing |

## Build System

### Electron-Vite

The project uses **electron-vite** to configure three separate build targets with a single configuration file:

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
| **renderer** | `index.html`, `standalone.html`, `splash.html`, `AIbackground.html` | `out/renderer` | Chromium renderer with 4 HTML entry points |

**Key Features:**
- **externalizeDepsPlugin**: Excludes Node.js dependencies from main/preload bundles
- **@vitejs/plugin-react**: React Fast Refresh for development
- **@tailwindcss/vite**: Tailwind CSS v4 integration (no separate config file)
- **Multiple HTML entries**: Supports main island window, standalone widget, splash screen, and AI background

## Electron Architecture

### Main Process

The main process manages application lifecycle, window creation, and system-level operations. It is structured around **service factories** and **modular IPC handler registration**.

#### Service Factory Pattern

Services are created via factory functions with dependency injection through getter/setter options:

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

#### IPC Handler Registration

Each domain has its own `register*Handlers()` function that receives a configuration object:

```ts
// Example: Clipboard domain
registerClipboardHandlers({ getMainWindow });

// Example: Media domain
registerMediaHandlers({ getMainWindow, getNowPlayingInfo });

// Example: Hotkey domain
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

#### Transparent Window Architecture

:::warning
The application uses multiple transparent, frameless, always-on-top windows. These windows require special Electron configuration with sandbox disabled to support native module loading.
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
    sandbox: false,
  },
});
```

**Window Types:**

| Window | Properties | Purpose |
|--------|------------|---------|
| **Main Island** | `transparent`, `frameless`, `alwaysOnTop` | Primary dynamic island UI |
| **Agent Voice Input** | `fullscreen`, `transparent`, `setIgnoreMouseEvents(true)` | Voice input overlay |
| **CLI Glow Overlay** | `transparent`, `alwaysOnTop` | CLI terminal glow effect |

#### Custom Protocol

A custom `eisland-media://` protocol safely serves local wallpaper media files:

```ts
protocol.registerFileProtocol('eisland-media', (request, callback) => {
  const url = request.url.replace('eisland-media://', '');
  const filePath = join(app.getPath('userData'), 'wallpapers', url);
  // Path sandboxing: only serve files from userData/wallpapers
  callback({ path: filePath });
});
```

#### Chromium Performance Flags

Applied before `app.whenReady()`:

```ts
function applyChromiumPerformanceFlags(app: Electron.App) {
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
  app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
}
```

#### Auto-Updater

Uses `electron-updater` with startup auto-check:

```ts
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', info);
});
```

### Preload Bridge

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

**IPC Patterns:**

| Pattern | Method | Use Case |
|---------|--------|----------|
| **Fire-and-forget** | `ipcRenderer.send()` | Window control, one-way notifications |
| **Request-response** | `ipcRenderer.invoke()` | Data queries, operations with return values |
| **Event subscription** | `ipcRenderer.on()` + unsubscribe | Real-time updates, state changes |

## React Patterns

### Coordinator Hook Pattern

:::tip
The island UI is orchestrated by a single **coordinator hook** (`useDynamicIslandCoordinator`) that composes approximately 16 specialized hooks, each managing one concern:
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

  // Timer and alarms
  const { timerState, alarmState } = useIslandTimerAndAlarm();

  // Settings synchronization
  useIslandSettingsSync();

  // Auto-dimming
  useIslandAutoDim();

  // State bridges (auto-transitions)
  useIslandStateBridges();

  // Escape navigation
  useIslandEscapeNavigation();

  // Startup announcements
  useIslandStartupAnnouncements();

  // Background video
  const { bgVideoElementRef, bgVideoHwDecode } = useIslandBackgroundVideoSync();

  // Notification subscriptions
  useIslandNotificationSubscriptions();

  // Hover interaction
  useIslandHoverInteraction();

  // CSS presentation
  const { shellClassName, shellStyle } = useIslandShellPresentation();

  // Runtime refs for cross-hook communication
  const runtimeRefs = useIslandRuntimeRefs();

  // Background media controller
  useIslandBackgroundMediaController();

  // Claude CLI session status
  useClaudeCliSessionStatus();

  return {
    shellClassName, shellStyle, handleIslandClick,
    timeStr, dayStr, fullTimeStr, lunarStr,
    bgMedia, bgVideoElementRef, bgVideoHwDecode,
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
| `useIslandBreakReminder` | Periodic break reminders |
| `useIslandSettingsSync` | IPC settings change listener |
| `useIslandAutoDim` | Auto-dimming after idle period |
| `useIslandStateBridges` | Auto-transitions (e.g., lyrics when music plays) |
| `useIslandEscapeNavigation` | Escape key navigation |
| `useIslandStartupAnnouncements` | First-run guide and update announcements |
| `useIslandBackgroundVideoSync` | Background video playback sync |
| `useIslandNotificationSubscriptions` | IPC notification listeners |
| `useIslandHoverInteraction` | Mouse enter/leave with debounced timers |
| `useIslandShellPresentation` | CSS class/style computation |
| `useIslandRuntimeRefs` | Mutable refs for cross-hook communication |
| `useIslandBackgroundMediaController` | Wallpaper media state management |
| `useClaudeCliSessionStatus` | Claude Code CLI session tracking |

### State-Based Component Rendering

Components are rendered based on the current island state:

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
      {state === 'lyricsTranslation' && <LyricsTranslationState />}
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

## Claude Code & Codex CLI Integration

:::info
eIsland integrates with **Claude Code** and **Codex** CLI tools to provide real-time session monitoring directly within the island. The integration uses a hook-based architecture that detects new sessions, streams events, and surfaces permission requests without leaving the desktop.
:::

### Dual-Provider Architecture

The CLI subsystem supports two providers through a unified `CliProvider` type:

```ts
type CliProvider = 'claude' | 'codex';
```

Each provider has its own IPC channels, but the renderer uses a shared abstraction layer (`useCliStatus` hook) that routes to the correct API based on the active provider:

```ts
const apiFor = (provider: CliProvider) => provider === 'codex'
  ? {
      get: window.api.codexStatusGet,
      enable: window.api.codexMonitorEnable,
      disable: window.api.codexMonitorDisable,
      subscribe: window.api.onCodexStatusUpdated,
    }
  : {
      get: window.api.claudeCodeStatusGet,
      enable: window.api.claudeCodeHookInstall,
      disable: window.api.claudeCodeHookUninstall,
      subscribe: window.api.onClaudeCodeStatusUpdated,
    };
```

:::tip
The provider selection is persisted to localStorage and restored on app restart. When a new session is detected for the inactive provider, the system auto-switches and shows a notification.
:::

### Session Detection

The `useClaudeCliSessionStatus` hook runs at the coordinator level and monitors both providers simultaneously. It uses **ref-based tracking** to avoid triggering re-renders:

```ts
export function useClaudeCliSessionStatus(): {
  hasActiveSessionRef: React.MutableRefObject<boolean>;
} {
  const trackersRef = useRef<Record<CliProvider, ProviderTracker>>({
    claude: createProviderTracker(),
    codex: createProviderTracker(),
  });

  useEffect(() => {
    // Subscribe to both providers
    const unsubscribeClaude = window.api?.onClaudeCodeStatusUpdated?.(applyClaudeSnapshot);
    const unsubscribeCodex = window.api?.onCodexStatusUpdated?.(applyCodexSnapshot);

    return () => { unsubscribeClaude?.(); unsubscribeCodex?.(); };
  }, []);
}
```

**Detection Logic:**

| Signal | Action |
|--------|--------|
| New session ID not in tracker | Play notification sound, show glow, fire notification |
| New `sessionStart` event | Same as new session |
| New pending permission ID | Auto-transition to `cli` state with sound |
| Session phase changes to `completed` | Mark provider as inactive (if no other active sessions) |

### IPC Channel Map

| Channel | Direction | Provider | Description |
|---------|-----------|----------|-------------|
| `claudeCodeStatusGet` | Renderer → Main | Claude | Fetch current status snapshot |
| `codexStatusGet` | Renderer → Main | Codex | Fetch current status snapshot |
| `onClaudeCodeStatusUpdated` | Main → Renderer | Claude | Real-time status subscription |
| `onCodexStatusUpdated` | Main → Renderer | Codex | Real-time status subscription |
| `claudeCodePermissionResolve` | Renderer → Main | Claude | Resolve permission (deny/allow/always) |
| `claudeCodeHookInstall` | Renderer → Main | Claude | Install CLI hook script |
| `claudeCodeHookUninstall` | Renderer → Main | Claude | Uninstall CLI hook script |
| `codexMonitorEnable` | Renderer → Main | Codex | Enable Codex monitoring |
| `codexMonitorDisable` | Renderer → Main | Codex | Disable Codex monitoring |
| `cliGlowShow` | Renderer → Main | Both | Show fullscreen glow overlay |

### Status Snapshot Structure

Both providers return the same snapshot shape:

```ts
interface CliStatusSnapshot {
  enabled: boolean;              // Whether monitoring is active
  receiverRunning: boolean;      // Backend receiver status
  receiverUrl: string | null;    // Receiver endpoint URL
  settingsPath: string;          // Hook script config path
  hookScriptPath: string;        // Hook script location
  sessions: CliSessionSnapshot[];// Active and completed sessions
  events: CliHookEvent[];        // Recent events (newest first)
  heatmap: Record<string, { session: number; tool: number; prompt: number }>;
  updatedAt: number;             // Last update timestamp
}
```

### Session Lifecycle

A CLI session progresses through four phases:

| Phase | Description | Island Behavior |
|-------|-------------|-----------------|
| `idle` | Session created, no activity | Show in session list |
| `running` | Actively processing | Stream events, update heatmap |
| `waiting_permission` | Blocked on tool approval | Auto-transition to `cli` state, show permission buttons |
| `completed` | Session finished | Filtered from active list, data retained for heatmap |

:::important
Permission handling is Claude-only. Codex sessions auto-approve tool calls. The island displays three permission buttons for Claude: **Deny**, **Allow**, and **Always Allow** — each maps to a `claudeCodePermissionResolve` IPC call.
:::

### Component Layers

The CLI integration has two visual layers:

| Layer | State | Dimensions | Components |
|-------|-------|------------|------------|
| **Island compact** | `cli` | 500×88 px | `CliContent` — provider icon, session title, phase badge, event summary, permission buttons |
| **Full panel** | `maxExpand` (tab: `cli`) | 860×400 px | `CliTab` — session sidebar, event stream, activity heatmap, monitor controls |

:::note
For the full CLI architecture, module structure, and hook details, see [CLI State & Codex Support](../frontend-arch/cli.md).
:::

## State Management

### Zustand Store Architecture

:::info
The application uses **Zustand** with a **slice composition pattern** for global state management. Seven domain-specific slices are composed into a single store:
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

**Store Type (Intersection):**

```ts
export type IIslandStore = IslandSlice & WeatherSlice & TimerSlice &
                           MediaSlice & AiSlice & PomodoroSlice;
```

### Slice Pattern

Each slice is a `StateCreator` typed function that receives `set`, `get`, and `store`:

```ts
import type { StateCreator } from 'zustand';

export const createIslandSlice: StateCreator<IslandSlice, [], [], IslandSlice> = (set, get) => ({
  state: 'idle',
  uiStateLocked: false,
  authReturnState: null,

  setIdle: (force?: boolean) => set((prev) => {
    // Guard: check if UI state is locked
    if (prev.uiStateLocked && prev.state !== 'idle') return prev;

    // Guard: certain states block non-forced idle transitions
    if (!force && (prev.state === 'expanded' || prev.state === 'maxExpand' ||
                   prev.state === 'guide' || prev.state === 'login' ||
                   prev.state === 'register' || prev.state === 'payment' ||
                   prev.state === 'announcement')) {
      return prev;
    }

    // Side effect: call Electron IPC
    window.api?.collapseWindow();
    window.api?.enableMousePassthrough();

    return { state: 'idle' as const, authReturnState: null };
  }),

  setExpanded: () => set({ state: 'expanded' }),

  enterAuth: (targetState: IslandState) => set((prev) => ({
    state: targetState,
    authReturnState: prev.state,  // Save current state for return
  })),

  returnFromAuth: () => set((prev) => ({
    state: prev.authReturnState || 'idle',
    authReturnState: null,
  })),
});
```

**Key Patterns:**

| Pattern | Description |
|---------|-------------|
| **Side effects in set()** | State transitions trigger Electron IPC calls directly within the updater |
| **Conditional transitions** | Guard logic prevents invalid state changes |
| **Auth return state** | Saves current state before entering auth flows, restores on return |
| **Type assertions** | `as const` ensures literal type narrowing |

### AI Slice (Persistence Pattern)

The AI slice demonstrates localStorage persistence with robust normalization:

```ts
const AI_CONFIG_KEY = 'eIsland_aiConfig';

function loadAiConfig(): AiConfig {
  const defaults: AiConfig = {
    apiKey: '',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4',
    // ... other defaults
  };

  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiConfig>;
      // Defensive normalization: merge with defaults
      const merged = { ...defaults, ...parsed };
      // Validate each field type
      if (typeof merged.apiKey !== 'string') merged.apiKey = defaults.apiKey;
      if (typeof merged.endpoint !== 'string') merged.endpoint = defaults.endpoint;
      return merged;
    }
  } catch {
    // Ignore parse errors, return defaults
  }
  return defaults;
}
```

**Persistence Features:**

- **Cross-tab sync**: Listens to `window.addEventListener('storage', ...)` for config changes in other tabs
- **Deferred writes during streaming**: `if (!get().aiChatStreaming) saveAiChatSessions(...)` prevents excessive writes
- **Deep normalization**: Nested structures (messages, tool calls, chat sessions) are defensively parsed
- **Default fallbacks**: Every field has a default value if parsing fails

### Store Utilities

Utility functions for localStorage operations with try/catch wrappers:

```ts
// store/utils/storage.ts
export function loadNetworkConfig(): NetworkConfig {
  try {
    const raw = localStorage.getItem('eIsland_networkConfig');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { proxy: '', timeout: 30000 };
}

export function saveNetworkConfig(config: NetworkConfig): void {
  try {
    localStorage.setItem('eIsland_networkConfig', JSON.stringify(config));
  } catch { /* ignore */ }
}
```

## Island State Machine

### State Configuration

The island has **20 distinct states**, each with defined pixel dimensions and behavior rules:

#### State Areas (Width × Height)

```ts
export const STATE_AREA: Record<string, number> = {
  idle: 260 * 42,           // 10,920 px²
  hover: 500 * 60,          // 30,000 px²
  notification: 500 * 88,   // 44,000 px²
  expanded: 860 * 150,      // 129,000 px²
  maxExpand: 860 * 400,     // 344,000 px²
  lyrics: 500 * 42,         // 21,000 px²
  lyricsTranslation: 500 * 60, // 30,000 px²
  minimal: 260 * 42,        // 10,920 px²
  agent: 500 * 88,          // 44,000 px²
  agentVoiceInput: 500 * 88,// 44,000 px²
  login: 500 * 88,          // 44,000 px²
  register: 500 * 88,       // 44,000 px²
  resetPassword: 500 * 88,  // 44,000 px²
  payment: 500 * 88,        // 44,000 px²
  guide: 860 * 400,         // 344,000 px²
  announcement: 860 * 400,  // 344,000 px²
  stt: 500 * 88,            // 44,000 px²
  cli: 500 * 88,            // 44,000 px²
};
```

#### State Behavior Configuration

```ts
export const STATE_CONFIGS: Record<IslandState, StateConfig> = {
  idle:         { mousePassthrough: true,  expanded: false, enterDelay: 0,   leaveDelay: 0   },
  hover:        { mousePassthrough: false, expanded: true,  enterDelay: 60,  leaveDelay: 80  },
  lyrics:       { mousePassthrough: true,  expanded: true,  enterDelay: 50,  leaveDelay: 0   },
  lyricsTranslation:{ mousePassthrough: true,  expanded: true,  enterDelay: 50,  leaveDelay: 0   },
  notification: { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  expanded:     { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  maxExpand:    { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  minimal:      { mousePassthrough: true,  expanded: false, enterDelay: 0,   leaveDelay: 0   },
  agent:        { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  agentVoiceInput: { mousePassthrough: false, expanded: true, enterDelay: 0, leaveDelay: 0   },
  login:        { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  register:     { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  resetPassword:{ mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  payment:      { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  guide:        { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  announcement: { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  stt:          { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  cli:          { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
};
```

**Configuration Properties:**

| Property | Description |
|----------|-------------|
| `mousePassthrough` | Whether mouse events pass through to underlying windows |
| `expanded` | Whether the island is in expanded visual state |
| `enterDelay` | Delay (ms) before entering the state |
| `leaveDelay` | Delay (ms) before leaving the state |

### Morphing Animation System

State transitions are animated through CSS class-based morphing:

```ts
const MORPH_DURATION_BY_SPEED: Record<string, number> = {
  slow: 1100,    // 1.1 seconds
  medium: 550,   // 0.55 seconds
  fast: 280,     // 0.28 seconds
};

useEffect(() => {
  if (prevStateRef.current === state) return;

  // Set morphing state
  setFromState(prevStateRef.current);
  prevStateRef.current = state;
  setMorphing(true);

  // Clear morphing after duration
  const id = setTimeout(() => {
    setMorphing(false);
    setFromState('');
  }, MORPH_DURATION_BY_SPEED[animationSpeed] ?? 550);

  return () => clearTimeout(id);
}, [state, animationSpeed]);
```

#### CSS Class Composition

The shell presentation hook builds a composite CSS class name:

```ts
const shellClassName = [
  'island-shell',
  getStateClassName(state),
  morphing && 'morphing',
  fromState && `from-${fromState}`,
  instantResize && 'instant-resize',
  showGlow && 'music-glow',
  showGlow === 'paused' && 'music-paused',
  springAnimation && 'spring-animation',
  `speed-${animationSpeed}`,
].filter(Boolean).join(' ');
```

**CSS Classes:**

| Class | Purpose |
|-------|---------|
| `island-shell` | Base shell styles |
| `{state}` | State-specific dimensions and layout |
| `morphing` | Active morphing animation |
| `from-{state}` | Origin state for morph direction |
| `instant-resize` | Skip animation for size reduction |
| `music-glow` | Music-reactive glow effect |
| `music-paused` | Paused music glow state |
| `spring-animation` | Spring physics animation |
| `speed-{slow\|medium\|fast}` | Animation speed modifier |

#### Instant Resize Optimization

When morphing from a larger state to a smaller one, an instant resize is applied to avoid visual glitches:

```ts
const instantResize = morphing && STATE_AREA[fromState] > STATE_AREA[state];
```

### Click Navigation Flow

State-dependent click handling implements a navigation hierarchy:

```ts
function handleIslandClick() {
  switch (state) {
    case 'idle':
      if (idleClickExpand) setHover();
      break;
    case 'hover':
      setExpanded();
      break;
    case 'expanded':
    case 'maxExpand':
    case 'announcement':
      if (isOnCliTab && hasActiveSession) setCli();
      else setHover();
      break;
    case 'login':
    case 'register':
    case 'payment':
      // Auth states handle their own navigation
      break;
    default:
      setIdle();
  }
}
```

## Animations

### GSAP Integration

**GSAP** (GreenSock Animation Platform) is used for programmatic animations where CSS transitions are insufficient. The project uses `@gsap/react` for React integration:

```ts
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

function EventRow({ event }: { event: CliEvent }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const card = cardRef.current;
    if (!card) return;

    gsap.fromTo(
      card,
      { autoAlpha: 0, y: 10, scale: 0.985 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.28,
        ease: 'power2.out',
      },
    );
  }, { scope: cardRef });

  return <div ref={cardRef}>{/* content */}</div>;
}
```

**GSAP Properties Used:**

| Property | Description |
|----------|-------------|
| `autoAlpha` | Combined opacity + visibility (GSAP-specific) |
| `y` | Transform translateY |
| `scale` | Transform scale |
| `duration` | Animation duration in seconds |
| `easing` | `power2.out` for smooth deceleration |

**Key Features:**
- **useGSAP hook**: Automatic cleanup and scoped selector queries
- **Scope option**: `{ scope: cardRef }` limits GSAP selectors to the ref's subtree
- **fromTo animation**: Defines explicit start and end states

### CSS-Driven Animations

Most island animations (morphing between states) are CSS-driven rather than GSAP-driven, using class-based transitions:

```css
.island-shell {
  transition: width 0.3s ease, height 0.3s ease, border-radius 0.3s ease;
}

.island-shell.morphing {
  transition: width var(--morph-duration) var(--morph-ease),
              height var(--morph-duration) var(--morph-ease);
}

.island-shell.instant-resize {
  transition: none;
}

.island-shell.spring-animation {
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

## Styling

### Tailwind CSS v4

The project uses **Tailwind CSS v4** with CSS-first configuration (no JavaScript config file):

```css
/* src/renderer/styles/reset/reset.css */
@import "tailwindcss";

@theme {
  --color-island-accent: oklch(0.7 0.15 250);
  --color-island-pill: oklch(0.65 0.12 250);
}
```

#### Theme System

Dark and light themes are implemented via CSS custom properties:

```css
:root {
  /* Dark theme (default) */
  --color-text-rgb: 255, 255, 255;
  --color-island-bg: #000000;
  --color-island-text: #ffffff;
  --icon-invert: 1;
}

[data-theme="light"] {
  /* Light theme */
  --color-text-rgb: 0, 0, 0;
  --color-island-bg: #f5f5f7;
  --color-island-text: #1d1d1f;
  --icon-invert: 0;
}
```

#### Transparent Background

For Electron's transparent window:

```css
html, body, #root {
  background: transparent;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
```

#### Tailwind v4 Features Used

| Feature | Description |
|---------|-------------|
| `@import "tailwindcss"` | CSS-first import (no `@tailwind` directives) |
| `@theme` directive | Theme variable definition in CSS |
| `oklch()` colors | Modern color space for consistent perception |
| CSS custom properties | Theme switching without JavaScript |
| `@tailwindcss/vite` plugin | Vite integration (no PostCSS config) |

## Internationalization

### i18next Configuration

The application uses **i18next** with **react-i18next** for internationalization:

```ts
// src/renderer/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from '../../../i18n/zh-CN.json';
import enUS from '../../../i18n/en-US.json';

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
```

**Supported Languages:**

| Locale | Language | Role |
|--------|----------|------|
| `zh-CN` | Chinese (Simplified) | Default / Fallback |
| `en-US` | English (US) | Secondary |

#### Language Detection

```ts
function getInitialLanguage(): string {
  // 1. Check localStorage for saved preference
  const saved = localStorage.getItem('i18n-language');
  if (saved && isValidLocale(saved)) return saved;

  // 2. Check browser language
  const browserLang = navigator.language;
  return normalizeLanguage(browserLang);
}

function normalizeLanguage(lang: string): string {
  if (lang.startsWith('zh')) return 'zh-CN';
  if (lang.startsWith('en')) return 'en-US';
  return 'zh-CN'; // Default fallback
}
```

#### Runtime Language Switching

```ts
export function setLanguage(lang: string): void {
  i18n.changeLanguage(lang);
  localStorage.setItem('i18n-language', lang);
}

// Cross-window synchronization via IPC
window.api.onSettingsChanged((settings) => {
  if (settings.i18n?.language) {
    i18n.changeLanguage(settings.i18n.language);
  }
});
```

#### Translation Usage

Components use the `useTranslation` hook:

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.appName')}</h1>
      <p>{t('guide.welcome', { defaultValue: 'Welcome to eIsland' })}</p>
    </div>
  );
}
```

#### Locale File Structure

```json
{
  "common": {
    "appName": "eIsland",
    "loading": "Loading...",
    "error": "Error occurred"
  },
  "standalone": {
    "timer": "Timer",
    "alarm": "Alarm"
  },
  "guide": {
    "welcome": "Welcome to eIsland",
    "getStarted": "Get Started"
  }
}
```

## Data Visualization

### Highcharts

**Highcharts** is used for data visualization with React integration:

```tsx
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

function UsageChart({ data }: { data: UsageData[] }) {
  const options: Highcharts.Options = {
    chart: { type: 'area', backgroundColor: 'transparent' },
    title: { text: 'AI Usage Over Time' },
    xAxis: { categories: data.map(d => d.date) },
    yAxis: { title: { text: 'Tokens' } },
    series: [{
      name: 'Input Tokens',
      data: data.map(d => d.inputTokens),
    }, {
      name: 'Output Tokens',
      data: data.map(d => d.outputTokens),
    }],
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}
```

## Markdown Rendering

### React Markdown with Sanitization

Markdown content is rendered with **react-markdown** and sanitized with **DOMPurify**:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

function MarkdownContent({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {sanitized}
    </ReactMarkdown>
  );
}
```

**Features:**
- **remark-gfm**: GitHub Flavored Markdown support (tables, strikethrough, task lists)
- **DOMPurify**: XSS prevention by sanitizing HTML input
- **Component overrides**: Custom renderers for code blocks, links, images

## Icon System

### Lucide React

**Lucide React** provides a consistent icon set:

```tsx
import { Sun, Moon, Play, Pause, Settings, User } from 'lucide-react';

function Controls() {
  return (
    <div>
      <Sun size={18} />
      <Moon size={18} />
      <Play size={18} />
      <Pause size={18} />
    </div>
  );
}
```

**Icon Properties:**

| Prop | Type | Description |
|------|------|-------------|
| `size` | `number` | Icon dimensions in pixels |
| `color` | `string` | Icon color |
| `strokeWidth` | `number` | Stroke width (default: 2) |
| `className` | `string` | CSS class for styling |

## Testing

:::danger
All frontend code changes must be verified through tests. The project contains **125 test files** with **2068 tests** covering main process, preload scripts, and renderer process.
:::

### Vitest Configuration

```ts
// vitest.config.ts
export default {
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
};
```

### Testing Patterns

The project has **125 test files** with **2068 tests** across main process, preload, and renderer. All tests use `.test.ts` (no component rendering tests).

#### Pattern 1: Slice Unit Testing

A custom mock store factory simulates Zustand's `set`/`get` without creating a real store:

```ts
function createSliceState<T>(
  creator: StateCreator<T, [], [], T>
): { getState: () => T } {
  let state = {} as T;
  const setState = (updater: T | ((prev: T) => T)) => {
    const patch = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...patch };
  };
  state = creator(setState, () => state, {} as never);
  return { getState: () => state };
}

// Test usage
it('transitions to expanded state', () => {
  const store = createSliceState(createIslandSlice);
  store.getState().setExpanded();
  expect(store.getState().state).toBe('expanded');
});
```

#### Pattern 2: Electron Module Mocking

Uses `vi.hoisted()` to create mocks before ES module hoisting:

```ts
const { registerMock, unregisterMock, appQuitMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  unregisterMock: vi.fn(),
  appQuitMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { quit: appQuitMock },
  globalShortcut: { register: registerMock, unregister: unregisterMock },
}));

it('registers global shortcut', () => {
  registerHotkey('CommandOrControl+Shift+A');
  expect(registerMock).toHaveBeenCalledWith('CommandOrControl+Shift+A', expect.any(Function));
});
```

#### Pattern 3: Preload Bridge Testing

Tests both context-isolated and non-isolated modes:

```ts
it('exposes api in isolated context', async () => {
  process.contextIsolated = true;
  vi.resetModules();
  await import('./index');
  expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith('api', expect.any(Object));
});

it('falls back to window assignment in non-isolated context', async () => {
  process.contextIsolated = false;
  vi.resetModules();
  await import('./index');
  expect(window.api).toBeDefined();
});
```

#### Pattern 4: Store Aggregation Testing

Mocks all slice creators and verifies composition:

```ts
it('composes all slices into single store', () => {
  const mockIslandSlice = { state: 'idle', setIdle: vi.fn() };
  const mockWeatherSlice = { weather: null, setWeather: vi.fn() };

  vi.mock('../slices/islandSlice', () => ({
    createIslandSlice: () => mockIslandSlice,
  }));
  vi.mock('../slices/weatherSlice', () => ({
    createWeatherSlice: () => mockWeatherSlice,
  }));

  const store = useIslandStore.getState();
  expect(store.state).toBe('idle');
  expect(store.weather).toBeNull();
});
```

#### Pattern 5: Pure Utility Testing

Simple input/output tests for utility functions:

```ts
describe('formatTime', () => {
  it('formats HH:mm with leading zeros', () => {
    expect(formatTime(new Date(2026, 0, 5, 7, 3, 9))).toBe('07:03');
  });

  it('handles midnight', () => {
    expect(formatTime(new Date(2026, 0, 5, 0, 0, 0))).toBe('00:00');
  });
});
```

### Test Coverage by Domain

| Domain | Test Files | Coverage |
|--------|------------|----------|
| **Main Process** | ~30 files | IPC handlers, services, utilities |
| **Preload** | ~5 files | Bridge exposure, context isolation |
| **Renderer Store** | ~20 files | All 7 slices, store aggregation |
| **Renderer Utils** | ~35 files | Pure functions, helpers, parsers |

## Performance Optimizations

:::tip
Key performance optimization strategies adopted by the eIsland frontend:
:::

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
