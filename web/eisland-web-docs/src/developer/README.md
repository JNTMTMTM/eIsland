---
title: Developer Guide
icon: code
---

# Developer Guide

:::info
This section provides comprehensive developer documentation for the eIsland project, covering environment setup, development workflows, coding standards, and testing practices.
:::

## Documentation Structure

### Environment Setup

Environment configuration for frontend, backend, and plugin development.

| Document | Description |
|----------|-------------|
| [Frontend Setup](environment-setup/frontend-setup.md) | Node.js, npm, Electron, React, and frontend IDE configuration |
| [Backend Setup](environment-setup/backend-setup.md) | Java JDK, Maven, MySQL, Redis, RabbitMQ, and backend IDE configuration |
| [Plugin Setup](environment-setup/plugin-setup.md) | Plugin development toolchain, scaffolding, and testing environment |

### Git Operations

Git workflows and commands for eIsland development.

| Document | Description |
|----------|-------------|
| [Local Operations](git-operations/local-operations.md) | Local Git commands: branching, committing, rebasing, and history management |
| [GitHub Operations](git-operations/github-operations.md) | GitHub workflows: pull requests, code reviews, issue management, and CI/CD |

### Development Commands

Detailed reference for npm scripts defined in `package.json`.

| Document | Description |
|----------|-------------|
| [Development Commands](commands/dev-commands.md) | `dev`, `build`, `preview` — building, running, and previewing the application |
| [Testing Commands](commands/test-commands.md) | `test`, `test:node`, `test:renderer`, `test:preload`, `test:coverage` — grouped tests and coverage audits |
| [Package Commands](commands/package-commands.md) | `package`, `postinstall` — building installers and managing native modules |
| [Code Quality Commands](commands/quality-commands.md) | `comment:check`, `i18n:check` — validating comment standards and i18n completeness |
| [Release Commands](commands/release-commands.md) | `release:notes`, `changelog:generate`, `release:upload*` — changelogs and artifact uploads |
| [Plugin Commands](commands/plugin-commands.md) | `build`, `test`, `smoke` — building, testing, and smoke-testing all native plugins |

### Code Quality

Coding standards and comment quality requirements for the eIsland project.

| Document | Description |
|----------|-------------|
| [Code Quality Review](code-quality/code-review.md) | Frontend coding standards covering HTML, CSS, JavaScript, TypeScript, React, and Next.js conventions |
| [Comment Quality Review](code-quality/comment-quality.md) | JSDoc comment standards, file headers, function documentation, and annotation best practices |
