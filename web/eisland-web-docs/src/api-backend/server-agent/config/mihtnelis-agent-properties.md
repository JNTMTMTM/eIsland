---
title: Mihtnelis Agent Properties
---

# Mihtnelis Agent Properties

:::info
LLM provider settings and agent configuration properties.
:::

## Configuration Properties

| Property | Description | Default |
|---|---|---|
| mihtnelis.agent.default-provider | Default LLM provider | deepseek |
| mihtnelis.agent.max-input-chars | Maximum input characters | 100000 |
| mihtnelis.agent.allowed-providers | Allowed provider list | all |

## Provider Configuration

### DeepSeek

| Property | Description |
|---|---|
| mihtnelis.agent.llm.deepseek.base-url | API base URL |
| mihtnelis.agent.llm.deepseek.api-key | API key |
| mihtnelis.agent.llm.deepseek.model | Model name |
| mihtnelis.agent.llm.deepseek.enabled | Enable provider |
| mihtnelis.agent.llm.deepseek.thinking | Enable thinking mode |
| mihtnelis.agent.llm.deepseek.reasoning-effort | Reasoning effort level |

:::tip
Provider configuration supports custom API credentials for Pro users.
:::
