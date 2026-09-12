---
title: ReplayProtectionFilter
---

# ReplayProtectionFilter

:::info
`OncePerRequestFilter` that prevents replay attacks on high-risk write endpoints using `X-Timestamp` and `X-Nonce` headers with Redis-backed deduplication.
:::

## Overview

Intercepts POST/PUT/DELETE requests to protected paths and requires `X-Timestamp` and `X-Nonce` headers. Validates timestamp within a 5-minute skew window and uses Redis `SETNX` to reject duplicate nonces. For unauthenticated login endpoints, uses client IP as the replay principal.

## Protected Methods

`POST`, `PUT`, `DELETE`

## Protected Paths

| Path Pattern | Description |
|---|---|
| `/v1/user/**` | All user API endpoints |
| `/v1/upload/user-avatar` | Avatar upload |
| `/auth/user/login` | User login |
| `/auth/user/login/account` | Account login |
| `/auth/user/login/email` | Email login |

## Filter Flow

1. Check if request method and path are protected
2. Resolve principal: authenticated username, or `ip:{clientIp}` for login endpoints
3. Validate `X-Timestamp` header: must be a valid long within 5-minute skew
4. Validate `X-Nonce` header: length 8--128 characters
5. Redis `SETNX` on nonce key with TTL equal to skew window
6. If key already exists: reject as replay (4003)
7. Otherwise: continue chain

## Headers

| Header | Type | Description |
|---|---|---|
| `X-Timestamp` | `long` | Request timestamp in epoch milliseconds |
| `X-Nonce` | `String` | Unique request identifier (8--128 chars) |

## Error Codes

| Code | Condition | Message |
|---|---|---|
| `4002` | Missing/invalid headers or expired timestamp | Missing replay-protection headers / Invalid nonce / Invalid timestamp / Request time window expired |
| `4003` | Duplicate nonce detected | Duplicate replay request detected |

All errors return HTTP 400.

## Redis Key Pattern

```
auth:replay:{principal}:{method}:{uri}:{nonce}
```

TTL: 5 minutes (matches `ALLOWED_SKEW_MILLIS`).

## Dependencies

- `authSecurityRedisTemplate` -- nonce deduplication (Redis DB 6)
- `ClientIpUtil` -- client IP resolution for unauthenticated requests
- `ObjectMapper` -- JSON error response serialization
