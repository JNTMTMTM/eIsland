---
title: Backend Tech Stack
icon: server
---

# Backend Tech Stack

:::info
This document provides an overview of the backend technologies used in the eIsland server application.
:::

## Core Framework

### Java + Spring Boot

The eIsland backend is built with **Java 25** using **Spring Boot 4.0.5** as the application framework. The project follows a modular monolith architecture with clear domain boundaries.

**Key Spring Boot Starters Used:**

- **spring-boot-starter-webmvc**: RESTful API development
- **spring-boot-starter-security**: Authentication and authorization
- **spring-boot-starter-data-redis**: Caching and session management
- **spring-boot-starter-amqp**: Message queue integration
- **spring-boot-starter-validation**: Request validation
- **spring-boot-starter-websocket**: Real-time communication
- **spring-boot-starter-json**: JSON serialization

## Project Structure

The server is organized as a multi-module Maven project:

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

## Database

### MySQL

**MySQL** is used as the primary relational database for persistent data storage. The application connects to MySQL using the official JDBC driver with optimized connection settings. For the complete column-level schema reference, see [MySQL Database Schema](../backend-arch/mysql-schema.md).

#### Database Configuration

```yaml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT}/${DB_NAME}?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

**Key Features:**
- **UTF-8 Encoding**: Full Unicode support for international content
- **Asia/Shanghai Timezone**: Consistent timestamp handling
- **Connection Pooling**: Managed by Spring Boot's HikariCP (default)

#### Database Schema

The database consists of multiple tables organized by domain:

| Domain | Tables | Purpose |
|--------|--------|---------|
| **User** | `user_account`, `user_active_daily` | User profiles, authentication, activity tracking |
| **Mini Game** | `mini_game_score`, `mini_game_score_dlq_log` | Game scores, leaderboards, dead letter queue logs |
| **Payment** | `payment_order`, `payment_transaction`, `payment_notify_log`, `payment_pricing_config`, `payment_dlq_log` | Payment processing, order management |
| **Version** | `app_version` | Application version management |
| **Service Status** | `service_status` | Service health monitoring |
| **Upload** | `object_outbox`, `object_replication_task`, `object_replication_checkpoint`, `object_replication_backfill` | File upload, object replication |
| **Agent** | `agent_usage_stats`, `agent_model_pricing`, `agent_billing_dlq_log` | AI agent usage tracking, billing |
| **Wallpaper** | `wallpaper_market`, `wallpaper_tag` | Wallpaper marketplace |
| **Auth** | `issue_feedback`, `email_dispatch_dlq_log` | Issue feedback, email dispatch |
| **Identity** | `identity_verification` | Identity verification |

### MyBatis ORM

**MyBatis** is used as the Object-Relational Mapping (ORM) framework, providing flexible SQL mapping and database interaction.

#### MyBatis Configuration

```yaml
mybatis:
  mapper-locations: classpath*:mapper/*.xml
  type-aliases-package: com.pyisland.server.user.entity,com.pyisland.server.version.entity,com.pyisland.server.servicestatus.entity,com.pyisland.server.minigame.entity
  configuration:
    map-underscore-to-camel-case: true  # Automatic column-to-property mapping
```

**Key Configuration:**
- **Mapper Locations**: XML mapper files in `classpath*:mapper/*.xml`
- **Type Aliases**: Automatic package scanning for entity classes
- **Underscore to Camel Case**: Automatic conversion (e.g., `user_id` → `userId`)

#### Mapper Interface Pattern

MyBatis uses a **Mapper Interface** pattern for type-safe database access:

```java
@Mapper
public interface UserMapper {
    
    // Query by username
    User selectByUsername(@Param("username") String username);
    
    // Query by email
    User selectByEmail(@Param("email") String email);
    
    // Insert new user
    int insert(User user);
    
    // Update profile
    int updateProfile(@Param("username") String username,
                      @Param("password") String password,
                      @Param("avatar") String avatar);
    
    // Atomic balance deduction
    int deductBalance(@Param("username") String username,
                      @Param("amountFen") BigDecimal amountFen);
}
```

#### XML Mapper Files

SQL statements are defined in XML mapper files for complex queries:

```xml
<mapper namespace="com.pyisland.server.user.mapper.UserMapper">
    
    <!-- Result mapping for User entity -->
    <resultMap id="UserResultMap" type="User">
        <id property="id" column="id"/>
        <result property="username" column="username"/>
        <result property="email" column="email"/>
        <result property="password" column="password"/>
        <result property="role" column="role"/>
        <result property="proExpireAt" column="pro_expire_at"/>
        <result property="avatar" column="avatar"/>
        <result property="balanceFen" column="balance_fen"/>
        <result property="createdAt" column="created_at"/>
    </resultMap>
    
    <!-- Reusable column set -->
    <sql id="baseColumns">
        id, username, email, password, role, pro_expire_at, avatar, 
        gender, gender_custom, birthday, enabled, session_token, 
        totp_secret_ciphertext, totp_secret_updated_at, balance_fen, created_at
    </sql>
    
    <!-- Select query with parameterized WHERE clause -->
    <select id="selectByUsername" resultMap="UserResultMap">
        SELECT <include refid="baseColumns"/>
        FROM user_account
        WHERE username = #{username}
    </select>
    
    <!-- Insert with auto-generated key -->
    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO user_account
            (username, email, password, role, pro_expire_at, avatar, 
             gender, gender_custom, birthday, balance_fen, enabled, 
             session_token, created_at)
        VALUES
            (#{username}, #{email}, #{password}, #{role}, #{proExpireAt}, 
             #{avatar}, #{gender}, #{genderCustom}, #{birthday}, #{balanceFen}, 
             #{enabled}, #{sessionToken}, #{createdAt})
    </insert>
    
    <!-- Conditional UPDATE with atomic operations -->
    <update id="deductBalance">
        UPDATE user_account
        SET balance_fen = GREATEST(balance_fen - #{amountFen}, 0)
        WHERE username = #{username}
          AND balance_fen > 0
    </update>
    
    <!-- Conditional SELECT with dynamic WHERE -->
    <select id="selectByRole" resultMap="UserResultMap">
        SELECT <include refid="baseColumns"/>
        FROM user_account
        <where>
            <if test="role != null">role = #{role}</if>
        </where>
        ORDER BY created_at DESC
    </select>
    
    <!-- INSERT IGNORE for idempotent operations -->
    <insert id="insertDailyActive">
        INSERT IGNORE INTO user_active_daily (username, role, active_date, active_at)
        VALUES (#{username}, #{role}, #{activeDate}, #{activeAt})
    </insert>
    
    <!-- Atomic CAS (Compare-And-Swap) operation -->
    <update id="updateBestIfGreater">
        UPDATE mini_game_score
        SET high_score = #{highScore},
            best_duration_ms = #{bestDurationMs},
            best_moves = #{bestMoves},
            achieved_at = #{achievedAt},
            updated_at = #{updatedAt}
        WHERE user_id = #{userId}
          AND game_id = #{gameId}
          AND high_score &lt; #{highScore}
    </update>
</mapper>
```

#### Advanced MyBatis Features Used

**1. Result Maps**

Complex object mapping with nested properties:

```xml
<resultMap id="MiniGameScoreResultMap" type="com.pyisland.server.minigame.entity.MiniGameScore">
    <id property="id" column="id"/>
    <result property="userId" column="user_id"/>
    <result property="gameId" column="game_id"/>
    <result property="highScore" column="high_score"/>
    <result property="bestDurationMs" column="best_duration_ms"/>
    <result property="bestMoves" column="best_moves"/>
    <result property="playsCount" column="plays_count"/>
    <result property="lastPlayedAt" column="last_played_at"/>
    <result property="achievedAt" column="achieved_at"/>
    <result property="createdAt" column="created_at"/>
    <result property="updatedAt" column="updated_at"/>
</resultMap>
```

**2. Dynamic SQL**

Conditional clauses with `<where>`, `<if>`, and `<choose>`:

```xml
<select id="selectByRole" resultMap="UserResultMap">
    SELECT <include refid="baseColumns"/>
    FROM user_account
    <where>
        <if test="role != null">role = #{role}</if>
    </where>
    ORDER BY created_at DESC
</select>
```

**3. SQL Fragments**

Reusable SQL snippets with `<sql>` and `<include>`:

```xml
<sql id="baseColumns">
    id, username, email, password, role, pro_expire_at, avatar
</sql>

<select id="selectByUsername" resultMap="UserResultMap">
    SELECT <include refid="baseColumns"/>
    FROM user_account
    WHERE username = #{username}
</select>
```

**4. Auto-Generated Keys**

Automatic primary key retrieval after INSERT:

```xml
<insert id="insert" useGeneratedKeys="true" keyProperty="id">
    INSERT INTO user_account (username, email, password)
    VALUES (#{username}, #{email}, #{password})
</insert>
```

**5. Atomic Operations**

Database-level atomic updates for concurrency safety:

```xml
<!-- Atomic balance deduction with floor protection -->
<update id="deductBalance">
    UPDATE user_account
    SET balance_fen = GREATEST(balance_fen - #{amountFen}, 0)
    WHERE username = #{username}
      AND balance_fen > 0
</update>

<!-- CAS (Compare-And-Swap) for high score updates -->
<update id="updateBestIfGreater">
    UPDATE mini_game_score
    SET high_score = #{highScore}
    WHERE user_id = #{userId}
      AND game_id = #{gameId}
      AND high_score &lt; #{highScore}
</update>
```

**6. INSERT IGNORE**

Idempotent insert operations:

```xml
<insert id="insertDailyActive">
    INSERT IGNORE INTO user_active_daily (username, role, active_date, active_at)
    VALUES (#{username}, #{role}, #{activeDate}, #{activeAt})
</insert>

<insert id="insertIfAbsent" useGeneratedKeys="true" keyProperty="id">
    INSERT IGNORE INTO mini_game_score (user_id, game_id, high_score)
    VALUES (#{userId}, #{gameId}, #{highScore})
</insert>
```

#### Mapper Files by Domain

| Domain | Mapper Files | Key Operations |
|--------|--------------|----------------|
| **User** | `UserMapper.xml`, `WallpaperMarketMapper.xml`, `WallpaperTagMapper.xml`, `AnnouncementConfigMapper.xml`, `IdentityVerificationMapper.xml`, `ToolboxSoftwareMapper.xml`, `ToolboxTranslatePricingMapper.xml`, `AgentUsageStatsMapper.xml`, `AgentModelPricingMapper.xml`, `AgentBillingDlqLogMapper.xml` | CRUD, balance operations, daily active tracking |
| **Mini Game** | `MiniGameScoreMapper.xml`, `MiniGameScoreDlqLogMapper.xml` | Score submission, leaderboard queries, atomic updates |
| **Payment** | `PaymentOrderMapper.xml`, `PaymentTransactionMapper.xml`, `PaymentNotifyLogMapper.xml`, `PaymentPricingConfigMapper.xml`, `PaymentDlqLogMapper.xml` | Order management, transaction tracking |
| **Version** | `AppVersionMapper.xml` | Version management |
| **Service Status** | `ServiceStatusMapper.xml` | Health monitoring |
| **Upload** | `ObjectOutboxMapper.xml`, `ObjectReplicationTaskMapper.xml`, `ObjectReplicationCheckpointMapper.xml`, `ObjectReplicationBackfillMapper.xml` | File upload, replication |
| **Auth** | `IssueFeedbackMapper.xml`, `EmailDispatchDlqLogMapper.xml` | Feedback, email dispatch |

#### Entity Classes

MyBatis entity classes are plain Java objects (POJOs) with getters and setters:

```java
public class User {
    private Long id;
    private String username;
    private String email;
    private String password;
    private String role;
    private LocalDateTime proExpireAt;
    private String avatar;
    private String gender;
    private String genderCustom;
    private LocalDate birthday;
    private boolean enabled;
    private String sessionToken;
    private String totpSecretCiphertext;
    private LocalDateTime totpSecretUpdatedAt;
    private BigDecimal balanceFen;
    private LocalDateTime createdAt;
    
    // Getters and setters...
}

public class MiniGameScore {
    private Long id;
    private Long userId;
    private String gameId;
    private long highScore;
    private long bestDurationMs;
    private int bestMoves;
    private int playsCount;
    private LocalDateTime lastPlayedAt;
    private LocalDateTime achievedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Getters and setters...
}
```

#### Database Access Patterns

**1. Repository Pattern**

Each domain has dedicated mapper interfaces:

```java
@Mapper
public interface MiniGameScoreMapper {
    MiniGameScore selectByUserAndGame(@Param("userId") Long userId,
                                      @Param("gameId") String gameId);
    int insertIfAbsent(MiniGameScore score);
    int updateBestIfGreater(@Param("userId") Long userId,
                            @Param("gameId") String gameId,
                            @Param("highScore") long highScore, ...);
    int incrementPlaysCount(@Param("userId") Long userId,
                            @Param("gameId") String gameId, ...);
    List<MiniGameScore> selectTopByGame(@Param("gameId") String gameId,
                                        @Param("limit") int limit);
}
```

**2. Service Layer Integration**

Services use mappers with transaction management:

```java
@Service
public class MiniGameScoreService {
    private final MiniGameScoreMapper scoreMapper;
    
    public String submit(Long userId, String gameId, ScoreSubmitRequest req) {
        // 1. Validate request
        // 2. Check rate limits (Redis)
        // 3. Check idempotency (Redis)
        // 4. Insert if absent (MySQL)
        scoreMapper.insertIfAbsent(score);
        // 5. Update if greater (atomic CAS)
        scoreMapper.updateBestIfGreater(userId, gameId, highScore, ...);
        // 6. Increment plays count
        scoreMapper.incrementPlaysCount(userId, gameId, ...);
        return null;
    }
}
```

**3. Transaction Management**

Spring's `@Transactional` annotation for atomic operations:

```java
@Transactional
public void transferBalance(String fromUser, String toUser, BigDecimal amount) {
    userMapper.deductBalance(fromUser, amount);
    userMapper.addBalance(toUser, amount);
}
```

#### MyBatis Best Practices Implemented

1. **Parameterized Queries**: All queries use `#{param}` syntax to prevent SQL injection
2. **Result Maps**: Explicit column-to-property mapping for complex entities
3. **SQL Fragments**: Reusable column sets with `<sql>` and `<include>`
4. **Dynamic SQL**: Conditional clauses for flexible queries
5. **Atomic Operations**: Database-level CAS for concurrency safety
6. **Idempotent Inserts**: `INSERT IGNORE` for duplicate prevention
7. **Auto-Generated Keys**: Automatic primary key retrieval
8. **Underscore to Camel Case**: Automatic property name conversion

#### Performance Optimizations

1. **Batch Operations**: Bulk inserts for high-throughput scenarios
2. **Indexed Queries**: Proper indexing on frequently queried columns
3. **Connection Pooling**: HikariCP for efficient connection management
4. **Query Caching**: Redis caching layer for frequently accessed data
5. **Lazy Loading**: Optional deferred loading for large objects

### Redis

**Redis** is a critical infrastructure component serving multiple purposes across the application. For the complete key-pattern reference across all 15 databases, see [Redis Architecture](../backend-arch/redis-schema.md).

#### Caching Layer

Redis acts as the primary caching layer to reduce database load and improve response times:

- **Weather Data**: Caches API responses from QWeather with configurable TTL (default 10 minutes for forecasts, 3 minutes for alerts)
- **User Profiles**: Stores frequently accessed user data
- **Service Status**: Caches health check results
- **Version Information**: Caches app version data with bloom filter support

```java
// Example: Weather data caching
String cacheKey = cacheKeyPrefix + ":forecast:" + location;
String cached = qweatherRedisTemplate.opsForValue().get(cacheKey);
if (cached != null) {
    return objectMapper.readValue(cached, MAP_TYPE);
}
// Fetch from API and cache
qweatherRedisTemplate.opsForValue().set(cacheKey, responseJson, 
    Duration.ofSeconds(dailyCacheTtlSeconds));
```

#### Rate Limiting & Security

Redis implements sophisticated rate limiting mechanisms:

- **Authentication Rate Limiting**: Sliding window algorithm for login/register attempts
  - Login: 5 failures per 5-minute window, 10-minute lockout
  - Registration: 5 attempts per hour per IP
- **Upload Rate Limiting**: File upload throttling
- **API Rate Limiting**: General API request throttling

```java
// Example: Sliding window rate limiting
authSecurityRedisTemplate.opsForZSet().add(failuresKey, member, now);
authSecurityRedisTemplate.opsForZSet().removeRangeByScore(failuresKey, 0, now - LOGIN_WINDOW_MS);
Long failureCount = authSecurityRedisTemplate.opsForZSet().zCard(failuresKey);
```

#### Leaderboards & Game State

Redis powers the mini-game leaderboard system:

- **Sorted Sets (ZSET)**: Maintains real-time leaderboards with scores
- **Game Sessions**: Stores game session data for anti-cheat verification
- **User Metadata**: Hash structures for detailed score information

```java
// Example: Leaderboard operations
miniGameRedisTemplate.opsForZSet().add(lbKey, userId, highScore);
Set<ZSetOperations.TypedTuple<String>> topPlayers = 
    miniGameRedisTemplate.opsForZSet().reverseRangeWithScores(lbKey, 0, limit);
```

#### Bloom Filters

:::tip
Redis implements **Bloom Filters** — a space-efficient probabilistic data structure used to test whether an element is a member of a set. This is particularly useful for preventing **cache penetration** (queries for non-existent data that bypass cache and hit the database directly).
:::

##### How Bloom Filters Work in eIsland

The implementation uses a **two-layer verification approach**:

1. **Bloom Filter Layer**: Fast rejection using Redis bitmaps
2. **Exact Set Layer**: Precise verification using Redis Sets

##### Implementation Details

**Hash Functions**: Uses double hashing with CRC32 and Java's hashCode for uniform distribution:

```java
private long[] bloomOffsets(String normalized) {
    long hash1 = hashCrc32(normalized);  // CRC32 hash
    long hash2 = hashJava(normalized);   // Java hashCode
    long[] offsets = new long[hashCount];
    for (int i = 0; i < hashCount; i++) {
        long combined = hash1 + i * hash2 + (long) i * i;
        long positive = combined & Long.MAX_VALUE;
        offsets[i] = positive % bitSize;
    }
    return offsets;
}
```

**Configuration Parameters**:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `bit-size` | 1,000,003 - 2,000,003 | Size of the bitmap (prime numbers for better distribution) |
| `hash-count` | 6 | Number of hash functions (optimal for ~1% false positive rate) |

##### Bloom Filter Instances

**1. User Ban Bloom Filter** (`UserBanBloomService`)

Quickly checks if a username is banned before processing requests:

```java
@Service
public class UserBanBloomService {
    // Configuration
    @Value("${user.ban.bloom.key:user:ban:bloom}") String bloomKey;
    @Value("${user.ban.set.key:user:ban:set}") String exactSetKey;
    @Value("${user.ban.bloom.bit-size:1000003}") long bitSize;
    @Value("${user.ban.bloom.hash-count:6}") int hashCount;
    
    public boolean isBanned(String username) {
        String normalized = normalizeUsername(username);
        // Step 1: Bloom filter check (fast rejection)
        if (!mightContain(normalized)) {
            return false;  // Definitely not banned
        }
        // Step 2: Exact set verification
        Boolean exact = userBanRedisTemplate.opsForSet().isMember(exactSetKey, normalized);
        return Boolean.TRUE.equals(exact);
    }
}
```

**Use Case**: Every authentication request checks if the user is banned. Without Bloom Filter, this would require a database query for every request.

**2. Wallpaper Detail Bloom Filter** (`WallpaperDetailBloomService`)

Prevents cache penetration for wallpaper detail queries:

```java
@Service
public class WallpaperDetailBloomService {
    // Larger bitmap for wallpaper IDs
    @Value("${wallpaper.detail.bloom.bit-size:2000003}") long bitSize;
    
    public boolean mightContain(Long id) {
        String normalized = normalizeId(id);
        // Fast rejection with Bloom Filter
        if (!mightContainBloom(normalized)) {
            return false;  // ID definitely doesn't exist
        }
        // Verify with exact set
        Boolean exact = wallpaperDetailBloomRedisTemplate.opsForSet().isMember(exactSetKey, normalized);
        return Boolean.TRUE.equals(exact);
    }
}
```

**Use Case**: When users request wallpaper details with random IDs, the Bloom Filter quickly rejects non-existent IDs without hitting the database.

**3. Version App Bloom Filter** (`VersionAppBloomService`)

Validates app version existence:

```java
@Service
public class VersionAppBloomService {
    public boolean mightContain(String appName) {
        String normalized = normalizeAppName(appName);
        // Bloom filter + exact set verification
        if (!mightContainBloom(normalized)) {
            return false;
        }
        Boolean exact = versionBloomRedisTemplate.opsForSet().isMember(exactSetKey, normalized);
        return Boolean.TRUE.equals(exact);
    }
}
```

**Use Case**: Validates if an app version exists before processing update requests.

##### Key Features

**1. Fail-Open Design**

When Redis is unavailable, the system fails open (allows requests through) rather than failing closed:

```java
public boolean mightContain(String appName) {
    try {
        // ... bloom filter logic
    } catch (Exception ignored) {
        return true;  // Fail-open: assume exists if Redis is down
    }
}
```

**2. Cold Start Support**

Supports rebuilding from database snapshots:

```java
public void rebuildFromIds(Collection<Long> ids) {
    // Clear existing data
    wallpaperDetailBloomRedisTemplate.delete(exactSetKey);
    wallpaperDetailBloomRedisTemplate.delete(bloomKey);
    // Rebuild from database
    for (Long id : ids) {
        add(id);
    }
}
```

**3. Add-Only Bloom Filter**

The bitmap is add-only (no deletion) to maintain probabilistic guarantees:

```java
public void remove(Long id) {
    // Only remove from exact set, NOT from bloom filter
    // This allows the bloom filter to have false positives
    // but never false negatives
    wallpaperDetailBloomRedisTemplate.opsForSet().remove(exactSetKey, normalized);
}
```

##### Performance Benefits

| Operation | Without Bloom Filter | With Bloom Filter |
|-----------|---------------------|-------------------|
| Query non-existent ID | 1 DB query | 0 DB queries (fast rejection) |
| Query existing ID | 1 DB query | 1 Redis check + 1 DB query |
| Memory usage | N/A | ~1.2MB per 1M items (with 1% FP rate) |

##### Mathematical Properties

- **False Positive Rate**: ~1% with 6 hash functions and optimal bit size
- **False Negative Rate**: 0% (never misses existing items)
- **Space Efficiency**: ~10 bits per item for 1% FP rate
- **Time Complexity**: O(k) where k = number of hash functions

##### Best Practices Implemented

1. **Prime Number Bit Sizes**: Uses prime numbers (1,000,003 and 2,000,003) for better hash distribution
2. **Double Hashing**: Combines CRC32 and Java hashCode for independence
3. **Normalized Keys**: Case-insensitive, trimmed keys for consistency
4. **Atomic Operations**: Uses Redis bit operations for thread safety
5. **Graceful Degradation**: Falls back to database if Redis fails

#### Session & Token Management

- **JWT Token Storage**: Active token tracking
- **Email Verification Codes**: Temporary verification code storage
- **Slider CAPTCHA**: Challenge-response state management
- **TOTP Security**: Time-based one-time password state

#### AI Agent Features

Redis supports AI agent functionality:

- **Agent Balance**: Tracks user AI usage credits
- **Usage Statistics**: Monitors API consumption
- **Pricing Cache**: Caches model pricing information

#### Payment Processing

- **Order State**: Tracks payment order lifecycle
- **Idempotency Keys**: Prevents duplicate payment processing

#### Redis Data Structures Used

| Structure | Use Case |
|-----------|----------|
| **String** | Simple key-value caching, counters |
| **Hash** | User metadata, configuration objects |
| **Sorted Set** | Leaderboards, rate limiting windows |
| **Set** | Unique item tracking |
| **Bitmap** | Feature flags, user status |
| **HyperLogLog** | Approximate counting |

#### Redis Configuration

The application uses multiple Redis instances with dedicated configurations:

```java
// Example: Dedicated Redis configurations per domain
@Configuration
public class MiniGameRedisConfig {
    @Bean("miniGameRedisTemplate")
    public StringRedisTemplate miniGameRedisTemplate(
            @Value("${mini-game.redis.host}") String host,
            @Value("${mini-game.redis.port}") int port) {
        // Configure dedicated Redis connection
    }
}
```

#### Caching Strategy

Multi-level caching with Redis:

1. **Cache-Aside**: Check Redis first, fallback to database
2. **Write-Through**: Update cache on database writes
3. **Cache Warming**: Pre-populate cache on cold starts
4. **TTL Management**: Configurable expiration per data type

#### Performance Optimization

Redis optimizations include:

- **Connection Pooling**: Efficient connection reuse
- **Pipeline Operations**: Batch command execution
- **Lua Scripts**: Atomic operations for rate limiting
- **Lazy Expiration**: Background key cleanup

## Authentication & Security

### JWT (JSON Web Tokens)

:::danger
The application uses **JJWT** (Java JWT) for stateless token-based authentication. JWT tokens are the primary authentication mechanism, eliminating the need for server-side session storage. JWT Secret must be configured via environment variables — never hardcode in source code.
:::

#### JWT Configuration

```yaml
jwt:
  secret: ${JWT_SECRET}  # HMAC-SHA256 key (minimum 256 bits)
  expiration: ${JWT_EXPIRATION}  # Token validity in milliseconds (default: 7 days)
```

#### JWT Utility Class

The `JwtUtil` class handles token generation, validation, and parsing:

```java
@Component
public class JwtUtil {
    private final SecretKey key;
    private final long expiration;
    
    public JwtUtil(@Value("${jwt.secret}") String secret,
                   @Value("${jwt.expiration}") long expiration) {
        // Generate HMAC-SHA256 key from secret string
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }
    
    // Generate token with username and role
    public String generateToken(String username, String role) {
        return Jwts.builder()
                .subject(username)                    // Subject: username
                .claim("role", role)                  // Custom claim: user role
                .issuedAt(new Date())                 // Issued at timestamp
                .expiration(new Date(System.currentTimeMillis() + expiration))  // Expiration
                .signWith(key)                        // HMAC-SHA256 signature
                .compact();
    }
    
    // Validate token signature and expiration
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;  // Invalid signature, expired, or malformed
        }
    }
    
    // Extract username from token
    public String getUsernameFromToken(String token) {
        return parseClaims(token).getSubject();
    }
    
    // Extract role from token (defaults to "user")
    public String getRoleFromToken(String token) {
        Claims claims = parseClaims(token);
        Object role = claims.get("role");
        if (role instanceof String roleStr && !roleStr.isBlank()) {
            return roleStr;
        }
        return "user";
    }
    
    // Parse and verify token claims
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

**Key Features:**
- **HMAC-SHA256 Signing**: Cryptographic signature verification
- **Automatic Expiration**: Tokens expire after configurable period
- **Role-Based Claims**: User role embedded in token
- **Stateless Validation**: No database lookup required for basic validation

#### JWT Authentication Filter

The `JwtAuthenticationFilter` intercepts every request to validate JWT tokens:

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    // Business error codes for specific scenarios
    public static final int CODE_SESSION_KICKED = 4011;  // Session invalidated
    public static final int CODE_USER_BANNED = 4031;     // User banned
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 1. Extract token from Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = authHeader.substring(7).trim();
        
        // 2. Validate token signature and expiration
        if (token.isEmpty() || !jwtUtil.validateToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // 3. Extract user information from token
        String username = jwtUtil.getUsernameFromToken(token);
        String role = jwtUtil.getRoleFromToken(token);
        
        // 4. Verify user exists and is active
        User user = userService.getByUsername(username);
        if (user == null) {
            writeError(response, SC_UNAUTHORIZED, 401, "Account deleted");
            return;
        }
        
        // 5. Check if user is banned (using Bloom Filter for fast lookup)
        if (userBanBloomService.isBanned(user.getUsername())) {
            writeError(response, SC_FORBIDDEN, CODE_USER_BANNED, "Account banned");
            return;
        }
        
        // 6. Check if account is enabled
        if (Boolean.FALSE.equals(user.getEnabled())) {
            writeError(response, SC_UNAUTHORIZED, 401, "Account disabled");
            return;
        }
        
        // 7. Verify session token (single device login enforcement)
        if (user.getSessionToken() != null && !token.equals(user.getSessionToken())) {
            writeError(response, SC_UNAUTHORIZED, CODE_SESSION_KICKED, "Logged in elsewhere");
            return;
        }
        
        // 8. Set security context for downstream controllers
        String effectiveRole = user.getRole() != null ? user.getRole() : role;
        SimpleGrantedAuthority authority = new SimpleGrantedAuthority(
                "ROLE_" + effectiveRole.toUpperCase(Locale.ROOT));
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getUsername(), null, List.of(authority));
        SecurityContextHolder.getContext().setAuthentication(auth);
        
        // 9. Expose user info via request attributes
        request.setAttribute("username", user.getUsername());
        request.setAttribute("role", effectiveRole);
        request.setAttribute("userId", user.getId());
        
        filterChain.doFilter(request, response);
    }
}
```

**Authentication Flow:**

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
│  2. Validate JWT Signature & Expiration                     │
│     - HMAC-SHA256 verification                              │
│     - Check expiration timestamp                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Extract Username & Role from Claims                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Database Verification                                   │
│     - User exists?                                          │
│     - Account enabled?                                      │
│     - Not banned? (Bloom Filter → Exact Set)                │
│     - Session token matches? (Single device enforcement)    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Set Security Context                                    │
│     - Username                                              │
│     - Role (ROLE_USER, ROLE_PRO, ROLE_ADMIN)                │
│     - Request attributes                                    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
  Continue to Controller
```

### Spring Security Configuration

Comprehensive security configuration with stateless JWT authentication:

```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // BCrypt with strength 12
    }
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF (stateless JWT doesn't need it)
            .csrf(AbstractHttpConfigurer::disable)
            
            // Enable CORS with configurable origins
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // Stateless session management (no HTTP Session)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // URL-based authorization rules
            .authorizeHttpRequests(reg -> reg
                // Public endpoints
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/v1/version/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/v1/service-status/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/v1/announcement/current").permitAll()
                .requestMatchers(HttpMethod.POST, "/v1/payment/wechat/notify").permitAll()
                .requestMatchers(HttpMethod.POST, "/v1/payment/alipay/notify").permitAll()
                
                // Authenticated user endpoints
                .requestMatchers("/v1/user/**").hasAnyRole("USER", "PRO", "ADMIN")
                .requestMatchers("/v1/mini-game/**").hasAnyRole("USER", "PRO", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/v1/upload/**").hasAnyRole("USER", "PRO", "ADMIN")
                
                // Admin-only endpoints
                .anyRequest().hasRole("ADMIN")
            )
            
            // Custom error handlers
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new JsonAuthenticationEntryPoint())
                .accessDeniedHandler(new JsonAccessDeniedHandler())
            )
            
            // Security filter chain
            .addFilterBefore(clientVersionGateFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(replayProtectionFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

**Security Features:**

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **CSRF Protection** | Disabled | Stateless JWT doesn't require CSRF tokens |
| **Session Management** | STATELESS | No HTTP Session stored on server |
| **CORS** | Configurable origins | Cross-origin request control |
| **Password Hashing** | BCrypt (strength 12) | Secure password storage |
| **Role-Based Access** | ROLE_USER, ROLE_PRO, ROLE_ADMIN | Endpoint authorization |

### Password Security

#### BCrypt Password Hashing

All passwords are hashed using **BCrypt** with configurable strength:

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);  // Strength 12 = 2^12 iterations
}
```

**BCrypt Properties:**
- **Salt**: Automatically generated per password
- **Iterations**: 2^12 = 4096 rounds (configurable)
- **Output**: 60-character hash string
- **One-Way**: Cannot be reversed to plaintext

### Replay Protection

The `ReplayProtectionFilter` prevents replay attacks on sensitive endpoints:

```java
@Component
public class ReplayProtectionFilter extends OncePerRequestFilter {
    
    private static final long ALLOWED_SKEW_MILLIS = 5 * 60 * 1000L;  // 5-minute window
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // Only protect write operations (POST, PUT, DELETE)
        if (!isProtectedRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Extract timestamp and nonce from headers
        String timestampHeader = request.getHeader("X-Timestamp");
        String nonce = request.getHeader("X-Nonce");
        
        // Validate timestamp is within allowed window
        long timestamp = Long.parseLong(timestampHeader.trim());
        long now = Instant.now().toEpochMilli();
        if (Math.abs(now - timestamp) > ALLOWED_SKEW_MILLIS) {
            writeError(response, 4002, "Request timestamp expired");
            return;
        }
        
        // Check nonce uniqueness in Redis (prevents replay)
        String key = "auth:replay:" + principal + ":" + method + ":" + uri + ":" + nonce;
        Boolean accepted = authSecurityRedisTemplate.opsForValue().setIfAbsent(
                key, String.valueOf(now), Duration.ofMillis(ALLOWED_SKEW_MILLIS));
        
        if (!Boolean.TRUE.equals(accepted)) {
            writeError(response, 4003, "Replay attack detected");
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}
```

**Replay Protection Flow:**

```
Client Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Include Headers:                                           │
│    - X-Timestamp: 1719000000000 (Unix milliseconds)        │
│    - X-Nonce: random-unique-string-128-chars                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Server Validation:                                         │
│    1. Check timestamp within 5-minute window                │
│    2. Check nonce not used before (Redis SETNX)             │
│    3. Store nonce with TTL                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
  Request Accepted or Rejected (4003 Replay Detected)
```

### Rate Limiting

:::warning
Multiple rate limiting mechanisms protect against abuse. All authentication-related endpoints are protected by strict rate limiting.
:::

#### Authentication Rate Limiting

```java
@Component
public class AuthRateLimiter {
    // Login: 5 failures per 5-minute window, 10-minute lockout
    public static final int LOGIN_MAX_FAILURES = 5;
    public static final long LOGIN_WINDOW_MS = 5 * 60 * 1000L;
    public static final long LOGIN_LOCK_MS = 10 * 60 * 1000L;
    
    // Registration: 5 attempts per hour per IP
    public static final int REGISTER_MAX_ATTEMPTS = 5;
    public static final long REGISTER_WINDOW_MS = 60 * 60 * 1000L;
    
    public void recordLoginFailure(String key) {
        // Sliding window using Redis Sorted Set
        authSecurityRedisTemplate.opsForZSet().add(failuresKey, member, now);
        authSecurityRedisTemplate.opsForZSet().removeRangeByScore(failuresKey, 0, now - LOGIN_WINDOW_MS);
        
        Long failureCount = authSecurityRedisTemplate.opsForZSet().zCard(failuresKey);
        if (failureCount >= LOGIN_MAX_FAILURES) {
            // Lock account for 10 minutes
            authSecurityRedisTemplate.opsForValue().set(loginLockKey, 
                String.valueOf(now + LOGIN_LOCK_MS), Duration.ofMillis(LOGIN_LOCK_MS));
        }
    }
}
```

#### Slider CAPTCHA Rate Limiting

```java
@Service
public class SliderCaptchaService {
    // Token bucket algorithm using Lua script
    private static final RedisScript<List<Long>> TOKEN_BUCKET_SCRIPT = buildTokenBucketScript();
    
    // Rate limits per operation
    private final int createRateLimitAccount;  // 12 per minute per account
    private final int createRateLimitIp;       // 24 per minute per IP
    private final int verifyRateLimitIp;       // 60 per minute per IP
    private final int verifyFailLimitAccount;  // 3 failures per 10 minutes
    private final int verifyFailLimitIp;       // 3 failures per 10 minutes
    
    public CaptchaChallenge createChallenge(String account, String userIp) {
        // Check rate limits before creating challenge
        assertRateLimit(keyCreateRateAccount(normalizedAccount), createRateLimitAccount, ...);
        assertRateLimit(keyCreateRateIp(normalizedIp), createRateLimitIp, ...);
        
        // Limit pending challenges
        Long pendingCount = sliderCaptchaRedisTemplate.opsForSet().size(keyAccountChallenges(normalizedAccount));
        if (pendingCount >= MAX_PENDING_CHALLENGES_PER_ACCOUNT) {
            throw new TooManyPendingChallengesException("Too many pending challenges");
        }
        
        // Create challenge with random target value
        int target = ThreadLocalRandom.current().nextInt(minValue, maxValue + 1);
        String challengeId = UUID.randomUUID().toString();
        
        // Store challenge in Redis with TTL
        sliderCaptchaRedisTemplate.opsForValue().set(
                keyChallenge(challengeId), String.valueOf(target), ttl);
        
        return new CaptchaChallenge(challengeId, minValue, maxValue, target, tolerance, captchaSign);
    }
}
```

**Token Bucket Algorithm (Lua Script):**

```lua
-- Atomic token bucket implementation in Redis
local key = KEYS[1]
local now_ms = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill_per_ms = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

-- Load current state
local state = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(state[1]) or capacity
local ts = tonumber(state[2]) or now_ms

-- Calculate token refill
local elapsed = now_ms - ts
tokens = math.min(capacity, tokens + elapsed * refill_per_ms)

-- Check if request can be fulfilled
local allowed = 0
local retry_after_ms = 0
if tokens >= requested then
    tokens = tokens - requested
    allowed = 1
else
    local deficit = requested - tokens
    retry_after_ms = math.ceil(deficit / refill_per_ms)
end

-- Update state
redis.call('HSET', key, 'tokens', tokens, 'ts', now_ms)
redis.call('EXPIRE', key, ttl_seconds)

return { allowed, math.floor(tokens), retry_after_ms }
```

### TOTP (Time-Based One-Time Password)

Two-Factor Authentication (2FA) using TOTP:

```java
@Service
public class TotpSecurityService {
    public static final int TOTP_DIGITS = 6;
    public static final long TOTP_PERIOD_SECONDS = 30L;
    
    // Security features
    private final int failMaxAttempts;           // 5 attempts before lockout
    private final long failWindowSeconds;        // 10-minute window
    private final int userRateMax;               // 30 per minute per user
    private final int ipRateMax;                 // 60 per minute per IP
    private final long replayProtectSeconds;     // 120-second replay protection
    
    public String verifyTotpOrMessage(String username, String clientIp, String code) {
        // 1. Rate limiting check
        // 2. Decrypt stored TOTP secret (AES-256-GCM)
        // 3. Generate TOTP codes for current and adjacent windows
        // 4. Verify code matches
        // 5. Check replay protection (code not used recently)
        // 6. Record success or failure
        return null;  // null = success
    }
}
```

**TOTP Security Features:**

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **Encryption** | AES-256-GCM | Secure secret storage |
| **Rate Limiting** | Per-user and per-IP | Prevent brute force |
| **Replay Protection** | Redis-based code tracking | Prevent code reuse |
| **Failure Tracking** | Sliding window counter | Account lockout |
| **Time Window** | ±30 seconds | Clock drift tolerance |

### User Ban System

Multi-layer ban checking with Bloom Filter optimization:

```java
@Service
public class UserBanBloomService {
    // Two-layer verification: Bloom Filter → Exact Set
    public boolean isBanned(String username) {
        String normalized = normalizeUsername(username);
        
        // Layer 1: Bloom Filter (fast rejection)
        if (!mightContain(normalized)) {
            return false;  // Definitely not banned
        }
        
        // Layer 2: Exact Set verification
        Boolean exact = userBanRedisTemplate.opsForSet().isMember(exactSetKey, normalized);
        return Boolean.TRUE.equals(exact);
    }
}
```

**Ban Check Flow:**

```
Authentication Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Bloom Filter Check (O(k) time, k=6 hash functions)     │
│     - If "not contained" → User definitely not banned       │
│     - If "might contain" → Proceed to exact check           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Redis Set Check (O(1) time)                             │
│     - Exact membership verification                         │
│     - No false positives                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Decision                                                │
│     - Not banned → Continue authentication                  │
│     - Banned → Return 403 with CODE_USER_BANNED (4031)      │
└─────────────────────────────────────────────────────────────┘
```

### Security Headers & CORS

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    
    // Configurable allowed origins
    config.setAllowedOriginPatterns(List.of("*"));
    
    // Allowed HTTP methods
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    
    // Allowed headers
    config.setAllowedHeaders(List.of("*"));
    
    // Allow credentials (cookies, authorization headers)
    config.setAllowCredentials(true);
    
    // Cache preflight response for 1 hour
    config.setMaxAge(3600L);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

### Error Handling

Standardized JSON error responses:

```java
// Authentication entry point (401 Unauthorized)
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", 401);
        body.put("message", "Authentication required");
        
        objectMapper.writeValue(response.getWriter(), body);
    }
}

// Access denied handler (403 Forbidden)
public class JsonAccessDeniedHandler implements AccessDeniedHandler {
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", 403);
        body.put("message", "Access denied");
        
        objectMapper.writeValue(response.getWriter(), body);
    }
}
```

### Security Best Practices Summary

| Category | Implementation | Details |
|----------|----------------|---------|
| **Authentication** | JWT (HMAC-SHA256) | Stateless, 7-day expiration |
| **Password Storage** | BCrypt (strength 12) | Salted, 4096 iterations |
| **Session Management** | Single device enforcement | Session token in DB |
| **Rate Limiting** | Redis sliding window | Per-user and per-IP limits |
| **Replay Protection** | Timestamp + Nonce | 5-minute window, Redis SETNX |
| **Brute Force Protection** | Account lockout | 5 failures → 10-minute lock |
| **CAPTCHA** | Slider verification | Token bucket rate limiting |
| **2FA** | TOTP (AES-256-GCM) | 6-digit codes, 30-second window |
| **User Ban** | Bloom Filter + Exact Set | Fast rejection, no false negatives |
| **CORS** | Configurable origins | Credential support |
| **CSRF** | Disabled | Not needed for stateless JWT |
| **Input Validation** | Bean Validation | @Valid, @NotNull, @Size |
| **SQL Injection** | MyBatis parameterized queries | #{param} syntax |
| **XSS Protection** | Output encoding | Jackson JSON serialization |

## Message Queue

### RabbitMQ

**RabbitMQ** is used for asynchronous processing and event-driven architecture. For the complete queue topology, message definitions, and retry patterns, see [RabbitMQ Architecture](../backend-arch/rabbitmq-schema.md).

- **Email Notifications**: Asynchronous email delivery
- **Payment Processing**: Order status updates
- **Data Sync**: Background data synchronization
- **Retry Mechanisms**: Failed operation retry with dead letter queues

## Cloud Storage

### Multi-Cloud Support

The application supports multiple cloud storage providers:

| Provider | SDK | Use Case |
|----------|-----|----------|
| **Aliyun OSS** | aliyun-sdk-oss | Avatars, wallpapers, feedback assets |
| **Tencent COS** | cos_api | Backup storage |
| **Cloudflare R2** | AWS S3 SDK | Primary file storage |

```xml
<!-- Cloud Storage Dependencies -->
<dependency>
    <groupId>com.aliyun.oss</groupId>
    <artifactId>aliyun-sdk-oss</artifactId>
</dependency>
<dependency>
    <groupId>com.qcloud</groupId>
    <artifactId>cos_api</artifactId>
</dependency>
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
</dependency>
```

## AI Integration

### Overview

:::tip
The eIsland AI agent system (codenamed **mihtnelis**) provides intelligent conversational capabilities with tool calling, streaming responses, and multi-provider support. The architecture is designed for extensibility, allowing seamless integration of new LLM providers.
:::

### LLM Gateway Architecture

The system supports two gateway modes for LLM communication:

#### 1. LangChain4j Gateway

**LangChain4j** is a Java framework for building LLM-powered applications. It provides:

- **OpenAI-Compatible API**: Works with any OpenAI-compatible endpoint
- **Tool Calling**: Native function calling support
- **Streaming**: Real-time response streaming via SSE
- **Service Builder**: Declarative AI service creation

```java
@Service
@ConditionalOnProperty(prefix = "mihtnelis.agent.llm", name = "gateway", havingValue = "langchain4j")
public class LangChain4jChatGatewayService implements AgentChatGatewayService {
    
    // Build OpenAI-compatible client
    private OpenAiChatModel buildModelClient(String provider, ChatRequestOptions requestOptions) {
        MihtnelisAgentProperties.Provider cfg = resolveProvider(provider);
        
        return OpenAiChatModel.builder()
                .baseUrl(cfg.getBaseUrl())           // API endpoint
                .apiKey(cfg.getApiKey())             // Authentication
                .modelName(cfg.getModel())           // Model identifier
                .temperature(0.2)                     // Low temperature for consistency
                .build();
    }
    
    // Standard chat without tools
    public String chat(String provider, String systemPrompt, String userPrompt, 
                       ChatRequestOptions requestOptions) {
        OpenAiChatModel modelClient = buildModelClient(provider, requestOptions);
        String prompt = "System:\n" + systemPrompt + "\n\nUser:\n" + userPrompt;
        return modelClient.generate(prompt);
    }
    
    // Chat with native tool calling
    public String chatWithNativeTools(String provider, String systemPrompt, String userPrompt,
                                      AgentToolExecutionService toolExecutionService, ...) {
        OpenAiChatModel modelClient = buildModelClient(provider, requestOptions);
        
        // Create AI service with tool bridge
        NativeToolAssistant assistant = AiServices.builder(NativeToolAssistant.class)
                .chatLanguageModel(modelClient)
                .tools(new NativeToolBridge(toolExecutionService, proUser, context))
                .build();
        
        return assistant.chat(systemPrompt, userPrompt);
    }
}
```

#### 2. Native HTTP Gateway

For advanced features like **thinking mode** (chain-of-thought), the system bypasses LangChain4j and uses direct HTTP calls:

```java
// Direct HTTP call to LLM API
private String chatWithThinkingHttp(String provider, String systemPrompt, String userPrompt,
                                    ChatRequestOptions requestOptions, ChatStreamListener streamListener) {
    // Build request payload
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("model", model);
    payload.put("messages", new Object[]{
            Map.of("role", "system", "content", systemPrompt),
            Map.of("role", "user", "content", userPrompt)
    });
    payload.put("temperature", 0.2);
    payload.put("stream", useStream);
    
    // Enable thinking mode for supported providers
    if (requestOptions.thinkingEnabled() && !isCustomProvider) {
        payload.put("thinking", Map.of("type", "enabled"));
        payload.put("reasoning_effort", effort);  // low/medium/high
    }
    
    // Send HTTP request
    HttpRequest request = HttpRequest.newBuilder(URI.create(url))
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();
    
    if (useStream) {
        return chatWithThinkingStream(request, streamListener, usageAccumulator);
    }
    return chatWithThinkingBlocking(request, usageAccumulator);
}
```

**Thinking Mode Features:**
- **Reasoning Content**: Captures chain-of-thought reasoning
- **Reasoning Effort**: Configurable depth (low/medium/high)
- **Streaming**: Real-time reasoning and content streaming
- **Tag Parsing**: Extracts `<think>` tags from responses

### AI Provider Configuration

The system supports multiple LLM providers with independent configuration:

```yaml
mihtnelis:
  agent:
    default-provider: deepseek  # Default provider
    allowed-providers: deepseek  # Allowed providers
    max-input-chars: 8000  # Maximum input length
    llm:
      gateway: langchain4j  # Gateway mode (langchain4j or spring-ai)
      deepseek:
        enabled: true
        base-url: https://api.deepseek.com
        api-key: ${DEEPSEEK_API_KEY}
        model: deepseek-chat
        thinking: false  # Enable thinking mode
        reasoning-effort: medium  # low/medium/high
```

**Provider Properties:**

| Property | Description | Default |
|----------|-------------|---------|
| `enabled` | Whether provider is active | false |
| `base-url` | API endpoint URL | - |
| `api-key` | Authentication key | - |
| `model` | Model identifier | - |
| `thinking` | Enable chain-of-thought | false |
| `reasoning-effort` | Thinking depth | medium |

### Provider Routing

The `AiProviderRouterService` handles provider selection:

```java
@Service
public class AiProviderRouterService {
    
    public String resolveProvider(String requestedProvider) {
        List<String> allowed = properties.getAllowedProviders();
        String normalizedDefault = properties.getDefaultProvider();
        
        // If no provider requested, use default
        if (requestedProvider.isBlank()) {
            return normalizedDefault;
        }
        
        // Allow "custom" for user-provided API keys
        if ("custom".equals(requestedProvider)) {
            return requestedProvider;
        }
        
        // Check if requested provider is in allowed list
        for (String item : allowed) {
            if (item.equalsIgnoreCase(requestedProvider)) {
                return requestedProvider;
            }
        }
        
        return normalizedDefault;
    }
}
```

### Tool Calling System

The AI agent has access to **50+ tools** organized by category:

#### File Operations

| Tool | Description | Risk Level |
|------|-------------|------------|
| `file.list` | List directory contents | Low |
| `file.read` | Read text file | Low |
| `file.write` | Write text file | High |
| `file.delete` | Delete file/directory | High |
| `file.rename` | Rename/move file | Medium |
| `file.copy` | Copy file/directory | Medium |
| `file.mkdir` | Create directory | Low |
| `file.search` | Search files by name | Low |
| `file.grep` | Search file contents | Low |
| `file.tree` | Directory tree structure | Low |
| `file.stat` | File metadata | Low |
| `file.exists` | Check path existence | Low |
| `file.read.lines` | Read file lines | Low |
| `file.append` | Append to file | Medium |
| `file.replace` | Find and replace | Medium |
| `file.compress` | Create zip archive | Medium |
| `file.extract` | Extract zip archive | Medium |
| `file.hash` | Calculate file hash | Low |
| `file.trash` | Move to recycle bin | Medium |

#### System Operations

| Tool | Description | Risk Level |
|------|-------------|------------|
| `sys.info` | System information | Low |
| `sys.env` | Environment variables | Low |
| `sys.open` | Open system component | Medium |
| `sys.installed-apps` | List installed programs | Low |
| `sys.launch` | Launch application | Medium |

#### Command Execution

| Tool | Description | Risk Level |
|------|-------------|------------|
| `cmd.exec` | Execute CMD command | High |
| `cmd.powershell` | Execute PowerShell command | High |

#### Window Management

| Tool | Description | Risk Level |
|------|-------------|------------|
| `win.list` | List visible windows | Low |
| `win.minimize` | Minimize window | Medium |
| `win.maximize` | Maximize window | Medium |
| `win.restore` | Restore window | Medium |
| `win.close` | Close/terminate process | High |
| `win.screenshot` | Take screenshot | Low |

#### Network Operations

| Tool | Description | Risk Level |
|------|-------------|------------|
| `net.ping` | Ping test | Low |
| `net.dns` | DNS lookup | Low |
| `net.ports` | List listening ports | Low |
| `net.proxy` | Manage proxy settings | Medium |
| `net.hosts` | Manage hosts file | Medium |

#### System Monitoring

| Tool | Description | Risk Level |
|------|-------------|------------|
| `monitor.cpu` | CPU information | Low |
| `monitor.memory` | Memory usage | Low |
| `monitor.disk` | Disk space | Low |
| `monitor.gpu` | GPU information | Low |

#### Hardware Control

| Tool | Description | Risk Level |
|------|-------------|------------|
| `volume.get` | Get system volume | Low |
| `volume.set` | Set system volume | Medium |
| `brightness.get` | Get screen brightness | Low |
| `brightness.set` | Set screen brightness | Medium |
| `display.list` | List displays | Low |

#### Power Management

| Tool | Description | Risk Level |
|------|-------------|------------|
| `power.sleep` | Sleep computer | High |
| `power.shutdown` | Shutdown computer | High |
| `power.restart` | Restart computer | High |

#### Clipboard & Notifications

| Tool | Description | Risk Level |
|------|-------------|------------|
| `clipboard.read` | Read clipboard | Low |
| `clipboard.write` | Write clipboard | Medium |
| `notification.send` | Send Windows notification | Low |

#### eIsland Settings

| Tool | Description | Risk Level |
|------|-------------|------------|
| `island.settings.list` | List all settings | Low |
| `island.settings.read` | Read setting value | Low |
| `island.settings.write` | Write setting value | Medium |
| `island.theme.get` | Get theme mode | Low |
| `island.theme.set` | Set theme mode | Medium |
| `island.opacity.get` | Get opacity | Low |
| `island.opacity.set` | Set opacity | Medium |
| `island.restart` | Restart application | High |

#### Alarm & Todo Management

| Tool | Description | Risk Level |
|------|-------------|------------|
| `alarm.list` | List alarms | Low |
| `alarm.create` | Create alarm | Low |
| `alarm.delete` | Delete alarm | Medium |
| `alarm.toggle` | Toggle alarm | Low |
| `alarm.update` | Update alarm | Low |
| `todolist.list` | List todos | Low |
| `todolist.create` | Create todo | Low |
| `todolist.delete` | Delete todo | Medium |
| `todolist.toggle` | Toggle todo | Low |
| `todolist.update` | Update todo | Low |

#### Weather & Time

| Tool | Description | Risk Level |
|------|-------------|------------|
| `weather.query` | Query weather | Low |
| `weather.city.lookup` | Lookup city | Low |
| `weather.by_city.query` | Weather by city | Low |
| `weather.quota.status` | API quota status | Low |
| `time.now` | Current time | Low |
| `user.ip.get` | Get public IP | Low |
| `location.by_ip.resolve` | Location from IP | Low |

#### Web Operations

| Tool | Description | Risk Level |
|------|-------------|------------|
| `web.search` | Web search | Low |
| `web.page.read` | Read web page | Medium |

### Tool Execution Architecture

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. LLM Receives Prompt + Tool Definitions                  │
│     - System prompt with tool descriptions                  │
│     - User message                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. LLM Decides to Call Tool                                │
│     - Returns tool name + arguments                         │
│     - May call multiple tools                               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Server Executes Tool                                    │
│     - Validate arguments                                    │
│     - Check permissions (Pro/Admin only tools)              │
│     - Execute on client via relay (local tools)             │
│     - Execute on server (weather, web search)               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Tool Result Returned to LLM                             │
│     - Success: {tool, success: true, data: ...}             │
│     - Error: {tool, success: false, error: ...}             │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. LLM Generates Final Response                            │
│     - Incorporates tool results                             │
│     - Streams to client via SSE                             │
└─────────────────────────────────────────────────────────────┘
```

### Streaming Architecture

The system uses **Server-Sent Events (SSE)** for real-time streaming:

```java
@Service
public class MihtnelisAgentStreamService {
    
    public SseEmitter openStream(String username, String clientIp, String traceId, 
                                 MihtnelisStreamRequest request) {
        SseEmitter emitter = new SseEmitter(0L);  // No timeout
        
        // Start async stream processing
        CompletableFuture.runAsync(() -> emitFlow(emitter, username, clientIp, traceId, request), 
                                   streamExecutor);
        
        return emitter;
    }
    
    private void emitFlow(SseEmitter emitter, ...) {
        // 1. Validate request
        // 2. Check user balance
        // 3. Build system prompt
        // 4. Call LLM with streaming
        // 5. Send chunks via SSE
        // 6. Deduct balance on completion
        
        sendEvent(emitter, "thinking", Map.of("text", reasoningContent));
        sendEvent(emitter, "content", Map.of("text", contentDelta));
        sendEvent(emitter, "tool_call", Map.of("tool", toolName, "purpose", purpose));
        sendEvent(emitter, "tool_result", Map.of("tool", toolName, "data", result));
        sendEvent(emitter, "done", Map.of("usage", tokenUsage));
    }
}
```

**SSE Event Types:**

| Event | Description | Data Format |
|-------|-------------|-------------|
| `thinking` | Reasoning content | `{text: "..."}`
| `content` | Response content | `{text: "..."}`
| `tool_call` | Tool invocation | `{tool: "...", purpose: "..."}`
| `tool_result` | Tool result | `{tool: "...", data: {...}}`
| `error` | Error occurred | `{code: "...", message: "..."}`
| `done` | Stream complete | `{usage: {prompt: N, completion: N}}`

### Token Usage Tracking

The system tracks token usage for billing:

```java
public class TokenUsageAccumulator {
    private int promptTokens = 0;
    private int completionTokens = 0;
    private int reasoningTokens = 0;
    private int cachedTokens = 0;
    
    public void add(int prompt, int completion, int reasoning, int cached) {
        this.promptTokens += prompt;
        this.completionTokens += completion;
        this.reasoningTokens += reasoning;
        this.cachedTokens += cached;
    }
}
```

**Usage Fields:**

| Field | Description |
|-------|-------------|
| `prompt_tokens` | Input tokens consumed |
| `completion_tokens` | Output tokens generated |
| `reasoning_tokens` | Thinking tokens (for thinking mode) |
| `cached_tokens` | Cache hit tokens (cost savings) |

### Billing System

The AI billing system uses Redis for atomic operations and RabbitMQ for async persistence:

```java
@Service
public class AgentBalanceRedisService {
    
    // Lua script for atomic balance deduction
    private static final String DEDUCT_LUA = """
            local bal = redis.call('GET', KEYS[1])
            if bal == false then
                return '-1'  -- Key not exists, need DB init
            end
            local current = tonumber(bal)
            if current <= 0 then
                return '-3'  -- Balance zero, reject
            end
            local amount = tonumber(ARGV[1])
            local deducted = math.min(current, amount)
            local newBal = current - deducted
            local fmtBal = string.format('%.8f', newBal)
            local fmtDed = string.format('%.8f', deducted)
            redis.call('SET', KEYS[1], fmtBal)
            return fmtBal .. '|' .. fmtDed
            """;
    
    public DeductResult deduct(String username, BigDecimal amountFen, 
                               String modelName, int inputTokens, int outputTokens) {
        // 1. Atomic deduction via Redis Lua
        String result = redisTemplate.execute(DEDUCT_SCRIPT, 
                List.of("agent:balance:" + username), 
                String.valueOf(amountFen));
        
        // 2. Parse result
        if ("-1".equals(result)) {
            // Initialize from DB
        } else if ("-3".equals(result)) {
            // Balance zero
        } else {
            // Success: async persist to DB via RabbitMQ
            rabbitTemplate.convertAndSend("agent.billing.deduct", 
                    new AgentBillingDeductMessage(username, amountFen, modelName, ...));
        }
        
        return new DeductResult(newBalance, actualDeducted, balanceZero);
    }
}
```

**Billing Flow:**

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Check Balance (Redis)                                   │
│     - Key: agent:balance:{username}                         │
│     - Value: balance in fen (8 decimal places)              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Process Request                                         │
│     - Call LLM                                              │
│     - Track token usage                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Calculate Cost                                          │
│     - Model pricing (per 1K tokens)                         │
│     - Input tokens × input_rate                             │
│     - Output tokens × output_rate                           │
│     - Reasoning tokens × reasoning_rate                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Atomic Deduction (Redis Lua)                            │
│     - Cap-at-zero semantics                                 │
│     - Returns new balance + actual deducted                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Async Persist (RabbitMQ)                                │
│     - Send deduction message to queue                       │
│     - Consumer updates MySQL database                       │
│     - DLQ for failed messages                               │
└─────────────────────────────────────────────────────────────┘
```

### Model Pricing Configuration

Dynamic pricing stored in database:

```java
@Service
public class AgentModelPricingService {
    
    // Pricing per 1K tokens
    public record ModelPricing(
        String modelName,
        BigDecimal inputRate,      // Cost per 1K input tokens
        BigDecimal outputRate,     // Cost per 1K output tokens
        BigDecimal reasoningRate,  // Cost per 1K reasoning tokens
        boolean enabled
    ) {}
    
    public BigDecimal calculateCost(String modelName, int inputTokens, 
                                    int outputTokens, int reasoningTokens) {
        ModelPricing pricing = getPricing(modelName);
        
        BigDecimal inputCost = pricing.inputRate()
                .multiply(BigDecimal.valueOf(inputTokens))
                .divide(BigDecimal.valueOf(1000), 8, RoundingMode.HALF_UP);
        
        BigDecimal outputCost = pricing.outputRate()
                .multiply(BigDecimal.valueOf(outputTokens))
                .divide(BigDecimal.valueOf(1000), 8, RoundingMode.HALF_UP);
        
        BigDecimal reasoningCost = pricing.reasoningRate()
                .multiply(BigDecimal.valueOf(reasoningTokens))
                .divide(BigDecimal.valueOf(1000), 8, RoundingMode.HALF_UP);
        
        return inputCost.add(outputCost).add(reasoningCost);
    }
}
```

### User Authorization for Custom API Keys

Pro users can provide their own API keys:

```java
// In MihtnelisAgentStreamService
if (customApiKey != null || customEndpoint != null) {
    // Check if user is Pro or Admin
    User user = userService.getByUsername(username);
    if (user != null && (User.ROLE_PRO.equals(user.getRole()) || 
                         User.ROLE_ADMIN.equals(user.getRole()))) {
        allowCustom = true;
    }
    
    if (!allowCustom) {
        sendEvent(emitter, "error", Map.of(
                "code", "CUSTOM_API_FORBIDDEN",
                "message", "Custom API credentials are for Pro users only"
        ));
        return;
    }
}
```

### Speech-to-Text (STT)

Integration with Tencent Cloud Speech SDK:

```java
// Real-time speech recognition
public class AgentRealtimeSttWebSocketHandler extends TextWebSocketHandler {
    
    // WebSocket endpoint for real-time STT
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // 1. Receive audio chunks from client
        // 2. Send to Tencent Cloud STT API
        // 3. Stream transcription results back
    }
}
```

**STT Features:**
- Real-time audio streaming via WebSocket
- Tencent Cloud Speech SDK integration
- Multiple language support
- Low-latency transcription

### Prompt Engineering

The system uses structured prompt builders:

```java
@Component
public class MihtnelisPromptBuilder {
    
    public String buildSystemPrompt(String agentMode, boolean proUser, 
                                     List<String> skills, String location) {
        StringBuilder prompt = new StringBuilder();
        
        // Base personality
        prompt.append("You are mihtnelis, an AI assistant integrated into eIsland.\n\n");
        
        // Capabilities description
        prompt.append("## Capabilities\n");
        prompt.append("- File operations (read, write, search)\n");
        prompt.append("- System control (volume, brightness, power)\n");
        prompt.append("- Weather queries\n");
        prompt.append("- Web search\n");
        prompt.append("- And more...\n\n");
        
        // Tool usage instructions
        prompt.append("## Tool Usage\n");
        prompt.append("When you need to perform actions, use the appropriate tools.\n");
        prompt.append("Always explain what you're doing before calling a tool.\n\n");
        
        // Location context
        if (location != null) {
            prompt.append("## User Location\n");
            prompt.append("The user is located in: ").append(location).append("\n\n");
        }
        
        // Pro user features
        if (proUser) {
            prompt.append("## Pro Features\n");
            prompt.append("- Custom API key support\n");
            prompt.append("- Higher rate limits\n");
            prompt.append("- Priority processing\n\n");
        }
        
        return prompt.toString();
    }
}
```

### Rate Limiting & Protection

AI-specific rate limiting:

```java
// Per-user rate limiting
private final int userRateMax;           // 30 requests per minute
private final int ipRateMax;             // 60 requests per minute
private final long rateWindowSeconds;    // 60-second window

// Balance check before processing
public void checkBalance(String username) {
    BigDecimal balance = balanceRedisService.getBalance(username);
    if (balance.compareTo(BigDecimal.ZERO) <= 0) {
        throw new InsufficientBalanceException("Insufficient AI credits");
    }
}

// Input length validation
if (userPrompt.length() > MAX_TOTAL_MESSAGE_CHARS) {
    sendEvent(emitter, "error", Map.of(
            "code", "INPUT_TOO_LONG",
            "message", "Input exceeds maximum length"
    ));
    return;
}
```

### Error Handling

Comprehensive error handling for AI operations:

```java
public enum AgentErrorCode {
    EMPTY_PROMPT("EMPTY_PROMPT", "Message cannot be empty"),
    INPUT_TOO_LONG("INPUT_TOO_LONG", "Input exceeds maximum length"),
    PROVIDER_DISABLED("PROVIDER_DISABLED", "LLM provider is disabled"),
    CUSTOM_API_FORBIDDEN("CUSTOM_API_FORBIDDEN", "Custom API for Pro users only"),
    INSUFFICIENT_BALANCE("INSUFFICIENT_BALANCE", "Insufficient AI credits"),
    LLM_INVOKE_FAILED("LLM_INVOKE_FAILED", "LLM invocation failed"),
    TOOL_EXECUTION_FAILED("TOOL_EXECUTION_FAILED", "Tool execution failed"),
    TIMEOUT("TIMEOUT", "Request timed out"),
    RATE_LIMITED("RATE_LIMITED", "Too many requests");
}
```

### Performance Optimizations

1. **Connection Pooling**: HTTP client reuse for LLM calls
2. **Streaming**: Real-time response delivery via SSE
3. **Async Processing**: Non-blocking tool execution
4. **Caching**: Redis caching for pricing and configuration
5. **Batch Operations**: Bulk token usage updates

### Security Considerations

:::warning
Security of the AI agent system is critical. Key security measures include:
:::

1. **API Key Protection**: Keys stored in environment variables
2. **Input Sanitization**: Prompt injection prevention
3. **Tool Permission Control**: High-risk tools require Pro/Admin
4. **Rate Limiting**: Per-user and per-IP limits
5. **Balance Enforcement**: Pre-flight balance checks
6. **Audit Logging**: All tool executions logged

## Payment Processing

### Overview

:::info
The payment system supports multiple payment channels for the Chinese market, with **Alipay** as the primary payment method. The architecture is designed for reliability with idempotent operations, async processing, and comprehensive error handling. For the database schema, see [MySQL — Payment Domain](../backend-arch/mysql-schema.md#payment-domain). For the async notification processing, see [RabbitMQ — Payment Notification](../backend-arch/rabbitmq-schema.md#domain-2-payment-notification).
:::

### Alipay SDK Integration

The application uses the **Alipay SDK for Java** to integrate with Alipay's payment gateway:

```xml
<dependency>
    <groupId>com.alipay.sdk</groupId>
    <artifactId>alipay-sdk-java</artifactId>
    <version>4.38.0.ALL</version>
</dependency>
```

#### Alipay Configuration

```yaml
payment:
  alipay:
    enabled: true
    gateway-url: https://openapi.alipay.com/gateway.do
    app-id: ${ALIPAY_APP_ID}
    private-key-path: ${ALIPAY_PRIVATE_KEY_PATH}  # RSA2 private key file
    public-key-path: ${ALIPAY_PUBLIC_KEY_PATH}    # Alipay public key file
    notify-url: ${ALIPAY_NOTIFY_URL}              # Async callback URL
    return-url: ${ALIPAY_RETURN_URL}              # Sync redirect URL
    sign-type: RSA2                                # Signature algorithm
    charset: UTF-8
    query-pending-batch-size: 100
```

**Configuration Properties:**

| Property | Description | Required |
|----------|-------------|----------|
| `enabled` | Enable/disable Alipay | Yes |
| `gateway-url` | Alipay API endpoint | Yes |
| `app-id` | Alipay application ID | Yes |
| `private-key-path` | Path to RSA2 private key file | Yes |
| `public-key-path` | Path to Alipay public key file | Yes |
| `notify-url` | Async payment notification URL | Yes |
| `return-url` | Sync redirect URL after payment | No |
| `sign-type` | Signature algorithm (RSA2) | Yes |
| `charset` | Character encoding | Yes |

#### Alipay SDK Client

The `AlipaySdkClient` encapsulates all Alipay API interactions:

```java
@Component
public class AlipaySdkClient {
    
    private final AlipayProperties properties;
    private volatile AlipayClient cachedClient;  // Thread-safe cached client
    
    // Build Alipay client with RSA2 authentication
    private AlipayClient buildClient() throws Exception {
        AlipayClient client = cachedClient;
        if (client != null) {
            return client;
        }
        synchronized (this) {
            client = cachedClient;
            if (client != null) {
                return client;
            }
            
            // Read RSA keys from file
            String privateKey = readKey(properties.getPrivateKeyPath());
            String publicKey = readKey(properties.getPublicKeyPath());
            
            // Create Alipay client
            client = new DefaultAlipayClient(
                    properties.getGatewayUrl(),    // API endpoint
                    properties.getAppId(),         // App ID
                    privateKey,                    // Private key
                    "json",                        // Format
                    properties.getCharset(),       // Charset
                    publicKey,                     // Public key
                    properties.getSignType()       // Sign type (RSA2)
            );
            
            cachedClient = client;
            return client;
        }
    }
}
```

**Key Features:**
- **Thread-Safe Client**: Double-checked locking for client initialization
- **RSA2 Authentication**: Secure signature verification
- **Key File Reading**: Automatic key file loading and parsing
- **Client Caching**: Reuse client instance for performance

#### Payment Operations

**1. Create Page Order (PC Payment)**

```java
public PlaceOrderResult createPageOrder(String outTradeNo,
                                        String description,
                                        int amountFen,
                                        int timeoutMinutes) throws Exception {
    AlipayClient client = buildClient();
    
    // Build payment request
    AlipayTradePagePayRequest request = new AlipayTradePagePayRequest();
    request.setNotifyUrl(properties.getNotifyUrl());
    request.setReturnUrl(properties.getReturnUrl());
    
    // Build payment model
    AlipayTradePagePayModel model = new AlipayTradePagePayModel();
    model.setOutTradeNo(outTradeNo);           // Unique order ID
    model.setSubject(description);              // Order description
    model.setTotalAmount(toYuan(amountFen));    // Amount in yuan (e.g., "15.00")
    model.setProductCode("FAST_INSTANT_TRADE_PAY");  // Product code
    model.setTimeoutExpress(timeoutMinutes + "m");    // Expiration time
    
    // Set absolute expiration time
    String timeExpire = ZonedDateTime.now(ZoneId.of("Asia/Shanghai"))
            .plusMinutes(timeoutMinutes)
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    model.setTimeExpire(timeExpire);
    
    request.setBizModel(model);
    
    // Execute request (GET method for page payment)
    AlipayTradePagePayResponse response = client.pageExecute(request, "GET");
    
    if (!response.isSuccess()) {
        throw new IllegalStateException("Alipay order failed: " + response.getSubCode());
    }
    
    return new PlaceOrderResult(null, response.getBody());  // Returns payment URL
}
```

**Payment Flow:**

```
Client Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Create Order in Database                                │
│     - Generate unique outTradeNo                            │
│     - Set product, amount, expiration                       │
│     - Store in payment_order table                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Call Alipay API (createPageOrder)                       │
│     - Submit order to Alipay                                │
│     - Receive payment URL                                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Redirect User to Alipay                                 │
│     - User scans QR code or logs in                         │
│     - Completes payment                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Alipay Async Notification (POST)                        │
│     - Verify signature                                      │
│     - Update order status                                   │
│     - Grant user benefits (Pro subscription)                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Send Payment Receipt Email                              │
│     - Async via RabbitMQ                                    │
│     - Resend SDK delivery                                   │
└─────────────────────────────────────────────────────────────┘
```

**2. Query Order Status**

```java
public QueryResult queryOrder(String outTradeNo) throws Exception {
    AlipayClient client = buildClient();
    
    AlipayTradeQueryRequest request = new AlipayTradeQueryRequest();
    AlipayTradeQueryModel model = new AlipayTradeQueryModel();
    model.setOutTradeNo(outTradeNo);
    request.setBizModel(model);
    
    AlipayTradeQueryResponse response = client.execute(request);
    
    if (!response.isSuccess()) {
        if (isTradeNotExist(response.getSubCode())) {
            return QueryResult.notFound();
        }
        throw new IllegalStateException("Alipay query failed: " + response.getSubMsg());
    }
    
    return new QueryResult(
            response.getTradeStatus(),      // TRADE_SUCCESS, TRADE_CLOSED, etc.
            response.getTradeNo(),          // Alipay transaction ID
            toOffsetDateTime(response.getSendPayDate())  // Payment time
    );
}
```

**Trade Status Values:**

| Status | Description | Action |
|--------|-------------|--------|
| `WAIT_BUYER_PAY` | Waiting for payment | Keep polling |
| `TRADE_SUCCESS` | Payment successful | Grant benefits |
| `TRADE_FINISHED` | Trade completed | No action needed |
| `TRADE_CLOSED` | Trade closed/expired | No action needed |
| `NOT_FOUND` | Trade doesn't exist | Handle error |

**3. Close Order**

```java
public CloseResult closeOrder(String outTradeNo) {
    AlipayClient client = buildClient();
    
    AlipayTradeCloseRequest request = new AlipayTradeCloseRequest();
    AlipayTradeCloseModel model = new AlipayTradeCloseModel();
    model.setOutTradeNo(outTradeNo);
    request.setBizModel(model);
    
    AlipayTradeCloseResponse response = client.execute(request);
    
    if (!response.isSuccess()) {
        if (isTradeNotExist(response.getSubCode())) {
            return CloseResult.failed("TRADE_NOT_EXIST", "Trade not found");
        }
        return CloseResult.failed(response.getSubCode(), response.getSubMsg());
    }
    
    return CloseResult.ok();
}
```

**4. Cancel Order**

```java
public void cancelOrder(String outTradeNo) {
    AlipayClient client = buildClient();
    
    AlipayTradeCancelRequest request = new AlipayTradeCancelRequest();
    AlipayTradeCancelModel model = new AlipayTradeCancelModel();
    model.setOutTradeNo(outTradeNo);
    request.setBizModel(model);
    
    AlipayTradeCancelResponse response = client.execute(request);
    
    if (!response.isSuccess()) {
        log.warn("Alipay cancel failed: {}", response.getSubMsg());
    }
}
```

#### Alipay Notification Handling

The system handles Alipay's async payment notifications:

```java
@RestController
@RequestMapping("/payment/alipay")
public class AlipayNotifyController {
    
    @PostMapping("/notify")
    public String handleNotify(HttpServletRequest request) {
        // 1. Extract notification parameters
        Map<String, String> params = extractParams(request);
        
        // 2. Verify signature using Alipay SDK
        boolean verified = AlipaySignature.rsaCheckV1(params, publicKey, charset, signType);
        
        if (!verified) {
            log.warn("Alipay notify signature verification failed");
            return "failure";
        }
        
        // 3. Process payment result
        String tradeStatus = params.get("trade_status");
        String outTradeNo = params.get("out_trade_no");
        String tradeNo = params.get("trade_no");
        
        if ("TRADE_SUCCESS".equals(tradeStatus) || "TRADE_FINISHED".equals(tradeStatus)) {
            // 4. Update order status and grant benefits
            paymentService.handlePaymentSuccess(outTradeNo, tradeNo, params);
        }
        
        // 5. Return success to Alipay
        return "success";
    }
}
```

**Notification Security:**

:::danger
Payment callback notifications must be signature-verified to prevent forged payment success requests. The system uses RSA2 signature verification + Redis idempotency detection for dual protection.
:::

- **Signature Verification**: RSA2 signature check on every notification
- **Idempotent Processing**: Redis-based duplicate detection
- **Async Processing**: RabbitMQ for non-blocking operations

#### Payment Products

| Product | Description | Default Price |
|---------|-------------|---------------|
| `PRO_MONTH` | Pro subscription (1 month) | ¥15.00 |
| `AGENT_RECHARGE` | AI agent credits | Variable |
| `TEST_PAY` | Test payment | ¥0.01 |

#### Order Lifecycle

```
Order Created
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Status: PENDING                                            │
│  - Waiting for user to complete payment                     │
│  - Timeout: 15 minutes (configurable)                       │
└─────────────────────────────────────────────────────────────┘
    │
    ├─── User Pays ───────────────────────────────────────────┐
    │                                                         │
    ▼                                                         ▼
┌─────────────────────────┐                    ┌─────────────────────────┐
│  Status: PAID           │                    │  Status: EXPIRED        │
│  - Payment confirmed    │                    │  - Auto-close on timeout│
│  - Grant benefits       │                    │  - Release resources    │
│  - Send receipt email   │                    └─────────────────────────┘
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│  Status: COMPLETED      │
│  - Benefits active      │
│  - Subscription started │
└─────────────────────────┘
```

#### Concurrency Control

The payment system uses multiple mechanisms for concurrency safety:

```java
// 1. Redis distributed lock for order creation
String lockKey = "payment:lock:create:pro-month:" + username;
String lockValue = UUID.randomUUID().toString();
Boolean locked = paymentRedisTemplate.opsForValue().setIfAbsent(lockKey, lockValue, 15, TimeUnit.SECONDS);

if (!Boolean.TRUE.equals(locked)) {
    throw new IllegalStateException("Order creation too frequent, please retry");
}

// 2. Idempotent notification processing
String notifyDoneKey = "payment:notify:done:" + outTradeNo;
Boolean alreadyProcessed = paymentRedisTemplate.opsForValue().setIfAbsent(notifyDoneKey, "1", 24, TimeUnit.HOURS);

if (Boolean.TRUE.equals(alreadyProcessed)) {
    log.info("Notification already processed: {}", outTradeNo);
    return "success";
}

// 3. Database transaction for atomic operations
@Transactional
public void handlePaymentSuccess(String outTradeNo, String tradeNo, Map<String, String> params) {
    // Update order status
    paymentOrderMapper.updateStatus(outTradeNo, "PAID", tradeNo);
    
    // Create transaction record
    paymentTransactionMapper.insert(new PaymentTransaction(...));
    
    // Grant user benefits (Pro subscription)
    userService.updateProExpireAt(username, expireAt);
}
```

### WeChat Pay Integration

The system also supports **WeChat Pay** as an alternative payment channel:

```yaml
payment:
  wechat:
    enabled: false
    mch-id: ${WX_PAY_MCH_ID}
    app-id: ${WX_PAY_APP_ID}
    api-v3-key: ${WX_PAY_API_V3_KEY}
    private-key-path: ${WX_PAY_PRIVATE_KEY_PATH}
    serial-no: ${WX_PAY_SERIAL_NO}
    notify-url: ${WX_PAY_NOTIFY_URL}
    public-key-id: ${WX_PAY_PUBLIC_KEY_ID}
    public-key-path: ${WX_PAY_PUBLIC_KEY_PATH}
    platform-cert-path: ${WX_PAY_PLATFORM_CERT_PATH}
    order-expire-minutes: 15
```

**WeChat Pay Features:**
- Native JSAPI payment
- H5 payment
- QR code payment
- Refund processing

### Payment Database Schema

**payment_order Table:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `out_trade_no` | VARCHAR(64) | Unique order ID |
| `username` | VARCHAR(50) | User who created order |
| `product_code` | VARCHAR(32) | Product identifier |
| `amount_fen` | INT | Amount in fen (cents) |
| `currency` | VARCHAR(3) | Currency code (CNY) |
| `channel` | VARCHAR(16) | Payment channel (ALIPAY/WECHAT) |
| `status` | VARCHAR(16) | Order status |
| `trade_no` | VARCHAR(64) | Payment platform transaction ID |
| `paid_at` | DATETIME | Payment time |
| `expire_at` | DATETIME | Order expiration time |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

**payment_transaction Table:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `out_trade_no` | VARCHAR(64) | Order ID |
| `trade_no` | VARCHAR(64) | Platform transaction ID |
| `channel` | VARCHAR(16) | Payment channel |
| `amount_fen` | INT | Amount |
| `status` | VARCHAR(16) | Transaction status |
| `raw_notify` | TEXT | Raw notification data |
| `created_at` | DATETIME | Creation time |

### Dead Letter Queue (DLQ)

Failed payment operations are routed to DLQ for retry:

```java
// Payment DLQ message
public record PaymentDlqMessage(
    String outTradeNo,
    String operation,
    String errorMessage,
    int retryCount,
    LocalDateTime failedAt
) {}

// DLQ consumer with retry logic
@RabbitListener(queues = "payment.dlq")
public void handleDlq(PaymentDlqMessage message) {
    if (message.retryCount() < MAX_RETRIES) {
        // Retry operation
        retryOperation(message);
    } else {
        // Log to database for manual review
        paymentDlqLogMapper.insert(new PaymentDlqLog(...));
    }
}
```

---

## Email Services

### Overview

:::tip
The email system uses **Resend** as the primary email delivery service, providing reliable transactional email delivery with high deliverability rates. For the verification code storage, see [Redis — Email Verification](../backend-arch/redis-schema.md#db-2--email-verification--identity-verification). For the async dispatch topology, see [RabbitMQ — Email Verification](../backend-arch/rabbitmq-schema.md#domain-1-email-verification).
:::

### Resend SDK Integration

```xml
<dependency>
    <groupId>com.resend</groupId>
    <artifactId>resend-java</artifactId>
</dependency>
```

#### Resend Configuration

```yaml
resend:
  api-key: ${RESEND_API_KEY}           # Resend API key
  from: noreply@pyisland.com           # Sender email address
  endpoint: https://api.resend.com/emails  # API endpoint (default)
```

**Configuration Properties:**

| Property | Description | Required |
|----------|-------------|----------|
| `api-key` | Resend API authentication key | Yes |
| `from` | Sender email address | Yes |
| `endpoint` | API endpoint URL | No (default: Resend API) |

#### Email Verification Service

The `EmailVerificationService` handles all email verification flows:

```java
@Service
public class EmailVerificationService {
    
    // Verification scenarios
    public enum Scene {
        REGISTER,           // New account registration
        LOGIN,              // Login verification
        RESET_PASSWORD,     // Password reset
        CHANGE_EMAIL,       // Email change
        UNREGISTER          // Account deletion
    }
    
    // Rate limiting constants
    private static final int CODE_LENGTH = 6;                    // 6-digit code
    private static final long CODE_TTL_SECONDS = 5 * 60;         // 5-minute validity
    private static final long SEND_COOLDOWN_SECONDS = 60;        // 60-second cooldown
    private static final int MAX_VERIFY_ATTEMPTS = 5;            // 5 attempts max
    private static final int MAX_IP_SENDS_PER_HOUR = 3;          // 3 per hour per IP
    private static final int MAX_EMAIL_SENDS_PER_HOUR = 3;       // 3 per hour per email
    private static final int MAX_EMAIL_SENDS_PER_DAY = 30;       // 30 per day per email
    
    public SendCodeResult sendCode(SendCodeCommand command) {
        // 1. Check rate limits (per IP, per email)
        if (isRateLimited(command.email(), command.clientIp())) {
            return SendCodeResult.rateLimited(retryAfterSeconds);
        }
        
        // 2. Generate 6-digit code
        String code = generateCode();
        
        // 3. Store code in Redis with TTL
        String key = buildKey(command.email(), command.scene());
        verificationRedisTemplate.opsForValue().set(key, hash(code), 
                Duration.ofSeconds(CODE_TTL_SECONDS));
        
        // 4. Send email via RabbitMQ (async)
        rabbitTemplate.convertAndSend("email.verification", 
                new EmailCodeDispatchMessage(command.email(), command.scene(), code, traceId));
        
        return SendCodeResult.ok();
    }
    
    public VerifyCodeResult verifyCode(VerifyCodeCommand command) {
        // 1. Get stored hash from Redis
        String key = buildKey(command.email(), command.scene());
        String storedHash = verificationRedisTemplate.opsForValue().get(key);
        
        if (storedHash == null) {
            return VerifyCodeResult.expired();
        }
        
        // 2. Verify code hash
        if (!storedHash.equals(hash(command.code()))) {
            recordFailedAttempt(command.email(), command.scene());
            return VerifyCodeResult.invalid();
        }
        
        // 3. Consume code if requested (one-time use)
        if (command.consume()) {
            verificationRedisTemplate.delete(key);
        }
        
        return VerifyCodeResult.ok();
    }
}
```

**Verification Flow:**

```
User Request (Register/Login/Reset)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Rate Limit Check                                        │
│     - Per IP: 3 emails per hour                             │
│     - Per email: 3 emails per hour, 30 per day              │
│     - Cooldown: 60 seconds between sends                    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Generate Verification Code                              │
│     - 6-digit numeric code                                  │
│     - Hash with pepper before storage                       │
│     - Store in Redis with 5-minute TTL                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Async Email Dispatch (RabbitMQ)                         │
│     - Queue: email.verification                             │
│     - Consumer calls Resend API                             │
│     - DLQ for failed deliveries                             │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Resend Email Delivery                                   │
│     - HTML template with code                               │
│     - 5-minute expiration notice                            │
│     - Trace ID for debugging                                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. User Enters Code                                        │
│     - Verify against stored hash                            │
│     - Max 5 attempts before code invalidation               │
│     - One-time consumption                                  │
└─────────────────────────────────────────────────────────────┘
```

#### Resend Email Service Implementation

```java
@Service
public class ResendEmailService {
    
    private final String resendApiKey;
    private final String resendFrom;
    
    public void sendVerificationCode(String email, Scene scene, String code, String traceId) {
        // Validate configuration
        if (resendApiKey == null || resendApiKey.isBlank()) {
            throw new IllegalStateException("resend.api-key is missing");
        }
        
        // Build email content
        String subject = buildSubject(scene);
        String html = buildHtml(scene, code, traceId);
        
        // Send via Resend SDK
        Resend resend = new Resend(resendApiKey);
        CreateEmailOptions options = CreateEmailOptions.builder()
                .from(resendFrom)                    // Sender address
                .to(List.of(email))                  // Recipient
                .subject(subject)                    // Email subject
                .html(html)                          // HTML content
                .build();
        
        resend.emails().send(options);
    }
    
    private String buildSubject(Scene scene) {
        return switch (scene) {
            case REGISTER -> "eIsland Registration Verification Code";
            case LOGIN -> "eIsland Login Verification Code";
            case RESET_PASSWORD -> "eIsland Password Reset Code";
            case CHANGE_EMAIL -> "eIsland Email Change Code";
            case UNREGISTER -> "eIsland Account Deletion Code";
        };
    }
    
    private String buildHtml(Scene scene, String code, String traceId) {
        String sceneLabel = switch (scene) {
            case REGISTER -> "Register Account";
            case LOGIN -> "Login to Account";
            case RESET_PASSWORD -> "Reset Password";
            case CHANGE_EMAIL -> "Change Email";
            case UNREGISTER -> "Delete Account";
        };
        
        return """
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
                  <h2 style="margin:0 0 12px 0">eIsland Email Verification</h2>
                  <p>You are performing: <strong>%s</strong></p>
                  <p>Your verification code (valid for 5 minutes):</p>
                  <p style="font-size:24px;letter-spacing:4px;font-weight:700;margin:8px 0 12px">%s</p>
                  <p style="color:#666">If you did not request this, please ignore this email.</p>
                  <p style="color:#999;font-size:12px">traceId: %s</p>
                </div>
                """.formatted(sceneLabel, code, traceId);
    }
}
```

**Email Template Features:**
- **HTML Format**: Rich formatting with inline styles
- **Scene-Specific Content**: Dynamic subject and body based on scenario
- **Code Display**: Large, prominent verification code
- **Expiration Notice**: 5-minute validity reminder
- **Trace ID**: For debugging and support

#### Payment Receipt Email

After successful payment, a receipt email is sent:

```java
@Service
public class PaymentReceiptEmailService {
    
    public void sendPaymentReceipt(String toEmail,
                                   String outTradeNo,
                                   String channel,
                                   String transactionId,
                                   Integer amountFen,
                                   String currency,
                                   String productCode,
                                   LocalDateTime paidAt,
                                   LocalDateTime expireAt) {
        // Build receipt HTML
        String subject = "eIsland Payment Receipt - " + outTradeNo;
        String html = """
                <div style="font-family:Arial,sans-serif;line-height:1.7;color:#111">
                  <h2 style="margin:0 0 12px 0">eIsland Payment Successful</h2>
                  <p>Your order has been paid successfully. Here is your receipt:</p>
                  <table style="border-collapse:collapse;margin-top:12px">
                    <tr><td>Order Number</td><td><strong>%s</strong></td></tr>
                    <tr><td>Payment Channel</td><td>%s</td></tr>
                    <tr><td>Transaction ID</td><td>%s</td></tr>
                    <tr><td>Amount</td><td>%s %s</td></tr>
                    <tr><td>Payment Time</td><td>%s</td></tr>
                    <tr><td>Expiration</td><td>%s</td></tr>
                    <tr><td>Product</td><td>%s</td></tr>
                  </table>
                </div>
                """.formatted(outTradeNo, channel, transactionId, 
                             formatAmount(amountFen), currency,
                             paidAt, expireAt, productCode);
        
        // Send via Resend
        Resend resend = new Resend(resendApiKey);
        CreateEmailOptions options = CreateEmailOptions.builder()
                .from(resendFrom)
                .to(List.of(toEmail))
                .subject(subject)
                .html(html)
                .build();
        
        resend.emails().send(options);
    }
}
```

**Receipt Email Content:**
- Order number
- Payment channel (Alipay/WeChat)
- Transaction ID
- Amount in yuan
- Payment timestamp
- Subscription expiration
- Product description

### Email Dispatch Architecture

```
Email Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Service Layer                                           │
│     - EmailVerificationService                              │
│     - PaymentReceiptEmailService                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. RabbitMQ Queue                                          │
│     - email.verification (verification codes)               │
│     - payment.receipt (payment receipts)                    │
│     - email.dlq (failed deliveries)                         │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Consumer Processing                                     │
│     - EmailCodeDispatchConsumer                             │
│     - PaymentReceiptDispatchConsumer                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Resend API Call                                         │
│     - ResendEmailService.sendVerificationCode()             │
│     - PaymentReceiptEmailService.sendPaymentReceipt()       │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Email Delivery                                          │
│     - Resend infrastructure                                 │
│     - High deliverability                                   │
│     - Tracking and analytics                                │
└─────────────────────────────────────────────────────────────┘
```

### Rate Limiting

Email sending is rate-limited to prevent abuse:

| Limit Type | Limit | Window |
|------------|-------|--------|
| Per IP | 3 emails | 1 hour |
| Per Email | 3 emails | 1 hour |
| Per Email | 30 emails | 24 hours |
| Cooldown | 1 email | 60 seconds |
| Code Attempts | 5 attempts | Per code |

### Error Handling

```java
// Email dispatch consumer with retry
@RabbitListener(queues = "email.verification")
public void handleEmailDispatch(EmailCodeDispatchMessage message) {
    try {
        resendEmailService.sendVerificationCode(
                message.email(),
                message.scene(),
                message.code(),
                message.traceId()
        );
    } catch (Exception ex) {
        log.error("Email dispatch failed: {}", ex.getMessage());
        
        // Retry logic
        if (message.retryCount() < MAX_RETRIES) {
            // Requeue with incremented retry count
            rabbitTemplate.convertAndSend("email.verification",
                    message.withRetryCount(message.retryCount() + 1));
        } else {
            // Send to DLQ
            rabbitTemplate.convertAndSend("email.dlq", message);
            
            // Log to database
            emailDispatchDlqLogMapper.insert(new EmailDispatchDlqLog(...));
        }
    }
}
```

### Security Considerations

1. **Code Hashing**: Verification codes hashed with pepper before Redis storage
2. **Rate Limiting**: Multiple layers (IP, email, cooldown)
3. **One-Time Use**: Codes consumed after successful verification
4. **TTL Expiration**: 5-minute code validity
5. **Attempt Limiting**: 5 failed attempts invalidate code
6. **Trace ID**: Unique identifier for each email for debugging

### Performance Optimizations

1. **Async Processing**: RabbitMQ for non-blocking email dispatch
2. **Connection Pooling**: Resend SDK connection reuse
3. **Batch Operations**: Bulk email capabilities
4. **DLQ Retry**: Automatic retry for failed deliveries
5. **Monitoring**: Email delivery tracking and analytics

## Configuration Management

### Environment Variables

:::danger
Sensitive configuration is managed through environment variables. All keys, passwords, and sensitive configuration must be injected via environment variables — never hardcode in source code.
:::

```properties
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=eisland

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRATION=604800000

# Cloud Storage
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-secret-key
```

### Spring Dotenv

Environment variable loading from `.env` files:

```xml
<dependency>
    <groupId>me.paulschwarz</groupId>
    <artifactId>spring-dotenv</artifactId>
</dependency>
```

## Testing

### Spring Boot Test

Comprehensive testing setup:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

**Testing Capabilities:**
- Unit testing with JUnit
- Integration testing with SpringBootTest
- Security testing with MockMvc
- Database testing with Testcontainers

## Deployment

### WAR Packaging

The application is packaged as a **WAR** file for deployment:

- Compatible with external Tomcat containers
- Embedded Tomcat support for development
- Cloud-native deployment options

### Build Tools

- **Maven**: Dependency management and build automation
- **Maven Wrapper**: Consistent build environment across teams

## Performance Optimization

### Caching Strategy

Multi-level caching implementation:

1. **L1 Cache**: In-memory caching for frequent access
2. **L2 Cache**: Redis for shared cache across instances
3. **Database Query Cache**: MyBatis query result caching

### Async Processing

Non-blocking operations using:

- **RabbitMQ**: Message queue for background tasks
- **Spring @Async**: Asynchronous method execution
- **CompletableFuture**: Non-blocking I/O operations

## Monitoring & Observability

### Health Checks

Built-in service health monitoring:

- Database connectivity
- Redis availability
- External service dependencies
- Application metrics

### Logging

Structured logging with:

- **SLF4J**: Logging facade
- **Logback**: Logging implementation
- **JSON Format**: Machine-readable log output

## Security Best Practices

:::info
Security best practices adopted by the eIsland backend:
:::

### Data Protection

- **Password Hashing**: BCrypt for secure password storage
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries with MyBatis
- **XSS Protection**: Output encoding and sanitization

### API Security

- **Rate Limiting**: Request throttling per user/IP
- **CORS Configuration**: Controlled cross-origin access
- **HTTPS Enforcement**: Secure communication channels
- **Token Rotation**: Regular JWT token refresh

## Scalability Considerations

### Horizontal Scaling

The architecture supports:

- **Stateless Design**: No server-side session storage
- **Database Connection Pooling**: Efficient resource utilization
- **Cache Distribution**: Redis cluster support
- **Load Balancing**: Multiple instance deployment

### Microservice Ready

While currently a modular monolith, the design allows for:

- **Domain Isolation**: Clear module boundaries
- **API Gateway Ready**: RESTful API design
- **Service Discovery**: Potential integration with service mesh
- **Event Sourcing**: RabbitMQ-based event propagation

---

For detailed API documentation, refer to the OpenAPI specifications and source code comments.
