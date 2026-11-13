---
title: eisland Server Architecture
icon: server
---

# eIsland Server Architecture

:::info
The eIsland backend follows a **modular monolith** architecture built with **Java 25** and **Spring Boot 4.0.5**. It provides RESTful APIs, real-time communication, and background processing for the eIsland desktop application. The server handles user authentication, AI agent interactions, payment processing, weather data aggregation, and more.
:::

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              eIsland Server                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          API Gateway (Spring MVC)                          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │  │  /auth   │ │  /user   │ │  /agent  │ │ /payment │ │  /game   │  ...     │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│  ┌───────────────────────────────────▼────────────────────────────────────────┐ │
│  │                          Service Layer                                     │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │
│  │  │ server-auth  │ │ server-user  │ │ server-agent │ │server-payment│ ...   │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                          │
│  ┌───────────────────────────────────▼────────────────────────────────────────┐ │
│  │                          Data Layer                                        │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │
│  │  │    MySQL     │ │    Redis     │ │   RabbitMQ   │ │ Cloud Storage│       │ │
│  │  │  (Primary)   │ │  (Cache)     │ │   (Queue)    │ │   (Files)    │       │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Modular Monolith

:::tip
The server is organized as a multi-module Maven project with clear domain boundaries. Each module encapsulates a specific business domain, enabling independent development and testing while maintaining deployment simplicity. This architecture pattern provides the benefits of microservices (separation of concerns, independent development) while avoiding the operational complexity of distributed systems.
:::

### Module Structure

```
server/
├── server-common/          # Shared utilities and constants
├── server-auth/            # Authentication and authorization
├── server-user/            # User management
├── server-agent/           # AI agent services
├── server-weather/         # Weather data services
├── server-payment/         # Payment processing
├── server-version/         # Version management
├── server-service-status/  # Service health monitoring
├── server-upload/          # File upload services
├── server-mini-game/       # Mini-game leaderboards
└── server-app/             # Main application entry point
```

### Module Responsibilities

| Module | Domain | Key Features |
|--------|--------|--------------|
| **server-common** | Shared | Utilities, constants, exception handling, base entities |
| **server-auth** | Authentication | JWT, login, register, password reset, email verification, CAPTCHA, OAuth (GitHub, Microsoft, WeChat, Gitee, KOOK) |
| **server-user** | User Management | Profile, settings, balance, identity verification |
| **server-agent** | AI Agent | LLM integration, tool calling, billing, streaming |
| **server-weather** | Weather | QWeather API integration, caching, location services |
| **server-payment** | Payment | Alipay, WeChat Pay, order management, receipts |
| **server-version** | Version | App version management, update checks |
| **server-service-status** | Health | Service monitoring, health checks |
| **server-upload** | Upload | File upload, object storage, CDN replication |
| **server-mini-game** | Games | Leaderboards, scores, anti-cheat |
| **server-app** | Entry Point | Application bootstrap, configuration assembly |

### Dependency Flow

```
server-app
    │
    ├──► server-auth
    │        └──► server-common
    │
    ├──► server-user
    │        └──► server-common
    │
    ├──► server-agent
    │        └──► server-common
    │
    ├──► server-payment
    │        └──► server-common
    │
    └──► ... (other modules)
```

## Data Layer

### MySQL Database

:::info
**MySQL** is the primary relational database for persistent data storage. The application uses HikariCP connection pooling for efficient connection management and MyBatis ORM for flexible SQL mapping. The database schema is designed with clear domain boundaries, with each module owning its tables and mappers. For the complete column-level reference, see [MySQL Database Schema](mysql-schema.md).
:::

#### Database Schema

| Domain | Tables | Purpose |
|--------|--------|---------|
| **User** | `user_account`, `user_active_daily`, `user_oauth_binding` | User profiles, authentication, activity tracking, OAuth bindings |
| **Mini Game** | `mini_game_score`, `mini_game_score_dlq_log` | Game scores, leaderboards, dead letter queue logs |
| **Payment** | `payment_order`, `payment_transaction`, `payment_notify_log`, `payment_pricing_config`, `payment_dlq_log` | Payment processing, order management |
| **Version** | `app_version` | Application version management |
| **Service Status** | `service_status` | Service health monitoring |
| **Upload** | `object_outbox`, `object_replication_task`, `object_replication_checkpoint`, `object_replication_backfill` | File upload, object replication |
| **Agent** | `agent_usage_stats`, `agent_model_pricing`, `agent_billing_dlq_log` | AI agent usage tracking, billing |
| **Wallpaper** | `wallpaper_market`, `wallpaper_tag` | Wallpaper marketplace |
| **Auth** | `issue_feedback`, `email_dispatch_dlq_log` | Issue feedback, email dispatch |
| **Identity** | `identity_verification` | Identity verification |

