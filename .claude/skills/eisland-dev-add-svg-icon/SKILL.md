---
name: eisland-dev-add-svg-icon
author: 鸡哥
description: >
  Add a new SVG icon to the project's icon enum system with matching test assertions.
  Use this skill whenever the user asks to "add SVG icon", "添加图标", "add icon enum",
  "注册图标", "补齐图标枚举", "add SVG enum", or wants to register a new .svg file
  in the SvgIcon utility. Also trigger when the user provides a path to an .svg file
  and asks to create enum/test for it.
---

# Add SVG Icon Enum and Test

Register a new SVG file in the project's icon enum system and ensure test coverage.

## When to use

- User provides an SVG file path and asks to add it to the enum
- User says "添加图标", "add icon", "补齐枚举", "注册 SVG"
- User adds a new `.svg` file to `src/renderer/public/svg/` and wants it registered

## Project structure

```
src/renderer/public/svg/
├── *.svg                  → SvgIcon (eisland-icon.ts)
├── agent/*.svg            → AgentIcon (agent-icon.ts)
├── calculator/*.svg       → CalculatorIcon (calculator-icon.ts)
├── countries/*.svg        → CountryIcon (country-icon.ts)
├── devicons/*.svg         → DevIcon (dev-icon.ts)
├── player/*.svg           → PlayerIcon (player-icon.ts)
└── services/*.svg         → ServiceIcon (service-icon.ts)

src/renderer/utils/SvgIcon/
├── index.ts               → unified exports
├── eisland-icon.ts        → SvgIcon enum
├── agent-icon.ts          → AgentIcon enum
├── calculator-icon.ts     → CalculatorIcon enum
├── country-icon.ts        → CountryIcon enum + aliases + resolvers
├── dev-icon.ts            → DevIcon enum + aliases + resolvers
├── player-icon.ts         → PlayerIcon enum
├── service-icon.ts        → ServiceIcon enum
└── test/
    ├── eisland-icon.test.ts
    ├── agent-icon.test.ts
    ├── calculator-icon.test.ts
    ├── country-icon.test.ts
    ├── dev-icon.test.ts
    ├── player-icon.test.ts
    └── service-icon.test.ts
```

## Process

### Step 1: Identify the icon category

Determine which enum the SVG belongs to based on its filesystem path:

| SVG path | Enum file | Enum name | Path prefix |
|----------|-----------|-----------|-------------|
| `svg/FOO.svg` | `eisland-icon.ts` | `SvgIcon` | `./svg/` |
| `svg/agent/FOO.svg` | `agent-icon.ts` | `AgentIcon` | `./svg/agent/` |
| `svg/calculator/FOO.svg` | `calculator-icon.ts` | `CalculatorIcon` | `./svg/calculator/` |
| `svg/countries/FOO.svg` | `country-icon.ts` | `CountryIcon` | `./svg/countries/` |
| `svg/devicons/FOO.svg` | `dev-icon.ts` | `DevIcon` | `/svg/devicons/` |
| `svg/player/FOO.svg` | `player-icon.ts` | `PlayerIcon` | `./svg/player/` |
| `svg/services/FOO.svg` | `service-icon.ts` | `ServiceIcon` | `./svg/services/` |

Note the path prefix difference: root/agent/countries/player/services use `./svg/...`, devicons use `/svg/...`.

### Step 2: Derive the enum key

Use the SVG filename (without extension), converted to UPPER_SNAKE_CASE for eisland-icon, agent-icon, and player-icon. Examples:
- `FILTER.svg` → `FILTER`
- `CLAUDE.svg` → `CLAUDE`
- `PIN_ON_TOP.svg` → `PIN_ON_TOP`
- `applemusic.svg` → `APPLE_MUSIC`
- `qqmusic.svg` → `QQMUSIC`

For country-icon and dev-icon, keys follow their existing conventions (e.g., `CHN`, `javascript`).

### Step 3: Add to the enum

Read the enum file, then add the new entry before the closing `} as const;`. Keep entries sorted logically or grouped with related icons — match the existing ordering style.

**eisland-icon.ts / agent-icon.ts / calculator-icon.ts / player-icon.ts / service-icon.ts pattern:**
```ts
  NEW_ICON: './svg/NEW_ICON.svg',
  // player-icon.ts uses: './svg/player/name.svg'
  // service-icon.ts uses: './svg/services/name.svg'
  // calculator-icon.ts uses: './svg/calculator/name.svg'
```

**country-icon.ts / dev-icon.ts:** These have aliases and resolver functions. Only add if the user explicitly asks, and follow the existing alias/resolver patterns.

### Step 4: Update the test file

Read the test file for the enum, then make three changes:

1. **Add property assertion** — add `expect(EnumName).toHaveProperty('NEW_KEY');` in the "should contain expected keys" test block.

2. **Update key count** — the test has an assertion like `expect(Object.keys(EnumName)).toHaveLength(N)`. Increment N by 1.

3. **Path format check** — verify the existing path regex test covers the new entry's path format. No change needed unless the path format differs from existing entries.

### Step 5: Export from index.ts (new category only)

If adding to an existing enum file (eisland-icon, agent-icon, calculator-icon, etc.), no change to `index.ts` is needed — it's already exported.

If creating a **new** category (a new enum file), add the export to `src/renderer/utils/SvgIcon/index.ts`:
```ts
export { NewEnum } from './new-enum';
export type { NewEnumKey } from './new-enum';
```

### Step 6: Run tests

```bash
npx vitest run src/renderer/utils/SvgIcon/test/<enum-name>.test.ts
```

All tests must pass. If the key count assertion fails, double-check the count update in Step 4.

## Important rules

- **Never modify existing entries** — only add new ones
- **Match existing code style** — look at surrounding entries for trailing commas, spacing, comments
- **Update key count in tests** — forgetting this is the most common mistake
- **Run tests before reporting done** — verify the change actually works
- **Path prefix must match the category** — `./svg/` vs `/svg/` matters
