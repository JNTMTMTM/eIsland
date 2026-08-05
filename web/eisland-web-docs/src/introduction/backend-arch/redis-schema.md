---
title: Redis Architecture
icon: database
---

# Redis Architecture

:::info
The eIsland backend uses **Redis 7.0+** as its primary caching, rate-limiting, and real-time data layer. The application connects via **Lettuce** (bundled with `spring-boot-starter-data-redis`) in standalone mode with **15 isolated databases** (DB 0–14), each dedicated to a specific business domain. This document covers every Redis key pattern, data structure, TTL, and usage rationale across the entire system. For the MySQL tables that Redis caches, see [MySQL Database Schema](mysql-schema.md). For the MQ-based async persistence, see [RabbitMQ Architecture](rabbitmq-schema.md).
:::

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           eIsland Redis Layer                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Client: Lettuce (spring-boot-starter-data-redis)                               │
│  Mode:   RedisStandaloneConfiguration (no cluster, no sentinel)                 │
│  Pool:   Default Lettuce settings (no explicit pool tuning)                     │
│  Template: StringRedisTemplate (all domain-specific templates)                  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                    15 Isolated Redis Databases                            │  │
│  │                                                                           │  │
│  │  DB 0   ─ Default Cache, Announcements, Toolbox, Version Bloom            │  │
│  │  DB 1   ─ Avatar Cache                                                    │  │
│  │  DB 2   ─ Email Verification, Identity Verification                       │  │
│  │  DB 3   ─ Wallpaper Cache, Wallpaper Bloom                                │  │
│  │  DB 4   ─ Slider CAPTCHA                                                  │  │
│  │  DB 5   ─ TOTP Security                                                   │  │
│  │  DB 6   ─ Auth Rate Limiting, Replay Protection                           │  │
│  │  DB 7   ─ Upload Rate Limiting                                            │  │
│  │  DB 8   ─ Issue Feedback Rate Limiting                                    │  │
│  │  DB 9   ─ User Ban Bloom Filter                                           │  │
│  │  DB 10  ─ Payment (orders, locks, pricing)                                │  │
│  │  DB 11  ─ QWeather Cache, Tencent TMT Quota                               │  │
│  │  DB 12  ─ Agent Balance (Lua atomic deduction)                            │  │
│  │  DB 13  ─ Agent Usage Stats, Agent Pricing Cache                          │  │
│  │  DB 14  ─ Mini Game (scores, leaderboards, sessions)                      │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  Key Techniques:                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Spring Cache │ │ Bloom Filter │ │  Lua Scripts │ │  SETNX Locks │            │
│  │ (@Cacheable) │ │  (Bitmaps)   │ │  (Atomic Op) │ │  (Distrib.)  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Database Allocation

:::tip
Each business domain is assigned a dedicated Redis database index to prevent key collisions and enable independent flush/monitoring. All databases share the same Redis host, port, and password — only the database index differs.
:::

| DB Index | Domain | Config Class | Environment Variable |
|----------|--------|--------------|---------------------|
| 0 | Default Cache, Announcements, Toolbox Software, Version Bloom | `CacheConfig`, `AnnouncementRedisConfig`, `ToolboxSoftwareRedisConfig`, `VersionBloomRedisConfig` | `REDIS_DATABASE` |
| 1 | Avatar Cache | `CacheConfig` (`avatarCacheManager`) | `REDIS_AVATAR_DATABASE` |
| 2 | Email Verification, Identity Verification | `VerificationRedisConfig`, `IdentityRedisConfig` | `REDIS_VERIFY_DATABASE`, `REDIS_IDENTITY_DATABASE` |
| 3 | Wallpaper Cache, Wallpaper Detail Bloom | `CacheConfig` (`wallpaperCacheManager`), `WallpaperDetailBloomRedisConfig` | `REDIS_WALLPAPER_DATABASE` |
| 4 | Slider CAPTCHA | `VerificationRedisConfig` | `REDIS_SLIDER_CAPTCHA_DATABASE` |
| 5 | TOTP Security | `TotpSecurityRedisConfig` | `REDIS_TOTP_DATABASE` |
| 6 | Auth Rate Limiting, Replay Protection | `VerificationRedisConfig` | `REDIS_AUTH_SECURITY_DATABASE` |
| 7 | Upload Rate Limiting | `UploadRateRedisConfig`, `UploadSecurityRedisConfig` | `REDIS_UPLOAD_RATE_DATABASE` |
| 8 | Issue Feedback Rate Limiting | `VerificationRedisConfig` | `REDIS_ISSUE_FEEDBACK_DATABASE` |
| 9 | User Ban Bloom Filter | `UserBanRedisConfig` | `REDIS_USER_BAN_DATABASE` |
| 10 | Payment | `PaymentRedisConfig` | `REDIS_PAYMENT_DATABASE` |
| 11 | QWeather Cache, Tencent TMT Quota | `QWeatherRedisConfig` | `REDIS_QWEATHER_DATABASE` |
| 12 | Agent Balance | `AgentBillingRedisConfig` | `REDIS_AGENT_BILLING_DATABASE` |
| 13 | Agent Usage Stats, Agent Pricing | `AgentUsageRedisConfig`, `AgentPricingRedisConfig` | `REDIS_AGENT_PRICING_DATABASE` |
| 14 | Mini Game | `MiniGameRedisConfig` | `REDIS_MINI_GAME_DATABASE` |

