---
title: eisland State Machine
icon: diagram-project
---

# eIsland State Machine

:::info
The eIsland state machine is the core architecture that controls the island's appearance, behavior, and interactions. It manages **20 distinct states**, each with defined pixel dimensions, mouse behavior, and transition rules. The dimensions shown below are for **Notch** mode — see [Shape Modes](shape-modes.md) for **Pill** mode dimensions.
:::

## State Categories

### Primary States

| State | Description | Mouse Passthrough | Dimensions (W×H) |
|-------|-------------|-------------------|------------------|
| `idle` | Default resting state | Yes | 260×42 px |
| `minimal` | Compact display mode | Yes | 260×42 px |
| `hover` | Mouse interaction state | No | 500×60 px |
| `expanded` | Full dashboard view | No | 860×150 px |
| `maxExpand` | Maximum expansion | No | 860×400 px |

### Content States

| State | Description | Mouse Passthrough | Dimensions (W×H) |
|-------|-------------|-------------------|------------------|
| `lyrics` | Music lyrics display | Yes | 500×42 px |
| `lyricsTranslation` | Lyrics with translation | Yes | 500×60 px |
| `notification` | Alert and message display | No | 500×88 px |
| `announcement` | System announcements | No | 860×400 px |

### User Flow States

| State | Description | Mouse Passthrough | Dimensions (W×H) |
|-------|-------------|-------------------|------------------|
| `guide` | First-run tutorial | No | 860×400 px |
| `login` | Authentication screen | No | 860×400 px |
| `register` | Account creation | No | 860×400 px |
| `resetPassword` | Password recovery | No | 860×400 px |
| `setPassword` | OAuth new user password setup | No | 860×400 px |
| `bindOAuth` | Bind OAuth to existing account | No | 860×400 px |
| `bindEmail` | Bind email for OAuth (WeChat, KOOK) | No | 860×400 px |
| `payment` | Payment processing | No | 860×400 px |

### AI & Input States

| State | Description | Mouse Passthrough | Dimensions (W×H) |
|-------|-------------|-------------------|------------------|
| `agent` | AI assistant mode | No | 500×88 px |
| `agentVoiceInput` | Voice command mode | No | 500×88 px |
| `stt` | Speech-to-text | No | 500×88 px |
| `cli` | Claude Code / Codex session monitor | No | 500×88 px |

## State Configuration

:::tip
Each state defines four key properties that control its behavior:
:::

| Property | Type | Description |
|----------|------|-------------|
| `mousePassthrough` | `boolean` | Whether mouse events pass through to underlying windows |
| `expanded` | `boolean` | Whether the island is in expanded visual state |
| `enterDelay` | `number` | Delay (ms) before entering the state |
| `leaveDelay` | `number` | Delay (ms) before leaving the state |

### Configuration Matrix

```ts
export const STATE_CONFIGS: Record<IslandState, StateConfig> = {
  idle:           { mousePassthrough: true,  expanded: false, enterDelay: 0,   leaveDelay: 0   },
  hover:          { mousePassthrough: false, expanded: true,  enterDelay: 60,  leaveDelay: 80  },
  lyrics:         { mousePassthrough: true,  expanded: true,  enterDelay: 50,  leaveDelay: 0   },
  lyricsTranslation:{ mousePassthrough: true,  expanded: true,  enterDelay: 50,  leaveDelay: 0   },
  notification:   { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  expanded:       { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  maxExpand:      { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  minimal:        { mousePassthrough: true,  expanded: false, enterDelay: 0,   leaveDelay: 0   },
  agent:          { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  agentVoiceInput:{ mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  login:          { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  register:       { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  resetPassword:  { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  setPassword:    { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  bindOAuth:      { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  bindEmail:      { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  payment:        { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  guide:          { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  announcement:   { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  stt:            { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
  cli:            { mousePassthrough: false, expanded: true,  enterDelay: 0,   leaveDelay: 0   },
};
```

## State Areas

