---
title: Code Quality Review
icon: code
---

# Code Quality Review

:::info
This document outlines the frontend coding standards for the eIsland project. All frontend code must comply with these rules — no exceptions.
:::

## HTML Standards

### Document Structure

All HTML documents must start with an HTML5 doctype declaration in lowercase, and include the required structural elements: `<html>`, `<head>`, and `<body>`.

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Page Title</title>
</head>
<body>
</body>
</html>
```

### Language and Encoding

Specify the language attribute on the root HTML element and declare UTF-8 encoding explicitly.

```html
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
</head>
```

### Formatting Rules

- Use **2 spaces** for indentation
- All HTML tags use lowercase
- All attribute values must use **double quotes**
- Self-closing elements do **not** need a trailing slash in HTML5

### Attribute Order

HTML attributes should follow this order:

1. `class`
2. `id`, `name`
3. `data-*`
4. `src`, `for`, `type`, `href`, `value`
5. `title`, `alt`
6. `role`, `aria-*`
7. `tabindex`
8. `style`

### Semantic HTML

- Ensure headings follow a logical hierarchy (`h1` → `h2` → `h3`) without skipping levels
- All `<img>` tags must have an `alt` attribute
- Avoid inline event handlers — use external JavaScript instead
- A page must have only **one** `<main>` element

---

## CSS Standards

### Tailwind CSS

#### Class Order

Tailwind classes must follow the **official order** (`better-tailwindcss/enforce-consistent-class-order` with `order: 'official'`). The general sequence is: layout → box model → typography → visual effects.

```html
<button class="flex items-center justify-center w-full p-4 font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600">
  Click me