---

## DB 0 — Default Cache, Announcements, Toolbox, Version Bloom

:::info
DB 0 is the shared default database used by the primary Spring `CacheManager` and several lightweight caches that don't warrant a dedicated database.
:::

### Spring Cache Keys (`@Cacheable`)

:::tip
Spring Cache keys are automatically prefixed with `server:` (configured via `spring.cache.redis.key-prefix`). The `::` separator is Spring's default cache name delimiter. All cache entries have a **5-minute TTL** and **null values are not cached**.
:::

| Cache Name | Key Pattern | TTL | Purpose |
|------------|-------------|-----|---------|
| `service-status` | `server:service-status::{apiName}` | 5 min | API endpoint enable/disable status by name |
| `service-status-list` | `server:service-status-list::all` | 5 min | All service statuses (single cached list) |
| `app-version` | `server:app-version::{appName}` | 5 min | Application version by app name |
| `app-version-list` | `server:app-version-list::all` | 5 min | All app versions (single cached list) |

### Announcement Cache

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `announcement:current:v2` | STRING (JSON or `__NONE__`) | 60 sec | Current active announcement. `__NONE__` sentinel prevents cache penetration when no announcement exists |

### Feedback QQ Group Config Cache

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `feedback:qq-group:config` | STRING (JSON or `__NONE__`) | 60 sec | QQ group invitation config for feedback page. `__NONE__` sentinel prevents cache penetration when no config exists or config is disabled |

### Toolbox Software Cache

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `toolbox:software:list` | STRING (JSON array) | 300 sec | Enabled software catalog for the toolbox feature |

### Version Bloom Filter

:::warning
Custom Bloom filter implementation using Redis bitmaps. Prevents cache penetration for nonexistent app version names. Uses a dual-structure pattern: a bitmap for probabilistic testing + a set for exact verification (eliminates false positives).
:::

| Key Pattern | Data Structure | Bits | Hash Functions | TTL | Purpose |
|-------------|---------------|------|----------------|-----|---------|
| `version:app:bloom` | BITMAP | 1,000,003 | 6 (CRC32 + Java hashCode) | Persistent | Bloom filter for app version names |
| `version:app:set` | SET | — | — | Persistent | Exact app version name set (eliminates false positives) |

---

## DB 1 — Avatar Cache

| Cache Name | Key Pattern | TTL | Purpose |
|------------|-------------|-----|---------|
| `avatar-data` | `server:avatar-data::{username}` | 5 min | User avatar URL or Base64 data. Cached separately from DB 0 to isolate avatar I/O from general caching |

---

## DB 2 — Email Verification & Identity Verification

### Email Verification

:::info
Email verification codes are stored as SHA-256 hashes (with pepper + scene + email + code) to prevent plaintext exposure. Multiple rate limits protect against abuse at IP, email-hourly, and email-daily levels.
:::

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `verify:code:{SCENE}:{email}` | STRING (SHA-256 hash) | 5 min | — | Hashed verification code. Scenes: `REGISTER`, `LOGIN`, `RESET_PASSWORD`, `CHANGE_EMAIL`, `UNREGISTER` |
| `verify:attempts:{SCENE}:{email}` | STRING (INCR counter) | Same as code | 5 attempts | Wrong attempt counter. Account is locked after 5 failed attempts |
| `verify:cooldown:{SCENE}:{email}` | STRING ("1") | 60 sec | — | Send cooldown. Prevents rapid-fire email sends to the same address |
| `verify:rate:ip:{ip}` | STRING (INCR counter) | 1 hour | 3/hour | IP-based send rate limit |
| `verify:rate:email:hour:{email}` | STRING (INCR counter) | 1 hour | 3/hour | Per-email hourly send rate limit |
| `verify:rate:email:day:{email}` | STRING (INCR counter) | To end of day (UTC+8) | 30/day | Per-email daily send rate limit |

### Identity Verification

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `identity:rate:{username}` | STRING (INCR counter) | 300 sec | 3/5min | Rate limit for identity verification requests |
| `identity:verified:{username}` | STRING ("1" or "0") | 3600 sec | — | Cached identity verification status to avoid repeated DB queries |

---

## DB 3 — Wallpaper Cache & Bloom Filter

### Spring Cache Keys

