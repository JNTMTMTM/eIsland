# Feedback QQ Group Config API

:::info
QQ group invitation configuration endpoints under `/v1/`. Allows admins to manage the QQ group link displayed on the feedback page, and clients to fetch the current active config.
:::

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /v1/feedback/qq-group | Public | Get current active QQ group config |
| GET | /v1/admin/feedback/qq-group | ADMIN | Get QQ group config (including disabled) |
| PUT | /v1/admin/feedback/qq-group | ADMIN | Update QQ group config |

### GET /v1/feedback/qq-group

Returns the current QQ group configuration if `enabled = 1`. Public endpoint, no authentication required.

**Response (200):**

```json
{
  "code": 200,
  "data": {
    "qqInviteUrl": "https://qm.qq.com/example"
  }
}
```

**Response (200, disabled or not configured):**

```json
{
  "code": 200,
  "data": null
}
```

### GET /v1/admin/feedback/qq-group

Returns the current QQ group configuration regardless of `enabled` status. Requires `ROLE_ADMIN`.

**Response (200):**

```json
{
  "code": 200,
  "data": {
    "qqInviteUrl": "https://qm.qq.com/example",
    "enabled": true,
    "updatedBy": "admin",
    "updatedAt": "2026-08-05T12:00:00"
  }
}
```

### PUT /v1/admin/feedback/qq-group

Updates the QQ group configuration. Requires `ROLE_ADMIN`. Evicts the Redis cache on success.

**Request Body:**

```json
{
  "qqInviteUrl": "https://qm.qq.com/example",
  "enabled": true
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `qqInviteUrl` | `String` | Yes | QQ group invitation link (max 500 chars) |
| `enabled` | `Boolean` | No | Enable/disable the banner (default: `true`) |

**Response (200):**

```json
{
  "code": 200,
  "message": "success"
}
```

:::tip
The Redis cache key `feedback:qq-group:config` is evicted on every PUT to ensure clients see the latest config within the 60-second TTL window.
:::
