---
title: Testing Commands
icon: vial
---

# Testing Commands

:::info
This document covers the testing commands for running, filtering, and measuring test coverage in the eIsland frontend.
:::

All commands are run from the eIsland project root, where `package.json` and `vitest.config.ts` are located:

```bash
npm run <script>
```

## `npm run test`

Runs both the `node` and `renderer` test projects once.

```bash
npm run test
```

**Configuration:** Vitest 4.1.10 with:

- `environment: 'node'`
- `clearMocks: true` — mocks are cleared between tests
- `restoreMocks: true` — mocks are restored to their original implementation
- Two named projects, both inheriting the root configuration with `extends: true`
- Support for both `.test.ts` and `.test.tsx` files

| Project | Test File Pattern | Exclusion | CLI Label Color |
|---------|-------------------|-----------|-----------------|
| `node` | `src/**/*.test.{ts,tsx}` | `src/renderer/**` | Yellow |
| `renderer` | `src/renderer/**/*.test.{ts,tsx}` | None configured | Magenta |

:::important
The `node` and `renderer` labels identify test projects. Both currently run in the Node.js environment; naming a project `renderer` does not provide a DOM or launch Electron. Tests that require DOM interaction need a configured environment such as `jsdom` or `happy-dom` and its dependency.
:::

### Latest Verified Test Run

The full suite passed on **2026-10-05**:

| Project | Test Files | Passing Tests |
|---------|------------|---------------|
| `node` | 59 | 778 |
| `renderer` | 138 | 1913 |
| **Total** | **197** | **2691** |

These counts describe the root application suite; native plugins have separate test configurations.

:::tip
For iterative development, use `npx vitest` (without `run`) to start Vitest in **watch mode** — it re-runs affected tests on file save.
:::

**When to use:**

- Before committing code
- In CI pipelines
- After pulling new changes to verify nothing is broken

## `npm run test:node`

Runs only the `node` project, which collects tests under `src/` outside `src/renderer/`, including main process and preload tests.

```bash
npm run test:node
```

**Under the hood:** `vitest run --project node`

## `npm run test:renderer`

Runs only the `renderer` project for renderer stores, utilities, hooks, and component tests.

```bash
npm run test:renderer
```

**Under the hood:** `vitest run --project renderer`

:::tip
Filter a project to a specific test file by forwarding its path through npm:

```bash
npm run test:renderer -- src/renderer/components/states/questionnaire/components/test/QuestionnaireQuestion.test.ts
```
:::

## `npm run test:preload`

Runs only the preload bridge test file.

```bash
npm run test:preload
```

**Under the hood:** `vitest run src/preload/index.test.ts`

:::note
This is a subset of `npm run test`. Use it when modifying preload code for faster feedback — it skips all other test files.
:::

## `npm run test:coverage`

Runs both test projects with the V8 coverage provider (`@vitest/coverage-v8`).

```bash
npm run test:coverage
```

**Output:** Coverage report in the terminal and `coverage/` directory with HTML reports.

**When to use:**

- Before opening a PR to review exercised code and untested paths
- Periodically to audit test gaps
- When adding new features to ensure they are tested

### Audit Renderer TSX Coverage

Use an explicit include pattern to measure all renderer TSX source files, including files that tests do not import:

```bash
npm run test:coverage -- --coverage.include="src/renderer/**/*.tsx" --coverage.reportsDirectory=coverage/renderer-tsx
```

The audit on **2026-10-05** measured:

| Metric | Result |
|--------|--------|
| `.test.tsx` files | 0 |
| Renderer TSX source files | 278 |
| TSX files with executed statements | 15 |
| TSX files without executed statements | 263 |
| Line coverage | 2.38% |
| Statement coverage | 2.30% |
| Function coverage | 2.08% |
| Branch coverage | 2.51% |

:::note
These percentages cover only `src/renderer/**/*.tsx`, not the entire application. Existing `.test.ts` files already exercise some TSX components through `React.createElement` and static rendering with `react-dom/server`. The absence of `.test.tsx` files does not mean there are no component tests; UI interaction and unexecuted component paths still need additional coverage.
:::

## Troubleshooting

### `npm run test` Fails After Pull

**Stale build artifacts:**

```bash
rm -rf out/ node_modules/
npm install
npm run test
```
