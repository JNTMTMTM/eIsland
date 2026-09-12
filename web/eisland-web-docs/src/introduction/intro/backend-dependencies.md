---
title: Backend Dependencies
icon: server
---

# Backend Dependencies

:::info
This document provides a non-technical overview of every library and tool used in the eIsland backend server. The backend is a Java application built with Spring Boot, using Maven as its build tool. Each dependency is explained by what it does for the user, not how it works internally.
:::

:::note
**Build Environment:** Apache Maven · Java 25 (JDK 25.0.2)
:::

## Core Framework

The foundational Spring Boot starters that provide the server's core capabilities.

| Starter | What It Does |
|---------|--------------|
| **Spring Boot Starter WebMVC** | Powers the server's REST API — handles incoming HTTP requests from the eIsland desktop app and returns responses (user data, weather info, AI replies, etc.). |
| **Spring Boot Starter Security** | Protects the server from unauthorized access — handles login, password hashing, session management, and ensures only authenticated users can access protected endpoints. |
| **Spring Boot Starter JSON** | Automatically converts Java objects to JSON format for API responses, and parses incoming JSON requests into Java objects. |
| **Spring Boot Starter Validation** | Validates incoming request data — ensures required fields are present, values are within allowed ranges, and formats are correct before processing. |
| **Spring Boot Starter Cache** | Provides an in-memory caching layer — stores frequently accessed data temporarily to reduce database load and improve response speed. |
| **Spring Boot Starter Tomcat** | The embedded web server that hosts the application. Configured as `provided` because the app can also run on an external Tomcat server. |
| **Spring Boot Configuration Processor** | Generates metadata for custom configuration properties, enabling IDE auto-completion and documentation for server settings. |

:::tip
Spring Boot Starters are pre-packaged bundles of functionality. Instead of manually configuring each feature, developers simply add a starter dependency and Spring Boot automatically sets up everything needed.
:::

## Database & ORM

Libraries for connecting to and interacting with the MySQL database.

| Library | What It Does |
|---------|--------------|
| **MyBatis Spring Boot Starter** | Bridges the gap between Java code and MySQL database. Translates Java method calls into SQL queries and maps database results back to Java objects. Used across all modules that store data (users, payments, versions, game scores, etc.). |
| **MySQL Connector/J** | The official MySQL driver for Java — enables the application to establish connections with the MySQL database server and execute queries. |

:::details How MyBatis Works — Simplified
When the server needs to save a new user, MyBatis takes the Java user object, runs the appropriate SQL `INSERT` statement against MySQL, and returns the result. Developers write SQL in XML mapper files rather than embedding it in Java code, keeping the logic clean and maintainable.
:::

## Caching & Message Queue

Libraries for Redis caching and RabbitMQ message processing.

| Library | What It Does |
|---------|--------------|
| **Spring Boot Starter Data Redis** | Connects to the Redis in-memory database for fast caching. Stores frequently accessed data (user sessions, weather cache, rate limiting counters, leaderboard scores) to reduce MySQL load and improve response times. |
| **Spring Boot Starter AMQP** | Connects to RabbitMQ for asynchronous message processing. Used for tasks that don't need immediate completion — like sending emails, processing payments, and retrying failed operations. |

:::important
Redis and RabbitMQ are critical infrastructure services. Redis provides sub-millisecond data access for hot data, while RabbitMQ ensures reliable processing of background tasks. Both services must be running for the backend to function correctly.
:::

## Authentication & Security

Libraries for JWT token-based authentication and email verification.

| Library | What It Does |
|---------|--------------|
| **JJWT API** | Creates and validates JSON Web Tokens (JWT) — the secure "tickets" that prove a user is logged in. When you log in to eIsland, the server generates a JWT that the app includes in every subsequent request. |
| **JJWT Impl** | The runtime implementation of JJWT that handles the actual cryptographic operations (signing and verifying tokens). |
| **JJWT Jackson** | Integrates JJWT with Jackson for JSON serialization of JWT claims (the data stored inside the token). |
| **Resend Java** | Sends transactional emails (verification codes, password resets, payment confirmations) through the Resend email service. |