</button>
```

:::important
Prefer Tailwind shorthand forms when available (e.g., `mx-4` instead of `ml-4 mr-4`). The `better-tailwindcss/enforce-shorthand-classes` rule enforces this.
:::

#### ESLint-Enforced Rules

The following Tailwind rules are enforced by `eslint-plugin-better-tailwindcss` for all files under `src/renderer/`:

| Rule | Level | Description |
|------|-------|-------------|
| `enforce-consistent-class-order` | Error | Classes must follow the official order |
| `enforce-shorthand-classes` | Error | Must use shorthand when available |
| `no-restricted-classes` | Error | Negative arbitrary values: `-` must be outside brackets |
| `no-unknown-classes` | Error | Flags classes not in the Tailwind config |
| `no-conflicting-classes` | Error | Flags mutually exclusive classes |
| `no-duplicate-classes` | Error | Flags duplicate class names |

:::note
Tailwind CSS rules only apply to files under `src/renderer/`. Other directories (plugins, SDK, docs) are not checked.
:::

#### Utility-First Principle

To enforce the utility-first approach, avoid adding custom semantic class names to components. All styles should be composed from atomic utility classes. If customization is truly needed, use `@apply` in CSS.

#### Arbitrary Values

For negative arbitrary values, the `-` sign must be placed **outside** the brackets.

```html
<div class="-top-[-10px]">...</div>
```

### General CSS Rules

- Use **2 spaces** for indentation
- All code uses **lowercase** (except strings)
- Use **double quotes** consistently
- One blank line between rule sets; no trailing whitespace
- Use **kebab-case** for class names, IDs, keyframes, and custom media queries

### Selector Complexity Limits

| Rule | Limit |
|------|-------|
| ID selectors | **Forbidden** |
| Class selectors per selector | Max 4 |
| Attribute selectors per selector | Max 2 |
| Combinators per selector | Max 4 |
| Universal selectors per selector | Max 1 |
| Type selectors per selector | Max 2 |
| Type selector prefixing a class/ID | **Forbidden** (e.g., `div.my-class`) |

### Color Rules

- Prefer 3-digit hex shorthand
- Color values must be **lowercase**
- **Color names are forbidden** (use hex or HSL)
- Hue values use angle units (`deg`)

```css
.element {
  color: #fff;
  background-color: #f0c;
  border-color: hsl(270deg 60% 70%);
}
```

### Numeric Rules

- Omit units for zero values (`padding: 0`)
- Omit leading zero for decimals below 1 (`opacity: .5`)
- No trailing zeros

### Property Declaration Order

Properties should be declared in this order:

1. Composition rules (`composes`)
2. `all`
3. Positioning (`position`, `top`, `z-index`, etc.)
4. Display mode (`box-sizing`, `display`)
5. Flexbox
6. Grid
7. Spacing (`gap`)
8. Alignment (`align-*`, `justify-*`)
9. Order
10. Box model (`width`, `height`, `padding`, `margin`, `overflow`)
11. Typography (`font-*`, `color`, `text-*`)
12. Interaction (`cursor`, `pointer-events`)
13. Background and border
14. Mask
15. SVG properties
16. Transitions and animations
17. Paged media

:::danger
`!important` is **strictly forbidden**.
:::

---

## JavaScript / TypeScript Standards

### Variables and Constants

- Prefer `const` for constants, `let` for reassignable variables. **Avoid `var`**.
- Declare **one variable per** `const` or `let` statement
- Variables must be defined before use
- **Never delete variables**
- Avoid initializing to `undefined`

```typescript
const name = 'Alice';
let age = 30;
```

### Data Types

- Use literals for primitive types
- Use `as const` for read-only constants when the type is explicit
- **`any` type is forbidden** unless absolutely necessary
- **Forbidden wrappers**: `Function`, `Object`, `String`, `Number`, `Boolean`

```typescript
const config = {
  host: 'localhost',
  port: 8080,
} as const;
```

### Objects

- Use object literals `{}`
- Use shorthand method syntax
- Use shorthand property syntax (placed at the **beginning** of the object)
- Only quote invalid identifiers (e.g., `'data-test'`)
- Use `Object.hasOwn()` instead of `Object.prototype.hasOwnProperty`
- Prefer spread `...` over `Object.assign`

### Arrays

- Use array literals `[]`
- Use `Array.from()` for array-like conversions
- Callbacks must have a `return` statement (unless implicit)
- **Avoid `for...in`** on arrays
- Prefer higher-order functions (`map`, `filter`, `reduce`) over `for` loops

### Strings

- Use **single quotes** `''` for strings
- Prefer **template literals** for concatenation
- Avoid unnecessary escape characters

```typescript
const message = `Hello, ${name}!`;
```

### Functions

- Use function declarations or expressions, not `new Function()`
- Do not declare functions inside non-function blocks (`if`, `while`)
- Set default values in parameters, not in the function body
- Parameters with defaults go at the **end** of the parameter list
- Prefer rest parameters `...` over `arguments`
- No space before parentheses in function calls

### Arrow Functions

- Use for anonymous callbacks
- Omit braces and `return` for single-expression bodies without side effects

```typescript
const square = (x: number) => x * x;
```

### Classes and Interfaces

- Always use `class` — avoid direct `prototype` manipulation
- Call `super()` in non-empty constructors
- **One class per file**
- Prefer `interface` over `type` for object shapes; use `type` for unions and tuples

### Modules

- Use ES6 modules (`import`/`export`) exclusively — **CommonJS (`require`/`module.exports`) is forbidden**
- No file extensions in import paths (except `.mjs` and `.cjs` which must always be explicit)
- Use `export default` for single-export modules
- Imports at the **top** of the file, ordered: builtins → external → internal (absolute) → parent relative → sibling relative → index → type-only
- No duplicate imports — merge from the same module into a single statement

:::important
Import ordering is enforced by `import-x/order`. The full group order is: `builtin` → `external` → `internal` → `parent` → `sibling` → `index` → `type`.
:::

### ESLint Disable Comments

- Every `eslint-disable` comment **must specify the rule name** — unlimited disables are forbidden
- Every disable comment **must include a reason** after the `--` separator
- Re-enable disabled rules as soon as possible — do not leave broad disables spanning large blocks
- Unused disable / enable directives will cause lint failures

```typescript
// eslint-disable-next-line no-eval -- Third-party library requires eval for template parsing
const result = eval(template);
```

:::warning
The `eslint-comments/no-unlimited-disable`, `eslint-comments/require-description`, `eslint-comments/no-unused-enable`, and `eslint-comments/disable-enable-pair` rules are all enforced at error level.
:::

### Comparison and Equality

- Always use `===` and `!==`
- No explicit comparison of booleans to `true`/`false`

```typescript
const isAdult = age >= 18;       // ✅
const isAdult = age >= 18 ? true : false; // ❌
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables, functions | camelCase or PascalCase | `userName`, `getUser()`, `UserProfile` |
| Classes, interfaces, types, enums | PascalCase | `UserProfile`, `StatusEnum` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| No leading/trailing underscores | — | — |
| File names | camelCase or kebab-case | `userProfile.ts` or `user-profile.ts` |

