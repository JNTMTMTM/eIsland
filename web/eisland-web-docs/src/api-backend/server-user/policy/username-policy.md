---
title: UsernamePolicy
---

# UsernamePolicy

:::info
Utility class enforcing username format validation: Unicode letters, digits, underscores, dots, and hyphens within 2-32 characters.
:::

## Overview

A stateless policy class (private constructor, static methods) that validates usernames at registration and profile update time. Supports international characters via Unicode letter matching.

## Constants

| Constant | Value | Description |
|---|---|---|
| `MIN_LENGTH` | `2` | Minimum username length (by code point) |
| `MAX_LENGTH` | `32` | Maximum username length (by code point) |

## Validation Rules

| Rule | Error Message |
|---|---|
| Must not be null or blank | `"Username cannot be empty"` |
| Length must be 2-32 code points | `"Username must be 2-32 characters"` |
| Only `[\p{L}\p{N}_.\-]` allowed | `"Username only allows letters, numbers, underscores, dots, or hyphens"` |

## Methods

| Method | Return | Description |
|---|---|---|
| `validate(username)` | `String \| null` | Returns error message if invalid, `null` if valid |

## Charset Pattern

```
^[\p{L}\p{N}_.\-]+$
```

- `\p{L}` -- any Unicode letter (Chinese, English, etc.)
- `\p{N}` -- any Unicode digit
- `_` -- underscore
- `.` -- dot
- `-` -- hyphen