:::warning
JWT tokens have an expiration time. When a token expires, the user must log in again. This is a security measure — even if a token is stolen, it becomes useless after expiration.
:::

## AI & Machine Learning

Libraries that power the eIsland AI assistant (mihtnelis agent).

| Library | What It Does |
|---------|--------------|
| **Spring AI OpenAI** | Integrates with OpenAI's API for AI-powered conversations. Provides streaming responses so users see the AI typing in real-time. |
| **LangChain4j** | A Java framework for building AI agent applications — provides tools for chaining AI calls, managing conversation memory, and orchestrating complex AI workflows. |
| **LangChain4j OpenAI** | The OpenAI-specific module for LangChain4j — connects to OpenAI models for the agent's reasoning and tool-calling capabilities. |

:::details AI Agent Architecture
The eIsland AI agent uses a combination of Spring AI (for streaming conversations) and LangChain4j (for tool orchestration). When you ask the AI a question, it can use tools like weather lookup, system commands, or web search to gather information before formulating a response.
:::

## Speech Recognition

| Library | What It Does |
|---------|--------------|
| **Tencent Cloud Speech SDK Java** | Converts speech to text — enables voice input for the AI assistant. When you speak to eIsland, this library sends the audio to Tencent Cloud's speech recognition service and returns the transcribed text. |

## Cloud Storage

Libraries for file uploads and storage across multiple cloud providers.

| Library | What It Does |
|---------|--------------|
| **Aliyun SDK OSS** | Connects to Alibaba Cloud Object Storage Service — used for storing user uploads (avatars, files) in regions where Alibaba Cloud is the primary provider. |
| **Tencent COS API** | Connects to Tencent Cloud Object Storage — provides file storage capabilities as an alternative cloud provider. |
| **AWS S3 SDK** | Connects to Amazon S3 and S3-compatible services (like Cloudflare R2) — used for storing application assets, release files, and user uploads. |

:::tip
The upload module supports three cloud storage providers. Developers can configure which provider to use based on the deployment region — Alibaba Cloud for mainland China, Tencent Cloud as an alternative, and Cloudflare R2 for global distribution.
:::

## Payment Processing

Libraries for handling payments and financial transactions.

| Library | What It Does |
|---------|--------------|
| **Alipay SDK Java** | Integrates with Alipay (Zhifubao) — one of China's largest payment platforms. Handles payment creation, QR code generation, payment verification, and refund processing. |

:::warning
Payment processing involves real financial transactions. The Alipay SDK handles secure communication with Alipay's servers, verifies payment callbacks to prevent fraud, and ensures all transactions are properly recorded.
:::

## Markdown Processing

| Library | What It Does |
|---------|--------------|
| **CommonMark** | Parses and renders Markdown text on the server side. Used to convert Markdown content (like user profiles or game descriptions) into HTML for display. |

## JSON Processing

| Library | What It Does |
|---------|--------------|
| **Jackson Databind** | The core JSON processing library — serializes Java objects into JSON for API responses and deserializes incoming JSON requests into Java objects. Used directly by the user, weather, and mini-game modules for fine-grained JSON control. |

## HTTP Client

| Library | What It Does |
|---------|--------------|
| **Apache HttpClient** | Makes HTTP requests to external services from the server. Used when the server needs to call third-party APIs (weather services, payment gateways, cloud storage) on behalf of the user. |

## Configuration

| Library | What It Does |
|---------|--------------|
| **Spring DotEnv** | Loads environment variables from `.env` files — allows developers to keep sensitive configuration (database passwords, API keys, secret tokens) out of the source code. |

:::danger
Never commit `.env` files to version control. These files contain sensitive credentials that could compromise the entire system if exposed. The `.gitignore` file is configured to exclude them.
:::

## Servlet API

