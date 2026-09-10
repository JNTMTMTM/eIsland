---
title: eIsland Documentation
icon: info
---

# eIsland Documentation

:::info
Welcome to the eIsland developer documentation. This section provides comprehensive guides covering the project introduction, technology stack, and system architecture for both the frontend desktop application and the backend server.
:::

## Documentation Structure

### Introduction

Overview of the eIsland project, including the state machine architecture, key features, and community guidelines.

| Document | Description |
|----------|-------------|
| [Project Overview](intro/project-overview.md) | State machine architecture, 15 states, key features, widget system, and animation system |
| [Project Dependencies](intro/dependencies.md) | Overview of all libraries and tools that power eIsland, explained for non-developers |
| [Backend Dependencies](intro/backend-dependencies.md) | Overview of all backend server libraries, frameworks, and internal modules |
| [Code of Conduct](intro/coc.md) | Contributor Covenant Code of Conduct for the eIsland community |

### Tech Stack

Technology stack used across the eIsland ecosystem.

| Document | Description |
|----------|-------------|
| [Frontend Tech Stack](tech-stack/frontend-tech-stack.md) | React 19, TypeScript, Vite, Electron, Framer Motion, and frontend tooling |
| [Backend Tech Stack](tech-stack/backend-tech-stack.md) | Java 25, Spring Boot 4.0.5, MyBatis, MySQL, Redis, RabbitMQ, and backend tooling |
| [Plugins Tech Stack](tech-stack/plugins-tech-stack.md) | Plugin system architecture, IPC bridge, bundling, and tool integration |

### Frontend Architecture

eIsland desktop application's frontend architecture.

| Document | Description |
|----------|-------------|
| [Process Model](frontend-arch/process-model.md) | Electron's multi-process architecture: Main, Preload, and Renderer processes |
| [State Machine](frontend-arch/states.md) | The 15-state state machine controlling the island's visual modes and transitions |
| [Shape Modes](frontend-arch/shape-modes.md) | Visual shape modes: pill, compact, expanded, and widget configurations |
| [CLI Commands](frontend-arch/cli.md) | Command-line interface for development and debugging |
| [Questionnaire](frontend-arch/questionnaire.md) | First-run questionnaire system for user preferences |
| [Electron Windows](frontend-arch/electron-windows.md) | Window types, creation, and management across the application |

### Backend Architecture

eIsland backend server architecture and infrastructure.

| Document | Description |
|----------|-------------|
| [Server Architecture](backend-arch/server-model.md) | Modular monolith design, module structure, security, API design, and AI agent system |
| [MySQL Database Schema](backend-arch/mysql-schema.md) | Complete database schema: 37 tables across 13 domains with every field documented |
| [Redis Architecture](backend-arch/redis-schema.md) | 15 databases, ~83 key patterns, Bloom filters, Lua scripts, and rate limiting |
| [RabbitMQ Architecture](backend-arch/rabbitmq-schema.md) | 6 exchanges, 21 queues, 9 message types, and retry/DLQ pattern |
