---
title: RabbitMQ Architecture
icon: envelopes-bulk
---

# RabbitMQ Architecture

:::info
The eIsland backend uses **RabbitMQ 3.12+** for asynchronous processing and event-driven architecture. The application connects via **Spring AMQP** (`spring-boot-starter-amqp`) with **Jackson JSON** message serialization. There are **6 exchanges**, **21 queues**, and **9 message types** across 6 business domains. Every domain follows the same **3-queue retry pattern**: main queue → retry queue (TTL-delayed via DLX) → DLQ. For the MySQL DLQ tables, see [MySQL Database Schema](mysql-schema.md). For the Redis caches, see [Redis Architecture](redis-schema.md).
:::

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           eIsland RabbitMQ Layer                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Client: Spring AMQP (spring-boot-starter-amqp)                                 │
│  Serializer: JacksonJsonMessageConverter (JSON)                                 │
│  Exchanges: 6 DirectExchange (all durable)                                      │
│  Queues:    21 (all durable)                                                    │
│  Messages:  9 Java record types                                                 │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                    6 Message Domains                                      │  │
│  │                                                                           │  │
│  │  Auth      ─ Email verification code dispatch                             │  │
│  │  Payment   ─ Payment notification processing + receipt dispatch           │  │
│  │  Agent     ─ Billing deduction + usage stats                              │  │
│  │  Upload    ─ Object replication (outbox pattern)                          │  │
│  │  Identity  ─ Identity verification material upload                        │  │
│  │  Mini Game ─ Score upsert                                                 │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  Retry Pattern (all domains):                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                                   │
│  │  Main    │───►│  Retry   │───►│   DLQ    │                                   │
│  │  Queue   │◄───│  Queue   │    │  Queue   │                                   │
│  │          │    │ (TTL+DLX)│    │ (persist)│                                   │
│  └──────────┘    └──────────┘    └──────────┘                                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Exchange Topology

:::tip
All 6 exchanges are **DirectExchange** type with `durable=true` and `autoDelete=false`. Direct exchanges route messages to queues based on exact routing key match.
:::

| Exchange Name | Domain | Queues | Config Class |
|--------------|--------|--------|--------------|
| `eisland.email.verify.exchange` | Auth — Email Verification | 3 | `EmailVerificationMqConfig` |
| `eisland.payment.notify.exchange` | Payment — Notifications & Receipts | 6 | `PaymentMqConfig` |
| `eisland.agent.billing.exchange` | Agent — Billing & Usage | 4 | `AgentBillingMqConfig` |
| `eisland.object.replication.exchange` | Upload — Object Replication | 3 | `ObjectReplicationMqConfig` |
| `eisland.identity.material.exchange` | Identity — Material Upload | 3 | `IdentityMaterialMqConfig` |
| `eisland.mini-game.exchange` | Mini Game — Score Upsert | 3 | `MiniGameScoreMqConfig` |

---

## Retry Pattern

:::info
All domains (except `agent.usage-stats`) follow the same application-level retry pattern. Unlike Spring Retry or RabbitMQ's built-in retry, this pattern uses **explicit routing** to retry and DLQ queues with **custom retry headers** for fine-grained control.
:::

### Flow Diagram

```
Producer
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Main Queue                                                 │
│  @RabbitListener → onMessage(msg, retryCount)               │
│      │                                                      │
│      ├── Success → ACK (message consumed)                   │
│      │                                                      │
│      └── Exception caught:                                  │
│              │                                              │
│              ├── retryCount < maxRetries                    │
│              │      → convertAndSend to RETRY routing key   │
│              │      → header: x-{domain}-retry-count + 1    │
│              │                                              │
│              └── retryCount >= maxRetries                   │
│                     → convertAndSend to DLQ routing key     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Retry Queue                                                │
│  Arguments:                                                 │
│    x-message-ttl: {delay}ms                                 │
│    x-dead-letter-exchange: {same exchange}                  │
│    x-dead-letter-routing-key: {main routing key}            │
│                                                             │
│  Message expires after TTL → re-routed to Main Queue        │
└─────────────────────────────────────────────────────────────┘
    │ (if maxRetries exhausted)
    ▼
┌─────────────────────────────────────────────────────────────┐
│  DLQ Queue                                                  │
│  @RabbitListener → onDeadLetter(msg, retryCount)            │
│      → Log error                                            │
│      → Persist to *_dlq_log MySQL table                     │
└─────────────────────────────────────────────────────────────┘
```