:::note
The `@typescript-eslint/naming-convention` rule enforces: `variableLike` must be `camelCase`, `PascalCase`, or `UPPER_CASE` (no leading/trailing underscores); `typeLike` must be `PascalCase`.
:::

### Promises and Async

- Prefer `async/await`
- `reject` reasons should be `Error` objects
- Always include `.catch()` or `try...catch`
- Avoid `return`/`throw`/`break`/`continue` in `finally` blocks
- Avoid unnecessary `await`
- Avoid `await` in loops — use `Promise.all` for parallelism
- Prefer `await` over `.then()` chains (`promise/prefer-await-to-then`)
- Avoid nesting promises — flatten with `async`/`await` (`promise/no-nesting`)
- Every promise must be awaited or returned — floating promises are errors (`@typescript-eslint/no-floating-promises`)
- `return await` is forbidden — either return directly or use `try`/`catch` (`@typescript-eslint/return-await`)

```typescript
async function fetchData() {
  return fetch('/api/data'); // ✅ Direct return
}
```

### Security

:::danger
`eval()` and `new Function()` are **strictly forbidden**. `javascript:` URLs are forbidden. Never use `innerHTML`/`outerHTML` with unvalidated content.
:::

---

## React Standards

### File Extensions and Component Definition

- React component files use **`.tsx`** extension
- Named components **must** use `function` declaration or expression — arrow functions are forbidden for named components
- Anonymous components **must** use arrow functions
- **Do not import `React`** (React 17+ JSX transform handles this)

:::important
The `react/function-component-definition` rule enforces: `namedComponents: ['function-declaration', 'function-expression']` and `unnamedComponents: 'arrow-function'`. This means `const Foo = () => <div />` is invalid — use `function Foo() { return <div />; }` instead.
:::

### JSX Rules

- JSX attributes use **double quotes**; JS/TS strings use **single quotes**
- Boolean `true` values are omitted: `<Checkbox checked />`
- Self-closing tags have a space before the slash: `<MyComponent />`
- Multi-line JSX must be wrapped in parentheses
- No spaces inside JSX curly braces: `name={userName}` not `name={ userName }`
- First prop stays on the same line as the tag opening — never on a new line (`react/jsx-first-prop-new-line: never`)
- Props indent by **2 spaces** (`react/jsx-indent-props: 2`)
- Component names must use PascalCase (`react/jsx-pascal-case`)
- No inline arrow functions or `.bind()` in JSX props (`react/jsx-no-bind`) — use `useCallback` or extract handlers
- No `dangerouslySetInnerHTML` (`react/no-danger`) — use DOMPurify for untrusted content
- All `target="_blank"` links must include `rel="noopener noreferrer"` (`react/jsx-no-target-blank`)

### Props

- Destructure props in the function parameter — always use destructuring assignment (`react/destructuring-assignment: always`)
- Use default parameters for optional props
- **Props spreading is forbidden** — pass each prop explicitly (`react/jsx-props-no-spreading: error`)
- **Never use array index as `key`** — use stable unique identifiers (`react/no-array-index-key: error`)
- State variables must use the `useState` hook pattern (`react/hook-use-state: error`)

```tsx
items.map((item) => <ListItem key={item.id} item={item} />); // ✅
items.map((item, index) => <ListItem key={index} item={item} />); // ❌
```

### Hooks Rules

- **Only call Hooks at the top level** — never in loops, conditions, or nested functions
- **Only call Hooks in React functions** — components or custom Hooks
- `useEffect`, `useCallback`, `useMemo` must include **all external dependencies**
- Use symmetric naming: `[count, setCount]`

### React Compiler Compatibility

