# FeedbackQqGroupConfigService

:::info
`@Service` for QQ group invitation configuration management with Redis caching.
:::

## Overview

Manages the singleton QQ group config (ID = 1) for the feedback page. Supports public retrieval (enabled-only with Redis cache) and admin CRUD operations. Uses the `__NONE__` sentinel pattern to prevent cache penetration when no config exists.

## Key Methods

| Method | Description |
|---|---|
| `getPublicConfig()` | Returns the active config if enabled; caches result in Redis for 60s |
| `getAdminConfig()` | Returns the config regardless of enabled status (no cache) |
| `save(qqInviteUrl, enabled, updatedBy)` | Upserts the singleton config and evicts Redis cache |

## Caching Strategy

| Key | TTL | Sentinel | Eviction |
|-----|-----|----------|----------|
| `feedback:qq-group:config` | 60 sec | `__NONE__` | On every `save()` |

## Dependencies

- `FeedbackQqGroupConfigMapper` — database access
- `feedbackQqGroupRedisTemplate` — Redis cache operations
