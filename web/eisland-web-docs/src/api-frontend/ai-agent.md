---
title: AI & Agent
icon: robot
---

# AI & Agent

:::info
The AI & Agent API provides the eIsland AI assistant capabilities, including cloud-hosted agent chat, local Ollama integration, custom API direct chat, Claude Code monitoring, and Codex integration. All methods are exposed on `window.api` via the Electron preload bridge.
:::

## Agent Local Tools

### executeAgentLocalTool

Executes a local tool in the main process on behalf of the AI agent.

```ts
window.api.executeAgentLocalTool(request: ExecuteAgentLocalToolRequest): Promise<ExecuteAgentLocalToolResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `ExecuteAgentLocalToolRequest` | Tool name and arguments |

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<ExecuteAgentLocalToolResult>` | Tool execution result |

:::important
This is the bridge between the cloud-hosted AI agent and local system capabilities (e.g., taking screenshots, reading files, controlling volume). The main process routes the request to the appropriate local handler.
:::

## Ollama (Local LLM)

:::info
Ollama integration allows running local LLMs for privacy-sensitive or offline AI chat. Each chat session gets a unique session ID and a dedicated event channel.
:::

### ollamaPing

Checks if the Ollama server is reachable.

```ts
window.api.ollamaPing(): Promise<boolean>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<boolean>` | `true` if Ollama is running and reachable |

---

### ollamaModels

Lists available Ollama models.

```ts
window.api.ollamaModels(): Promise<string[]>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<string[]>` | Array of model names |

---

### ollamaDetectBaseUrl

Auto-detects the Ollama server base URL.

```ts
window.api.ollamaDetectBaseUrl(): Promise<string | null>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<string \| null>` | Detected base URL, or `null` if not found |

---

### ollamaChatStart

Starts a new Ollama chat session.

```ts
window.api.ollamaChatStart(request: OllamaChatRequest): Promise<ChatStartResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `OllamaChatRequest` | Model, messages, and options |

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<ChatStartResult>` | `{ sessionId: string }` |

---

### ollamaChatAbort

Aborts a running Ollama chat session.

```ts
window.api.ollamaChatAbort(sessionId: string): Promise<ChatAbortResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | `string` | Session ID from `ollamaChatStart` |

---

### onOllamaChatEvent

Listens for streaming events from an Ollama chat session.

```ts
window.api.onOllamaChatEvent(sessionId: string, callback: (event: ChatEvent) => void): () => void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | `string` | Session ID from `ollamaChatStart` |
| `callback` | `(event: ChatEvent) => void` | Called for each streaming event |

**Returns:** Unsubscribe function.

:::tip
Each session gets a dedicated IPC channel (`ollama:chat:event:{sessionId}`). Always unsubscribe in `useEffect` cleanup to prevent leaks.
:::

## Custom Direct API

:::info
Custom Direct allows connecting to any OpenAI-compatible API endpoint (e.g., DeepSeek, MiMo, MiniMax) without using the cloud agent gateway.
:::

### customDirectChatStart

Starts a new custom direct chat session.

