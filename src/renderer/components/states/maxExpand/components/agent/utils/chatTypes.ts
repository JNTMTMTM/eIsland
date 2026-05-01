/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file chatTypes.ts
 * @description AI 对话 SSE 事件负载类型定义。
 * @author 鸡哥
 */

export interface ThinkEventPayload {
  text?: unknown;
  index?: unknown;
  done?: unknown;
}

export interface MetaEventPayload {
  thinkingEnabled?: unknown;
  reasoningEffort?: unknown;
}

export interface FinalEventPayload {
  traceId?: unknown;
  traceid?: unknown;
  trace_id?: unknown;
  billedInputTokens?: unknown;
  billedOutputTokens?: unknown;
  billedReasoningTokens?: unknown;
  billedTokenTotal?: unknown;
  tokenSource?: unknown;
}

export interface ToolEventPayload {
  turn?: unknown;
  tool?: unknown;
  arguments?: unknown;
  success?: unknown;
  error?: unknown;
  result?: unknown;
}

export interface ToolCallRequestPayload {
  turn?: unknown;
  requestId?: unknown;
  tool?: unknown;
  purpose?: unknown;
  arguments?: unknown;
  riskLevel?: unknown;
  authorizationRequired?: unknown;
  message?: unknown;
}

export interface ToolCallResultPayload {
  turn?: unknown;
  requestId?: unknown;
  tool?: unknown;
  success?: unknown;
  error?: unknown;
  result?: unknown;
  durationMs?: unknown;
}

export type AiLocalToolAccessPrompt = {
  sessionId: string;
  requestId: string;
  tool: string;
  purpose: string;
  argumentsPayload: Record<string, unknown>;
  riskLevel: string;
  message: string;
};