### Retry Configuration Summary

| Domain | Retry TTL | Max Retries | Retry Header | Configurable Via |
|--------|-----------|-------------|--------------|-----------------|
| Email Verify | 10,000ms | 3 | `x-email-retry-count` | `${email.notify-retry-delay-ms}`, `${email.notify-max-retries}` |
| Identity Material | 10,000ms | 3 | `x-identity-material-retry-count` | Hardcoded |
| Object Replication | 15,000ms | 6 | `x-object-replication-retry-count` | `${object-replication.retry-delay-ms}`, `${object-replication.max-retries}` |
| Payment Notify | 15,000ms | 5 | `x-payment-retry-count` | `${payment.notify-retry-delay-ms}`, `${payment.notify-max-retries}` |
| Payment Receipt | 15,000ms | 5 | `x-payment-receipt-retry-count` | `${payment.notify-retry-delay-ms}`, `${payment.notify-max-retries}` |
| Agent Billing | 5,000ms | 5 | `x-agent-billing-retry-count` | Hardcoded |
| Mini Game Score | 15,000ms | 5 | `x-mini-game-score-retry-count` | Hardcoded |
| Agent Usage Stats | — | — | — | No retry (fire-and-forget) |

---

## Domain 1: Email Verification

:::info
Dispatches verification code emails asynchronously. The producer publishes to the main queue, and the consumer calls the Resend API to deliver the email. Failed deliveries are retried with exponential backoff via the retry queue.
:::

### Queue Topology

| Queue | Routing Key | Arguments |
|-------|-------------|-----------|
| `eisland.email.verify.dispatch.queue` | `eisland.email.verify.dispatch` | — |
| `eisland.email.verify.retry.queue` | `eisland.email.verify.retry` | `x-message-ttl`: 10000ms, `x-dead-letter-exchange`: `eisland.email.verify.exchange`, `x-dead-letter-routing-key`: `eisland.email.verify.dispatch` |
| `eisland.email.verify.dlq` | `eisland.email.verify.dlq` | — |

### Message: `EmailCodeDispatchMessage`

```java
public record EmailCodeDispatchMessage(
    String traceId,              // Distributed trace ID for request correlation
    String email,                // Recipient email address
    String scene,                // Email scene: REGISTER, LOGIN, RESET_PASSWORD, CHANGE_EMAIL, UNREGISTER
    String code,                 // Plaintext verification code (6 digits)
    long createdAtEpochSeconds,  // Message creation time (epoch seconds)
    String lastError             // Error message from previous failed attempt (null on first send)
)
```

### Producer → Consumer Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | `EmailVerificationService.sendCode()` | Generates code, hashes for Redis, publishes `EmailCodeDispatchMessage` to main queue |
| 2 | `EmailCodeDispatchConsumer.onMessage()` | Calls Resend API to send email. On failure → retry or DLQ |
| 3 | `EmailCodeDispatchConsumer.onDeadLetter()` | Persists to `email_dispatch_dlq_log` table |

---

## Domain 2: Payment Notification

:::warning
Payment notifications from Alipay and WeChat are published to MQ immediately after signature verification. This decouples the HTTP callback response from the business logic (order update, benefit granting), ensuring the payment gateway receives a fast 200 OK even if downstream processing is slow.
:::

### Queue Topology

| Queue | Routing Key | Arguments |
|-------|-------------|-----------|
| `eisland.payment.notify.process.queue` | `eisland.payment.notify.process` | — |
| `eisland.payment.notify.retry.queue` | `eisland.payment.notify.retry` | `x-message-ttl`: 15000ms, `x-dead-letter-exchange`: `eisland.payment.notify.exchange`, `x-dead-letter-routing-key`: `eisland.payment.notify.process` |
| `eisland.payment.notify.dlq` | `eisland.payment.notify.dlq` | — |
| `eisland.payment.receipt.dispatch.queue` | `eisland.payment.receipt.dispatch` | — |
| `eisland.payment.receipt.retry.queue` | `eisland.payment.receipt.retry` | `x-message-ttl`: 15000ms, `x-dead-letter-exchange`: `eisland.payment.notify.exchange`, `x-dead-letter-routing-key`: `eisland.payment.receipt.dispatch` |
| `eisland.payment.receipt.dlq` | `eisland.payment.receipt.dlq` | — |