| Cache Name | Key Pattern | TTL | Purpose |
|------------|-------------|-----|---------|
| `wallpaper-list` | `server:wallpaper-list::{keyword}:{type}:{sortBy}:{page}:{pageSize}:{requestedNode}:{proUser}` | 5 min | Published wallpaper list with filters |
| `wallpaper-list` (total) | `server:wallpaper-list::total:{keyword}:{type}` | 5 min | Total count for published wallpaper list pagination |
| `wallpaper-admin-list` | `server:wallpaper-admin-list::{...}` | 5 min | Admin wallpaper listing |
| `wallpaper-my-list` | `server:wallpaper-my-list::{ownerUsername}:{keyword}:{type}:{sortBy}:{page}:{pageSize}:{requestedNode}:{proUser}` | 5 min | User's own wallpaper list |
| `wallpaper-my-list` (total) | `server:wallpaper-my-list::total:{ownerUsername}:{keyword}:{type}` | 5 min | Total count for user's own wallpapers |
| `wallpaper-detail` | `server:wallpaper-detail::{id}:{requestedNode}:{proUser}` | 5 min | Single wallpaper detail by ID |

### Wallpaper Detail Bloom Filter

| Key Pattern | Data Structure | Bits | Hash Functions | TTL | Purpose |
|-------------|---------------|------|----------------|-----|---------|
| `wallpaper:detail:bloom` | BITMAP | 2,000,003 | 6 | Persistent | Bloom filter for wallpaper IDs (prevents cache penetration) |
| `wallpaper:detail:set` | SET | — | — | Persistent | Exact wallpaper ID set (eliminates false positives) |

---

## DB 4 — Slider CAPTCHA

:::info
The slider CAPTCHA system uses a full lifecycle approach: challenge creation, ownership tracking, rate limiting via Lua-based token bucket, and fail counting. Challenges are bound to both account and IP to prevent cross-origin abuse.
:::

### Challenge Storage

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `verify:slider:challenge:{challengeId}` | STRING (target x-offset value) | Configurable (default 120s) | Challenge target position for client-side rendering |
| `verify:slider:challenge-owner:{challengeId}` | STRING (account name) | Same as challenge | Binds challenge to account (prevents challenge sharing) |
| `verify:slider:challenge-ip-owner:{challengeId}` | STRING (IP address) | Same as challenge | Binds challenge to IP (prevents cross-origin use) |
| `verify:slider:account:challenges:{base64(account)}` | SET of challengeIds | Challenge TTL + 10s | Tracks all pending challenges per account |
| `verify:slider:ip:challenges:{base64(ip)}` | SET of challengeIds | Challenge TTL + 10s | Tracks all pending challenges per IP |
| `verify:slider:sign:{signToken}` | STRING ("account\|ip\|challengeId") | min(challengeTTL, 120s) | Short-lived sign ticket for email-send verification |

### Rate Limiting (Token Bucket via Lua)

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `verify:slider:rate:create:account:{base64(account)}` | HASH (`tokens`, `ts`) | 2x window | 12/min | Challenge creation rate per account |
| `verify:slider:rate:create:ip:{base64(ip)}` | HASH (`tokens`, `ts`) | 2x window | 24/min | Challenge creation rate per IP |
| `verify:slider:rate:verify:ip:{base64(ip)}` | HASH (`tokens`, `ts`) | 2x window | 60/min | Challenge verification rate per IP |

:::details Token Bucket Lua Script — `SliderCaptchaService.java`
Source: `server-auth/.../SliderCaptchaService.java` (lines 317–363)

```lua
local key = KEYS[1]
local now_ms = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill_per_ms = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])
local ttl_seconds = tonumber(ARGV[5])

local state = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(state[1])
local ts = tonumber(state[2])

if tokens == nil then
  tokens = capacity
end
if ts == nil then
  ts = now_ms
end

local elapsed = now_ms - ts
if elapsed < 0 then
  elapsed = 0
end

tokens = math.min(capacity, tokens + elapsed * refill_per_ms)

local allowed = 0
local retry_after_ms = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
else
  local deficit = requested - tokens
  retry_after_ms = math.ceil(deficit / refill_per_ms)
end

redis.call('HSET', key, 'tokens', tokens, 'ts', now_ms)
redis.call('EXPIRE', key, ttl_seconds)
return { allowed, math.floor(tokens), retry_after_ms }
```

**Parameters:**

| ARGV | Name | Description |
|------|------|-------------|
| `ARGV[1]` | `now_ms` | Current time in milliseconds (`System.currentTimeMillis()`) |
| `ARGV[2]` | `capacity` | Maximum token bucket capacity (varies by rate limit) |
| `ARGV[3]` | `refill_per_ms` | Tokens refilled per millisecond (computed as `capacity / windowSeconds / 1000`) |
| `ARGV[4]` | `requested` | Tokens to consume per request (always `"1"`) |
| `ARGV[5]` | `ttl_seconds` | Key expiry time (`max(30, refillWindowSeconds * 2)`) |

**Returns:** `List<Long>` — `[allowed, remaining_tokens, retry_after_ms]`
- `allowed`: `1` = permitted, `0` = denied
- `remaining_tokens`: tokens left after the operation
- `retry_after_ms`: milliseconds to wait before retrying (`0` if allowed)
:::

### Failure Tracking

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `verify:slider:fail:account:{base64(account)}` | STRING (INCR counter) | 600 sec | 3 failures | Verification failure count per account |
| `verify:slider:fail:ip:{base64(ip)}` | STRING (INCR counter) | 600 sec | 3 failures | Verification failure count per IP |

