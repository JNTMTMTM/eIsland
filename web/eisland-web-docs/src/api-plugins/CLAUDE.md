# API Plugins Documentation Guidelines

## Icon Convention

Every documentation file MUST use the correct icon in frontmatter based on its type:

| Type | Icon | Example |
|------|------|---------|
| Function/Method | `fa6-solid:code` | `getPowerInfo` |
| Interface/Type | `fa6-solid:table` | `BluetoothDeviceInfo` |
| Class/Monitor | `fa6-solid:cubes` | `BluetoothMonitor` |
| Enum | `fa6-solid:list` | `BatteryStatus` |
| Plugin index | Category icon | `bluetooth`, `music`, etc. |

## Code Examples

All function/method documentation MUST include both TypeScript and JavaScript code blocks using the `code-tabs` syntax:

```markdown
::: code-tabs

@tab TypeScript

```ts
import { functionName } from '@eisland/plugin-name';
// TypeScript example
```

@tab JavaScript

```js
const { functionName } = require('@eisland/plugin-name');
// JavaScript example
```

:::
```

## Required Sections (Function/Method)

Every function/method document MUST include these sections in this exact order:

1. **Info admonition** — Brief description of what the function does, including how it works internally and what it returns
2. **Signature** — TypeScript function signature in a code block
3. **Parameters** — Table with Parameter, Type, Description columns
4. **Usage** — Description of when to use, typical workflow as numbered list, followed by `:::note` and `:::tip` admonitions
5. **Return Value** — Table with Type and Description, followed by explanation paragraph and `:::warning` admonition
6. **Example** — `::: code-tabs` with `@tab TypeScript` and `@tab JavaScript` sections (import/require style)
7. **Notes** — Exactly 3 admonitions: `:::note`, `:::tip`, `:::important` (each linking to related functions)
8. **Danger Avoidance** — `:::danger` admonition with anti-patterns

## Section Details

### Info Admonition
- Must start with "Retrieves..." or "Sends..." or similar action verb
- Must describe the internal mechanism (e.g., "using Win32 API", "via COM interop")
- Must state the return type (e.g., "Returns the icon as a PNG `Buffer`, or `null`...")

### Parameters Table
```markdown
| Parameter | Type | Description |
|-----------|------|-------------|
| `paramName` | `type` | Description (with constraints) |
```

### Usage Section
- 2-3 sentences describing when to use
- "It is part of the [Plugin Name] plugin." as last sentence
- "Typical workflow:" followed by numbered steps
- One `:::note` with constraint or edge case
- One `:::tip` with optimization or alternative

### Return Value Section
```markdown
| Type | Description |
|------|-------------|
| `Buffer \| null` | Description, or `null` if condition |
```
- Followed by "The buffer contains..." explanation paragraph
- One `:::warning` with important caveat

### Example Section
- `::: code-tabs` wrapper
- `@tab TypeScript` with `import` style
- `@tab JavaScript` with `require` style
- Both tabs MUST have identical logic (only import/require differs)
- Include 2-3 examples: basic usage, with error handling, edge case

### Notes Section
Exactly 3 admonitions in this order:
1. `:::note` — Constraint or prerequisite
2. `:::tip` — Alternative function or optimization (with link)
3. `:::important` — Best practice or performance tip (with link)

### Danger Avoidance Section
- `:::danger` admonition with anti-pattern warning
- Can have multiple `:::danger` blocks if needed

## Admonition Types

| Type | Use For |
|------|---------|
| `:::info` | Document introduction (required) |
| `:::tip` | Best practices, helpful shortcuts |
| `:::note` | Supplementary information, constraints |
| `:::important` | Key information users must know |
| `:::warning` | Cautions, potential issues |
| `:::danger` | Critical warnings, anti-patterns (required) |

Each document MUST use at least 4 different admonition types.

## Cross-References

Link to related documents using relative paths:

```markdown
See [getStatus](get-status.md) for current state.
Refer to [CommandResult](command-result.md) for return type details.
```

Every Notes section MUST include at least one cross-reference to a related function.

## Sidebar Badge Registration

When adding new Interface, Enum, or Monitor documentation, you MUST register the badge in `src/.vuepress/components/SidebarBadges.vue`:

1. Open `src/.vuepress/components/SidebarBadges.vue`
2. Add the name to `BADGE_MAP` with the correct type:

```typescript
const BADGE_MAP: Record<string, string> = {
  // ... existing entries ...
  YourNewInterface: 'interface',
  YourNewEnum: 'enum',
  YourNewMonitor: 'monitor',
}
```

3. Badge types match the icon convention:

| Badge Type | Icon | Description |
|------------|------|-------------|
| `interface` | `fa6-solid:table` | Data structures, interfaces |
| `enum` | `fa6-solid:list` | Enumerations |
| `monitor` | `fa6-solid:cubes` | Monitor classes |
| `function` | `fa6-solid:code` | Auto-detected by URL pattern |

:::important
Function badges are auto-detected from URL patterns (`get*`, `set*`, `close*`, `start*`, `stop*`, `is*`, `enable*`, `disable*`, `request*`, `play*`, `pause*`, `next*`, `previous*`, `seek*`). You do NOT need to register functions manually.
:::

:::warning
If you forget to register a badge, the sidebar item will not show its type indicator. Always verify badges appear after adding new documentation.
:::
