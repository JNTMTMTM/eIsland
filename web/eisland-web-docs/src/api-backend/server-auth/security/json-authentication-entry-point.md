---
title: JsonAuthenticationEntryPoint
---

# JsonAuthenticationEntryPoint

:::info
Spring Security `AuthenticationEntryPoint` that returns a unified JSON error response for unauthenticated or expired-token requests (HTTP 401).
:::

## Overview

Handles `AuthenticationException` thrown when a request lacks valid authentication. Supports custom error messages and codes via request attributes set by upstream filters (e.g. `JwtAuthenticationEntryPoint`).

## Response Format

```json
{
  "code": 401,
  "message": "Not logged in or token has expired"
}
```

| Field | Type | Default | Customizable Via |
|---|---|---|---|
| `code` | `int` | `401` | `request.getAttribute("auth_error_code")` |
| `message` | `String` | `Not logged in or token has expired` | `request.getAttribute("auth_error_message")` |

HTTP Status: `401 Unauthorized`

## Request Attributes

| Attribute | Type | Description |
|---|---|---|
| `auth_error_code` | `Integer` | Custom business error code (defaults to 401) |
| `auth_error_message` | `String` | Custom error message (defaults to "Not logged in or token has expired") |

## Dependencies

- `ObjectMapper` -- JSON serialization