---

## DB 5 — TOTP Security

:::warning
TOTP (Time-based One-Time Password) secrets are cached in Redis to avoid repeated database decryption. The decrypted plaintext secret has a very short TTL (60s) while the encrypted ciphertext is cached longer (24h). Replay protection prevents the same TOTP code from being used twice.
:::

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `totp:security:secret:plain:{username}` | STRING (Base32 seed) | 60 sec | Decrypted TOTP secret cache. Short TTL minimizes exposure window |
| `totp:security:secret:enc:{username}` | STRING (AES-GCM ciphertext) | 86400 sec (24h) | Encrypted TOTP secret cache. Longer TTL avoids repeated DB reads |
| `totp:security:fail:{username}` | STRING (INCR counter) | 600 sec | TOTP verification failure counter (max 5 per 10-minute window) |
| `totp:security:replay:{username}:{counter}:{code}` | STRING ("1") | 120 sec | TOTP replay prevention. Same code+counter cannot be reused |
| `totp:security:rate:user:{username}` | STRING (INCR counter) | 60 sec | Per-user verification rate limit (30/min) |
| `totp:security:rate:ip:{clientIp}` | STRING (INCR counter) | 60 sec | Per-IP verification rate limit (60/min) |

---

## DB 6 — Auth Rate Limiting & Replay Protection

### Login Rate Limiting (Sliding Window)

:::info
Login failure tracking uses Redis Sorted Sets for sliding window counters. Each failure is recorded as a member with a timestamp score. Old entries are pruned by removing members outside the window. After exceeding the threshold, a lock key is set with a 10-minute TTL.
:::

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `auth:limit:login:failures:{key}` | ZSET (member=timestamp:nano, score=timestamp) | ~15 min | 5 failures / 5 min | Sliding window login failure tracker |
| `auth:limit:login:lock:{key}` | STRING (unlock timestamp epoch ms) | 10 min | — | Login lock. Set when failures exceed threshold. Value is the unlock time |

### Registration Rate Limiting

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `auth:limit:register:attempts:{ip}` | ZSET (member=timestamp:nano, score=timestamp) | 1 hour | 5/hour per IP | Sliding window registration rate limit |

### Replay Protection

:::danger
Sensitive endpoints (payment callbacks, profile changes) are protected against replay attacks using timestamp + nonce validation. Each nonce is stored with SETNX and a 5-minute TTL — duplicate nonces are rejected.
:::

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `auth:replay:{principal}:{METHOD}:{URI}:{nonce}` | STRING (timestamp) | 5 min | Replay protection nonce. SETNX ensures one-time use |

---

## DB 7 — Upload Rate Limiting

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `upload:limit:user-avatar:ip:{ip}` | STRING (INCR counter) | 1 hour | 3/hour | Avatar upload rate per IP |
| `upload:limit:user-avatar:account:{account}` | STRING (INCR counter) | 1 hour | 3/hour | Avatar upload rate per account |
| `wallpaper:upload:{ownerUsername}` | STRING (INCR counter) | 1 hour | 5/hour | Wallpaper upload rate per user |

---

## DB 8 — Issue Feedback Rate Limiting

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `issue-feedback:submit:{username}:{ip}` | STRING (INCR counter) | 1 hour | 3/hour | Feedback submission rate per user+IP combination |

---

## DB 9 — User Ban Bloom Filter

:::warning
The user ban system uses a Bloom filter for fast negative lookups (bloom miss = definitely not banned) combined with an exact set for positive verification (set hit = definitely banned). This two-layer approach provides O(1) lookups with zero false negatives and near-zero false positives.
:::

| Key Pattern | Data Structure | Bits | Hash Functions | TTL | Purpose |
|-------------|---------------|------|----------------|-----|---------|
| `user:ban:bloom` | BITMAP | 1,000,003 | 6 (CRC32 + Java hashCode) | Persistent | Bloom filter for banned usernames |
| `user:ban:set` | SET of usernames | — | — | Persistent | Exact banned username set. Checked after bloom positive to eliminate false positives |

**Lookup flow:**

```
Request arrives
    │
    ▼
Bloom filter check (user:ban:bloom)
    │
    ├── Not in bloom → User is NOT banned (fast path, ~99% of requests)
    │
    └── Possibly in bloom → Exact set check (user:ban:set)
            │
            ├── Not in set → False positive, user is NOT banned
            │
            └── In set → User IS BANNED → Reject request
```

---

## DB 10 — Payment

:::info
The payment domain uses Redis for multiple purposes: pricing configuration caching, order lifecycle tracking, notification deduplication, and distributed locking for idempotent order creation.
:::

### Pricing Configuration Cache

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `payment:pricing:pro-month:amount-fen` | STRING (integer) | Persistent | Pro monthly subscription price in fen (e.g., "1500") |
| `payment:pricing:free:desc` | STRING (text) | Persistent | Free tier description text |
| `payment:pricing:free:features` | STRING (newline-separated) | Persistent | Free tier feature list |
| `payment:pricing:pro:desc` | STRING (text) | Persistent | Pro tier description text |
| `payment:pricing:pro:features` | STRING (newline-separated) | Persistent | Pro tier feature list |