```ts
window.api.customDirectChatStart(request: CustomDirectChatRequest): Promise<ChatStartResult>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `CustomDirectChatRequest` | API URL, key, model, messages, and options |

---

### customDirectChatAbort

Aborts a running custom direct chat session.

```ts
window.api.customDirectChatAbort(sessionId: string): Promise<ChatAbortResult>
```

---

### onCustomDirectChatEvent

Listens for streaming events from a custom direct chat session.

```ts
window.api.onCustomDirectChatEvent(sessionId: string, callback: (event: ChatEvent) => void): () => void
```

:::note
Custom Direct uses the same `ChatEvent` type as Ollama. The event channel pattern is `customDirect:chat:event:{sessionId}`.
:::

## Voice Input

| Getter | Setter | Type | Description |
|--------|--------|------|-------------|
| `agentVoiceInputHotkeyGet` | `agentVoiceInputHotkeySet` | `string` | Hotkey for voice input activation |

### onAgentVoiceInputState

Listens for voice input state changes.

```ts
window.api.onAgentVoiceInputState(callback: (state: string) => void): () => void
```

---

### onExternalAgentStarted

Listens for external agent session start events.

```ts
window.api.onExternalAgentStarted(callback: (data: ExternalAgentData) => void): () => void
```

---

### onExternalAgentStopped

Listens for external agent session stop events.

```ts
window.api.onExternalAgentStopped(callback: (data: ExternalAgentData) => void): () => void
```

## Claude Code Integration

:::important
Claude Code integration monitors CLI sessions running on the user's machine. It streams events (tool calls, permission requests, session lifecycle) to the renderer for display in the island's CLI state.
:::

### claudeCodeStatusGet

Returns the current Claude Code status snapshot.

```ts
window.api.claudeCodeStatusGet(): Promise<ClaudeCodeStatusSnapshot>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<ClaudeCodeStatusSnapshot>` | Active sessions, hook status, and recent events |

---

### claudeCodeHookInstall

Installs the Claude Code hook for event streaming.

```ts
window.api.claudeCodeHookInstall(): Promise<ClaudeCodeHookMutationResult>
```

**Returns:**

| Type | Description |
|------|-------------|
| `Promise<ClaudeCodeHookMutationResult>` | Success/failure status |

---

### claudeCodeHookUninstall

Removes the Claude Code hook.

```ts
window.api.claudeCodeHookUninstall(): Promise<ClaudeCodeHookMutationResult>
```

---

### claudeCodeEventsClear

Clears all stored Claude Code events.

```ts
window.api.claudeCodeEventsClear(): Promise<void>
```

---

### claudeCodeSessionsDelete

Deletes all stored Claude Code session data.

```ts
window.api.claudeCodeSessionsDelete(): Promise<void>
```

---

### claudeCodePermissionResolve

Resolves a pending permission request from Claude Code.

```ts
window.api.claudeCodePermissionResolve(
  sessionId: string,
  decision: 'allow' | 'always' | 'deny'
): Promise<void>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | `string` | Session ID with the pending permission |
| `decision` | `'allow' \| 'always' \| 'deny'` | User's permission decision |

:::warning
`'allow'` grants permission once; `'always'` grants it for all future requests in the session; `'deny'` rejects the tool call. The decision is irreversible.
:::

---

### onClaudeCodeStatusUpdated

Listens for Claude Code status changes.

```ts
window.api.onClaudeCodeStatusUpdated(callback: (snapshot: ClaudeCodeStatusSnapshot) => void): () => void
```

## Codex Integration

:::info
Codex integration provides the same monitoring capabilities as Claude Code, adapted for OpenAI's Codex CLI.
:::

### codexStatusGet

Returns the current Codex status snapshot.

```ts
window.api.codexStatusGet(): Promise<CodexStatusSnapshot>
```

---

### codexMonitorEnable

Enables Codex session monitoring.

```ts
window.api.codexMonitorEnable(): Promise<CodexMonitorMutationResult>
```

---

### codexMonitorDisable

Disables Codex session monitoring.

```ts
window.api.codexMonitorDisable(): Promise<CodexMonitorMutationResult>
```

---

### codexEventsClear

Clears all stored Codex events.

```ts
window.api.codexEventsClear(): Promise<void>
```

---

### codexSessionsDelete

Deletes all stored Codex session data.

```ts
window.api.codexSessionsDelete(): Promise<void>
```

---

### onCodexStatusUpdated

Listens for Codex status changes.

```ts
window.api.onCodexStatusUpdated(callback: (snapshot: CodexStatusSnapshot) => void): () => void
```

:::tip
Claude Code and Codex share the same type aliases (`ClaudeCodeStatusSnapshot` / `CodexStatusSnapshot`). The renderer uses a unified CLI state to display both providers.
:::
