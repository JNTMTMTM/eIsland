---
name: eisland-dev-refactor-module-split
author: JNTMTMTM
description: >
  Refactor a monolithic React component file into a standardized module structure with
  components/, hooks/, utils/, types/, and config/ subdirectories. Use this skill whenever
  the user asks to "split", "refactor", "拆分", "拆解", or "restructure" a component file
  into subdirectories, or when they mention organizing code into modules.
---

# Refactor Module Split

Split a monolithic React component file into a clean module structure with five subdirectories: `components/`, `hooks/`, `utils/`, `types/`, and `config/`, plus an `index.ts` entry point.

## When to use

- A single `.tsx` file has grown large and contains multiple concerns (utility functions, hooks, sub-components, constants, type definitions)
- The user explicitly asks to split/refactor a component into subdirectories
- The file is a React component that mixes UI rendering, state management, utility logic, and configuration

## Process

### Step 0: Ensure module scaffolding exists

Before extracting any code, verify the target module directory has the required structure. If any of the following are missing, create them first:

```
<module>/
├── index.ts          (if missing, create with placeholder export)
├── types/            (if missing, create directory)
├── config/           (if missing, create directory)
├── utils/            (if missing, create directory)
├── hooks/            (if missing, create directory)
└── components/       (if missing, create directory)
```

- Empty directories should contain a `.gitkeep` placeholder
- `index.ts` should initially export the original component (update after refactoring)

### Step 1: Analyze the source file

Read the target file in full. Categorize every piece of code into one of five buckets:

| Bucket | Criteria | Target directory |
|--------|----------|-----------------|
| **Types** | `type`, `interface`, component prop interfaces, hook return types | `types/` |
| **Constants** | `const` values, config keys, store keys, i18n keys/defaults | `config/` |
| **Pure functions** | No React hooks, no side effects, deterministic input→output | `utils/` |
| **React hooks** | Uses `useState`, `useEffect`, `useMemo`, `useCallback`, or custom hooks | `hooks/` |
| **Sub-components** | Returns JSX, used within the main component | `components/` |

Also check if the file's sibling directories already exist (e.g., `components/` or `hooks/` may already have files from prior refactoring). Don't duplicate existing extractions.

### Step 2: Create the extracted files

For each extracted piece, create a new file in the appropriate directory. Every file must include:

1. **License header** — copy the exact GPL-3.0 block from the source file
2. **File-level JSDoc** — `@file`, `@description`, `@author` tags
3. **Function/type JSDoc** — `@param`, `@returns` for all exported functions
4. **Correct imports** — relative paths back to shared types or store slices

Naming conventions:
- `types/` — camelCase with module prefix (e.g., `todoTypes.ts`, `albumTypes.ts`, `localFileSearchTypes.ts`)
- `config/` — camelCase with module prefix (e.g., `todoConfig.ts`, `albumConfig.ts`, `localFileSearchConfig.ts`)
- `utils/` — camelCase with module prefix (e.g., `todoUtils.ts`, `albumUtils.ts`, `localFileSearchUtils.ts`)
- `hooks/` — camelCase with `use` prefix (e.g., `useTodos.ts`, `useAlbumItems.ts`, `useLocalFileSearch.ts`)
- `components/` — PascalCase component name (e.g., `TodoTab.tsx`, `TodoHeader.tsx`, `AlbumGridItem.tsx`)

### Step 3: Define types first

Create `types/<module>Types.ts` **before** other files. This file must contain:

1. **Domain types** — data models, enums, union types used by the module
2. **Hook return type** — `Use<Module>Return` interface describing the hook's full return shape
3. **Component prop interfaces** — `<Component>Props` for every sub-component

All component prop interfaces and hook return types MUST be defined in `types/`, not inline in component or hook files.

Example pattern:
```typescript
// types/todoTypes.ts

/** 紧急程度 */
export type Priority = 'P0' | 'P1' | 'P2';

/** 单条待办 */
export interface TodoItem { ... }

/** useTodos hook 返回值类型 */
export interface UseTodosReturn { ... }

/** TodoHeader 组件入参 */
export interface TodoHeaderProps { ... }

/** TodoInputBar 组件入参 */
export interface TodoInputBarProps { ... }
```

### Step 4: Rewrite the source file