### Order Lifecycle

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `payment:order:channel:{outTradeNo}` | STRING (channel name) | 30 days | Records which payment channel (wechat/alipay) was used for an order |
| `payment:order:receipt-email:{outTradeNo}` | STRING (email) | Order expire + 60 min | Receipt email address for post-payment delivery |
| `payment:user:active-order:{username}` | STRING (outTradeNo) | Order expire + 5 min | Tracks user's currently active (unpaid) order to prevent duplicate creation |

### Notification Deduplication

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `payment:notify:done:{channel}:{outTradeNo}:{transactionId}` | STRING ("1") | 30 days | Idempotency flag for payment notifications. Prevents duplicate processing of the same callback |

### Distributed Locks

:::tip
All payment locks use SETNX with a UUID value and short TTL. The UUID ensures that only the lock holder can release it (checked via Lua script in delete operations).
:::

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `payment:order:op-lock:{outTradeNo}` | STRING (UUID) | 15 sec | Operation lock for order status changes |
| `payment:lock:create:pro-month:{username}` | STRING (UUID) | 15 sec | Prevents duplicate Pro month order creation |
| `payment:lock:create:agent-recharge:{username}` | STRING (UUID) | 15 sec | Prevents duplicate agent recharge order creation |
| `payment:lock:create:test:{channel}:{username}` | STRING (UUID) | 15 sec | Prevents duplicate test order creation |

---

## DB 11 — QWeather Cache & Tencent TMT Quota

### QWeather API Cache

:::info
Weather data is cached to reduce API calls to QWeather's service. The monthly quota counter tracks usage to prevent exceeding the plan limit (default 50,000 calls/month).
:::

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `qweather:daily3d:{location}:{lang}:{unit}` | STRING (JSON) | 600 sec | 3-day weather forecast cache |
| `qweather:alerts:{location}:{lang}` | STRING (JSON) | 180 sec | Current weather alerts cache (shorter TTL for time-sensitive data) |
| `qweather:geo:city:{query}:{lang}` | STRING (JSON) | 600 sec | City geocoding lookup cache |
| `qweather:quota:provider:qweather:{YYYYMM}` | STRING (INCR counter) | End of month | Monthly API call quota counter (default limit: 50,000) |

### Tencent TMT Translation Quota

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `tmt:quota:monthly:{YYYYMM}` | STRING (INCR by charCount) | End of month | Monthly character translation quota (limit: 5,000,000 chars). Shares DB 11 with QWeather via `qweatherRedisTemplate` |

---

## DB 12 — Agent Balance

