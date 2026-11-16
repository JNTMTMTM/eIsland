---
title: eIsland Project Introduction
icon: info
---

# eIsland - Developer Introduction

eIsland is a desktop widget application for Windows that brings the Apple Dynamic Island experience to PC. The project implements a sophisticated state machine architecture to manage the island's various visual and interactive modes.

## State Machine Architecture

:::info
The core of eIsland is built around a comprehensive state machine that controls the island's appearance and behavior. The system manages **15 distinct states**, each representing a specific user interaction context. For the full state configuration matrix, transition rules, and per-state behavior details, see [State Machine](../frontend-arch/states.md).
:::

### Primary States

| State | Description | Behavior |
|-------|-------------|----------|
| `idle` | Default resting state | Pass-through mouse events, minimal footprint |
| `minimal` | Compact display mode | Pass-through, shows essential info only |
| `hover` | Mouse interaction state | Interactive, expands on hover with delay |
| `expanded` | Full dashboard view | Interactive, shows widgets and controls |
| `maxExpand` | Maximum expansion | Full-screen panel for settings and tools |

### Content States

| State | Description | Behavior |
|-------|-------------|----------|
| `lyrics` | Music lyrics display | Pass-through, synchronized with playback |
| `notification` | Alert and message display | Interactive, shows notifications |
| `announcement` | System announcements | Interactive, displays updates |

### User Flow States

| State | Description | Behavior |
|-------|-------------|----------|
| `guide` | First-run tutorial | Interactive, guides new users |
| `login` | Authentication screen | Interactive, user login form |
| `register` | Account creation | Interactive, registration flow |
| `resetPassword` | Password recovery | Interactive, reset workflow |
| `payment` | Payment processing | Interactive, subscription handling |

### AI & Input States

| State | Description | Behavior |
|-------|-------------|----------|
| `agent` | AI assistant mode | Interactive, chat interface |
| `agentVoiceInput` | Voice command mode | Pass-through, voice recognition |
| `stt` | Speech-to-text | Interactive, transcription display |
| `cli` | Command line interface | Interactive, terminal emulation |

## State Transitions

States transition based on user interactions, system events, and application logic. Each state defines:

- **Mouse passthrough**: Whether mouse events pass to underlying windows
- **Expansion behavior**: How the island visually expands
- **Enter/Leave delays**: Timing for smooth state transitions
- **Area calculations**: Pixel dimensions for each state

For the complete transition rules and auto-transition logic, see [State Transitions](../frontend-arch/states.md#state-transitions). For the IPC data flow between processes, see [Process Model](../frontend-arch/process-model.md#data-flow).

## Key Features

:::info
eIsland provides a rich set of functional modules covering music, productivity tools, information display, entertainment, and communication.
:::

### Music Integration
- Real-time lyrics synchronization with playback (via [SMTC Worker](../frontend-arch/process-model.md#smtc-worker))
- Support for multiple music players (NetEase, QQ Music, Kugou)
- Album art display and music controls

### Productivity Tools
- Pomodoro timer with customizable intervals
- Countdown timers for important events
- Todo list management
- Application shortcuts

### Information Display
- Weather information with location detection (powered by [QWeather API](../backend-arch/redis-schema.md#db-11--qweather-cache--tencent-tmt-quota))
- Calendar integration with lunar dates
- Performance monitoring widgets for CPU, GPU, memory, and disk usage and available temperatures

### Entertainment
- Built-in mini-games (2048, Gomoku) with [leaderboard system](../backend-arch/mysql-schema.md#mini-game-domain)
- Customizable wallpapers and themes (via [Wallpaper Marketplace](../backend-arch/mysql-schema.md#wallpaper-domain))
- Animation effects and transitions (see [Animation System](#animation-system) below)

### Communication
- Email notification monitoring
- AI-powered chat assistant (see [AI Agent System](../tech-stack/backend-tech-stack.md#ai-integration))
- Voice command support (via [Speech-to-Text](../tech-stack/backend-tech-stack.md#speech-to-text-stt))

## Widget System

:::tip
The expanded state supports a flexible widget system with configurable layouts (managed via [Zustand Store](../tech-stack/frontend-tech-stack.md#state-management)):
:::

- **Left/Right panels**: Choose from shortcuts, todo, song, countdown, pomodoro, and more
- **Clock styles**: Classic, gradient, or minimal time display
- **Drag-and-drop**: Reorder widgets and application shortcuts
- **Custom backgrounds**: Support for images and videos

## Animation System

:::tip
State transitions use a morphing animation system with configurable speeds (see [GSAP Integration](../tech-stack/frontend-tech-stack.md#gsap-integration) and [CSS-Driven Animations](../tech-stack/frontend-tech-stack.md#css-driven-animations)):
:::

- **Slow**: 1100ms for dramatic transitions
- **Medium**: 550ms for standard interactions
- **Fast**: 280ms for quick responses

The island smoothly animates between states, creating a fluid user experience similar to Apple's Dynamic Island.

---

:::tip
**Related Documents:**
- [Process Model](../frontend-arch/process-model.md) — Electron multi-process architecture and IPC communication
- [State Machine](../frontend-arch/states.md) — Full 16-state configuration, transitions, and per-state behavior
- [Frontend Tech Stack](../tech-stack/frontend-tech-stack.md) — React, TypeScript, Electron, Zustand, GSAP
- [Backend Tech Stack](../tech-stack/backend-tech-stack.md) — Java, Spring Boot, AI agent, payment processing
:::