| Library | What It Does |
|---------|--------------|
| **Jakarta Servlet API** | Provides the interface for handling HTTP requests and responses at the servlet level. Used by utility classes that need direct access to request information (like extracting the client's IP address). |

:::note
The Jakarta Servlet API is marked as `provided` — it is supplied by the web server (Tomcat) at runtime, not bundled with the application. This avoids conflicts between the application's and server's servlet implementations.
:::

## Testing

Libraries used by developers to verify the server works correctly.

| Library | What It Does |
|---------|--------------|
| **Spring Boot Starter Test** | Provides the testing framework for the entire application — includes JUnit for running tests, MockMvc for simulating HTTP requests, and assertion libraries for verifying results. |
| **Spring Security Test** | Provides testing utilities specific to security — allows developers to simulate authenticated users, test permission checks, and verify that protected endpoints reject unauthorized access. |

:::details Testing Approach
The backend uses a layered testing strategy:

1. **Unit Tests** — Test individual methods and classes in isolation.
2. **Integration Tests** — Test how modules work together (e.g., auth + user + database).
3. **Security Tests** — Verify that authentication and authorization rules are correctly enforced.
:::

## Internal Modules

The server is organized as a modular monolith with 11 internal modules. These are not external libraries but project components that depend on each other.

:::important
All 11 modules run within a single application but are logically separated. Each module has its own database tables, services, and controllers. Modules communicate through well-defined Java interfaces rather than direct database access.
:::

### Module Overview

| Module | Description | External Dependencies | Internal Dependencies |
|--------|-------------|----------------------|----------------------|
| **server-common** | Shared utilities, constants, exception definitions, and IP extraction helpers | Jakarta Servlet API | — |
| **server-auth** | User authentication, login, registration, JWT tokens, email verification | WebMVC, Security, JSON, Redis, AMQP, JJWT, Resend | common, user, version |
| **server-user** | User accounts, profiles, preferences, avatar uploads, admin roles | WebMVC, JSON, Security, Redis, AMQP, MyBatis, Jackson, CommonMark, Alipay | common, upload |
| **server-agent** | AI assistant (mihtnelis), streaming conversations, tool orchestration, speech, billing | WebMVC, JSON, Security, Validation, WebSocket, Redis, AMQP, JJWT, Spring AI, LangChain4j, Tencent Speech | common, user, weather, service-status |
| **server-weather** | Weather data proxy, QWeather API, Redis cache, Pro-tier access | WebMVC, JSON, Security, Redis, Jackson | — |
| **server-payment** | Payment processing, Alipay integration, order management, callbacks | WebMVC, JSON, Security, Redis, AMQP, MyBatis, Alipay, Resend | common, user |
| **server-version** | App version metadata, release history, version check API | WebMVC, Redis, MyBatis | common |
| **server-service-status** | API service health monitoring, operational status tracking | WebMVC, MyBatis | common |
| **server-upload** | File uploads, avatar storage, multi-cloud support (OSS, COS, R2) | WebMVC, Security, Redis, AMQP, MyBatis, Aliyun OSS, Tencent COS, AWS S3, HttpClient | common |
| **server-mini-game** | High scores, leaderboards, Redis cache, RabbitMQ reliable persistence | WebMVC, JSON, Security, Redis, AMQP, MyBatis, Jackson | common, user |
| **server-app** | Main entry point, aggregates all modules, produces deployable WAR | WebMVC, JSON, Security, Cache, Redis, MyBatis, Tomcat, MySQL, DotEnv, Test | All 9 business modules |

### Module Details

:::details server-common — Foundation Module
The foundation module that all other modules depend on. Provides:

- **Utility classes** — Common helper methods used across the codebase
- **Constants** — Shared constant values and enumerations
- **Exception definitions** — Standard error types and error response formatting
- **IP extraction** — Client IP address detection from HTTP requests (uses Jakarta Servlet API)
:::

:::details server-auth — Authentication Module
Handles all authentication and authorization flows:

- **Login & Registration** — User credential validation, account creation
- **JWT Token Management** — Token generation, validation, and refresh using JJWT
- **Email Verification** — Sends verification codes via Resend email service
- **Spring Security Configuration** — Defines security rules, endpoint permissions, and filter chains

**Internal Dependencies:** server-common, server-user, server-version
:::

:::details server-user — User Management Module
Manages user accounts and profiles:

- **User CRUD** — Create, read, update, delete user accounts
- **Profile Management** — Avatar uploads (via server-upload), display name, preferences
- **Admin Role** — First-admin bootstrap, role assignment
- **Markdown Rendering** — Converts user bio/content from Markdown to HTML using CommonMark

**Internal Dependencies:** server-common, server-upload
:::

:::details server-agent — AI Assistant Module
Powers the mihtnelis AI agent:

- **Streaming Conversations** — Real-time AI responses via WebSocket using Spring AI OpenAI
- **Tool Orchestration** — Chains AI calls with external tools using LangChain4j
- **Speech Recognition** — Voice input processing via Tencent Cloud Speech SDK
- **Usage Billing** — Tracks API usage and manages billing through RabbitMQ

**Internal Dependencies:** server-common, server-user, server-weather, server-service-status
:::

:::details server-weather — Weather Module
Provides weather data services:

- **QWeather Proxy** — Proxies requests to the QWeather API, hiding API keys from the client
- **Redis Caching** — Caches weather responses to reduce external API calls
- **Pro-Tier Access** — Manages premium weather features based on user subscription

**Internal Dependencies:** None (standalone module)
:::

:::details server-payment — Payment Module
Handles financial transactions:

- **Alipay Integration** — Creates payment orders, generates QR codes, verifies callbacks
- **Order Management** — Tracks payment status, handles refunds
- **Email Notifications** — Sends payment confirmations via Resend
- **Async Processing** — Uses RabbitMQ for reliable payment callback handling

**Internal Dependencies:** server-common, server-user
:::

:::details server-version — Version Management Module
Manages application version information:

- **Version Metadata** — Stores version numbers, release dates, changelogs
- **Release History** — Tracks all published versions
- **Version Check API** — Serves version check requests from the desktop app for auto-update

**Internal Dependencies:** server-common
:::

:::details server-service-status — Service Status Module
Monitors backend service health:

- **Health Checks** — Tracks which API endpoints and services are operational
- **Status API** — Provides health status information to the desktop app
- **MyBatis Persistence** — Stores service status history in MySQL

**Internal Dependencies:** server-common
:::

:::details server-upload — File Upload Module
Handles file storage across multiple cloud providers:

- **Avatar Uploads** — Processes and stores user profile images
- **Multi-Cloud Support** — Alibaba Cloud OSS (mainland China), Tencent COS (alternative), Cloudflare R2 (global)
- **Apache HttpClient** — Manages HTTP connections to cloud storage APIs
- **RabbitMQ Integration** — Handles async upload processing and retry logic

**Internal Dependencies:** server-common
:::

:::details server-mini-game — Mini-Game Module
Powers the mini-game features:

- **High Score Submission** — Accepts and validates game score submissions
- **Leaderboard Queries** — Retrieves top scores with Redis caching for fast access
- **Reliable Persistence** — Uses RabbitMQ to ensure scores are eventually saved to MySQL, even if the database is temporarily unavailable

**Internal Dependencies:** server-common, server-user
:::

:::details server-app — Application Entry Point
The main module that ties everything together:

- **Module Aggregation** — Imports and wires all 9 business modules
- **Configuration** — Contains `application.yaml` and Spring Boot configuration
- **Embedded Tomcat** — Bundles the Tomcat web server (or connects to external Tomcat)
- **MySQL Driver** — Includes the MySQL Connector/J runtime driver
- **Environment Config** — Loads secrets from `.env` files via Spring DotEnv
- **Testing** — Includes test dependencies for integration and security tests

**Internal Dependencies:** All 9 business modules (server-auth, server-user, server-agent, server-weather, server-payment, server-version, server-service-status, server-upload, server-mini-game)
:::

## Build Tool

| Tool | What It Does |
|------|--------------|
| **Apache Maven** | The build tool that compiles Java source code, runs tests, and packages the application into a deployable WAR file. It also manages all external dependencies listed in this document. |

:::tip
Maven reads the `pom.xml` files to understand which dependencies each module needs. When a developer runs `mvn build`, Maven automatically downloads all required libraries from the Maven Central repository and manages version conflicts between modules.
:::
