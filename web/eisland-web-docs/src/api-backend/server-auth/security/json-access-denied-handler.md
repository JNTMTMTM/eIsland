---
title: JsonAccessDeniedHandler
---

# JsonAccessDeniedHandler

:::info
Spring Security `AccessDeniedHandler` that returns a unified JSON error response for authenticated but unauthorized requests (HTTP 403).
:::

## Overview

Handles `AccessDeniedException` thrown when an authenticated user lacks the required role or authority. Returns a consistent JSON response structure compatible with the frontend error handling contract.

## Response Format

```json
{
  "code": 403,
  "message": "Access denied"
}
```

| Field | Type | Value |
|---|---|---|
| `code` | `int` | `403` |
| `message` | `String` | `Access denied` |

HTTP Status: `403 Forbidden`

## Dependencies

- `ObjectMapper` -- JSON serialization