Replace the extracted code in the original file with imports from the new modules. The source file should become a thin composition layer that:
- Imports hook from `../hooks/use<Module>`
- Imports sub-components from `./<ComponentName>`
- Calls the hook at the top level
- Destructures hook return values and passes them as props to sub-components
- Contains no extracted logic, no `useEffect`, no utility functions

### Step 5: Create the index.ts entry point

Create `<module>/index.ts` that re-exports the main component:
```typescript
export { TodoTab } from './components/TodoTab';
```

### Step 6: Verify

Run these checks in order — all must pass before committing:

```bash
# 1. TypeScript compilation
npx tsc --noEmit --pretty

# 2. Comment standards compliance (file headers, JSDoc)
npm run comment:check

# 3. i18n completeness (all t() keys exist in both zh-CN and en-US)
npm run i18n:check

# 4. Unit tests
npm run test
```

If any check fails, fix the issue before proceeding. Common failures:
- `comment:check` — missing license header, missing `@file`/`@description`/`@author`, missing JSDoc on exported functions
- `i18n:check` — a `t('key')` call references a key not present in both locale files
- `test` — a refactored import path broke a test, or an extracted function changed behavior

### Step 7: Commit

Use a conventional commit message:
```
refactor(<module-name>): extract types, utils, hooks, components, config from <OriginalFile>

- types/<name>Types.ts: type definitions + component prop interfaces
- utils/<name>Utils.ts: <what it does>
- hooks/use<Name>.ts: <what it does>
- components/<Name>.tsx: <what it does>
- config/<name>Config.ts: <what it contains>
- index.ts: module entry point
- <OriginalFile>.ts: simplified from <N> to <M> lines
```

## Directory structure

```
feature/
├── index.ts                    (module entry point, re-exports main component)
├── types/
│   └── featureTypes.ts         (types, hook return type, component prop interfaces)
├── config/
│   └── featureConfig.ts        (constants, store keys, defaults)
├── utils/
│   └── featureUtils.ts         (pure utility functions)
├── hooks/
│   └── useFeature.ts           (all state management logic)
└── components/
    ├── FeatureTab.tsx           (thin composition layer: hook + sub-components)
    ├── FeatureHeader.tsx        (sub-component)
    └── FeatureList.tsx          (sub-component)
```

### Real examples from the codebase

```
todo/
├── index.ts
├── types/todoTypes.ts
├── config/todoConfig.ts
├── utils/todoUtils.ts
├── hooks/useTodos.ts
└── components/
    ├── TodoTab.tsx
    ├── TodoHeader.tsx
    ├── TodoInputBar.tsx
    ├── TodoList.tsx
    ├── TodoItem.tsx
    └── TodoSubItem.tsx

album/
├── index.ts
├── types/albumTypes.ts
├── config/albumConfig.ts
├── utils/albumUtils.ts
├── hooks/
│   ├── useAlbumItems.ts
│   ├── useAlbumViewer.ts
│   ├── useAlbumViewerActions.ts
│   ├── useAlbumSelection.ts
│   ├── useAlbumGridConfig.ts
│   └── useAlbumDrag.ts
└── components/
    ├── AlbumTab.tsx
    ├── AlbumHeader.tsx
    ├── AlbumOverview.tsx
    ├── AlbumViewer.tsx
    ├── AlbumGridItem.tsx
    ├── AlbumMetaPanel.tsx
    └── AlbumSelectionBar.tsx

localFileSearch/
├── index.ts
├── types/localFileSearchTypes.ts
├── config/localFileSearchConfig.ts
├── utils/localFileSearchUtils.ts
├── hooks/useLocalFileSearch.ts
└── components/
    ├── LocalFileSearchTab.tsx
    ├── LocalFileSearchHeader.tsx
    ├── LocalFileSearchRootRow.tsx
    ├── LocalFileSearchQueryRow.tsx
    ├── LocalFileSearchConfigPanel.tsx
    └── LocalFileSearchResults.tsx
```

## Acceptance criteria

Every extracted file MUST satisfy ALL of the following before the refactoring is considered complete.

### Comment standards (references/COMMENT_STANDARDS.md)