:::info
State areas define the pixel footprint (Width × Height) for each state, used for layout calculations and transition animations.
:::

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
  login: 860 * 400,         // 344,000 px²
  register: 860 * 400,      // 344,000 px²
  resetPassword: 860 * 400, // 344,000 px²
  setPassword: 860 * 400,   // 344,000 px²
  bindOAuth: 860 * 400,     // 344,000 px²
  bindEmail: 860 * 400,     // 344,000 px²
  payment: 860 * 400,       // 344,000 px²
  guide: 860 * 400,         // 344,000 px²
  announcement: 860 * 400,  // 344,000 px²
  stt: 500 * 88,            // 44,000 px²
  cli: 500 * 88,            // 44,000 px²
};
```

## State Transitions

:::warning
State transitions are triggered by user interactions, system events, and application logic. The state machine enforces guards to prevent invalid transitions.
:::

### Click Navigation Flow

The island implements a hierarchical click navigation system:

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
    case 'lyrics':
    case 'lyricsTranslation':
      // Lyrics states use mouse pass-through, no click handling
      break;
    default:
      setIdle();
  }
}
```

### Transition Rules

| From State | Trigger | To State | Condition |
|------------|---------|----------|-----------|
| `idle` | Click | `hover` | `idleClickExpand` enabled |
| `hover` | Click | `expanded` | Always |
| `expanded` | Click | `hover` | Default |
| `expanded` | Click | `cli` | On CLI tab with active session |
| `maxExpand` | Click | `hover` | Default |
| `maxExpand` | Click | `cli` | On CLI tab with active session |
| `announcement` | Click | `hover` | Default |
| `announcement` | Click | `cli` | On CLI tab with active session |
| `login` | Click | — | Self-handled |
| `register` | Click | — | Self-handled |
| `payment` | Click | — | Self-handled |
| Any other | Click | `idle` | Default fallback |

### Auto-Transitions

:::tip
The state machine includes automatic transitions triggered by system events:
:::

| Trigger | From | To | Description |
|---------|------|----|-------------|
| Music plays | `idle` | `lyrics` | Auto-show lyrics when music starts |
| Music plays (with translation) | `idle` | `lyricsTranslation` | Auto-show lyrics with translation |
| Translation loaded | `lyrics` | `lyricsTranslation` | Upgrade when translation becomes available |
| Translation lost | `lyricsTranslation` | `lyrics` | Downgrade when translation unavailable |
| Music stops | `lyrics` / `lyricsTranslation` | `idle` | Return to idle when music stops |
| Notification arrives | Any | `notification` | Show notification overlay |
| Mouse hover | `idle` | `hover` | Expand on mouse enter |
| Mouse leave | `hover` | `idle` | Collapse on mouse leave (with delay) |
| Voice input | `idle` | `agentVoiceInput` | Activate voice recognition |
| CLI session | `expanded` | `cli` | Open terminal if session active |

## Animation System

:::info
State transitions are animated through a morphing animation system with configurable speeds.
:::

### Animation Speeds

| Speed | Duration | Use Case |
|-------|----------|----------|
| `slow` | 1100ms | Dramatic transitions, first-run guide |
| `medium` | 550ms | Standard interactions |
| `fast` | 280ms | Quick responses, frequent transitions |

### Morphing Implementation

```ts
const MORPH_DURATION_BY_SPEED: Record<string, number> = {
  slow: 1100,
  medium: 550,
  fast: 280,
};

useEffect(() => {
  if (prevStateRef.current === state) return;

  setFromState(prevStateRef.current);
  prevStateRef.current = state;
  setMorphing(true);

  const id = setTimeout(() => {
    setMorphing(false);
    setFromState('');
  }, MORPH_DURATION_BY_SPEED[animationSpeed] ?? 550);

  return () => clearTimeout(id);
}, [state, animationSpeed]);
```

### CSS Class Composition

The shell builds a composite CSS class name for styling:

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

### Instant Resize Optimization

:::warning
When morphing from a larger state to a smaller one, an instant resize is applied to avoid visual glitches:
:::

```ts
const instantResize = morphing && STATE_AREA[fromState] > STATE_AREA[state];
```

## State-Specific Behaviors

### idle

:::info
The `idle` state is the default resting state when no user interaction occurs. It serves as the entry point for most state transitions.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 260×42 px |
| **Mouse** | Pass-through |
| **Expanded** | No |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- Application startup
- User clicks outside the island
- Escape key pressed from any state
- Auth flow completion (returns to saved state)
- Music stops (from `lyrics` state)

