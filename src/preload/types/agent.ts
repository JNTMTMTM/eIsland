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
 * @file agent.ts
 * @description AI Agent 与聊天会话相关类型定义
 * @author 鸡哥
 */

/** Agent 本地工具执行请求 */
export interface ExecuteAgentLocalToolRequest {
  requestId?: string;
  tool: string;
  arguments?: Record<string, unknown>;
  workspaces?: string[];
}

/** Agent 本地工具执行结果 */
export interface ExecuteAgentLocalToolResult {
  success: boolean;
  result: unknown;
  error: string;
  durationMs: number;
}

/** Ollama 聊天请求 */
export interface OllamaChatRequest {
  /** eIsland 登录凭据，仅供主进程访问搜索接口。 */
  token?: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  context?: string;
  baseUrl?: string;
  temperature?: number;
}

/** 自定义直连聊天请求 */
export interface CustomDirectChatRequest {
  /** eIsland 登录凭据，与模型供应商的 apiKey 分开。 */
  token?: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  context?: string;
  baseUrl: string;
  apiKey: string;
  temperature?: number;
}

/** 聊天会话事件 */
export interface ChatEvent {
  type: string;
  payload: Record<string, unknown>;
}

/** 聊天会话启动结果 */
export interface ChatStartResult {
  started: boolean;
  sessionId: string;
}

/** 聊天会话中止结果 */
export interface ChatAbortResult {
  aborted: boolean;
}
