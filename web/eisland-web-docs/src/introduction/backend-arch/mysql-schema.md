---
title: MySQL Database Schema
icon: database
---

# MySQL Database Schema

:::info
The eIsland backend uses **MySQL 8.0+** as its primary relational database with **utf8mb4** character set and **InnoDB** engine. All tables follow the **snake_case** naming convention, while Java entity fields use **camelCase** via MyBatis auto-mapping. The database schema is designed with clear domain boundaries, with each module owning its tables. For the high-level architecture overview, see [Server Architecture](server-model.md). For the Redis caching layer, see [Redis Architecture](redis-schema.md). For the async message processing, see [RabbitMQ Architecture](rabbitmq-schema.md).
:::

## Database Overview

```
Database: pyisland_admin_database
Engine:   InnoDB
Charset:  utf8mb4 / utf8mb4_unicode_ci
```

| Domain | Tables | Purpose |
|--------|--------|---------|
| **User** | `user_account`, `user_active_daily`, `user_oauth_binding` | Unified user profiles, authentication, role management, activity tracking, OAuth bindings |
| **Identity** | `identity_verification` | Real-name identity verification via Alipay face authentication |
| **Auth** | `email_dispatch_dlq_log` | Email dispatch dead letter queue logging |
| **Payment** | `payment_order`, `payment_transaction`, `payment_notify_log`, `payment_reconcile_record`, `payment_dlq_log`, `payment_pricing_config` | WeChat/Alipay payment processing, order lifecycle, reconciliation |
| **Agent** | `agent_model_pricing`, `agent_usage_stats`, `agent_billing_dlq_log` | AI model pricing, aggregated usage statistics, billing DLQ |
| **Wallpaper** | `wallpaper_asset`, `wallpaper_version`, `wallpaper_video_meta`, `wallpaper_review_log`, `wallpaper_rating`, `wallpaper_stat_daily`, `wallpaper_apply_log`, `wallpaper_report`, `wallpaper_tag`, `wallpaper_tag_ref` | Wallpaper marketplace with versioning, reviews, ratings, reports |
| **Mini Game** | `mini_game_score`, `mini_game_score_dlq_log` | Game leaderboards, high score persistence, DLQ |
| **Version** | `app_version` | Application version management and update tracking |
| **Service Status** | `service_status` | API endpoint enable/disable control |
| **Upload** | `object_outbox`, `object_replication_task`, `object_replication_log`, `object_replication_checkpoint` | Outbox pattern for cross-provider object replication |
| **Feedback** | `issue_feedback`, `feedback_qq_group_config` | User-submitted issue reports, admin replies, and QQ group invitation config |
| **Announcement** | `announcement_config` | System-wide announcement/broadcast configuration |
| **Toolbox** | `toolbox_software`, `toolbox_translate_pricing` | Toolbox software catalog and translation pricing |
| **Legacy** | `admin_user`, `app_user` | Merged into `user_account`; retained for rollback safety |

---

## User Domain

### user_account

