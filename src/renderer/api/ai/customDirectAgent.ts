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
 * @file customDirectAgent.ts
 * @description 自定义 API 直连 Agent 渲染进程客户端，复用 ollama 提示词路径 + IPC 编排 + 事件桥接。
 * @author 鸡哥
 */

import { fetchAgentPrompt } from './mihtnelisAgentStream';
import type { MihtnelisAgentStreamEventType } from './types/MihtnelisAgentStreamEvent';
import type { CustomDirectAgentRequest } from './types/CustomDirectAgentRequest';

export type { CustomDirectAgentRequest };

let cachedSystemPrompt: string | null = null;
let cachedPromptKey = '';

function buildPromptCacheKey(
  agentMode: string,
  snapshotMode: boolean,
  workspaces: string[],
  skillNames: string[],
): string {
  return `${agentMode}|${snapshotMode}|${workspaces.sort().join(',')}|${skillNames.sort().join(',')}`;
}

/**
 * 从服务端获取系统提示词（带缓存），复用 ollama 的提示词路径。
 */
async function resolveSystemPrompt(request: CustomDirectAgentRequest): Promise<string> {
  const agentMode = request.agentMode || 'mihtnelis';
  const snapshotMode = request.snapshotMode === true;
  const workspaces = Array.isArray(request.workspaces) ? request.workspaces : [];
  const skillNames = Array.isArray(request.skills) ? request.skills.map((s) => s.name) : [];
  const key = buildPromptCacheKey(agentMode, snapshotMode, workspaces, skillNames);

  if (cachedSystemPrompt && cachedPromptKey === key) {
    return cachedSystemPrompt;
  }

  const resp = await fetchAgentPrompt({
    token: request.token,
    agentMode,
    snapshotMode,
    localMode: true,
    workspaces: workspaces.length > 0 ? workspaces : undefined,
    skills: Array.isArray(request.skills) && request.skills.length > 0 ? request.skills : undefined,
  });

  cachedSystemPrompt = resp.systemPrompt;
  cachedPromptKey = key;
  return resp.systemPrompt;
}

/** 清除缓存的系统提示词（设置变更时调用）。 */
export function clearCustomDirectPromptCache(): void {
  cachedSystemPrompt = null;
  cachedPromptKey = '';
}

/**
 * 启动自定义 API 直连 Agent 会话。
 * 事件通过 onEvent 回调推送，格式与 MihtnelisAgentStreamEvent 兼容。
 */
export async function streamCustomDirectAgent(request: CustomDirectAgentRequest): Promise<void> {
  const token = request.token?.trim();
  if (!token) {
    throw new Error('未登录，无法启动直连 Agent');
  }
  const message = request.message?.trim();
  if (!message) {
    throw new Error('message 不能为空');
  }
  if (!request.baseUrl?.trim() || !request.apiKey?.trim()) {
    throw new Error('自定义 API 端点和密钥不能为空');
  }

  // 1. 获取系统提示词
  let systemPrompt: string;
  try {
    systemPrompt = await resolveSystemPrompt(request);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    request.onEvent?.({
      type: 'error',
      payload: { code: 'PROMPT_FETCH_FAILED', message: `获取系统提示词失败: ${errMsg}` },
    });
    return;
  }

  // 2. 生成会话 ID
  const sessionId = `custom-direct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // 3. 创建完成 Promise
  let resolveCompletion!: () => void;
  const completionPromise = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });

  // 4. 注册事件监听
  const unsubscribe = window.api.onCustomDirectChatEvent(sessionId, (event) => {
    const type = event.type as MihtnelisAgentStreamEventType;
    const payload = event.payload as Record<string, unknown>;

    if (type === 'chunk') {
      request.onEvent?.({ type: 'chunk', payload: { text: payload.text } });
      return;
    }
    if (type === 'tool_call_request') {
      request.onEvent?.({ type: 'tool_call_request', payload });
      return;
    }
    if (type === 'tool_call_result') {
      request.onEvent?.({ type: 'tool_call_result', payload });
      return;
    }
    if (type === 'think') {
      request.onEvent?.({ type: 'think', payload });
      return;
    }
    if ((type as string) === 'stream_rollback') {
      request.onEvent?.({ type: 'stream_rollback' as MihtnelisAgentStreamEventType, payload });
      return;
    }
    if (type === 'meta') {
      request.onEvent?.({
        type: 'meta',
        payload: { ...payload, thinkingEnabled: Boolean(payload.thinkingEnabled) },
      });
      return;
    }
    if (type === 'final') {
      request.onEvent?.({ type: 'final', payload });
      unsubscribe();
      resolveCompletion();
      return;
    }
    if (type === 'error') {
      request.onEvent?.({ type: 'error', payload });
      unsubscribe();
      resolveCompletion();
      return;
    }

    // 透传其他事件
    request.onEvent?.({ type, payload });
  });

  // 5. 处理中止
  if (request.signal) {
    request.signal.addEventListener(
      'abort',
      () => {
        void window.api.customDirectChatAbort(sessionId).catch(() => undefined);
        unsubscribe();
        resolveCompletion();
      },
      { once: true },
    );
  }

  // 6. 启动编排
  try {
    await window.api.customDirectChatStart(sessionId, {
      token,
      model: request.model,
      systemPrompt,
      userMessage: message,
      context: request.context,
      baseUrl: request.baseUrl,
      apiKey: request.apiKey,
      temperature: request.temperature,
    });
  } catch (err) {
    unsubscribe();
    const errMsg = err instanceof Error ? err.message : String(err);
    request.onEvent?.({
      type: 'error',
      payload: { code: 'IPC_START_FAILED', message: `启动直连 Agent 失败: ${errMsg}` },
    });
    resolveCompletion();
    return;
  }

  // 7. 等待编排完成
  await completionPromise;
}