**Exit Conditions:**
- Mouse hover enters island area → `hover`
- Notification arrives → `notification`
- Music playback starts → `lyrics`
- Voice input activated → `agentVoiceInput`

**UI Components Rendered:**
- Minimal time display
- Status indicators (if configured)
- Music visualization glow (when playing)

**Behavior Details:**
- Mouse events pass through to underlying windows
- Minimal visual footprint, nearly invisible
- Auto-dimming after configurable idle period
- Supports click-to-expand (if `idleClickExpand` enabled)

---

### hover

:::info
The `hover` state provides quick information preview on mouse hover, serving as a bridge between idle and expanded states. It uses a **tab-based architecture** with three navigable pages: Time, Lyrics, and Weather.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 500×60 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 60ms |
| **Leave Delay** | 80ms |

**Entry Conditions:**
- Mouse enters island area from `idle` state
- Click on `idle` state (if `idleClickExpand` enabled)
- Return from `expanded`/`maxExpand` on click

**Exit Conditions:**
- Mouse leaves island area → `idle` (after 80ms delay)
- Click on island → `expanded`
- Timeout → `idle` (if configured)

#### Tab Navigation

The hover state contains four navigation dots at the top. Three switch between tab pages; the fourth triggers expansion.

| Tab | Page | Description |
|-----|------|-------------|
| `time` | TimeTab | Time display, lunar calendar, countdown timer, hide/quit buttons |
| `lyrics` | LyricsTab | Music playback controls, album art, artist info, canvas wave animation |
| `weather` | WeatherTab | Current weather, 2-day forecast, click-to-refresh |
| `expand` | — | Triggers transition to `expanded` state |

:::tip
Users can switch tabs by scrolling the mouse wheel while hovering over the island. The scroll direction cycles through the tab list in order.
:::

#### Module Structure

:::details hover module file tree
```
hover/
├── index.ts                          # Module entry point
├── types/index.ts                    # Shared type definitions (HoverContentProps, ActionButtonsProps, etc.)
├── config/hoverConfig.ts             # Navigation dots configuration
├── hooks/useHover.ts                 # Tab switching, wheel navigation, scroll logic
├── components/
│   ├── HoverContent.tsx              # Top-level component, wires hook to form
│   └── HoverForm.tsx                 # Tab layout, nav dots, tab content switching
├── utils/
│   ├── ActionButtons.tsx             # Hide island / Quit app buttons
│   ├── CountdownEdit.tsx             # Editable countdown timer
│   └── ToolButtons.tsx              # Screenshot / Task Manager buttons
└── pages/
    ├── time/                         # Time tab module
    │   ├── index.ts
    │   ├── types/timeTabTypes.ts
    │   └── components/TimeTab.tsx
    ├── lyric/                        # Lyrics tab module
    │   ├── index.ts
    │   ├── types/silkyWaveTypes.ts
    │   ├── config/silkyWaveConfig.ts
    │   ├── hooks/useSilkyWave.ts
    │   ├── utils/lyricUtils.ts
    │   └── components/
    │       ├── LyricsTab.tsx
    │       └── SilkyWave.tsx
    └── weather/                      # Weather tab module
        ├── index.ts
        ├── config/weatherConfig.ts
        ├── utils/weatherUtils.ts
        └── components/WeatherTab.tsx
```
:::

#### Page Details

**Time Tab** — The default tab on hover entry. Displays the current time and lunar calendar date. Includes an inline countdown timer (scroll wheel to edit digits) and action buttons for hiding the island or quitting the app.

**Lyrics Tab** — Shown when music is playing. Displays the album cover as a vinyl disc, song title, artist name, and playback controls (prev/play-pause/next). A canvas-based `SilkyWave` component renders a multi-layer sinusoidal wave animation that reacts to the playback state.

**Weather Tab** — Displays the current temperature, weather description, and location. Shows a 2-day forecast with icons, precipitation probability, and wind speed. Clicking the weather icon triggers a refresh.

**Behavior Details:**
- 60ms enter delay prevents accidental activation
- 80ms leave delay prevents flicker on quick mouse movements
- Debounced hover detection for smooth transitions
- Shows essential information without full expansion

---

### expanded

:::info
The `expanded` state is the full dashboard view with widgets, controls, and interactive elements.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×150 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- Click on `hover` state
- Direct transition from other states (via API)