:::tip
Unified user table created in April 2026 by merging the legacy `admin_user` and `app_user` tables. The `role` field distinguishes between regular users, Pro subscribers, and administrators. Single-device enforcement is achieved by comparing the `session_token` on each request against the stored value. For the JWT authentication flow, see [JWT Authentication](../tech-stack/backend-tech-stack.md#jwt-json-web-tokens). For the TOTP secret caching, see [Redis — TOTP Security](redis-schema.md#db-5--totp-security). For the agent balance stored in Redis, see [Redis — Agent Balance](redis-schema.md#db-12--agent-balance).
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `username` | VARCHAR(100) | NO | — | Unique login username. Used as the primary user identifier across all tables |
| `email` | VARCHAR(150) | NO | — | Unique email address. Used for email-based login and verification code delivery |
| `password` | VARCHAR(255) | NO | — | BCrypt-hashed password. Never stored in plaintext |
| `role` | VARCHAR(20) | NO | `'user'` | User role: `user` (basic), `pro` (premium subscriber), `admin` (full access) |
| `pro_expire_at` | DATETIME | YES | NULL | Pro subscription expiration timestamp. When `role = 'pro'` and `pro_expire_at < NOW()`, the subscription has expired. Checked by `ProExpireInterceptor` on authenticated requests |
| `avatar` | LONGTEXT | YES | NULL | Base64-encoded avatar image data or CDN URL |
| `gender` | VARCHAR(20) | NO | `'undisclosed'` | Gender identifier: `male`, `female`, `undisclosed`, or `custom` |
| `gender_custom` | VARCHAR(64) | YES | NULL | Free-text custom gender description when `gender = 'custom'` |
| `birthday` | DATE | YES | NULL | User's date of birth |
| `enabled` | TINYINT(1) | NO | `1` | Account enabled flag. `1` = active, `0` = disabled by admin. Disabled accounts cannot authenticate |
| `session_token` | VARCHAR(500) | YES | NULL | Current valid JWT session token hash. Enforces single-device login — only the most recent login session is valid. Validated on every authenticated request |
| `totp_secret_ciphertext` | LONGTEXT | YES | NULL | AES-GCM encrypted TOTP secret (Base64 ciphertext). Used for two-factor authentication. The encryption key is derived from a server-side pepper |
| `totp_secret_updated_at` | DATETIME | YES | NULL | Timestamp of the last TOTP secret rotation. Used by admin `rotate` operations to track when the seed was last changed |
| `balance_fen` | DECIMAL(20,8) | NO | `0` | User's AI agent balance in fen (1 fen = 0.01 CNY). Precision of 8 decimal places supports micro-billing for per-token AI usage. Deducted atomically via Redis Lua scripts |
| `created_at` | DATETIME | YES | NULL | Account creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_user_account_username` | `username` | UNIQUE | Enforce unique usernames, fast lookup for login |
| `uk_user_account_email` | `email` | UNIQUE | Enforce unique emails, fast lookup for email-based login |
| `idx_user_account_role` | `role` | Non-unique | Filter users by role in admin queries |
| `idx_user_account_pro_expire_at` | `pro_expire_at` | Non-unique | Batch job to downgrade expired Pro users |
| `idx_user_account_totp_secret_updated_at` | `totp_secret_updated_at` | Non-unique | Admin queries for TOTP rotation tracking |

### user_active_daily

:::info
Tracks daily user activity for analytics and DAU (Daily Active Users) reporting. One row is inserted per user per day on their first request, using `INSERT IGNORE` to prevent duplicates.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `username` | VARCHAR(100) | NO | — | Username of the active user |
| `role` | VARCHAR(20) | NO | `'user'` | User's role at the time of activity. Enables per-role DAU breakdown |
| `active_date` | DATE | NO | — | Calendar date of activity (UTC) |
| `active_at` | DATETIME | NO | — | Exact timestamp of the first request on that day |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_user_active_daily_user_role_date` | `username`, `role`, `active_date` | UNIQUE | Prevent duplicate entries per user per day per role |
| `idx_user_active_daily_date_role` | `active_date`, `role` | Non-unique | Aggregate DAU queries grouped by date and role |

---

### user_oauth_binding

:::tip
Stores OAuth provider bindings (GitHub, Microsoft, WeChat, Gitee, KOOK) linked to user accounts. Each row represents one third-party account linked to one eIsland user. A user can have multiple OAuth bindings (one per provider). For the OAuth login flow, see [State Machine — login](../frontend-arch/states.md#github-oauth-login-flow).
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `user_id` | BIGINT | NO | — | FK to `user_account.id`. CASCADE on delete |
| `provider` | VARCHAR(20) | NO | — | OAuth provider identifier (`github`, `microsoft`, `wechat`, `gitee`, `kook`) |
| `provider_user_id` | VARCHAR(100) | NO | — | Third-party platform unique user ID |
| `provider_username` | VARCHAR(100) | YES | NULL | Third-party platform display username |
| `provider_email` | VARCHAR(150) | YES | NULL | Third-party platform email address |
| `access_token` | VARCHAR(500) | YES | NULL | Third-party access token (encrypted at rest) |
| `created_at` | DATETIME | NO | `CURRENT_TIMESTAMP` | Binding creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_oauth_provider_user` | `provider`, `provider_user_id` | UNIQUE | One binding per provider per third-party user |
| `idx_oauth_user_id` | `user_id` | Non-unique | Look up all bindings for a user |
| `fk_oauth_user` | `user_id` | Foreign key | Referential integrity to `user_account.id` |

:::warning
The `access_token` column stores the raw OAuth token. In production, ensure the database connection uses TLS and consider application-level encryption for this column.
:::

---

### oauth_provider_config

:::info
Database-driven OAuth provider availability configuration. Controls which providers are enabled on the login page and their display names. Managed via admin API.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `provider` | VARCHAR(20) | NO | — | Provider identifier (`github`, `microsoft`, `wechat`, `gitee`, `kook`) |
| `display_name` | VARCHAR(50) | NO | — | Display name shown on the login page |
| `enabled` | TINYINT(1) | NO | `1` | Whether this provider is available |
| `message` | VARCHAR(200) | YES | NULL | Custom message shown when provider is disabled |
| `updated_at` | DATETIME | NO | `CURRENT_TIMESTAMP` | Last update timestamp (auto-updated) |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_oauth_provider_config_provider` | `provider` | UNIQUE | One config per provider |

:::note
When a new provider is added, insert a row with `enabled=1`. The admin can disable a provider at runtime via `PUT /v1/admin/oauth-providers` without code changes or redeployment.
:::

---

## Identity Domain

### identity_verification

:::warning
Stores real-name identity verification records using Alipay's face authentication service. Personally identifiable information (name and ID number) is stored as AES-GCM encrypted ciphertext to comply with data protection requirements.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `username` | VARCHAR(100) | NO | — | Username who initiated the verification |
| `outer_order_no` | VARCHAR(100) | NO | — | Unique order number generated by eIsland for idempotent request tracking |
| `certify_id` | VARCHAR(100) | NO | — | Alipay-issued certification ID. Used to query verification results from Alipay API |
| `cert_name_ciphertext` | LONGTEXT | NO | — | AES-GCM encrypted real name (Base64 ciphertext) |
| `cert_no_ciphertext` | LONGTEXT | NO | — | AES-GCM encrypted ID card number (Base64 ciphertext) |
| `status` | VARCHAR(20) | NO | — | Verification status: `INIT` → `CERTIFYING` → `PASSED` or `FAILED` |
| `material_info_url` | VARCHAR(500) | YES | NULL | URL to verification material/proof stored in object storage |
| `created_at` | DATETIME | NO | — | Record creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

---

## Payment Domain

### payment_order

:::info
Payment orders track the full lifecycle of a transaction from creation through payment to completion or closure. Each order has a unique `out_trade_no` used as the idempotency key when communicating with payment gateways (WeChat Pay / Alipay). For the payment flow and Alipay SDK integration, see [Payment Processing](../tech-stack/backend-tech-stack.md#payment-processing). For the async notification processing, see [RabbitMQ — Payment Notification](rabbitmq-schema.md#domain-2-payment-notification). For the distributed locks, see [Redis — Payment](redis-schema.md#db-10--payment).
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `out_trade_no` | VARCHAR(64) | NO | — | Unique merchant order number. Generated by the server as the idempotency key for payment gateway communication |
| `username` | VARCHAR(100) | NO | — | Username who created the order |
| `product_code` | VARCHAR(40) | NO | — | Product identifier, e.g. `pro-month` (Pro subscription), `agent-recharge` (AI balance top-up) |
| `amount_fen` | INT | NO | — | Payment amount in fen (1 fen = 0.01 CNY) |
| `currency` | VARCHAR(12) | NO | `'CNY'` | Currency code |
| `status` | VARCHAR(20) | NO | — | Order status: `PAYING` (awaiting payment), `SUCCESS` (paid), `CLOSED` (expired/cancelled), `FAILED` (payment error) |
| `wx_prepay_id` | VARCHAR(100) | YES | NULL | WeChat Pay prepay ID returned after order submission. Used to generate payment parameters for the client |
| `wx_code_url` | LONGTEXT | YES | NULL | WeChat Pay QR code URL for native payment |
| `wx_transaction_id` | VARCHAR(100) | YES | NULL | WeChat-assigned transaction ID. Populated after successful payment |
| `expire_at` | DATETIME | NO | — | Order expiration time. Orders not paid before this time are automatically closed |
| `paid_at` | DATETIME | YES | NULL | Timestamp when payment was confirmed |
| `closed_at` | DATETIME | YES | NULL | Timestamp when the order was closed (expired or manually cancelled) |
| `created_at` | DATETIME | NO | — | Order creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_payment_order_out_trade_no` | `out_trade_no` | UNIQUE | Idempotency key; fast lookup from payment gateway callbacks |
| `idx_payment_order_username_created` | `username`, `created_at` | Non-unique | User order history queries |
| `idx_payment_order_status_expire` | `status`, `expire_at` | Non-unique | Batch job to close expired `PAYING` orders |

### payment_transaction

:::info
Records individual transaction flows from WeChat Pay. One payment order may have multiple transaction records if retried. The `raw_json` field stores the complete WeChat callback payload for audit purposes.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `out_trade_no` | VARCHAR(64) | NO | — | Merchant order number (FK to `payment_order.out_trade_no`) |
| `wx_transaction_id` | VARCHAR(100) | NO | — | WeChat-assigned global transaction ID |
| `trade_state` | VARCHAR(30) | NO | — | WeChat trade state: `SUCCESS`, `REFUND`, `NOTPAY`, `CLOSED`, `REVOKED`, `USERPAYING`, `PAYERROR` |
| `payer_openid` | VARCHAR(128) | YES | NULL | WeChat OpenID of the payer |
| `success_time` | DATETIME | YES | NULL | WeChat-reported payment success time (RFC 3339 format parsed to datetime) |
| `raw_json` | LONGTEXT | YES | NULL | Complete raw JSON payload from WeChat callback. Retained for audit and debugging |
| `created_at` | DATETIME | NO | — | Record creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_payment_tx_wx_transaction_id` | `wx_transaction_id` | UNIQUE | Prevent duplicate processing of the same WeChat transaction |
| `idx_payment_tx_out_trade_no` | `out_trade_no` | Non-unique | Lookup transactions for a given order |

### payment_notify_log

:::info
Audit log for all payment gateway callback notifications. Every incoming notification (WeChat Pay or Alipay) is logged before processing, regardless of whether signature verification succeeds. This provides a complete audit trail for dispute resolution.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `notify_id` | VARCHAR(100) | YES | NULL | Gateway-assigned notification ID. Used for deduplication |
| `out_trade_no` | VARCHAR(64) | YES | NULL | Merchant order number from the notification |
| `event_type` | VARCHAR(50) | YES | NULL | Notification event type, e.g. `TRANSACTION.SUCCESS` |
| `verify_ok` | TINYINT(1) | NO | `0` | Whether RSA2 signature verification passed: `1` = verified, `0` = failed |
| `process_status` | VARCHAR(20) | NO | — | Processing result: `SUCCESS`, `FAILED`, `IGNORED` |
| `raw_body` | LONGTEXT | YES | NULL | Complete raw request body. Retained for audit |
| `created_at` | DATETIME | NO | — | Notification receipt timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_payment_notify_id` | `notify_id` | UNIQUE | Prevent duplicate processing of the same notification |
| `idx_payment_notify_out_trade_no` | `out_trade_no` | Non-unique | Lookup notifications for a given order |

### payment_reconcile_record

:::info
Payment reconciliation records comparing local transaction counts against WeChat Pay's daily bill. Used to detect discrepancies and ensure financial accuracy.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `bill_date` | DATE | NO | — | The billing date being reconciled |
| `channel` | VARCHAR(20) | NO | — | Payment channel: `wechat`, `alipay` |
| `download_status` | VARCHAR(20) | NO | — | Bill download status: `pending`, `success`, `failed` |
| `local_total` | INT | NO | `0` | Total successful transaction count from local database |
| `wechat_total` | INT | NO | `0` | Total transaction count from WeChat's bill |
| `diff_count` | INT | NO | `0` | Absolute difference between local and WeChat counts |
| `report_path` | VARCHAR(500) | YES | NULL | File path to the generated reconciliation report |
| `created_at` | DATETIME | NO | — | Record creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_payment_reconcile_bill_channel` | `bill_date`, `channel` | UNIQUE | One reconciliation record per channel per day |

### payment_dlq_log

:::warning
Dead letter queue log for payment notifications that failed processing after maximum retries. Each entry contains the original notification data and error details for manual investigation. For the RabbitMQ retry pattern, see [RabbitMQ — Payment Notification](rabbitmq-schema.md#domain-2-payment-notification).
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `notify_id` | VARCHAR(100) | YES | NULL | Original gateway notification ID |
| `out_trade_no` | VARCHAR(64) | YES | NULL | Merchant order number |
| `trade_state` | VARCHAR(30) | YES | NULL | Trade state at the time of failure |
| `retry_count` | INT | NO | `0` | Number of retry attempts before DLQ |
| `error_message` | VARCHAR(500) | YES | NULL | Last error message that caused the failure |
| `raw_body` | LONGTEXT | YES | NULL | Original notification payload |
| `created_at` | DATETIME | NO | — | DLQ entry creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_payment_dlq_notify_id` | `notify_id` | Non-unique | Lookup DLQ by notification ID |
| `idx_payment_dlq_out_trade_no` | `out_trade_no` | Non-unique | Lookup DLQ by order number |
| `idx_payment_dlq_created_at` | `created_at` | Non-unique | Time-range queries for admin dashboard |

### payment_pricing_config

:::info
Singleton configuration table for payment pricing and feature descriptions. Only one row (id=1) is used. The admin panel reads and updates this record to control pricing and feature lists displayed to users.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | — | Primary key (fixed value `1`) |
| `pro_month_amount_fen` | INT | NO | `1500` | Pro monthly subscription price in fen (default 1500 = ¥15.00) |
| `free_desc` | VARCHAR(500) | YES | NULL | Free tier description text displayed on the pricing page |
| `free_features_text` | TEXT | YES | NULL | Free tier feature list (newline-separated) |
| `pro_desc` | VARCHAR(500) | YES | NULL | Pro tier description text |
| `pro_features_text` | TEXT | YES | NULL | Pro tier feature list (newline-separated) |
| `updated_at` | DATETIME | YES | NULL | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_payment_pricing_updated_at` | `updated_at` | Non-unique | Cache invalidation checks |

---

## Agent Domain

### agent_model_pricing

:::tip
Per-model pricing configuration for the AI agent billing system. Prices are expressed in fen per million tokens. The billing service reads this table to calculate costs, and the `enabled` flag allows disabling specific models without removing pricing data.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `model_name` | VARCHAR(100) | NO | — | Unique model identifier, e.g. `deepseek-chat`, `mimo-v2-pro` |
| `input_price_fen_per_million` | BIGINT | NO | `0` | Price per million input tokens in fen |
| `cached_input_price_fen_per_million` | BIGINT | NO | `0` | Price per million cached input tokens in fen (added via migration). Cached tokens are typically cheaper than fresh input tokens |
| `output_price_fen_per_million` | BIGINT | NO | `0` | Price per million output tokens in fen |
| `enabled` | TINYINT(1) | NO | `1` | Whether this model is available for use: `1` = enabled, `0` = disabled |
| `updated_at` | DATETIME | YES | CURRENT_TIMESTAMP | Last update timestamp. Auto-updated via `ON UPDATE CURRENT_TIMESTAMP` |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_agent_model_pricing_model_name` | `model_name` | UNIQUE | One pricing record per model |

### agent_usage_stats

:::info
Aggregated usage statistics for all AI agent models. Updated atomically via `INSERT ... ON DUPLICATE KEY UPDATE` with delta values after each billing cycle. The `total_cost_micro_fen` field uses micro-fen precision (1 micro-fen = 0.00000001 fen) to avoid floating-point rounding in cumulative cost tracking.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `model_name` | VARCHAR(100) | NO | — | Unique model identifier |
| `total_input_tokens` | BIGINT | NO | `0` | Cumulative input tokens consumed across all users |
| `total_cached_tokens` | BIGINT | NO | `0` | Cumulative cached input tokens |
| `total_output_tokens` | BIGINT | NO | `0` | Cumulative output tokens generated |
| `total_reasoning_tokens` | BIGINT | NO | `0` | Cumulative reasoning/thinking tokens (for models with chain-of-thought) |
| `total_request_count` | BIGINT | NO | `0` | Total number of API requests made to this model |
| `total_cost_micro_fen` | BIGINT | NO | `0` | Cumulative cost in micro-fen (1 micro-fen = 0.00000001 fen). High precision prevents rounding errors in long-running totals |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

### agent_billing_dlq_log

:::warning
Dead letter queue log for AI agent billing operations that failed after maximum retries. When a billing deduction cannot be persisted to the database (e.g., due to transient DB errors), the message is routed to this DLQ for manual resolution. For the Redis atomic deduction, see [Redis — Agent Balance](redis-schema.md#db-12--agent-balance). For the MQ topology, see [RabbitMQ — Agent Billing](rabbitmq-schema.md#domain-3-agent-billing).
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `username` | VARCHAR(100) | NO | — | Username whose billing deduction failed |
| `amount_fen` | VARCHAR(40) | NO | — | Deduction amount in fen (stored as string to preserve precision) |
| `model_name` | VARCHAR(100) | YES | NULL | AI model that was used |
| `input_tokens` | INT | NO | `0` | Input tokens consumed in the failed request |
| `output_tokens` | INT | NO | `0` | Output tokens generated in the failed request |
| `retry_count` | INT | NO | `0` | Number of retry attempts before DLQ |
| `last_error` | VARCHAR(500) | YES | NULL | Last error message |
| `status` | VARCHAR(20) | NO | `'pending'` | Resolution status: `pending` (awaiting resolution), `resolved` (manually handled) |
| `resolved_by` | VARCHAR(100) | YES | NULL | Admin username who resolved this record |
| `resolved_at` | DATETIME | YES | NULL | Resolution timestamp |
| `created_at` | DATETIME | NO | — | DLQ entry creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_agent_billing_dlq_username` | `username` | Non-unique | Lookup DLQ entries by user |
| `idx_agent_billing_dlq_status` | `status` | Non-unique | Filter pending vs resolved entries |
| `idx_agent_billing_dlq_created_at` | `created_at` | Non-unique | Time-range queries |

---

## Wallpaper Domain

### wallpaper_asset

:::info
Core table for the wallpaper marketplace. Each row represents a wallpaper resource with its metadata, moderation status, and aggregate statistics. The `status` field controls the wallpaper's visibility: only `approved` wallpapers appear in public listings. Soft-delete is implemented via the `deleted` flag.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `owner_username` | VARCHAR(100) | NO | — | Username of the wallpaper uploader |
| `title` | VARCHAR(120) | NO | — | Wallpaper display title |
| `description` | TEXT | YES | NULL | Wallpaper description text |
| `type` | VARCHAR(20) | NO | `'image'` | Media type: `image` (static) or `video` (animated/live wallpaper) |
| `status` | VARCHAR(20) | NO | `'draft'` | Moderation status: `draft` (not submitted), `pending` (awaiting review), `approved` (published), `rejected` (failed review) |
| `original_url` | LONGTEXT | NO | — | CDN URL to the original full-resolution file |
| `thumb_320_url` | LONGTEXT | YES | NULL | CDN URL to 320px thumbnail |
| `thumb_720_url` | LONGTEXT | YES | NULL | CDN URL to 720px thumbnail |
| `thumb_1280_url` | LONGTEXT | YES | NULL | CDN URL to 1280px thumbnail |
| `width` | INT | YES | NULL | Image/video width in pixels |
| `height` | INT | YES | NULL | Image/video height in pixels |
| `file_size` | BIGINT | YES | NULL | File size in bytes |
| `tags_text` | TEXT | YES | NULL | Comma-separated tag names for search indexing |
| `copyright_declared` | TINYINT(1) | NO | `0` | Whether the uploader declared copyright ownership: `1` = declared, `0` = not declared |
| `copyright_info` | TEXT | YES | NULL | Additional copyright information or attribution text |
| `rating_avg` | DECIMAL(4,2) | NO | `0` | Average rating score (1-5 scale). Recalculated when ratings change |
| `rating_count` | BIGINT | NO | `0` | Total number of ratings received |
| `download_count` | BIGINT | NO | `0` | Total download count |
| `apply_count` | BIGINT | NO | `0` | Total "apply as wallpaper" count |
| `current_version` | INT | NO | `1` | Current version number. Incremented when the source file is replaced |
| `deleted` | TINYINT(1) | NO | `0` | Soft-delete flag: `1` = deleted, `0` = active |
| `created_at` | DATETIME | NO | — | Record creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |
| `published_at` | DATETIME | YES | NULL | Timestamp when the wallpaper was first approved/published |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_wallpaper_asset_owner` | `owner_username` | Non-unique | Lookup wallpapers by owner |
| `idx_wallpaper_asset_status` | `status` | Non-unique | Filter by moderation status |
| `idx_wallpaper_asset_type` | `type` | Non-unique | Filter by media type |
| `idx_wallpaper_asset_created_at` | `created_at` | Non-unique | Sort by creation date |

### wallpaper_version

:::tip
Tracks the version history of wallpaper source files. Each time a wallpaper's source file is replaced, a new version row is inserted while `wallpaper_asset.current_version` is incremented. This enables rollback to previous versions.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `wallpaper_id` | BIGINT | NO | — | FK to `wallpaper_asset.id` |
| `version_no` | INT | NO | — | Sequential version number (1, 2, 3, ...) |
| `original_url` | LONGTEXT | NO | — | CDN URL to the original file for this version |
| `thumb_320_url` | LONGTEXT | YES | NULL | 320px thumbnail URL for this version |
| `thumb_720_url` | LONGTEXT | YES | NULL | 720px thumbnail URL for this version |
| `thumb_1280_url` | LONGTEXT | YES | NULL | 1280px thumbnail URL for this version |
| `file_size` | BIGINT | YES | NULL | File size in bytes for this version |
| `width` | INT | YES | NULL | Image width in pixels |
| `height` | INT | YES | NULL | Image height in pixels |
| `checksum` | VARCHAR(128) | YES | NULL | SHA-256 or similar hash of the file for integrity verification |
| `operator_name` | VARCHAR(100) | NO | — | Username of the person who performed the version update |
| `reason` | VARCHAR(300) | YES | NULL | Reason for the version change |
| `created_at` | DATETIME | NO | — | Version creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_wallpaper_version_no` | `wallpaper_id`, `version_no` | UNIQUE | One version per number per wallpaper |
| `idx_wallpaper_version_wallpaper` | `wallpaper_id` | Non-unique | List all versions for a wallpaper |

### wallpaper_video_meta

:::info
Extended metadata for video-type wallpapers. Stored in a separate table to avoid bloating `wallpaper_asset` with NULL columns for image-type wallpapers. Joined into `WallpaperAsset` queries via `LEFT JOIN` when `type = 'video'`.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `wallpaper_id` | BIGINT | NO | — | PK, FK to `wallpaper_asset.id` |
| `duration_ms` | BIGINT | YES | NULL | Video duration in milliseconds |
| `frame_rate` | DECIMAL(6,3) | YES | NULL | Video frame rate (e.g. 29.970, 60.000) |
| `created_at` | DATETIME | NO | — | Record creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

### wallpaper_review_log

:::info
Audit trail for wallpaper moderation actions. Every approve/reject action by an admin is logged with the reviewer's identity and reason. This ensures accountability and enables dispute resolution.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `wallpaper_id` | BIGINT | NO | — | FK to `wallpaper_asset.id` |
| `action` | VARCHAR(30) | NO | — | Moderation action: `approved`, `rejected` |
| `reviewer_name` | VARCHAR(100) | NO | — | Admin username who performed the review |
| `reviewer_reason` | VARCHAR(500) | YES | NULL | Reason for the moderation decision |
| `created_at` | DATETIME | NO | — | Review action timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_wallpaper_review_wallpaper` | `wallpaper_id` | Non-unique | List review history for a wallpaper |
| `idx_wallpaper_review_created_at` | `created_at` | Non-unique | Time-range queries |

### wallpaper_rating

:::info
User ratings for wallpapers. Each user can rate a wallpaper once (enforced by unique key). Updates modify the existing rating. The `wallpaper_asset.rating_avg` and `rating_count` fields are recalculated on each change.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `wallpaper_id` | BIGINT | NO | — | FK to `wallpaper_asset.id` |
| `username` | VARCHAR(100) | NO | — | Username who submitted the rating |
| `score` | TINYINT | NO | — | Rating score (1-5 scale) |
| `created_at` | DATETIME | NO | — | Rating creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp (for rating changes) |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_wallpaper_rating_user` | `wallpaper_id`, `username` | UNIQUE | One rating per user per wallpaper |
| `idx_wallpaper_rating_wallpaper` | `wallpaper_id` | Non-unique | List all ratings for a wallpaper |
| `idx_wallpaper_rating_updated_at` | `updated_at` | Non-unique | Time-range queries |

### wallpaper_stat_daily

:::info
Daily aggregated statistics per wallpaper. Used for trend analysis and popular wallpaper discovery. One row per wallpaper per day.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `wallpaper_id` | BIGINT | NO | — | FK to `wallpaper_asset.id` |
| `stat_date` | DATE | NO | — | Calendar date of the statistics |
| `download_count` | BIGINT | NO | `0` | Downloads on this date |
| `apply_count` | BIGINT | NO | `0` | "Apply as wallpaper" actions on this date |
| `view_count` | BIGINT | NO | `0` | Detail page views on this date |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_wallpaper_stat_daily` | `wallpaper_id`, `stat_date` | UNIQUE | One stat row per wallpaper per day |
| `idx_wallpaper_stat_date` | `stat_date` | Non-unique | Aggregate across all wallpapers for a date |

### wallpaper_apply_log

:::info
Detailed log of wallpaper apply events. Tracks both authenticated users (by `username`) and anonymous users (by `ip_hash`). Used for abuse detection and usage analytics.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `wallpaper_id` | BIGINT | NO | — | FK to `wallpaper_asset.id` |
| `username` | VARCHAR(100) | YES | NULL | Username of the applier (NULL for anonymous) |
| `ip_hash` | VARCHAR(128) | YES | NULL | SHA-256 hash of the client IP for anonymous rate limiting |
| `user_agent` | VARCHAR(500) | YES | NULL | Client user-agent string |
| `action` | VARCHAR(20) | NO | — | Action type: `apply` (set as wallpaper), `download` |
| `created_at` | DATETIME | NO | — | Event timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_wallpaper_apply_wallpaper` | `wallpaper_id` | Non-unique | List apply events for a wallpaper |
| `idx_wallpaper_apply_username` | `username` | Non-unique | Lookup by user |
| `idx_wallpaper_apply_created_at` | `created_at` | Non-unique | Time-range queries |

### wallpaper_report

:::warning
User-submitted reports for inappropriate wallpapers. Reports enter with `status = 'pending'` and are resolved by admins. Unresolved reports block wallpaper from appearing in public listings (based on report count thresholds).
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `wallpaper_id` | BIGINT | NO | — | FK to `wallpaper_asset.id` |
| `reporter_username` | VARCHAR(100) | NO | — | Username who submitted the report |
| `reason_type` | VARCHAR(40) | NO | — | Report category: `copyright`, `inappropriate`, `spam`, `other` |
| `reason_detail` | VARCHAR(500) | YES | NULL | Free-text description of the issue |
| `status` | VARCHAR(20) | NO | `'pending'` | Resolution status: `pending`, `resolved`, `dismissed` |
| `resolver_name` | VARCHAR(100) | YES | NULL | Admin username who resolved the report |
| `resolution_note` | VARCHAR(500) | YES | NULL | Admin's resolution notes |
| `created_at` | DATETIME | NO | — | Report submission timestamp |
| `resolved_at` | DATETIME | YES | NULL | Resolution timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_wallpaper_report_wallpaper` | `wallpaper_id` | Non-unique | List reports for a wallpaper |
| `idx_wallpaper_report_status` | `status` | Non-unique | Filter pending reports |
| `idx_wallpaper_report_created_at` | `created_at` | Non-unique | Time-range queries |

### wallpaper_tag

:::info
Tag taxonomy for the wallpaper marketplace. Tags are managed by admins and used for categorization and search. The `slug` field provides a URL-friendly identifier, and `usage_count` is maintained as a denormalized counter.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(60) | NO | — | Display name of the tag |
| `slug` | VARCHAR(60) | NO | — | URL-friendly identifier (lowercase, hyphenated) |
| `creator_username` | VARCHAR(100) | YES | NULL | Admin username who created the tag |
| `enabled` | TINYINT(1) | NO | `1` | Whether the tag is available for use: `1` = enabled, `0` = disabled |
| `usage_count` | INT | NO | `0` | Number of wallpapers using this tag (denormalized counter) |
| `created_at` | DATETIME | NO | — | Tag creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_wallpaper_tag_slug` | `slug` | UNIQUE | One tag per slug |
| `idx_wallpaper_tag_enabled` | `enabled` | Non-unique | Filter enabled tags |
| `idx_wallpaper_tag_usage` | `usage_count` | Non-unique | Sort by popularity |

### wallpaper_tag_ref

:::info
Many-to-many relationship between wallpapers and tags. This is a junction table with a composite primary key.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `wallpaper_id` | BIGINT | NO | — | FK to `wallpaper_asset.id` |
| `tag_id` | BIGINT | NO | — | FK to `wallpaper_tag.id` |
| `created_at` | DATETIME | NO | — | Association creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `wallpaper_id`, `tag_id` | Clustered | Composite PK prevents duplicate associations |
| `idx_wallpaper_tag_ref_tag` | `tag_id` | Non-unique | Lookup wallpapers by tag |

---

## Mini Game Domain

### mini_game_score

:::info
High score records for mini-games. Each user has one record per game (enforced by unique key). New submissions use `INSERT ... ON DUPLICATE KEY UPDATE` to atomically update the high score if the new score exceeds the existing one.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `user_id` | BIGINT | NO | — | FK to `user_account.id` |
| `game_id` | VARCHAR(40) | NO | — | Game identifier, e.g. `2048`, `tetris`, `snake` |
| `high_score` | BIGINT | NO | `0` | All-time highest score |
| `best_duration_ms` | BIGINT | NO | `0` | Best completion time in milliseconds (for time-based games) |
| `best_moves` | INT | NO | `0` | Fewest moves to achieve the high score (for move-based games) |
| `plays_count` | BIGINT | NO | `0` | Total number of games played |
| `last_played_at` | DATETIME | YES | NULL | Timestamp of the most recent game session |
| `achieved_at` | DATETIME | YES | NULL | Timestamp when the current high score was achieved |
| `created_at` | DATETIME | NO | — | Record creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_mini_game_score_user_game` | `user_id`, `game_id` | UNIQUE | One record per user per game |
| `idx_mini_game_score_game_high` | `game_id`, `high_score` DESC | Non-unique | Leaderboard queries: top scores per game |
| `idx_mini_game_score_updated_at` | `updated_at` | Non-unique | Recently active players |

### mini_game_score_dlq_log

:::warning
Dead letter queue for game score submissions that failed processing. Score submissions are first validated (anti-cheat checks), then persisted. If database persistence fails after retries, the submission is logged here for manual review. For the Redis leaderboard, see [Redis — Mini Game](redis-schema.md#db-14--mini-game). For the MQ topology, see [RabbitMQ — Mini Game Score](rabbitmq-schema.md#domain-6-mini-game-score).
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `submit_id` | VARCHAR(64) | NO | — | Client-generated unique submission ID for idempotency |
| `user_id` | BIGINT | NO | — | FK to `user_account.id` |
| `game_id` | VARCHAR(40) | NO | — | Game identifier |
| `score` | BIGINT | NO | — | Submitted score value |
| `duration_ms` | BIGINT | NO | `0` | Game duration in milliseconds |
| `moves` | INT | NO | `0` | Number of moves made |
| `retry_count` | INT | NO | `0` | Number of retry attempts before DLQ |
| `last_error` | VARCHAR(500) | YES | NULL | Last error message |
| `payload_json` | LONGTEXT | YES | NULL | Complete submission payload for reprocessing |
| `status` | VARCHAR(20) | NO | `'pending'` | Resolution status: `pending`, `resolved`, `discarded` |
| `resolved_by` | VARCHAR(100) | YES | NULL | Admin username who resolved this record |
| `resolved_at` | DATETIME | YES | NULL | Resolution timestamp |
| `created_at` | DATETIME | NO | — | DLQ entry creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_mini_game_score_dlq_submit` | `submit_id` | UNIQUE | Prevent duplicate DLQ entries |
| `idx_mini_game_score_dlq_user_game` | `user_id`, `game_id` | Non-unique | Lookup DLQ by user and game |
| `idx_mini_game_score_dlq_status` | `status` | Non-unique | Filter pending entries |
| `idx_mini_game_score_dlq_created_at` | `created_at` | Non-unique | Time-range queries |

---

## Version Domain

### app_version

:::info
Application version registry. Each application component (desktop app, admin panel) has one row identified by `app_name`. The `update_count` tracks how many times clients have downloaded this version.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `app_name` | VARCHAR(100) | NO | — | Unique application identifier, e.g. `eisland-desktop`, `eisland-admin` |
| `version` | VARCHAR(50) | NO | — | Semantic version string, e.g. `1.2.3` |
| `description` | VARCHAR(500) | YES | NULL | Release notes or changelog summary |
| `update_count` | BIGINT | NO | `0` | Number of times this version has been downloaded/installed |
| `updated_at` | DATETIME | YES | NULL | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| UNIQUE (`app_name`) | `app_name` | UNIQUE | One version record per application |

---

## Service Status Domain

### service_status

:::tip
API endpoint enable/disable control table. Each API endpoint has a corresponding row. When `status = 0`, the endpoint returns a custom error message instead of processing the request. This allows administrators to disable specific features without redeploying the application.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `api_name` | VARCHAR(100) | NO | — | Unique API identifier matching `@ServiceStatusApi` annotations in controllers, e.g. `auth.user.login`, `user.wallpapers.upload` |
| `status` | TINYINT(1) | NO | `1` | Endpoint status: `1` = enabled, `0` = disabled |
| `message` | VARCHAR(500) | NO | `''` | Custom error message returned when the endpoint is disabled |
| `remark` | VARCHAR(255) | NO | `''` | Human-readable description of the endpoint (method, path, purpose) |
| `updated_at` | DATETIME | NO | CURRENT_TIMESTAMP | Last update timestamp. Auto-updated via `ON UPDATE CURRENT_TIMESTAMP` |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| UNIQUE (`api_name`) | `api_name` | UNIQUE | One status record per API endpoint |

---

## Upload / Object Replication Domain

:::info
The object replication subsystem implements an **outbox pattern** for reliable cross-provider file replication (e.g., from R2 to OSS). When a file is uploaded, an event is written to `object_outbox`. A background worker processes outbox events and creates replication tasks in `object_replication_task`. Each task attempt is logged in `object_replication_log`. Progress tracking uses `object_replication_checkpoint` for resumable batch operations.
:::

### object_outbox

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `event_type` | VARCHAR(80) | NO | — | Event type identifier, e.g. `avatar.uploaded`, `wallpaper.source.replaced` |
| `event_key` | VARCHAR(255) | NO | — | Unique event key for idempotency |
| `payload_json` | LONGTEXT | NO | — | JSON payload containing event details (source URL, target bucket, etc.) |
| `status` | VARCHAR(20) | NO | `'pending'` | Processing status: `pending`, `processing`, `published`, `failed` |
| `retry_count` | INT | NO | `0` | Number of processing attempts |
| `next_retry_at` | DATETIME | YES | NULL | Scheduled time for the next retry (exponential backoff) |
| `last_error` | VARCHAR(500) | YES | NULL | Last error message |
| `published_at` | DATETIME | YES | NULL | Timestamp when the event was successfully published |
| `created_at` | DATETIME | NO | — | Event creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_object_outbox_event_key` | `event_key` | UNIQUE | Idempotency: prevent duplicate events |
| `idx_object_outbox_status_retry` | `status`, `next_retry_at` | Non-unique | Worker query: find pending events ready for retry |
| `idx_object_outbox_created_at` | `created_at` | Non-unique | Time-range queries |

### object_replication_task

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `task_key` | VARCHAR(255) | NO | — | Unique task identifier for idempotency |
| `biz_type` | VARCHAR(40) | NO | — | Business domain: `avatar`, `wallpaper`, `feedback` |
| `biz_id` | BIGINT | YES | NULL | Related business entity ID |
| `biz_key` | VARCHAR(150) | YES | NULL | Related business key (e.g., username for avatars) |
| `field_name` | VARCHAR(80) | NO | — | Target field name in the business entity, e.g. `avatar`, `original_url` |
| `object_key` | VARCHAR(500) | NO | — | Object storage key (path in the bucket) |
| `source_provider` | VARCHAR(20) | NO | — | Source storage provider: `r2`, `oss` |
| `target_provider` | VARCHAR(20) | NO | — | Target storage provider |
| `source_url` | LONGTEXT | YES | NULL | Source file URL |
| `target_url` | LONGTEXT | YES | NULL | Target file URL (populated after replication) |
| `status` | VARCHAR(20) | NO | `'pending'` | Task status: `pending`, `processing`, `done`, `failed` |
| `priority` | INT | NO | `5` | Processing priority (lower = higher priority). Default 5, range 1-10 |
| `retry_count` | INT | NO | `0` | Number of retry attempts |
| `max_retries` | INT | NO | `6` | Maximum retry attempts before giving up |
| `next_retry_at` | DATETIME | YES | NULL | Scheduled time for the next retry |
| `last_error` | VARCHAR(500) | YES | NULL | Last error message |
| `done_at` | DATETIME | YES | NULL | Timestamp when replication completed |
| `created_at` | DATETIME | NO | — | Task creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `uk_object_replication_task_key` | `task_key` | UNIQUE | Idempotency: prevent duplicate tasks |
| `idx_object_replication_status_retry` | `status`, `next_retry_at` | Non-unique | Worker query: find pending tasks ready for retry |
| `idx_object_replication_priority_status` | `priority`, `status` | Non-unique | Priority-ordered task processing |
| `idx_object_replication_biz` | `biz_type`, `biz_id` | Non-unique | Lookup tasks by business entity |
| `idx_object_replication_created_at` | `created_at` | Non-unique | Time-range queries |

### object_replication_log

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `task_id` | BIGINT | NO | — | FK to `object_replication_task.id` |
| `trace_id` | VARCHAR(100) | YES | NULL | Distributed trace ID for request correlation |
| `attempt_no` | INT | NO | — | Sequential attempt number (1, 2, 3, ...) |
| `status` | VARCHAR(20) | NO | — | Attempt result: `success`, `failed` |
| `duration_ms` | INT | YES | NULL | Attempt duration in milliseconds |
| `error_message` | VARCHAR(500) | YES | NULL | Error message if the attempt failed |
| `created_at` | DATETIME | NO | — | Log entry timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_object_replication_log_task` | `task_id` | Non-unique | List attempts for a task |
| `idx_object_replication_log_trace` | `trace_id` | Non-unique | Correlate logs by trace ID |
| `idx_object_replication_log_created_at` | `created_at` | Non-unique | Time-range queries |

### object_replication_checkpoint

:::info
Tracks progress for resumable batch replication operations. Each checkpoint key represents a logical scan segment. The `last_id` field records the last processed ID, enabling the worker to resume from where it left off after restarts.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `checkpoint_key` | VARCHAR(80) | NO | — | Primary key. Unique identifier for the checkpoint segment |
| `last_id` | BIGINT | NO | `0` | Last processed row ID. Enables resumable scanning |
| `status` | VARCHAR(20) | NO | `'pending'` | Checkpoint status: `pending`, `scanning`, `done` |
| `last_error` | VARCHAR(500) | YES | NULL | Last error message |
| `done_at` | DATETIME | YES | NULL | Timestamp when the checkpoint completed |
| `created_at` | DATETIME | NO | — | Checkpoint creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `checkpoint_key` | Clustered | Row identifier |
| `idx_object_replication_checkpoint_status_updated` | `status`, `updated_at` | Non-unique | Worker query: find resumable checkpoints |

---

## Feedback Domain

### issue_feedback

:::info
User-submitted issue reports and feature requests. Users can attach log files and screenshots (uploaded via the `/v1/upload/feedback-*` endpoints). Admins resolve feedback by setting `status` and optionally adding an `admin_reply`.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `username` | VARCHAR(100) | NO | — | Username who submitted the feedback |
| `feedback_type` | VARCHAR(40) | NO | — | Category: `bug`, `feature`, `other` |
| `title` | VARCHAR(120) | NO | — | Brief summary of the feedback |
| `content` | TEXT | NO | — | Detailed description |
| `contact` | VARCHAR(150) | YES | NULL | Optional contact information (email, phone) |
| `feedback_log_url` | VARCHAR(500) | YES | NULL | CDN URL to uploaded log file |
| `feedback_screenshot_url` | VARCHAR(500) | YES | NULL | CDN URL to uploaded screenshot |
| `client_version` | VARCHAR(50) | YES | NULL | Client application version when feedback was submitted |
| `status` | VARCHAR(20) | NO | `'pending'` | Resolution status: `pending`, `resolved`, `dismissed` |
| `admin_reply` | VARCHAR(1000) | YES | NULL | Admin's response visible to the user |
| `created_at` | DATETIME | NO | — | Feedback submission timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |
| `resolved_at` | DATETIME | YES | NULL | Resolution timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_issue_feedback_user_created` | `username`, `created_at` | Non-unique | User's feedback history |
| `idx_issue_feedback_status_created` | `status`, `created_at` | Non-unique | Admin dashboard: pending feedback sorted by date |

### feedback_qq_group_config

:::info
Singleton configuration table for the QQ group invitation link displayed on the feedback page. Only one row (id=1) is used. Follows the same pattern as `announcement_config`.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | — | Primary key (fixed value `1`) |
| `qq_invite_url` | VARCHAR(500) | YES | NULL | QQ group invitation link |
| `enabled` | TINYINT(1) | NO | `0` | Master enable switch: `1` = active, `0` = disabled |
| `updated_by` | VARCHAR(100) | YES | NULL | Admin username who last updated the config |
| `updated_at` | DATETIME | YES | NULL | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |

---

## Announcement Domain

### announcement_config

:::info
Singleton configuration table for system-wide announcements. Only one row (id=1) is used. Announcements have a time window (`start_at` to `end_at`) during which they are displayed to users. The `enabled` flag provides an additional kill switch.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | — | Primary key (fixed value `1`) |
| `title` | VARCHAR(200) | YES | NULL | Announcement title displayed to users |
| `content` | TEXT | YES | NULL | Announcement body content (supports Markdown) |
| `enabled` | TINYINT(1) | NO | `0` | Master enable switch: `1` = active, `0` = disabled |
| `start_at` | DATETIME | YES | NULL | Announcement display start time |
| `end_at` | DATETIME | YES | NULL | Announcement display end time |
| `updated_by` | VARCHAR(100) | YES | NULL | Admin username who last updated the announcement |
| `updated_at` | DATETIME | YES | NULL | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_announcement_enabled` | `enabled` | Non-unique | Quick check if announcements are enabled |
| `idx_announcement_window` | `start_at`, `end_at` | Non-unique | Time-window queries for active announcements |

---

## Auth Domain

### email_dispatch_dlq_log

:::warning
Dead letter queue log for email delivery failures. When an email (verification code, receipt, etc.) cannot be delivered after maximum retries via RabbitMQ, the dispatch details are logged here for manual investigation. For the verification code storage, see [Redis — Email Verification](redis-schema.md#db-2--email-verification--identity-verification). For the MQ topology, see [RabbitMQ — Email Verification](rabbitmq-schema.md#domain-1-email-verification).
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `trace_id` | VARCHAR(100) | YES | NULL | Distributed trace ID for correlating the email request across services |
| `email` | VARCHAR(150) | YES | NULL | Recipient email address |
| `scene` | VARCHAR(50) | YES | NULL | Email type: `register`, `login`, `reset-password`, `receipt` |
| `retry_count` | INT | NO | `0` | Number of delivery attempts before DLQ |
| `error_message` | VARCHAR(500) | YES | NULL | Last delivery error message |
| `created_at` | DATETIME | NO | — | DLQ entry creation timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_email_dispatch_dlq_trace_id` | `trace_id` | Non-unique | Lookup by trace ID |
| `idx_email_dispatch_dlq_email` | `email` | Non-unique | Lookup by recipient |
| `idx_email_dispatch_dlq_created_at` | `created_at` | Non-unique | Time-range queries |

---

## Toolbox Domain

### toolbox_software

:::info
Catalog of commonly used software links displayed in the eIsland toolbox feature. Managed by admins, sorted by `sort_order` for display ordering.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(100) | NO | — | Software display name |
| `description` | VARCHAR(500) | YES | NULL | Brief description of the software |
| `url` | VARCHAR(500) | NO | — | Download or homepage URL |
| `icon_url` | VARCHAR(500) | YES | NULL | CDN URL to the software icon |
| `sort_order` | INT | NO | `0` | Display ordering weight (lower = displayed first) |
| `enabled` | TINYINT(1) | NO | `1` | Visibility flag: `1` = visible, `0` = hidden |
| `created_at` | DATETIME | NO | — | Record creation timestamp |
| `updated_at` | DATETIME | NO | — | Last update timestamp |

**Indexes:**

| Name | Columns | Type | Purpose |
|------|---------|------|---------|
| PRIMARY | `id` | Clustered | Row identifier |
| `idx_toolbox_software_enabled_sort` | `enabled`, `sort_order` | Non-unique | Query enabled software sorted by display order |

### toolbox_translate_pricing

:::info
Pricing configuration for the toolbox translation feature. Each row represents a translation service provider with its per-million-token pricing.
:::

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGINT | NO | AUTO_INCREMENT | Primary key |
| `service_name` | VARCHAR(100) | NO | — | Translation service identifier |
| `price_fen_per_million` | BIGINT | NO | — | Price per million tokens in fen |
| `enabled` | TINYINT(1) | NO | `1` | Whether this service is available |
| `updated_at` | DATETIME | YES | NULL | Last update timestamp |

---

## Legacy Tables

:::danger
The following tables are **deprecated** and retained only for rollback safety. They were merged into `user_account` in April 2026. After 30 days of stable operation, they can be manually dropped. **Do not write to these tables.**
:::

### admin_user (deprecated)

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `username` | VARCHAR(100) | Unique admin username |
| `password` | VARCHAR(255) | BCrypt-hashed password |
| `avatar` | LONGTEXT | Avatar data |
| `session_token` | VARCHAR(500) | Current JWT token hash |
| `created_at` | DATETIME | Creation timestamp |

### app_user (deprecated)

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `username` | VARCHAR(100) | Unique username |
| `email` | VARCHAR(150) | Unique email |
| `password` | VARCHAR(255) | BCrypt-hashed password |
| `avatar` | LONGTEXT | Avatar data |
| `gender` | VARCHAR(20) | Gender identifier |
| `gender_custom` | VARCHAR(64) | Custom gender text |
| `birthday` | DATE | Date of birth |
| `session_token` | VARCHAR(500) | Current JWT token hash |
| `created_at` | DATETIME | Creation timestamp |

---

## Table Summary

| # | Table | Domain | Description |
|---|-------|--------|-------------|
| 1 | `user_account` | User | Unified user accounts (admin + app merged) |
| 2 | `user_active_daily` | User | Daily active user tracking |
| 3 | `identity_verification` | Identity | Real-name verification records |
| 4 | `payment_order` | Payment | Payment order lifecycle |
| 5 | `payment_transaction` | Payment | WeChat Pay transaction flows |
| 6 | `payment_notify_log` | Payment | Payment callback audit log |
| 7 | `payment_reconcile_record` | Payment | Daily payment reconciliation |
| 8 | `payment_dlq_log` | Payment | Payment notification DLQ |
| 9 | `payment_pricing_config` | Payment | Pricing and feature configuration |
| 10 | `agent_model_pricing` | Agent | AI model pricing per million tokens |
| 11 | `agent_usage_stats` | Agent | Aggregated model usage statistics |
| 12 | `agent_billing_dlq_log` | Agent | Billing failure DLQ |
| 13 | `wallpaper_asset` | Wallpaper | Wallpaper marketplace resources |
| 14 | `wallpaper_version` | Wallpaper | Wallpaper file version history |
| 15 | `wallpaper_video_meta` | Wallpaper | Video wallpaper metadata |
| 16 | `wallpaper_review_log` | Wallpaper | Moderation audit trail |
| 17 | `wallpaper_rating` | Wallpaper | User ratings |
| 18 | `wallpaper_stat_daily` | Wallpaper | Daily statistics |
| 19 | `wallpaper_apply_log` | Wallpaper | Apply/download event log |
| 20 | `wallpaper_report` | Wallpaper | User reports |
| 21 | `wallpaper_tag` | Wallpaper | Tag taxonomy |
| 22 | `wallpaper_tag_ref` | Wallpaper | Wallpaper-tag associations |
| 23 | `mini_game_score` | Mini Game | High score records |
| 24 | `mini_game_score_dlq_log` | Mini Game | Score submission DLQ |
| 25 | `app_version` | Version | Application version registry |
| 26 | `service_status` | Service Status | API endpoint enable/disable control |
| 27 | `object_outbox` | Upload | Outbox pattern event queue |
| 28 | `object_replication_task` | Upload | Cross-provider replication tasks |
| 29 | `object_replication_log` | Upload | Replication attempt log |
| 30 | `object_replication_checkpoint` | Upload | Resumable batch progress |
| 31 | `issue_feedback` | Feedback | User issue reports |
| 32 | `announcement_config` | Announcement | System announcements |
| 33 | `email_dispatch_dlq_log` | Auth | Email delivery DLQ |
| 34 | `toolbox_software` | Toolbox | Software catalog |
| 35 | `toolbox_translate_pricing` | Toolbox | Translation service pricing |
| 36 | `admin_user` | Legacy | **Deprecated** — merged into `user_account` |
| 37 | `app_user` | Legacy | **Deprecated** — merged into `user_account` |
| 38 | `feedback_qq_group_config` | Feedback | QQ group invitation config for feedback page |