- **Never mutate State during rendering** — update in event handlers only
- Treat Props and State as **immutable** — use functional updates

```tsx
setUser(currentUser => ({ ...currentUser, age: currentUser.age + 1 })); // ✅
```

### Performance

- Avoid creating new objects/arrays/functions in render — define externally or memoize
- **Never define nested components** inside another component's render function (`react/no-unstable-nested-components: error`)
- No inline function bindings in JSX — extract to `useCallback` or class methods (`react/jsx-no-bind: error`)

### Accessibility

Accessibility rules are enforced by `eslint-plugin-jsx-a11y` (`flatConfigs.recommended`):

- All `<img>` tags must have `alt` (empty string `""` for decorative images)
- `<a>` tags must have content and a valid `href`
- Interactive non-button elements need `role` and keyboard handlers — prefer `<button>` directly
- No `target="_blank"` without `rel="noopener noreferrer"`
- ARIA attributes must be valid and match their roles
- HTML elements must have valid nesting and structure

:::tip
The project uses `eslint-plugin-jsx-a11y` with the recommended flat config. All accessibility violations are errors — fix them before committing.
:::

---

## Next.js Standards

### Server vs. Client Components

- Default to **Server Components** — add `'use client'` only when hooks, browser APIs, or event listeners are needed
- Client Components **cannot** be `async` functions

```tsx
'use client';

import { useState } from 'react';

export default function SubmitButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button onClick={() => setLoading(true)}>
      {loading ? 'Loading...' : 'Submit'}
    </button>
  );
}
```

### Image Optimization

:::important
**Must use `next/image`** — HTML `<img>` tags are forbidden. LCP images require the `priority` attribute. Always specify `width` and `height` (or `fill`).
:::

```tsx
import Image from 'next/image';

<Image src={heroImage} alt="Hero Banner" priority width={1200} height={600} />
```

### Script Loading

- **Must use `next/script`** — synchronous `<script>` tags are forbidden
- Inline scripts must have an `id` attribute
- Do not place `<Script>` inside `<head>` or Metadata

### Metadata and SEO

- Use the Metadata API (`metadata` object or `generateMetadata`)
- **Never use** `<head>` tags or `next/head`

### Fonts

- **Must use `next/font`** — importing Google Fonts via `<link>` is forbidden

### Navigation

- **Internal links**: Must use `<Link>` — `<a>` for internal pages is forbidden
- **External links**: Use `<a>` with `rel="noopener noreferrer"` when `target="_blank"`
- **Programmatic navigation**: Use `useRouter` from `next/navigation` (never `next/router`)

---

## Forbidden Patterns Summary

| Pattern | Reason | Alternative |
|---------|--------|-------------|
| `var` | Function scope, causes bugs | `const` / `let` |
| `any` | Bypasses type checking | Explicit type or `unknown` |
| `type` for object shapes | Inconsistent with interface declarations | `interface` |
| `==` / `!=` | Implicit coercion | `===` / `!==` |
| `eval()` | XSS security risk | Redesign |
| `new Function()` | XSS security risk | Redesign |
| `javascript:` URL | Security risk | `onClick` or `Link` |
| `require()` / `module.exports` | Not ES modules | `import` / `export` |
| Inline event handlers | Hard to maintain | External JS or event delegation |
| HTML `<img>` | Performance | `next/image` |
| Plain `<script>` | Blocks rendering | `next/script` |
| `<a>` for internal navigation | Full page refresh | `<Link>` component |
| CSS `!important` | Breaks specificity | Reorganize selectors |
| Array index as `key` | List update bugs | Stable unique ID |
| Props spreading `...props` | Unmaintainable | Pass each prop explicitly |
| `innerHTML` / `outerHTML` | XSS risk | Direct text rendering or sanitization |
| `for...in` / `for...of` | Prefer functional style | `map`, `filter`, `reduce`, `Array.from` |
| Inline arrow in JSX props | Causes re-renders | `useCallback` or extracted handler |
| Nested components in render | Unmounts/remounts on every render | Define outside the parent component |
| Floating promises | Silent error swallowing | `await` or `return` |
| Unlimited `eslint-disable` | Masks real issues | Specify rule name |
