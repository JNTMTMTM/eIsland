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
 * @file sessionUtils.ts
 * @description AI 对话会话状态推断工具函数。
 * @author 鸡哥
 */

import type { AiChatSession, AiWebAccessPrompt } from '../../../../../../store/types';
import type { AiLocalToolAccessPrompt, SessionCardState } from '../types/chatTypes';

export type { SessionCardState } from '../types/chatTypes';

/**
 * 根据已定位的会话、流状态和工具授权推断卡片状态，避免逐卡扫描会话列表。
 * @param params - 会话及运行、授权状态。
 * @returns 卡片显示状态。
 */
export function resolveSessionCardState(params: {
  sessionId: string;
  streamingSessionIds: ReadonlySet<string>;
  webAccessPrompt: AiWebAccessPrompt | null;
  localToolAccessPrompt: AiLocalToolAccessPrompt | null;
  session: AiChatSession | undefined;
}): SessionCardState {
  const {
    sessionId,
    streamingSessionIds,
    webAccessPrompt,
    localToolAccessPrompt,
    session,
  } = params;

  if (streamingSessionIds.has(sessionId)) {
    return 'running';
  }
  if (webAccessPrompt?.sessionId === sessionId || localToolAccessPrompt?.sessionId === sessionId) {
    return 'awaiting';
  }

  if (session?.messagesLoaded === false) return session.replyStatus ?? 'idle';
  if (!session || !Array.isArray(session.messages) || session.messages.length === 0) {
    return 'idle';
  }

  // 通常最后一条就是助手消息；从尾部查找，避免复制整段长历史。
  let lastAssistant: AiChatSession['messages'][number] | undefined;
  for (let index = session.messages.length - 1; index >= 0; index--) {
    if (session.messages[index].role === 'assistant') {
      lastAssistant = session.messages[index];
      break;
    }
  }
  if (!lastAssistant) {
    return 'idle';
  }

  const text = typeof lastAssistant.content === 'string' ? lastAssistant.content.trim() : '';
  if (text.startsWith('❌')) {
    return 'failed';
  }
  if (lastAssistant.finalized || text.length > 0) {
    return 'success';
  }
  return 'idle';
}