**Exit Conditions:**
- Click on island → `hover` (default)
- Click on CLI tab with active session → `cli`
- Escape key → `hover`
- Mouse leave (if configured) → `idle`

**UI Components Rendered:**
- Left panel: Shortcuts, todo list, song info, countdown, pomodoro
- Right panel: Weather, calendar, performance monitor, email
- Clock display: Classic, gradient, or minimal styles
- Widget controls: Drag-and-drop reordering
- Tab navigation: Switch between widget groups

**Behavior Details:**
- Supports drag-and-drop widget reordering
- Multiple clock style options
- Custom background images/videos
- Real-time data updates (weather, music, notifications)
- Responsive layout based on content

---

### maxExpand

:::info
The `maxExpand` state provides maximum screen real estate for settings, tools, and detailed views.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- User requests full-screen view from `expanded` state
- Settings panel access
- Detailed tool views

**Exit Conditions:**
- Click on island → `hover`
- Escape key → `expanded`
- Close button → `expanded`

**UI Components Rendered:**
- Full settings interface
- Detailed tool panels
- Extended widget configurations
- System information displays

**Behavior Details:**
- Maximum visual real estate
- Full keyboard navigation support
- Modal-like behavior (blocks underlying interactions)
- Used for complex configurations and detailed views

---

### lyrics

:::info
The `lyrics` state displays synchronized music lyrics, automatically activated during music playback.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 500×42 px |
| **Mouse** | Pass-through |
| **Expanded** | Yes |
| **Enter Delay** | 50ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- Music playback starts (auto-trigger)
- SMTC (System Media Transport Controls) reports playing state
- Manual activation from music controls

**Exit Conditions:**
- Music playback stops → `idle`
- Music paused (stays in `lyrics` with paused indicator)
- Manual dismiss

**UI Components Rendered:**
- Synchronized lyrics display
- Album art thumbnail
- Song title and artist
- Playback progress indicator
- Music glow effect (reactive to playback)

**Behavior Details:**
- Real-time lyrics synchronization with playback
- Supports multiple music players (NetEase, QQ Music, Kugou)
- 50ms enter delay for smooth transition
- Music-reactive glow effect (`music-glow` CSS class)
- Paused state indicator (`music-paused` CSS class)
- SMTC worker integration for system-level media control

---

### lyricsTranslation

:::info
The `lyricsTranslation` state displays synchronized lyrics with translation text below each line, automatically activated when translation lyrics are available during music playback.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 500×60 px |
| **Mouse** | Pass-through |
| **Expanded** | Yes |
| **Enter Delay** | 50ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- Music playback starts with translation lyrics available (auto-trigger from `idle`)
- Translation lyrics loaded while in `lyrics` state (auto-upgrade)
- Hover leave with translation available

**Exit Conditions:**
- Translation lyrics become unavailable → `lyrics` (auto-downgrade)
- Music playback stops → `idle`
- Manual dismiss

**UI Components Rendered:**
- Synchronized lyrics display (original text)
- Translation text below each lyric line
- Album art thumbnail
- Song title and artist
- Playback progress indicator
- Music glow effect (reactive to playback)

**Behavior Details:**
- Real-time lyrics and translation synchronization with playback
- Taller window (60px vs 42px) to accommodate translation line
- Automatic upgrade from `lyrics` when translation becomes available
- Automatic downgrade to `lyrics` when translation becomes unavailable
- Same mouse pass-through behavior as `lyrics` state
- Supports Soda Music, NetEase, QQ Music translation sources

---

### notification

:::info
The `notification` state displays alerts and messages with interactive dismissal.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 500×88 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- System notification arrives
- Email notification received
- Application alert triggered
- IPC notification from main process

**Exit Conditions:**
- Click on notification → action (if configured)
- Dismiss gesture → `idle`
- Timeout → `idle` (auto-dismiss)
- New notification replaces current

**UI Components Rendered:**
- Notification icon
- Title and message text
- Action buttons (if configured)
- Dismiss button
- Timestamp

**Behavior Details:**
- Immediate transition (no enter delay)
- Supports multiple notification types
- Auto-dismiss after configurable timeout
- Queued notifications (sequential display)
- Priority-based display order

---

### announcement