#### MyBatis ORM

:::tip
MyBatis provides flexible SQL mapping with XML-based query definitions and automatic underscore-to-camelCase conversion. Unlike JPA/Hibernate, MyBatis gives developers full control over SQL queries, making it ideal for complex reporting queries and performance-critical operations.
:::

```java
@Mapper
public interface UserMapper {
    User selectByUsername(@Param("username") String username);
    int insert(User user);
    int deductBalance(@Param("username") String username,
                      @Param("amountFen") BigDecimal amountFen);
}
```

**Key Features:**
- Parameterized queries (SQL injection prevention)
- Result maps for complex entity mapping
- Dynamic SQL with `<where>`, `<if>`, `<choose>`
- Auto-generated keys
- Atomic operations (CAS patterns)

### Redis Cache

:::info
**Redis** serves as the primary caching layer and supports rate limiting, leaderboards, bloom filters, and session management. The application uses multiple Redis instances with dedicated configurations per domain, ensuring isolation and performance. Redis is critical for real-time features like leaderboards, rate limiting, and session management. For the complete key-pattern reference across all 15 databases, see [Redis Architecture](redis-schema.md).
:::

#### Use Cases

| Structure | Use Case |
|-----------|----------|
| **String** | Simple key-value caching, counters, session tokens |
| **Hash** | User metadata, configuration objects |
| **Sorted Set** | Leaderboards, rate limiting windows |
| **Set** | Unique item tracking, ban lists |
| **Bitmap** | Feature flags, user status |
| **HyperLogLog** | Approximate counting |

#### Bloom Filters

:::tip
Redis implements **Bloom Filters** for fast rejection of non-existent queries, preventing cache penetration. Bloom Filters are space-efficient probabilistic data structures that can quickly determine if an element is definitely not in a set or possibly in a set. This is particularly useful for preventing cache penetration attacks where malicious users query non-existent data.
:::

| Instance | Purpose | Bit Size |
|----------|---------|----------|
| `UserBanBloomService` | Check if username is banned | 1,000,003 |
| `WallpaperDetailBloomService` | Validate wallpaper ID existence | 2,000,003 |
| `VersionAppBloomService` | Validate app version existence | 1,000,003 |

**Properties:**
- False Positive Rate: ~1% with 6 hash functions
- False Negative Rate: 0% (never misses existing items)
- Fail-open design (allows requests if Redis is down)

### RabbitMQ Message Queue

:::warning
**RabbitMQ** handles asynchronous processing and event-driven architecture with dead letter queue (DLQ) support for failed messages. The message queue decouples services, enables reliable delivery, and provides retry mechanisms for failed operations. DLQ ensures that failed messages are not lost and can be retried or logged for manual review. For the complete queue topology, message definitions, and retry patterns, see [RabbitMQ Architecture](rabbitmq-schema.md).
:::

#### Queue Topology

| Queue | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `email.verification` | Auth Service | Email Consumer | Email verification code dispatch |
| `payment.receipt` | Payment Service | Receipt Consumer | Payment receipt email delivery |
| `agent.billing.deduct` | Agent Service | Billing Consumer | AI usage billing persistence |
| `*.dlq` | Failed handlers | DLQ Consumer | Failed message retry and logging |

#### DLQ Pattern

```java
@RabbitListener(queues = "payment.dlq")
public void handleDlq(PaymentDlqMessage message) {
    if (message.retryCount() < MAX_RETRIES) {
        retryOperation(message);
    } else {
        paymentDlqLogMapper.insert(new PaymentDlqLog(...));
    }
}
```

## Security Architecture

### JWT Authentication

:::danger
All authenticated endpoints require a valid JWT token in the `Authorization` header. JWT secrets must be configured via environment variables. The system uses HMAC-SHA256 for token signing and implements single-device enforcement, where only the most recent login session is valid. This prevents session hijacking and ensures that compromised tokens cannot be reused.
:::

```
Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Extract Bearer Token from Authorization Header          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Validate JWT Signature & Expiration (HMAC-SHA256)       │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Database Verification                                   │
│     - User exists?                                          │
│     - Account enabled?                                      │
│     - Not banned? (Bloom Filter → Exact Set)                │
│     - Session token matches? (Single device enforcement)    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Set Security Context (ROLE_USER, ROLE_PRO, ROLE_ADMIN)  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
  Continue to Controller
```

### Role-Based Access Control

| Role | Permissions | Endpoints |
|------|-------------|-----------|
| **Public** | No auth required | `/auth/**`, `/v1/version/**`, `/v1/service-status/**` |
| **USER** | Basic authenticated | `/v1/user/**`, `/v1/mini-game/**`, `/v1/upload/**` |
| **PRO** | Premium features | Custom API keys, higher rate limits |
| **ADMIN** | Full access | All endpoints, admin operations |

