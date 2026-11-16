# CLAUDE.md

## Documentation Structure

The documentation lives in `src/` and is organized into top-level categories:

```
src/
├── introduction/                # Project introduction and architecture
│   ├── README.md                # Top-level documentation index
│   ├── intro/                   # Project introduction
│   │   ├── README.md            # Category index
│   │   ├── project-overview.md  # eIsland project overview
│   │   ├── coc.md               # Code of Conduct
│   │   └── backend-dependencies.md
│   ├── tech-stack/              # Technology stack
│   │   ├── README.md            # Category index
│   │   ├── frontend-tech-stack.md
│   │   └── backend-tech-stack.md
│   ├── frontend-arch/           # Frontend architecture
│   │   ├── README.md            # Category index
│   │   ├── process-model.md     # Electron multi-process model
│   │   ├── states.md            # 19-state state machine (incl. OAuth states)
│   │   └── electron-windows.md  # BrowserWindow instances
│   └── backend-arch/            # Backend architecture
│       ├── README.md            # Category index
│       ├── server-model.md      # Server module architecture
│       ├── mysql-schema.md      # Database schema (incl. user_oauth_binding)
│       ├── redis-schema.md      # Redis key patterns
│       └── rabbitmq-schema.md   # Message queue topology
└── developer/                   # Developer guide
    ├── README.md                # Top-level developer index
    ├── environment-setup/       # Environment configuration
    │   ├── README.md            # Category index
    │   ├── frontend-setup.md
    │   └── backend-setup.md
    ├── commands/                # npm/Maven script reference
    │   ├── README.md            # Category index
    │   ├── dev-commands.md
    │   ├── test-commands.md
    │   ├── quality-commands.md
    │   ├── release-commands.md
    │   ├── package-commands.md
    │   └── esa-commands.md
    ├── code-quality/            # Coding and comment quality standards
    │   ├── README.md            # Category index
    │   ├── code-review.md       # Frontend coding standards
    │   └── comment-quality.md   # JSDoc comment standards
    └── git-operations/          # Git workflows
        ├── README.md            # Category index
        ├── local-operations.md
        └── github-operations.md
```

### Sidebar Rules

Sidebar is configured in `src/.vuepress/sidebar.ts`.

- **Do NOT register `README.md` files in the sidebar.** VuePress automatically uses each subdirectory's `README.md` as the category index page.
- Each subdirectory has a `README.md` that introduces the category and links to its documents.
- The top-level `README.md` serves as the overall documentation index.

### Adding New Documentation

1. Place the file in the appropriate subdirectory.
2. Add the file path to `sidebar.ts` under the correct group.
3. Add a link to the file in the subdirectory's `README.md`.
4. If creating a new subdirectory, create a `README.md` index for it.

## Documentation Rules

### Admonition Syntax

**Every documentation file MUST use admonition syntax.** Each file should include at least one admonition block (`:::tip`, `:::info`, `:::note`, `:::important`, `:::warning`, `:::danger`, or `:::details`) to highlight key information. Use a variety of admonition types across the document — do not rely on a single type.

Documentation files support admonition blocks for emphasizing content:

```md
:::tip
Helpful tips and best practices.
:::

:::info
General information and explanations.
:::

:::note
Noteworthy details and supplementary information.
:::

:::important
Key information that users must be aware of.
:::

:::warning
Important notices and cautions.
:::

:::danger
Critical security notes and breaking changes.
:::
```

Collapsible admonition blocks use `:::details`:

```md
:::details Title — `ClassName.java`
Source: `module/.../ClassName.java` (lines 1–10)

```lua
-- code here
```
:::
```

### Spoiler Text

Use `!!` to wrap spoiler text that requires user interaction to reveal:

```md
This is !!spoiler content!!.
```

### Watermark

Enable watermark on specific pages by adding `watermark: true` to the frontmatter:

```md
---
title: Page Title
watermark: true
---
```

The watermark plugin is configured in `src/.vuepress/theme.ts` with default content "eIsland".

### Language

All documentation content must be written in **English**. No Chinese text is allowed in any documentation files.

### Test Statistics

When documenting test coverage, use accurate numbers from the latest test run:

- **128 test files**
- **2076 tests**

Update these numbers when new test results show different counts.

## Backend Documentation Standards

When documenting database, cache, or message queue schemas:

- **MySQL**: Document every column with Type, Nullable, Default, and Description. Include all indexes with their purpose.
- **Redis**: Document every key pattern with Data Structure, TTL, and Purpose. Embed Lua scripts inline with `:::details` blocks at the corresponding key section.
- **RabbitMQ**: Document all exchanges, queues, bindings, and message types. Include producer/consumer flow tables.
- Cross-reference Java entity classes, mapper XMLs, and service classes as source of truth.

## State Machine Documentation

When documenting island states in `states.md`:

- Each state must have a dedicated section with: Property table, Entry Conditions, Exit Conditions, UI Components Rendered, Behavior Details.
- Use **Mermaid sequence diagrams** for multi-step flows (e.g., OAuth login, payment processing).
- Dimensions must match `STATE_AREA` in `src/renderer/components/config/dynamicIslandStateConfig.ts`.
- State count in the header must match the total entries in `STATE_CONFIGS`.
- Auth-related states (`login`, `register`, `resetPassword`, `setPassword`, `bindOAuth`, `payment`) all use **860×400 px** dimensions.