:::info
The `announcement` state displays system announcements, updates, and important information.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- System announcement received
- Application update available
- First-run after update
- Scheduled announcements

**Exit Conditions:**
- Click dismiss → `hover`
- Acknowledge button → `hover`
- Escape key → `hover`

**UI Components Rendered:**
- Announcement title
- Rich content (markdown support)
- Version information (for updates)
- Action buttons (update, dismiss, remind later)
- Changelog details

**Behavior Details:**
- Full announcement panel
- Supports rich content (images, links, formatting)
- Version-specific announcements
- Dismiss tracking (won't show again)
- Integration with auto-updater

---

### guide

:::info
The `guide` state provides an interactive first-run tutorial for new users.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- First application launch
- Manual guide activation
- Guide reset (from settings)

**Exit Conditions:**
- Complete all steps → `idle`
- Skip guide → `idle`
- Escape key → `idle`

**UI Components Rendered:**
- Step indicator (progress bar)
- Tutorial content (per step)
- Interactive demonstrations
- Next/Previous/Skip buttons
- Highlight overlays (pointing to features)

**Behavior Details:**
- Step-by-step walkthrough
- Interactive element highlighting
- Progress tracking
- Skippable at any point
- Completion state persistence

---

### login

:::info
The `login` state provides user authentication interface, including email/password login and OAuth login (GitHub, Microsoft, WeChat, Gitee, KOOK). For the JWT authentication flow, see [JWT Authentication](../tech-stack/backend-tech-stack.md#jwt-json-web-tokens). For the rate limiting, see [Redis — Auth Rate Limiting](../backend-arch/redis-schema.md#db-6--auth-rate-limiting--replay-protection).
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- User requests login
- Protected action requires authentication
- Session expired

**Exit Conditions:**
- Successful authentication → saved state or `idle`
- Cancel → previous state
- Register link → `register`
- Reset password link → `resetPassword`
- OAuth (GitHub / Microsoft / Gitee) → `setPassword` (new user) or `bindOAuth` (existing email)
- OAuth (WeChat / KOOK) → `bindEmail` (no email returned) or `setPassword` / `bindOAuth` (if email available)

**UI Components Rendered:**
- Username/email input
- Password input
- Login button
- Register link
- Forgot password link
- GitHub OAuth button (with divider)
- Microsoft OAuth button
- WeChat OAuth button
- Gitee OAuth button
- KOOK OAuth button
- Error messages

**Behavior Details:**
- Self-handled navigation (does not follow standard click flow)
- Saves return state (`authReturnState`) for post-auth redirect
- Rate limiting (5 failures per 5-minute window)
- Account lockout protection
- Session token management
- Single device enforcement

#### OAuth Login Flow (GitHub / Microsoft / WeChat / Gitee / KOOK)

:::important
OAuth uses a **polling-based architecture**: eIsland opens the system default browser for authorization, then polls the backend for the result. All providers follow the same polling flow. WeChat and KOOK add an extra email binding step since they do not return the user's email.
:::

```mermaid
sequenceDiagram
    participant U as User
    participant E as eIsland (Renderer)
    participant B as System Browser
    participant P as OAuth Provider
    participant S as Backend Server

    U->>E: Click OAuth login button
    E->>S: GET /auth/oauth/{provider}/authorize
    S-->>E: authorizeUrl (no state)
    E->>E: Generate random sessionId (UUID)
    E->>B: shell.openExternal(authorizeUrl + state=sessionId)
    B->>P: User authorizes
    P->>S: Redirect to callback?code=xxx&state=sessionId
    S->>S: Exchange code for access_token
    S->>S: Fetch user info from provider API
    S->>S: Store result by sessionId
    S-->>B: 302 redirect to configured URL
    loop Poll every 2s (max 5 min)
        E->>S: GET /auth/oauth/poll?sessionId=xxx
        S-->>E: { ready: true }
    end
    E->>S: GET /auth/oauth/consume?sessionId=xxx
    S-->>E: OAuth result (LOGIN / SET_PASSWORD / BIND_OAUTH)
    E->>E: Route to appropriate state
```

**Backend Decision Logic:**

| Condition | Result | Next State |
|-----------|--------|------------|
| OAuth account already bound | `LOGIN` with JWT token | → saved state or `idle` |
| OAuth email matches registered email | `BIND_OAUTH` with tempToken | → `bindOAuth` |
| No matching email found | `SET_PASSWORD` with tempToken | → `setPassword` |
| WeChat / KOOK (no email returned) | `SET_PASSWORD` with tempToken (null email) | → `bindEmail` |

:::tip
If the OAuth provider returns a null email (e.g., GitHub privacy settings), the backend falls back to the provider's email API to fetch the user's verified primary email address.
:::

**Environment Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | `4e41d3...` |
| `GITHUB_REDIRECT_URI` | GitHub OAuth callback URL | `https://server.example.com/api/auth/oauth/github/callback` |
| `MICROSOFT_CLIENT_ID` | Microsoft Azure app client ID | `abc123...` |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Azure app client secret | `xyz789...` |
| `MICROSOFT_REDIRECT_URI` | Microsoft OAuth callback URL | `https://server.example.com/api/auth/oauth/microsoft/callback` |
| `WECHAT_APP_ID` | WeChat website application AppID | `wx1234567890abcdef` |
| `WECHAT_APP_SECRET` | WeChat website application AppSecret | `4e41d3...` |
| `WECHAT_REDIRECT_URI` | WeChat OAuth callback URL | `https://server.example.com/api/auth/oauth/wechat/callback` |
| `OAUTH_CALLBACK_REDIRECT_URL` | Browser redirect after callback | `https://www.pyisland.com` |

:::note
Microsoft OAuth requires an Azure AD app registration with a valid MPN ID if personal Microsoft accounts are supported. See [Azure App Registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app) for setup instructions.
:::

---

### register

:::info
The `register` state provides new account creation interface. For email verification, see [Redis — Email Verification](../backend-arch/redis-schema.md#db-2--email-verification--identity-verification). For CAPTCHA, see [Redis — Slider CAPTCHA](../backend-arch/redis-schema.md#db-4--slider-captcha).
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- User clicks register from login
- Direct registration link

**Exit Conditions:**
- Successful registration → `login` or `idle`
- Cancel → `login`
- Login link → `login`

**UI Components Rendered:**
- Username input
- Email input
- Password input
- Confirm password input
- Verification code input
- Register button
- Login link
- Terms acceptance checkbox

**Behavior Details:**
- Email verification required
- Password strength validation
- Username availability check
- Rate limiting (5 attempts per hour per IP)
- CAPTCHA protection (slider verification)

---

### resetPassword

:::info
The `resetPassword` state provides password recovery workflow.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- User clicks "Forgot password" from login
- Direct reset link

**Exit Conditions:**
- Successful password reset → `login`
- Cancel → `login`
- Timeout → `login`

**UI Components Rendered:**
- Email input
- Verification code input
- New password input
- Confirm password input
- Reset button
- Back to login link

**Behavior Details:**
- Email verification required
- Password strength validation
- Rate limiting
- Token expiration (5-minute validity)
- One-time use codes

---

### setPassword

:::info
The `setPassword` state handles OAuth new user registration — when a user logs in via GitHub or Microsoft for the first time and no matching email account exists, they must set a password to complete registration.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- OAuth callback returns `SET_PASSWORD` status (GitHub or Microsoft)
- No existing email account matches the OAuth provider email

**Exit Conditions:**
- Password set successfully → login + redirect to saved state
- Cancel → `login`

**UI Components Rendered:**
- Username input (editable, pre-filled from OAuth provider)
- Email input (read-only, pre-filled if available)
- Password input with show/hide toggle
- Confirm password input
- Submit button ("Set Password and Register")
- Cancel button ("Cancel Login")

**Behavior Details:**
- Temporary JWT token (`purpose=set_password`) carries OAuth context (provider, providerUserId, accessToken)
- Password strength validation (min 8 chars, letters + numbers)
- Username pattern validation (2-32 chars, alphanumeric/CJK/underscore)
- On success: creates user account + OAuth binding, returns JWT token
- Self-handled navigation (does not follow standard click flow)

---

### bindOAuth

:::info
The `bindOAuth` state handles linking a third-party OAuth account to an existing email account — when a user logs in via GitHub (or Microsoft, when enabled) and a matching email account already exists, they must enter their password to bind the accounts.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- OAuth callback returns `BIND_OAUTH` status (GitHub or Microsoft)
- OAuth provider email matches an existing registered email account

**Exit Conditions:**
- Password verified → OAuth binding created → login + redirect to saved state
- Cancel → `login`

**UI Components Rendered:**
- Username input (read-only, from existing account)
- Email input (read-only, from existing account)
- Password input with show/hide toggle
- Submit button ("Bind and Login")
- Cancel button ("Cancel Login")

**Behavior Details:**
- Temporary JWT token (`purpose=bind_oauth`) carries OAuth context
- Password verification against existing account
- On success: creates OAuth binding record in `user_oauth_binding` table, returns JWT token
- Account must be enabled (not banned)
- Self-handled navigation (does not follow standard click flow)

---

### bindEmail

:::info
The `bindEmail` state handles email binding for OAuth providers that do not return an email address — currently WeChat and KOOK. When a user logs in via WeChat or KOOK and no email is associated, they must bind an email to complete registration.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- OAuth callback returns `SET_PASSWORD` status with a null email (WeChat or KOOK)
- WeChat or KOOK OAuth login without a bound email address

**Exit Conditions:**
- Email bound + password set → `setPassword` (new email) or `bindOAuth` (existing email)
- Cancel → `login`

**UI Components Rendered:**
- Email input
- Verification code input
- Send verification code button (with slider CAPTCHA)
- Submit button ("Verify and Continue")
- Cancel button ("Cancel Login")

**Behavior Details:**
- Slider CAPTCHA required before sending verification code (once per session)
- Email verification code sent via `BIND_EMAIL` scene
- Backend verifies the code internally (no separate verify endpoint call)
- If the email is already registered → routes to `bindOAuth`
- If the email is new → routes to `setPassword` with email and username context
- Temporary JWT token (`tempToken`) carries WeChat OAuth context across states

#### WeChat OAuth Flow

:::important
WeChat OAuth uses the **qrconnect** flow for website applications. Unlike GitHub/Microsoft, WeChat does not return the user's email, requiring an additional email binding step.
:::

```mermaid
sequenceDiagram
    participant U as User
    participant E as eIsland (Renderer)
    participant B as System Browser
    participant W as WeChat Open Platform
    participant S as Backend Server

    U->>E: Click WeChat login button
    E->>S: GET /auth/oauth/wechat/authorize
    S-->>E: authorizeUrl (no state)
    E->>E: Generate random sessionId (UUID)
    E->>B: shell.openExternal(authorizeUrl + state=sessionId)
    B->>W: User scans QR code
    W->>S: Redirect to callback?code=xxx&state=sessionId
    S->>S: Exchange code for access_token
    S->>S: Fetch user info (nickname, avatar, openid)
    S->>S: Store result by sessionId
    S-->>B: 302 redirect to configured URL
    loop Poll every 2s (max 5 min)
        E->>S: GET /auth/oauth/poll?sessionId=xxx
        S-->>E: { ready: true }
    end
    E->>S: GET /auth/oauth/consume?sessionId=xxx
    S-->>E: OAuth result (null email)
    E->>E: Route to bindEmail state
    U->>E: Enter email + verification code
    E->>S: POST /auth/oauth/wechat/bind-email
    S-->>E: Result (SET_PASSWORD or BIND_OAUTH)
    E->>E: Route to setPassword or bindOAuth
```

**Backend Decision Logic (bind-email):**

| Condition | Result | Next State |
|-----------|--------|------------|
| Email already registered | `BIND_OAUTH` with tempToken | → `bindOAuth` |
| Email not registered | `SET_PASSWORD` with tempToken | → `setPassword` |

:::note
WeChat website applications use `https://open.weixin.qq.com/connect/qrconnect` as the authorization endpoint. The `appid` parameter is used instead of `client_id`, and the response uses `openid` (not `id`) as the unique identifier.
:::

---

### payment

:::info
The `payment` state handles subscription and payment processing. For the Alipay/WeChat integration, see [Payment Processing](../tech-stack/backend-tech-stack.md#payment-processing). For the order lifecycle, see [MySQL — Payment Domain](../backend-arch/mysql-schema.md#payment-domain).
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 860×400 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- User initiates purchase
- Subscription renewal
- Upgrade request

**Exit Conditions:**
- Payment success → `idle` (with benefits granted)
- Payment failure → `expanded` (with error)
- Cancel → previous state
- Timeout → `idle`

**UI Components Rendered:**
- Product selection
- Price display
- Payment method selection (Alipay, WeChat Pay)
- QR code (for mobile payment)
- Payment status indicator
- Cancel button

**Behavior Details:**
- Self-handled navigation
- Multiple payment channels (Alipay, WeChat Pay)
- Order creation with idempotency
- Payment timeout (15 minutes default)
- Async notification handling
- Receipt email delivery

---

### agent

:::info
The `agent` state provides the AI assistant chat interface with tool calling capabilities. For the LLM gateway and tool system, see [AI Integration](../tech-stack/backend-tech-stack.md#ai-integration). For the billing balance, see [Redis — Agent Balance](../backend-arch/redis-schema.md#db-12--agent-balance).
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 500×88 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- User opens AI assistant
- Voice command triggers agent
- Keyboard shortcut

**Exit Conditions:**
- Close button → `idle`
- Escape key → `idle`
- Minimize → `idle`

**UI Components Rendered:**
- Chat message history
- Input field
- Send button
- Tool call indicators
- Streaming response display
- Model selector
- Settings button

**Behavior Details:**
- Real-time streaming responses
- Tool calling (50+ tools available)
- Multi-provider support (DeepSeek, MiMo, MiniMax)
- Thinking mode (chain-of-thought)
- Chat session persistence
- Token usage tracking
- Balance management

---

### agentVoiceInput

:::info
The `agentVoiceInput` state provides voice command recognition interface.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 500×88 px |
| **Mouse** | Pass-through |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- Voice input hotkey pressed
- Manual voice activation
- Agent voice command request

**Exit Conditions:**
- Voice recognition complete → `agent`
- Silence timeout → `idle`
- Cancel gesture → `idle`
- Escape key → `idle`

**UI Components Rendered:**
- Voice waveform visualization
- Recording indicator
- Cancel button
- Status text ("Listening...", "Processing...")

**Behavior Details:**
- Fullscreen transparent overlay
- Mouse pass-through (does not block interactions)
- Real-time speech recognition via Tencent Cloud STT
- WebSocket streaming for low latency
- Noise cancellation
- Multi-language support

---

### stt

:::info
The `stt` (Speech-to-Text) state displays transcription results.
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 500×88 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- Speech recognition active
- Transcription request

**Exit Conditions:**
- Transcription complete → `agent` or `idle`
- Cancel → `idle`
- Timeout → `idle`

**UI Components Rendered:**
- Real-time transcription text
- Confidence indicator
- Edit button
- Copy button
- Cancel button

**Behavior Details:**
- Real-time transcription display
- Editable results
- Copy to clipboard
- Integration with agent for command processing

---

### cli

:::info
The `cli` state provides real-time monitoring of **Claude Code** and **Codex** CLI sessions. For the full architecture, event system, and permission handling, see [CLI State & Codex Support](cli.md).
:::

| Property | Value |
|----------|-------|
| **Dimensions** | 500×88 px |
| **Mouse** | Interactive |
| **Expanded** | Yes |
| **Enter Delay** | 0ms |
| **Leave Delay** | 0ms |

**Entry Conditions:**
- New CLI session detected (auto-transition via notification)
- Permission request received (auto-transition with sound + glow)
- Click on CLI tab with active session (from `expanded`, `maxExpand`, or `announcement`)

**Exit Conditions:**
- Close button → `idle`
- Click on body → `maxExpand` (opens full CLI panel)
- Escape key → previous state

**UI Components Rendered:**
- Provider icon (animated GIF for Claude, static SVG for Codex)
- Session title and phase badge
- Latest event summary or pending permission details
- Provider switch (Claude / Codex toggle)
- Permission buttons (Deny / Allow / Always Allow) — Claude only
- Synced lyrics overlay (when music is playing and no permission is pending)

**Behavior Details:**
- Dual-provider support (Claude Code and Codex)
- Real-time event streaming via IPC
- Automatic session detection with notification sound
- CLI glow overlay effect on new sessions
- Permission request auto-prompts with tool details
- Pill mode: content height reduced to 80px (shell stays 100px)
- Click body to expand into full `maxExpand` CLI panel with session sidebar, event stream, and activity heatmap