:::danger
The agent balance is the most critical Redis key in the billing system. It uses a **Lua script** for atomic deduction with cap-at-zero semantics, ensuring that a user can never be charged more than their remaining balance. The balance is persisted to MySQL every 30 minutes by a reconciliation job. For the MySQL column, see [user_account.balance_fen](mysql-schema.md#user_account). For the async billing persistence, see [RabbitMQ — Agent Billing](rabbitmq-schema.md#domain-3-agent-billing).
:::

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `agent:balance:{username}` | STRING (decimal, 8 places) | Persistent | User's AI agent balance in fen (e.g., "1234.56789012") |

### Lua Deduction Script

:::details Balance Atomic Deduct Lua Script — `AgentBalanceRedisService.java`
Source: `server-agent/.../AgentBalanceRedisService.java` (lines 41–66)

```lua
local bal = redis.call('GET', KEYS[1])
if bal == false then
    return '-1'
end
local current = tonumber(bal)
if current <= 0 then
    return '-3'
end
local amount  = tonumber(ARGV[1])
local deducted = math.min(current, amount)
local newBal = current - deducted
local fmtBal = string.format('%.8f', newBal)
local fmtDed = string.format('%.8f', deducted)
redis.call('SET', KEYS[1], fmtBal)
return fmtBal .. '|' .. fmtDed
```

**Parameters:**

| ARGV | Name | Description |
|------|------|-------------|
| `ARGV[1]` | `amount` | Deduction amount as a decimal string with 8 decimal places (e.g., `"0.00120000"`) |

**Returns:** `String`
- `"-1"` — key does not exist (needs initialization from DB via `SETNX`)
- `"-3"` — balance is already zero, deduction refused
- `"{newBal}|{deducted}"` — success, pipe-delimited new balance and actual deducted amount (cap-at-zero: deducts `min(current, requested)`)

**Invocation flow:**
```java
// AgentBalanceRedisService.java — deduct() method (lines 109–114)
String key = KEY_PREFIX + username;  // "agent:balance:{username}"
String amountStr = amountFen.setScale(SCALE, RoundingMode.HALF_UP).toPlainString();
String result = redisTemplate.execute(DEDUCT_SCRIPT, List.of(key), amountStr);
if ("-1".equals(result)) {
    if (initFromDb(username)) {
        result = redisTemplate.execute(DEDUCT_SCRIPT, List.of(key), amountStr);
    }
}
```
:::

### Balance Initialization

When a user first accesses the agent, their balance is loaded from MySQL using `SETNX` (only set if the key doesn't exist):

```
SETNX agent:balance:{username} → balance_fen from user_account table
```

### Reconciliation

`AgentBillingReconcileJob` runs every 30 minutes to sync Redis balances back to MySQL (`user_account.balance_fen`), ensuring durability even if Redis restarts.

---

## DB 13 — Agent Usage Stats & Pricing Cache

### Usage Statistics

:::info
Per-model usage statistics are tracked using Redis Hash fields with atomic `HINCRBY` operations. This avoids read-modify-write races when multiple requests complete simultaneously. Statistics are periodically flushed to MySQL's `agent_usage_stats` table.
:::

| Key Pattern | Data Structure | Fields | TTL | Purpose |
|-------------|---------------|--------|-----|---------|
| `agent:usage:{modelName}` | HASH | `inputTokens`, `cachedTokens`, `outputTokens`, `reasoningTokens`, `requestCount`, `costMicroFen` | Persistent | Per-model cumulative usage stats. Incremented atomically via `HINCRBY` |
| `agent:usage:__models__` | SET of model names | — | Persistent | Registry of all model names that have usage data. Used to enumerate models for reporting |

### Model Pricing Cache

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `agent:pricing:{modelName}` | STRING (JSON of `AgentModelPricing`) | 30 min | Cached model pricing configuration from `agent_model_pricing` table |

### Translation Pricing Cache

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `toolbox:translate:pricing:{serviceName}` | STRING (JSON of `ToolboxTranslatePricing`) | 30 min | Cached translation service pricing from `toolbox_translate_pricing` table |

---

## DB 14 — Mini Game

:::info
The mini-game domain is the most Redis-intensive module, using sorted sets for leaderboards, hashes for metadata, strings for caching and idempotency, and SETNX for distributed locks. All keys are prefixed with `mg:`. For the MySQL persistence, see [Mini Game Domain](mysql-schema.md#mini-game-domain). For the async score upsert, see [RabbitMQ — Mini Game Score](rabbitmq-schema.md#domain-6-mini-game-score).
:::

### Score Cache & Leaderboard

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `mg:score:high:{gameId}:{userId}` | STRING (score value) | 3600 sec | Per-user per-game high score cache |
| `mg:score:leaderboard:{gameId}` | ZSET (member=userId, score=highScore) | Persistent (pruned to top-N) | Global leaderboard. Top 200 entries retained via `ZREMRANGEBYRANK` |
| `mg:score:user-meta:{gameId}:{userId}` | HASH (`score`, `durationMs`, `moves`, `achievedAt`) | 3600 sec | Leaderboard row detail metadata for display |

**Leaderboard operations:**

| Operation | Redis Command | Description |
|-----------|---------------|-------------|
| Read top-N | `ZREVRANGEWITHSCORES 0 N-1` | Get highest scores |
| Update score | `ZADD` (overwrites same member) | Set new high score |
| Prune | `ZREMRANGEBYRANK N -1` | Remove entries beyond top-N |
| Cold start | Backfill from MySQL via `selectTopByGame` | Rebuild on cache miss |

### Idempotency Guards

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `mg:score:idempotency:{submitId}` | STRING ("1") SETNX | 24 hours | Prevents duplicate score submission from client |
| `mg:score:consume:idempotency:{submitId}` | STRING ("1") SETNX | 24 hours | Prevents duplicate MQ message processing |

### Distributed Lock

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `mg:score:lock:{gameId}:{userId}` | STRING ("1") SETNX | 10 sec | Write mutex for MySQL `INSERT ... ON DUPLICATE KEY UPDATE` |

### Rate Limiting

:::tip
Rate limiting uses a Lua script for atomic INCR + conditional EXPIRE (TTL is set only on the first increment to avoid resetting the window on subsequent requests).
:::

| Key Pattern | Data Structure | TTL | Limit | Purpose |
|-------------|---------------|-----|-------|---------|
| `mg:score:submit:rate:{gameId}:{userId}` | STRING (INCR counter) | 60 sec | 10/min | Score submission rate per user per game |
| `mg:score:leaderboard:refresh:rate:{gameId}:{userId}` | STRING (INCR counter) | 60 sec | 5/min (captcha after) | Leaderboard refresh rate. Triggers CAPTCHA after 5 requests |

**Rate limit Lua script:**

:::details Rate-Limit INCR+EXPIRE Lua Script — `MiniGameScoreService.java`
Source: `server-mini-game/.../MiniGameScoreService.java` (lines 48–53)

```lua
local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count;
```

**Parameters:**

| ARGV | Name | Description |
|------|------|-------------|
| `ARGV[1]` | `windowSeconds` | Rate limit window in seconds (e.g., `"60"`) |

**Returns:** `Long` — the incremented count after the INCR operation

**Invocation flow:**
```java
// MiniGameScoreService.java — checkRateLimit() method (lines 489–493)
Long count = miniGameRedisTemplate.execute(
        RATE_LIMIT_INCR_EXPIRE_SCRIPT,
        Collections.singletonList(rateKey),         // KEYS[1] = "mg:score:submit:rate:{gameId}:{userId}"
        String.valueOf(SUBMIT_RATE_WINDOW_SECONDS)  // ARGV[1] = "60"
);
```

Used at two call sites:
1. `checkRateLimit()` — `mg:score:submit:rate:{gameId}:{userId}` (submit rate, 10/min)
2. `shouldRequireLeaderboardRefreshCaptcha()` — `mg:score:leaderboard:refresh:rate:{gameId}:{userId}` (refresh rate, 5/min)
:::

### Game Sessions

| Key Pattern | Data Structure | TTL | Purpose |
|-------------|---------------|-----|---------|
| `mg:score:session:{gameId}:{userId}:{sessionId}` | STRING ("seed:startedAt") | 21600 sec (6 hours) | 2048 game session state. Stores the random seed and start time for anti-cheat verification |

---

## Bloom Filter Implementation

:::info
All Bloom filters in the system use a custom implementation with Redis bitmaps. The dual-structure pattern (bitmap + set) provides probabilistic fast-rejection with guaranteed zero false positives on positive matches.
:::

### Design

```
Lookup("item")
    │
    ▼
┌──────────────────────────────────────────┐
│  Bitmap Bloom Filter (probabilistic)     │
│  Hash functions: CRC32 + Java hashCode   │
│  6 hash iterations per item              │
│                                          │
│  All 6 bits set?                         │
│      NO  → Definitely NOT in set         │
│      YES → Possibly in set (check exact) │
└──────────────────────────────────────────┘
    │ (possibly in set)
    ▼
┌──────────────────────────────────────────┐
│  Redis SET (exact verification)          │
│                                          │
│  SISMEMBER returns 1?                    │
│      NO  → False positive, NOT in set    │
│      YES → Definitely in set             │
└──────────────────────────────────────────┘
```

### All Bloom Filters

| Name | Bitmap Key | Set Key | DB | Bit Size | Hash Count | False Positive Rate | Purpose |
|------|-----------|---------|-----|----------|------------|---------------------|---------|
| Version App | `version:app:bloom` | `version:app:set` | 0 | 1,000,003 | 6 | ~1% | Prevent cache penetration for nonexistent app names |
| Wallpaper Detail | `wallpaper:detail:bloom` | `wallpaper:detail:set` | 3 | 2,000,003 | 6 | ~1% | Prevent cache penetration for nonexistent wallpaper IDs |
| User Ban | `user:ban:bloom` | `user:ban:set` | 9 | 1,000,003 | 6 | ~1% | Fast banned-user lookup in auth filter |

### Properties

- **False Positive Rate**: ~1% (with 6 hash functions and bit sizes chosen for expected load)
- **False Negative Rate**: 0% (Bloom filters never miss existing items)
- **Fail-open design**: If Redis is unavailable, the Bloom filter allows requests through (degrades gracefully)
- **Hash functions**: Dual-hash strategy using CRC32 and Java `hashCode()` with double-hashing to generate 6 positions per item

---

## Lua Scripts

:::info
Three Lua scripts are used for atomic Redis operations that cannot be achieved with single commands. Full source code is embedded in the corresponding key sections above.
:::

| # | Script Name | Service Class | DB | Keys Operated | Purpose |
|---|-------------|---------------|-----|---------------|---------|
| 1 | **Token Bucket Rate Limiter** | `SliderCaptchaService` | 4 | `verify:slider:rate:*` (HASH) | Sliding-window token bucket for CAPTCHA rate limiting. Returns `{allowed, remaining, retry_after_ms}`. See [Rate Limiting (Token Bucket via Lua)](#rate-limiting-token-bucket-via-lua) |
| 2 | **Agent Balance Atomic Deduct** | `AgentBalanceRedisService` | 12 | `agent:balance:{username}` (STRING) | Atomic GET+SET with cap-at-zero. Returns `"-1"` (missing), `"-3"` (empty), or `"newBal\|deducted"`. See [Lua Deduction Script](#lua-deduction-script) |
| 3 | **Rate-Limit INCR+EXPIRE** | `MiniGameScoreService` | 14 | `mg:score:submit:rate:*`, `mg:score:leaderboard:refresh:rate:*` (STRING) | Atomic INCR with conditional EXPIRE (TTL set only on first increment). See [Rate Limiting](#rate-limiting) |

---

## Distributed Locks

:::warning
The application uses simple SETNX-based distributed locks without Redisson or RedLock. All locks have short TTLs (10–15 seconds) to prevent deadlocks if the holder crashes. Lock values are UUIDs to ensure only the holder can release.
:::

| Lock Key Pattern | DB | TTL | Purpose |
|------------------|-----|-----|---------|
| `mg:score:lock:{gameId}:{userId}` | 14 | 10 sec | Mini-game DB write mutex |
| `payment:order:op-lock:{outTradeNo}` | 10 | 15 sec | Payment order operation lock |
| `payment:lock:create:pro-month:{username}` | 10 | 15 sec | Pro month order creation dedup |
| `payment:lock:create:agent-recharge:{username}` | 10 | 15 sec | Agent recharge order creation dedup |
| `payment:lock:create:test:{channel}:{username}` | 10 | 15 sec | Test order creation dedup |

---

## Key Summary by Domain

| Domain | DB | Key Count | Data Structures Used |
|--------|-----|-----------|---------------------|
| Default Cache | 0 | 4 | STRING (Spring Cache) |
| Announcements | 0 | 1 | STRING |
| Feedback QQ Group | 0 | 1 | STRING |
| Toolbox Software | 0 | 1 | STRING |
| Version Bloom | 0 | 2 | BITMAP, SET |
| Avatar Cache | 1 | 1 | STRING (Spring Cache) |
| Email Verification | 2 | 6 | STRING |
| Identity Verification | 2 | 2 | STRING |
| Wallpaper Cache | 3 | 6 | STRING (Spring Cache) |
| Wallpaper Bloom | 3 | 2 | BITMAP, SET |
| Slider CAPTCHA | 4 | 11 | STRING, SET, HASH |
| TOTP Security | 5 | 6 | STRING |
| Auth Rate Limiting | 6 | 4 | ZSET, STRING |
| Upload Rate Limiting | 7 | 3 | STRING |
| Issue Feedback | 8 | 1 | STRING |
| User Ban Bloom | 9 | 2 | BITMAP, SET |
| Payment | 10 | 13 | STRING |
| QWeather Cache | 11 | 4 | STRING |
| TMT Quota | 11 | 1 | STRING |
| Agent Balance | 12 | 1 | STRING (Lua) |
| Agent Usage | 13 | 2 | HASH, SET |
| Agent Pricing | 13 | 2 | STRING |
| Mini Game | 14 | 9 | STRING, ZSET, HASH |
| **Total** | **15 DBs** | **~83** | **STRING, HASH, SET, ZSET, BITMAP** |

---

## What Redis is NOT Used For

:::info
The following common Redis use cases are **not** implemented in eIsland:
:::

| Feature | Status | Alternative |
|---------|--------|-------------|
| HTTP Session Management | Not used | JWT tokens stored in `user_account.session_token` |
| Redisson | Not used | Simple SETNX locks |
| Redis Pub/Sub | Not used | RabbitMQ for messaging |
| Redis Streams | Not used | RabbitMQ for event streaming |
| Redis Cluster | Not used | Standalone mode with multiple databases |
| Redis Sentinel | Not used | Standalone mode |
| Redis Modules (RedisBloom, RedisSearch) | Not used | Custom Bloom filter via bitmaps |
| Connection Pool Tuning | Not configured | Default Lettuce settings |

---

## Configuration Reference

### Environment Variables

| Variable | Purpose | Dev Default |
|----------|---------|-------------|
| `REDIS_HOST` | Redis server hostname | (required) |
| `REDIS_PORT` | Redis server port | (required) |
| `REDIS_PASSWORD` | Redis authentication password | (required) |
| `REDIS_DATABASE` | Default database index | (required) |
| `REDIS_TIMEOUT` | Connection timeout | (required) |
| `REDIS_CACHE_TTL` | Spring Cache default TTL | (required) |
| `REDIS_AVATAR_DATABASE` | Avatar cache DB | 1 |
| `REDIS_VERIFY_DATABASE` | Verification codes DB | 2 |
| `REDIS_WALLPAPER_DATABASE` | Wallpaper cache DB | 3 |
| `REDIS_SLIDER_CAPTCHA_DATABASE` | CAPTCHA DB | 4 |
| `REDIS_TOTP_DATABASE` | TOTP security DB | 5 |
| `REDIS_AUTH_SECURITY_DATABASE` | Auth rate-limit DB | 6 |
| `REDIS_UPLOAD_RATE_DATABASE` | Upload rate-limit DB | 7 |
| `REDIS_ISSUE_FEEDBACK_DATABASE` | Feedback rate-limit DB | 8 |
| `REDIS_USER_BAN_DATABASE` | User ban bloom DB | 9 |
| `REDIS_PAYMENT_DATABASE` | Payment DB | 10 |
| `REDIS_QWEATHER_DATABASE` | Weather cache DB | 11 |
| `REDIS_AGENT_BILLING_DATABASE` | Agent billing DB | 12 |
| `REDIS_AGENT_PRICING_DATABASE` | Agent pricing DB | 13 |
| `REDIS_MINI_GAME_DATABASE` | Mini game DB | 14 |

### Spring Cache Properties

```yaml
spring:
  cache:
    type: redis
    redis:
      cache-null-values: false      # Do not cache null results
      use-key-prefix: true          # Enable automatic key prefix
      key-prefix: 'server:'         # Global key prefix
      time-to-live: ${REDIS_CACHE_TTL}  # Default TTL
  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT}
      password: ${REDIS_PASSWORD}
      database: ${REDIS_DATABASE}
      timeout: ${REDIS_TIMEOUT}
```