### Rate Limiting

:::info
Rate limiting is implemented using Redis sorted sets for sliding window counters and Lua scripts for atomic token bucket operations. This prevents brute force attacks, abuse, and ensures fair usage across all users.
:::

| Mechanism | Limit | Window |
|-----------|-------|--------|
| **Login failures** | 5 attempts | 5 minutes |
| **Login lockout** | 10 minutes | After 5 failures |
| **Registration** | 5 attempts | 1 hour per IP |
| **Email send** | 3 emails | 1 hour per IP/email |
| **Slider CAPTCHA** | 12 creates | 1 minute per account |

### Replay Protection

:::warning
Sensitive endpoints are protected against replay attacks using timestamp + nonce validation:
:::

```java
// Client includes headers
X-Timestamp: 1719000000000  // Unix milliseconds
X-Nonce: random-unique-string-128-chars

// Server validates
if (Math.abs(now - timestamp) > 5_MINUTES) → Reject
if (Redis.has(nonce)) → Reject (replay detected)
Redis.set(nonce, TTL=5_MINUTES)
```

## API Architecture

### RESTful Design

:::info
The API follows RESTful conventions with consistent response formats and proper HTTP status codes. All endpoints are versioned (e.g., `/api/v1/`) to support backward compatibility. The API uses JSON for request and response bodies, and implements proper error handling with standardized error codes.
:::

**URL Pattern:**
```
/api/v1/{domain}/{resource}
```

**Response Format:**
```json
{
  "code": 200,
  "message": "Success",
  "data": { ... }
}
```

**Error Format:**
```json
{
  "code": 401,
  "message": "Authentication required"
}
```

### WebSocket Communication

:::tip
Real-time features use WebSocket for bidirectional communication:
:::

| Endpoint | Purpose | Protocol |
|----------|---------|----------|
| `/ws/agent/stt` | Speech-to-text streaming | WebSocket |
| `/ws/agent/stream` | AI response streaming | SSE (Server-Sent Events) |

### SSE Streaming

:::info
AI agent responses are streamed via **Server-Sent Events (SSE)** for real-time delivery. SSE is preferred over WebSocket for one-way server-to-client streaming because it's simpler, more reliable, and works with standard HTTP. The client receives incremental updates as the LLM generates tokens, providing a responsive user experience.
:::

```java
SseEmitter emitter = new SseEmitter(0L); // No timeout

CompletableFuture.runAsync(() -> {
    // 1. Validate request
    // 2. Check user balance
    // 3. Call LLM with streaming
    // 4. Send chunks via SSE
    sendEvent(emitter, "thinking", Map.of("text", reasoningContent));
    sendEvent(emitter, "content", Map.of("text", contentDelta));
    sendEvent(emitter, "tool_call", Map.of("tool", toolName));
    sendEvent(emitter, "done", Map.of("usage", tokenUsage));
}, streamExecutor);
```

**SSE Event Types:**

| Event | Description | Data Format |
|-------|-------------|-------------|
| `thinking` | Reasoning content | `{text: "..."}` |
| `content` | Response content | `{text: "..."}` |
| `tool_call` | Tool invocation | `{tool: "...", purpose: "..."}` |
| `tool_result` | Tool result | `{tool: "...", data: {...}}` |
| `error` | Error occurred | `{code: "...", message: "..."}` |
| `done` | Stream complete | `{usage: {prompt: N, completion: N}}` |

## AI Agent System

