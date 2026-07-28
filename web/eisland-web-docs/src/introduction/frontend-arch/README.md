---
title: Frontend Architecture
icon: building
---

# Frontend Architecture

:::info
This section documents the eIsland desktop application's frontend architecture, including the Electron multi-process model and the state machine that drives the island's visual behavior.
:::

## Overview

The eIsland frontend is built on Electron's multi-process architecture with a strict separation between the **Main Process** (Node.js), the **Preload Bridge** (Context Bridge), and the **Renderer Process** (Chromium). The core of the application is a state machine that manages **20 distinct states** controlling the island's appearance, expansion, and interaction behavior.

## Documents

| Document | Description |
|----------|-------------|
| [Process Model](process-model.md) | Electron's multi-process architecture: Main, Preload, and Renderer processes with IPC communication |
| [State Machine](states.md) | The 20-state state machine that controls the island's visual modes, transitions, and interaction behavior |
| [Shape Modes](shape-modes.md) | Notch and Pill shape modes: dimensions, positioning, interaction differences, and toggle mechanism |
| [CLI State & Codex Support](cli.md) | Claude Code and Codex CLI session monitoring: dual-provider architecture, event streaming, permission handling, and activity heatmap |
| [Electron Windows](electron-windows.md) | All BrowserWindow instances: main island, splash, guide, standalone, capture, and glow overlays |
