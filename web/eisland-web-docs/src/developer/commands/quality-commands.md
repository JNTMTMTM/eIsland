---
title: Code Quality Commands
icon: check-double
---

# Code Quality Commands

:::info
This document covers all code quality commands for the eIsland project — ESLint, Stylelint, HTML validation, comment checks, and i18n completeness.
:::

All commands are run from the project root:

```bash
npm run <script>
```

:::warning
Commands using `--experimental-strip-types` require **Node.js 22+**. See [Frontend Setup — Prerequisites](/developer/environment-setup/frontend-setup.md#prerequisites).
:::

## ESLint

### `lint`

Runs ESLint on the entire project with zero warnings allowed.

```bash
npm run lint
```

**Under the hood:** `eslint . --max-warnings=0`

**What it checks:**
- JavaScript / TypeScript syntax and best practices
- React hooks rules and JSX conventions
- Import ordering and deduplication
- JSDoc comment completeness
- Tailwind CSS class ordering and validity
- Accessibility (jsx-a11y)
- Promise handling patterns

:::important
Run this before every commit. CI rejects PRs that fail the lint check.
:::

### `lint:eslint`

Alias for `lint` — runs the same ESLint check.

```bash
npm run lint:eslint
```

### `lint:fix`

Runs ESLint with automatic fixing. Corrects formatting, import order, and other auto-fixable issues.

```bash
npm run lint:fix
```

**Under the hood:** `eslint . --fix --max-warnings=0`

:::tip
Use `lint:fix` after pulling upstream changes to auto-resolve formatting conflicts. Review the diff before committing — auto-fix may change behavior in edge cases.
:::

### `lint:comments`

Runs only the comment-related ESLint rules (JSDoc, file headers, method comments). Faster than a full lint when you only need to validate documentation compliance.

```bash
npm run lint:comments
```

**Under the hood:** `eslint . --config scripts/lint/comments.config.mjs --max-warnings=0`

**What it checks:**
- Copyright headers and `@file` / `@description` / `@author` tags
- JSDoc on exported functions, classes, and class methods
- Parameter and return value documentation

:::note
This uses a dedicated config (`comments.config.mjs`) that filters the main ESLint config to only JSDoc and project comment rules.
:::

## Stylelint

### `lint:css`

Runs Stylelint on all CSS and SCSS files in `src/` and `web/`.

```bash
npm run lint:css
```

**Under the hood:** `stylelint "{src,web}/**/*.{css,scss}" "web/**/.vuepress/**/*.{css,scss}" --max-warnings=0`

**What it checks:**
- Selector complexity limits (max classes, IDs, combinators)
- Property declaration order (position → display → box model → typography → visual)
- Color rules (no named colors, lowercase hex, angle units for hue)
- `!important` forbidden
- Kebab-case naming for classes, IDs, keyframes
- SCSS nesting, operator spacing, and mixin conventions

### `lint:css:fix`

Runs Stylelint with automatic fixing.

```bash
npm run lint:css:fix
```

:::tip
Stylelint auto-fix handles property reordering, shorthand consolidation, and quote normalization. Always review the output — property order changes can affect cascade behavior.
:::

## HTML Validation

### `lint:html`

Validates all HTML files against the project's HTML standards.

```bash
npm run lint:html
```

**Under the hood:** `html-validate "{src,web}/**/*.html" --max-warnings=0`

**What it checks:**
- Lowercase `<!doctype html>` declaration
- Required `lang` attribute on `<html>`
- Required `alt` on `<img>` tags
- Double quotes for attributes
- Boolean attributes use omit style (e.g., `checked` not `checked="checked"`)
- Void elements omit self-closing slash
- Heading hierarchy (no skipped levels)
- Input elements have associated labels

:::note
The project includes a custom `eisland/document-standards` HTML rule that enforces additional conventions beyond the standard `html-validate:recommended` preset.
:::

## Combined Commands

### `lint:all`

Runs all lint checks in parallel — ESLint, Stylelint, HTML validation, and i18n completeness.

```bash
npm run lint:all
```

**Under the hood:** `run-p --continue-on-error lint:eslint lint:css lint:html i18n:check`

:::important
`lint:all` uses `--continue-on-error`, so all checks run even if one fails. Review all failures, not just the first one.
:::

### `lint:config:test`

Runs the ESLint configuration self-test — validates that rules load correctly, environment isolation works, and key requirements are enforced.

```bash
npm run lint:config:test
```

**Under the hood:** `node --test scripts/lint/config.test.mjs`

**What it verifies:**
- Basic rules detect `var`, loose equality, `any`, and dangerous constructors
- Type-aware checks catch dangling promises
- Project rules detect shorthand order violations and bad filenames
- Comment rules enforce file headers, author tags, and JSDoc
- Disable comments require rule names and descriptions
- React rules detect hook violations, props spreading, and missing `alt`
- Node / browser global isolation works correctly
- CSS rules detect `!important`, named colors, and ID selectors
- HTML rules detect uppercase doctype, missing lang, and missing alt

:::tip
Run `lint:config:test` after modifying any ESLint, Stylelint, or HTML-validate configuration to verify the changes don't break existing rules.
:::

## Comment & i18n Checks

### `comment:check`

Validates that source files comply with the project's comment standards.

```bash
npm run comment:check
```

**Under the hood:** `node --experimental-strip-types scripts/check-comment-standards.ts`

**What it checks:**
- JSDoc headers on exported functions and classes
- Inline comments for complex logic
- Compliance with project documentation conventions

:::important
Run this before committing. CI will reject PRs that fail the comment check.
:::

### `i18n:check`

Validates i18n completeness — checks that all `t()` keys exist in both `zh-CN.json` and `en-US.json`.

```bash
npm run i18n:check
```

**Under the hood:** `node --experimental-strip-types scripts/check-i18n-completeness.ts`

**When to use:**
- After any UI change that adds or modifies `t()` translation calls
- Before committing to catch missing translations early

:::tip
Run this after adding new UI text. A missing translation key will show a runtime fallback (usually the key name itself), which looks broken to users.
:::

## Troubleshooting

### Fails with Syntax Error

**Node.js version too old:**

```bash
node -v  # Must be v22+

# If using nvm-windows
nvm install 25
nvm use 25
```

:::important
Both `comment:check` and `i18n:check` use `--experimental-strip-types` (Node.js 22+ native TypeScript execution). Older Node.js versions will fail with syntax errors on TypeScript annotations.
:::

### ESLint Config Not Found

If ESLint reports missing configuration:

```bash
# Ensure the lint workspace dependencies are installed
cd scripts/lint && npm install && cd ../..
```

:::note
The ESLint configuration lives in `scripts/lint/` as a separate workspace (`@eisland/lint-config`). Its dependencies are installed automatically via the root `npm install`, but may need a manual install after branch switches.
:::