:::info
The AI agent system (codenamed **mihtnelis**) provides intelligent conversational capabilities with tool calling, streaming responses, and multi-provider support. The system supports 50+ tools for file operations, system control, weather queries, web search, and more. For the detailed LLM gateway implementation and tool calling system, see [AI Integration](../tech-stack/backend-tech-stack.md#ai-integration).
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (eIsland Desktop)                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  User Message                                       │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/SSE
┌──────────────────────────▼──────────────────────────────────┐
│  Server (Spring Boot)                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  MihtnelisAgentStreamService                        │    │
│  │  1. Validate request                                │    │
│  │  2. Check balance                                   │    │
│  │  3. Build system prompt                             │    │
│  │  4. Call LLM (LangChain4j or Native HTTP)           │    │
│  │  5. Execute tools if requested                      │    │
│  │  6. Stream response via SSE                         │    │
│  │  7. Deduct balance on completion                    │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  LLM Providers                                              │
│  ┌──────────┐ ┌──────────┐                                  │
│  │ DeepSeek │ │  Custom  │                                  │
│  └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### Gateway Modes

:::tip
The system supports two gateway modes for LLM communication, each optimized for different use cases:
:::

| Mode | Library | Features |
|------|---------|----------|
| **LangChain4j** | langchain4j | OpenAI-compatible, tool calling, streaming |
| **Native HTTP** | HttpClient | Thinking mode, chain-of-thought, custom providers |

**LangChain4j Gateway** provides a high-level abstraction for OpenAI-compatible APIs, with built-in tool calling support and streaming. It's the default mode for most providers.

**Native HTTP Gateway** bypasses LangChain4j for advanced features like thinking mode (chain-of-thought reasoning) and custom provider configurations. It uses Java's HttpClient for direct API calls.

### Billing System

:::warning
AI usage is tracked and billed using Redis for atomic operations and RabbitMQ for async persistence:
:::

```
User Request → Check Balance (Redis) → Call LLM → Calculate Cost → Atomic Deduction (Lua) → Async Persist (RabbitMQ)
```

## Payment System

:::info
The payment system supports multiple payment channels for the Chinese market, with **Alipay** as the primary payment method. The architecture is designed for reliability with idempotent operations, async processing, and comprehensive error handling. All payment notifications are signature-verified to prevent fraud. For the Alipay SDK integration details, see [Payment Processing](../tech-stack/backend-tech-stack.md#payment-processing). For the database schema, see [Payment Domain](mysql-schema.md#payment-domain). For the async notification topology, see [RabbitMQ — Payment Notification](rabbitmq-schema.md#domain-2-payment-notification).
:::

### Payment Flow

```
Client Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Create Order in Database                                │
│     - Generate unique outTradeNo                            │
│     - Set product, amount, expiration                       │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Call Alipay/WeChat API                                  │
│     - Submit order to payment gateway                       │
│     - Receive payment URL                                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. User Completes Payment                                  │
│     - Scan QR code or login                                 │
│     - Payment confirmed                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Async Notification (POST)                               │
│     - Verify signature (RSA2)                               │
│     - Idempotent processing (Redis)                         │
│     - Update order status                                   │
│     - Grant user benefits                                   │
└─────────────────────────────────────────────────────────────┘
```

### Supported Channels

| Channel | SDK | Features |
|---------|-----|----------|
| **Alipay** | alipay-sdk-java | Page payment, mobile payment, QR code |
| **WeChat Pay** | wechatpay-java | JSAPI, H5, native QR code |

## Email System

:::info
The email system uses **Resend** as the primary email delivery service, providing reliable transactional email delivery with high deliverability rates. Emails are sent asynchronously via RabbitMQ to avoid blocking the main request flow.
:::

### Architecture

```
Service Layer → RabbitMQ Queue → Consumer → Resend API → Email Delivery
```

**Key Features:**
- Async delivery via RabbitMQ
- DLQ for failed deliveries
- Rate limiting (3/hour per IP, 30/day per email)
- Verification code hashing with pepper

**Email Types:**
- Registration verification codes
- Login verification codes
- Password reset codes
- Payment receipts
- Account deletion confirmation

**Security Measures:**
- Verification codes are hashed with a pepper before storage in Redis
- Codes expire after 5 minutes
- Maximum 5 verification attempts per code
- Rate limiting prevents abuse

## Deployment

:::info
The application is packaged as a **WAR** file for deployment to external Tomcat containers or embedded Tomcat. This packaging format provides compatibility with traditional Java application servers while maintaining the ability to run standalone during development.
:::

**Build Tools:**
- **Maven**: Dependency management and build automation
- **Maven Wrapper**: Consistent build environment across teams

**Environment Variables:**

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | MySQL connection |
| `DB_USERNAME`, `DB_PASSWORD` | MySQL credentials |
| `JWT_SECRET` | JWT signing key |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection |
| `RABBITMQ_HOST`, `RABBITMQ_PORT` | RabbitMQ connection |
| `ALIPAY_APP_ID`, `ALIPAY_PRIVATE_KEY_PATH` | Alipay credentials |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth credentials |
| `WECHAT_APP_ID`, `WECHAT_APP_SECRET` | WeChat OAuth credentials |
| `GITEE_CLIENT_ID`, `GITEE_CLIENT_SECRET` | Gitee OAuth credentials |
| `KOOK_CLIENT_ID`, `KOOK_CLIENT_SECRET` | KOOK OAuth credentials |
| `RESEND_API_KEY` | Email service key |

**Deployment Architecture:**
- **Database**: MySQL 8.0+ with HikariCP connection pooling
- **Cache**: Redis 7.0+ with dedicated instances per domain
- **Message Queue**: RabbitMQ 3.12+ with DLQ configuration
- **Application Server**: Tomcat 10.1+ or embedded Tomcat
- **Load Balancer**: Nginx or cloud load balancer for horizontal scaling