| # | Criterion | Check |
|---|-----------|-------|
| C1 | Every `.ts`/`.tsx` file starts with the GPL-3.0 license block (project name, URL, copyright, author, GPL notice) | `npm run comment:check` |
| C2 | Every `.ts`/`.tsx` file has a file-level JSDoc with `@file`, `@description`, `@author` | `npm run comment:check` |
| C3 | Every exported function/class/method has JSDoc with `@param` and `@returns` | `npm run comment:check` |
| C4 | `@author` is set to `鸡哥` (project default) | Visual check |
| C5 | Comments are in Chinese, explain "why" not "what" | Visual check |
| C6 | No comments on simple getters/setters, self-explanatory assignments, or template code | Visual check |

### Frontend standards (references/FRONTEND_STANDARDS.md)

| # | Criterion | Check |
|---|-----------|-------|
| F1 | Use `const` for constants, `let` for reassignable vars, never `var` | `npm run test` (lint) |
| F2 | One variable per declaration | Visual check |
| F3 | No `any` type — use explicit types or `unknown` | `npx tsc --noEmit` |
| F4 | Interface over `type` for object shapes; `type` only for unions/tuples | Visual check |
| F5 | ES6 modules (`import`/`export`), no `require()` | Visual check |
| F6 | Import order: builtins → external → internal (absolute) → parent relative → sibling relative | Visual check |
| F7 | No file extension in import paths | Visual check |
| F8 | Single quotes for JS/TS strings, double quotes for JSX attribute values | Visual check |
| F9 | 2-space indentation | Visual check |
| F10 | Semicolons at end of statements | Visual check |
| F11 | Unix line endings (`\n`) | Visual check |
| F12 | Variables/functions: camelCase; Classes/interfaces/types/enums: PascalCase; Constants: UPPER_SNAKE_CASE | Visual check |
| F13 | React components defined as named function declarations, not anonymous arrow functions | Visual check |
| F14 | No unused `React` import (JSX transform handles it) | `npx tsc --noEmit` |
| F15 | Hooks called only at top level, never in conditions/loops | Visual check |

### i18n completeness

| # | Criterion | Check |
|---|-----------|-------|
| I1 | Every `t('key')` in extracted files has a matching entry in both `zh-CN.json` and `en-US.json` | `npm run i18n:check` |
| I2 | No hardcoded Chinese or English strings in UI code — all wrapped in `t()` | `npm run i18n:check` |

### Behavioral preservation

| # | Criterion | Check |
|---|-----------|-------|
| B1 | TypeScript compiles with zero errors | `npx tsc --noEmit` |
| B2 | All existing tests pass | `npm run test` |
| B3 | No logic changes — the refactored code produces identical behavior | `npm run test` |
| B4 | Every `useEffect` extracted to a hook preserves the same dependency array | Visual check against original |

## Important rules

- **All five directories must exist** (`types/`, `config/`, `utils/`, `hooks/`, `components/`). If a directory has no files, create a `.gitkeep` placeholder.
- **`types/` must be created first.** All component prop interfaces and hook return types go in `types/`, not inline in component or hook files.
- **`index.ts` is required.** Every module must have an `index.ts` that re-exports the main component.
- **Extract ALL hooks.** Every `useEffect`, `useState`, `useMemo`, `useCallback` block in the original file must end up in a hook file. The main component should have zero `useEffect` calls after refactoring.
- **Extract ALL pure functions.** If a function has no React hooks and no side effects, it belongs in `utils/`. Don't leave pure functions in the component.
- **Extract ALL types.** All `type` and `interface` definitions used across multiple files go in `types/`.
- **Use `CSSProperties` not `React.CSSProperties`.** When importing CSS type utilities, import `CSSProperties` directly from `'react'` — do not use `React.CSSProperties` without importing `React`.
- **Match existing style.** Use the same comment density, naming patterns, and import ordering as the rest of the project.
- **Preserve behavior exactly.** This is a pure structural refactor — no logic changes, no new features, no "improvements" to adjacent code.
- **Relative imports from subdirectories.** A file in `hooks/` that needs a store type uses `../../../../store/types`, not an alias.
- **i18n keys stay in components.** The `t()` calls remain in the JSX; only the default values and key constants move to `config/`.
- **Run all four verification commands before committing.** Do not skip any check. If a check fails, fix it before committing.
