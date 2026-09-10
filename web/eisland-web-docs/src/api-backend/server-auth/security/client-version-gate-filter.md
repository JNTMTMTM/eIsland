---
title: ClientVersionGateFilter
---

# ClientVersionGateFilter

:::info
`OncePerRequestFilter` that enforces client version parity by requiring `X-App-Name` and `X-Client-Version` headers on client API paths.
:::

## Overview

Intercepts client-facing API requests and rejects those without valid `X-App-Name` and `X-Client-Version` headers, or whose version does not match the latest version recorded on the server. Returns HTTP 426 (Upgrade Required) with extended business codes on failure.

## Filter Flow

1. Check if request path is a client API (`/v1/user/**` or `/v1/upload/user-avatar`)
2. Skip if path is exempted (auth endpoints, update source, STT WebSocket)
3. Validate `X-App-Name` header is present
4. Validate `X-Client-Version` header is present
5. Look up latest version for the app name via `AppVersionService`
6. Compare client version to latest version
7. On mismatch: return 426 with error; on match: continue chain

## Exempt Paths

| Path | Reason |
|---|---|
| `/auth/user/**` | Auth endpoints -- avoids login/update deadlock |
| `/v1/user/update-source` | PRO update source resolution |
| `/v1/user/ai/stt/realtime` | Real-time STT WebSocket |

## Headers

| Header | Description |
|---|---|
| `X-App-Name` | Application identifier |
| `X-Client-Version` | Client version string (must match server's latest) |

## Error Codes

| Code | Condition | Message |
|---|---|---|
| `4262` | Missing `X-App-Name` | Missing application identifier header |
| `4261` | Missing `X-Client-Version` | Missing client version header |
| `5031` | No version configured for app | Server has not configured available versions for this application |
| `4260` | Version mismatch | Client version is outdated, please upgrade to the latest version |

All errors return HTTP 426 (Upgrade Required).

## Dependencies

- `AppVersionService` -- latest version lookup
- `ObjectMapper` -- JSON error response serialization
