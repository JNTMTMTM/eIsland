# eIsland

> Windows Dynamic Island style notification and quick-action application

## Tech Stack

| Category | Technology |
|---------|-----------|
| Desktop Framework | Electron ^33.x |
| Frontend | React 19 + TypeScript |
| Build Tool | Vite ^6.x + electron-vite |
| Styling | Tailwind CSS v4 |
| State Management | Zustand ^5.x |
| Database | better-sqlite3 ^11.x |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Package application
npm run dist
```

## Project Structure

```
eIsland/
├── electron/           # Main process
│   ├── main.ts        # Entry point
│   ├── preload.ts     # Preload scripts
│   ├── store/         # Database (better-sqlite3)
│   └── services/      # IPC handlers, tray
├── src/               # Renderer process (React)
│   ├── components/    # UI components
│   ├── hooks/         # Custom hooks
│   ├── stores/        # Zustand stores
│   ├── types/         # TypeScript types
│   └── styles/        # Tailwind CSS
└── resources/         # App icons
```

## Features

- Dynamic Island UI with compact/expanded states
- Notification aggregation and management
- System tray integration
- Local SQLite database storage
- Global shortcuts (Ctrl+Shift+D)
- Theme support (light/dark/system)

## Code Standards

This project follows the frontend code standards defined in `.cursor/skills/frontend-code-standards/STANDARDS.md`.
