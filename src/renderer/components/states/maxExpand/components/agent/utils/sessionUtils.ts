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
import type { AiLocalToolAccessPrompt } from './chatTypes';

export type SessionCardState = 'idle' | 'running' | 'awaiting' | 'success' | 'failed';

/** 根据会话、流状态、工具授权等信息推断会话卡片的显示状态。 */
export function resolveSessionCardState(params: {
  sessionId: string;
  streamingSessionIds: ReadonlySet<string>;
  webAccessPrompt: AiWebAccessPrompt | null;
  localToolAccessPrompt: AiLocalToolAccessPrompt | null;
  sessions: AiChatSession[];
}): SessionCardState {
  const {
    sessionId,
    streamingSessionIds,
    webAccessPrompt,
    localToolAccessPrompt,
    sessions,
  } = params;

  if (streamingSessionIds.has(sessionId)) {
    return 'running';
  }
  if (webAccessPrompt?.sessionId === sessionId || localToolAccessPrompt?.sessionId === sessionId) {
    return 'awaiting';
  }

  const session = sessions.find((item) => item.id === sessionId);
  if (!session || !Array.isArray(session.messages) || session.messages.length === 0) {
    return 'idle';
  }

  const lastAssistant = [...session.messages].reverse().find((message) => message.role === 'assistant');
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