### Message: `PaymentNotifyMessage`

```java
public record PaymentNotifyMessage(
    String notifyId,             // Gateway notification ID (for deduplication)
    String channel,              // Payment channel: ALIPAY, WECHAT
    String outTradeNo,           // Merchant order number
    String transactionId,        // Gateway transaction ID
    String tradeState,           // Trade state: SUCCESS, REFUND, NOTPAY, CLOSED, etc.
    OffsetDateTime successTime,  // Payment success time from gateway
    boolean verifyOk,            // Whether RSA2 signature verification passed
    String rawBody,              // Complete raw callback payload (for audit)
    String lastError             // Error from previous failed attempt
)
```

### Message: `PaymentReceiptDispatchMessage`

```java
public record PaymentReceiptDispatchMessage(
    String traceId,              // Distributed trace ID
    String email,                // Recipient email for receipt
    String outTradeNo,           // Merchant order number
    String channel,              // Payment channel: ALIPAY, WECHAT
    String transactionId,        // Gateway transaction ID
    Integer amountFen,           // Payment amount in fen
    String currency,             // Currency code: CNY
    String productCode,          // Product: pro-month, agent-recharge
    LocalDateTime paidAt,        // Payment time
    LocalDateTime expireAt,      // Order expiration time
    String lastError             // Error from previous failed attempt
)
```

### Producer → Consumer Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | `AlipayNotifyController` / `WechatPayNotifyController` | Verifies signature, publishes `PaymentNotifyMessage` |
| 2 | `PaymentNotifyConsumer.onMessage()` | Idempotent processing: update order status, grant benefits, send receipt |
| 3 | `PaymentNotifyConsumer.onDeadLetter()` | Persists to `payment_dlq_log` table |
| 4 | `PaymentService.trySendPaymentReceipt()` | After order completion, publishes `PaymentReceiptDispatchMessage` |
| 5 | `PaymentReceiptDispatchConsumer.onMessage()` | Calls Resend API to send receipt email |
| 6 | `PaymentReceiptDispatchConsumer.onDeadLetter()` | Persists to `payment_dlq_log` table |

---

## Domain 3: Agent Billing

