---
title: JwtAuthenticationFilter
---

# JwtAuthenticationFilter

:::info
`OncePerRequestFilter` that extracts JWT from `Authorization: Bearer` header, validates signature/expiry/session/status, and populates Spring SecurityContext.
:::

## Overview

Parses the JWT from the `Authorization` header, validates the token signature and expiry, checks user existence, ban status, enabled flag, and session token consistency. On success, sets the `SecurityContextHolder` authentication and exposes `username`, `role`, and `userId` as request attributes. On failure, writes a JSON error response and short-circuits the filter chain.

## Filter Flow

1. Extract `Bearer` token from `Authorization` header
2. Validate token signature and expiry via `JwtUtil`
3. Parse `username` and `role` from token claims
4. Load `User` from database by username
5. Check: user exists, not banned, enabled, session token matches
6. On success: set `SecurityContext` + request attributes, continue chain
7. On failure: write JSON error, abort chain

## Extended Business Codes

| Code | Constant | Description |
|---|---|---|
| `4011` | `CODE_SESSION_KICKED` | Session invalidated -- account logged in on another device |
| `4031` | `CODE_USER_BANNED` | User account is banned |

## Error Responses

| Condition | HTTP Status | Code | Message |
|---|---|---|---|
| User deleted | 401 | 401 | Account has been deleted |
| User banned | 403 | 4031 | Account has been banned |
| User disabled | 401 | 401 | Account has been disabled |
| Session kicked | 401 | 4011 | Account logged in on another device |

## Request Attributes Set

| Attribute | Type | Description |
|---|---|---|
| `username` | `String` | Authenticated username |
| `role` | `String` | Effective role (from DB, falling back to token) |
| `userId` | `Long` | Authenticated user ID |

## Dependencies

- `JwtUtil` -- token parsing and validation
- `UserService` -- user lookup
- `UserBanBloomService` -- ban status check via bloom filter
- `ObjectMapper` -- JSON error response serialization