:::danger
The agent billing domain has two queues: one for balance deduction persistence (critical, with retry) and one for usage stats aggregation (fire-and-forget, no retry). The deduction queue has the shortest retry TTL (5 seconds) to minimize billing delay. For the Redis atomic deduction, see [Redis — Agent Balance](redis-schema.md#db-12--agent-balance). For the MySQL tables, see [Agent Domain](mysql-schema.md#agent-domain).
:::

### Queue Topology

| Queue | Routing Key | Arguments |
|-------|-------------|-----------|
| `eisland.agent.billing.deduct.queue` | `eisland.agent.billing.deduct` | — |
| `eisland.agent.billing.deduct.retry.queue` | `eisland.agent.billing.deduct.retry` | `x-message-ttl`: 5000ms, `x-dead-letter-exchange`: `eisland.agent.billing.exchange`, `x-dead-letter-routing-key`: `eisland.agent.billing.deduct` |
| `eisland.agent.billing.deduct.dlq` | `eisland.agent.billing.deduct.dlq` | — |
| `eisland.agent.usage-stats.queue` | `eisland.agent.usage-stats` | — (no retry, no DLQ) |

### Message: `AgentBillingDeductMessage`

```java
public record AgentBillingDeductMessage(
    String username,             // Username whose balance was deducted
    String amountFen,            // Deducted amount in fen (decimal string, 8 places)
    String modelName,            // AI model name: deepseek-v4-flash, deepseek-v4-pro, etc.
    int inputTokens,             // Input tokens consumed
    int outputTokens,            // Output tokens generated
    String lastError             // Error from previous failed attempt
)
```

### Message: `AgentUsageStatsMessage`

```java
public record AgentUsageStatsMessage(
    String modelName,            // AI model name
    int inputTokens,             // Input tokens (fresh, not cached)
    int cachedTokens,            // Cached input tokens
    int outputTokens,            // Output tokens
    int reasoningTokens,         // Reasoning/thinking tokens
    long costMicroFen            // Cost in micro-fen (1 micro-fen = 0.00000001 fen)
)
```

### Producer → Consumer Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | `AgentBalanceRedisService.deduct()` | Lua script deducts balance in Redis, publishes `AgentBillingDeductMessage` |
| 2 | `AgentBillingDeductConsumer.onMessage()` | Persists deduction to `user_account.balance_fen` in MySQL |
| 3 | `AgentBillingDeductConsumer.onDeadLetter()` | Persists to `agent_billing_dlq_log` table |
| 4 | `AgentModelPricingService.recordUsageStats()` | Publishes `AgentUsageStatsMessage` after each billing |
| 5 | `AgentUsageStatsConsumer.onMessage()` | Upserts delta to `agent_usage_stats` table. Failures are logged only (no retry) |

---

## Domain 4: Object Replication

:::info
Implements the **outbox pattern** for reliable cross-provider file replication (e.g., R2 → OSS). Database writes create outbox events; a relay service polls the outbox table and publishes replication tasks to MQ. The main queue supports **priority** (0–10) via `x-max-priority`, ensuring high-priority replications (e.g., user avatars) are processed before low-priority ones (e.g., wallpapers).
:::

### Queue Topology

| Queue | Routing Key | Arguments |
|-------|-------------|-----------|
| `eisland.object.replication.process.queue` | `eisland.object.replication.process` | `x-max-priority`: 10 |
| `eisland.object.replication.retry.queue` | `eisland.object.replication.retry` | `x-message-ttl`: 15000ms, `x-dead-letter-exchange`: `eisland.object.replication.exchange`, `x-dead-letter-routing-key`: `eisland.object.replication.process` |
| `eisland.object.replication.dlq` | `eisland.object.replication.dlq` | — |

### Message: `ObjectReplicationMessage`

```java
public record ObjectReplicationMessage(
    Long taskId,                 // FK to object_replication_task.id
    String traceId,              // Distributed trace ID
    String lastError             // Error from previous failed attempt
) implements Serializable
```

### Outbox Pattern Flow

```
1. Service writes file → creates object_outbox row (status=pending)
                              │
2. ObjectOutboxRelayService   │ (polls every 3s, batch=100)
   reads outbox rows ─────────┘
      │
      ├── Creates object_replication_task row
      ├── Publishes ObjectReplicationMessage to main queue
      └── Marks outbox row as published
              │
3. ObjectReplicationConsumer.onMessage()
      │
      ├── Downloads file from source provider
      ├── Uploads to target provider
      ├── Updates task status to done
      └── Updates business entity URL field
              │
4. On failure → retry queue (15s TTL) → main queue (up to 6 retries)
              │
5. On DLQ → ObjectReplicationConsumer.onDeadLetter()
      └── Persists to object_replication_log table
```

### Producer → Consumer Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | `ObjectOutboxRelayService` | Polls `object_outbox`, creates `object_replication_task`, publishes `ObjectReplicationMessage` with priority |
| 2 | `ObjectReplicationConsumer.onMessage()` | Downloads from source, uploads to target, updates task and business entity |
| 3 | `ObjectReplicationConsumer.onDeadLetter()` | Persists to `object_replication_log` table |

---

## Domain 5: Identity Verification Material

:::warning
After Alipay identity verification completes, face material info (encrypted) must be uploaded to object storage for audit compliance. This is done asynchronously via MQ to avoid blocking the verification response.
:::

### Queue Topology

| Queue | Routing Key | Arguments |
|-------|-------------|-----------|
| `eisland.identity.material.upload.queue` | `eisland.identity.material.upload` | — |
| `eisland.identity.material.upload.retry.queue` | `eisland.identity.material.upload.retry` | `x-message-ttl`: 10000ms, `x-dead-letter-exchange`: `eisland.identity.material.exchange`, `x-dead-letter-routing-key`: `eisland.identity.material.upload` |
| `eisland.identity.material.upload.dlq` | `eisland.identity.material.upload.dlq` | — |

### Message: `IdentityMaterialMessage`

```java
public record IdentityMaterialMessage(
    String username,             // Username who completed verification
    String certifyId,            // Alipay certification ID
    String materialInfo,         // Encrypted material info JSON from Alipay
    String lastError             // Error from previous failed attempt
)
```

### Producer → Consumer Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | `IdentityVerificationService.queryResult()` | After Alipay returns PASSED, publishes `IdentityMaterialMessage` |
| 2 | `IdentityMaterialUploadConsumer.onMessage()` | Uploads material JSON to COS/OSS object storage, updates `identity_verification.material_info_url` |
| 3 | `IdentityMaterialUploadConsumer.onDeadLetter()` | Logs error (no dedicated DLQ log table) |

---

## Domain 6: Mini Game Score

:::info
Game score submissions are processed asynchronously to ensure the HTTP response is fast. The consumer performs Redis idempotency check, distributed lock, MySQL upsert, and leaderboard cache sync in sequence.
:::

### Queue Topology

| Queue | Routing Key | Arguments |
|-------|-------------|-----------|
| `eisland.mini-game.score.upsert.queue` | `eisland.mini-game.score.upsert` | — |
| `eisland.mini-game.score.upsert.retry.queue` | `eisland.mini-game.score.upsert.retry` | `x-message-ttl`: 15000ms, `x-dead-letter-exchange`: `eisland.mini-game.exchange`, `x-dead-letter-routing-key`: `eisland.mini-game.score.upsert` |
| `eisland.mini-game.score.upsert.dlq` | `eisland.mini-game.score.upsert.dlq` | — |

### Message: `ScoreUpsertMessage`

```java
public record ScoreUpsertMessage(
    String submitId,             // Client-generated unique ID for idempotency
    Long userId,                 // FK to user_account.id
    String gameId,               // Game identifier: 2048, tetris, snake
    long score,                  // Submitted score value
    long durationMs,             // Game duration in milliseconds
    int moves,                   // Number of moves made
    long achievedAt,             // Timestamp when the score was achieved
    String clientVersion,        // Client app version (for anti-cheat)
    String traceId,              // Distributed trace ID
    String lastError             // Error from previous failed attempt
)
```

### Producer → Consumer Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | `ScoreUpsertProducer.publish()` | After rate-limit and sanity checks, publishes `ScoreUpsertMessage` |
| 2 | `ScoreUpsertConsumer.onMessage()` | Redis SETNX idempotency → distributed lock → MySQL upsert → leaderboard cache sync |
| 3 | `ScoreUpsertConsumer.onDeadLetter()` | Persists to `mini_game_score_dlq_log` table |

---

## Queue Summary

| # | Queue Name | Domain | Retry? | DLQ? |
|---|-----------|--------|--------|------|
| 1 | `eisland.email.verify.dispatch.queue` | Auth | ✅ | ✅ |
| 2 | `eisland.email.verify.retry.queue` | Auth | — | — |
| 3 | `eisland.email.verify.dlq` | Auth | — | — |
| 4 | `eisland.payment.notify.process.queue` | Payment | ✅ | ✅ |
| 5 | `eisland.payment.notify.retry.queue` | Payment | — | — |
| 6 | `eisland.payment.notify.dlq` | Payment | — | — |
| 7 | `eisland.payment.receipt.dispatch.queue` | Payment | ✅ | ✅ |
| 8 | `eisland.payment.receipt.retry.queue` | Payment | — | — |
| 9 | `eisland.payment.receipt.dlq` | Payment | — | — |
| 10 | `eisland.agent.billing.deduct.queue` | Agent | ✅ | ✅ |
| 11 | `eisland.agent.billing.deduct.retry.queue` | Agent | — | — |
| 12 | `eisland.agent.billing.deduct.dlq` | Agent | — | — |
| 13 | `eisland.agent.usage-stats.queue` | Agent | ❌ | ❌ |
| 14 | `eisland.object.replication.process.queue` | Upload | ✅ | ✅ |
| 15 | `eisland.object.replication.retry.queue` | Upload | — | — |
| 16 | `eisland.object.replication.dlq` | Upload | — | — |
| 17 | `eisland.identity.material.upload.queue` | Identity | ✅ | ✅ |
| 18 | `eisland.identity.material.upload.retry.queue` | Identity | — | — |
| 19 | `eisland.identity.material.upload.dlq` | Identity | — | — |
| 20 | `eisland.mini-game.score.upsert.queue` | Mini Game | ✅ | ✅ |
| 21 | `eisland.mini-game.score.upsert.retry.queue` | Mini Game | — | — |
| 22 | `eisland.mini-game.score.upsert.dlq` | Mini Game | — | — |

---

## DLQ Persistence

:::warning
When a message reaches the DLQ (max retries exhausted), the consumer persists the failure details to a MySQL table for manual investigation and potential replay. See the corresponding table definitions in [MySQL Database Schema](mysql-schema.md).
:::

| Domain | DLQ Log Table | Entity Class | Consumer |
|--------|---------------|--------------|----------|
| Email Verify | `email_dispatch_dlq_log` | `EmailDispatchDlqLog` | `EmailCodeDispatchConsumer.onDeadLetter()` |
| Payment Notify | `payment_dlq_log` | `PaymentDlqLog` | `PaymentNotifyConsumer.onDeadLetter()` |
| Payment Receipt | `payment_dlq_log` | `PaymentDlqLog` | `PaymentReceiptDispatchConsumer.onDeadLetter()` |
| Agent Billing | `agent_billing_dlq_log` | `AgentBillingDlqLog` | `AgentBillingDeductConsumer.onDeadLetter()` |
| Object Replication | `object_replication_log` | — | `ObjectReplicationConsumer.onDeadLetter()` |
| Mini Game Score | `mini_game_score_dlq_log` | `MiniGameScoreDlqLog` | `ScoreUpsertConsumer.onDeadLetter()` |
| Identity Material | — | — | `IdentityMaterialUploadConsumer.onDeadLetter()` (log only) |

---

## Global Configuration

### RabbitMQ Connection

```yaml
spring:
  rabbitmq:
    host: ${RABBITMQ_HOST}
    port: ${RABBITMQ_PORT}
    username: ${RABBITMQ_USERNAME}
    password: ${RABBITMQ_PASSWORD}
    listener:
      simple:
        default-requeue-rejected: true  # Safety net; all consumers handle errors explicitly
```

### Message Converter

:::tip
`JacksonJsonMessageConverter` is configured as a singleton bean in `EmailVerificationMqConfig` and injected into the global `RabbitTemplate`. All Java `record` types are automatically serialized to/from JSON.
:::

```java
@Bean
public JacksonJsonMessageConverter jacksonJsonMessageConverter() {
    return new JacksonJsonMessageConverter();
}

@Bean
public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                     JacksonJsonMessageConverter converter) {
    RabbitTemplate template = new RabbitTemplate(connectionFactory);
    template.setMessageConverter(converter);
    return template;
}

@Bean
public RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
    return new RabbitAdmin(connectionFactory);
}
```

### Domain-Specific Properties

| Property | Default | Description |
|----------|---------|-------------|
| `email.notify-max-retries` | 3 | Max retry attempts for email dispatch |
| `email.notify-retry-delay-ms` | 10000 | Retry queue TTL for email (ms) |
| `payment.notify-max-retries` | 5 | Max retry attempts for payment notifications |
| `payment.notify-retry-delay-ms` | 15000 | Retry queue TTL for payment (ms) |
| `object-replication.enabled` | true | Enable object replication subsystem |
| `object-replication.outbox-relay-enabled` | true | Enable outbox relay polling |
| `object-replication.outbox-relay-batch-size` | 100 | Outbox relay batch size per poll |
| `object-replication.outbox-relay-interval-ms` | 3000 | Outbox relay poll interval (ms) |
| `object-replication.max-retries` | 6 | Max retry attempts for replication |
| `object-replication.retry-delay-ms` | 15000 | Retry queue TTL for replication (ms) |
| `object-replication.backfill-enabled` | false | Enable backfill job for missed replications |
| `object-replication.backfill-batch-size` | 200 | Backfill batch size |
| `object-replication.backfill-interval-ms` | 5000 | Backfill poll interval (ms) |
| `object-replication.dlq-replay-enabled` | false | Enable DLQ replay job |
| `object-replication.dlq-replay-batch-size` | 100 | DLQ replay batch size |
| `object-replication.dlq-replay-interval-ms` | 15000 | DLQ replay poll interval (ms) |
| `object-replication.source-fetch-timeout-ms` | 60000 | Source file download timeout (ms) |

---

## What RabbitMQ is NOT Used For

| Feature | Status | Alternative |
|---------|--------|-------------|
| Fanout / Topic exchanges | Not used | All exchanges are DirectExchange |
| RabbitMQ Streams | Not used | Classic queues only |
| Priority queues | Used in 1 queue only | `object.replication.process.queue` (`x-max-priority`: 10) |
| Message TTL on main queues | Not used | TTL only on retry queues |
| Max-length on queues | Not used | No backpressure at queue level |
| Custom container factories | Not used | All listeners use default `SimpleRabbitListenerContainerFactory` |
| Spring Retry / @Retryable | Not used | Hand-coded retry in consumer methods |
| RabbitMQ management plugin | Not configured in app | Managed externally |
