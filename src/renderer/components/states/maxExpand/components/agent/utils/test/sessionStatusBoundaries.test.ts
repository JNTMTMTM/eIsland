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
 * @file sessionStatusBoundaries.test.ts
 * @description 真实聊天会话卡片授权优先级、错误回复及空会话状态边界测试。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { resolveSessionCardState } from '../sessionUtils';
import type { AiChatMessage } from '../../../../../../../store/types';
type Params = Parameters<typeof resolveSessionCardState>[0];
/** 构造真实公开工具参数。
 * @param patch - 会话状态
 * @returns 状态参数
 */
function params(patch: Partial<Params> = {}): Params {
  return {
    sessionId: 'target',
    streamingSessionIds: new Set<string>(),
    webAccessPrompt: null,
    localToolAccessPrompt: null,
    sessions: [],
    ...patch
  };
}
/** 构造普通会话消息输入。
 * @param messages - 按时间排列的消息
 * @returns 会话
 */
function session(messages: AiChatMessage[]) {
  return {
    messages,
    id: 'target',
    title: 'title',
    updatedAt: 1
  };
}
describe('session status real public data', () => {
  it.each(['web', 'local'] as const)('%s authorization waits only for the matching session', (kind) => {
    const web = {
      sessionId: 'target',
      requestId: 'r',
      url: 'https://example.invalid',
      hostname: 'example.invalid',
      siteName: 'site',
      iconUrl: '',
      message: 'ask',
      domainPolicy: 'ask' as const
    };
    const local = {
      sessionId: 'target',
      requestId: 'r',
      tool: 'file.delete',
      purpose: 'delete',
      argumentsPayload: {},
      riskLevel: 'high',
      message: 'ask'
    };
    const input = params(kind === 'web' ? {
      webAccessPrompt: web
    } : {
      localToolAccessPrompt: local
    });
    expect(resolveSessionCardState(input)).toBe('awaiting');
    expect(resolveSessionCardState({
      ...input,
      sessionId: 'other'
    })).toBe('idle');
    expect(resolveSessionCardState({
      ...input,
      streamingSessionIds: new Set(['target'])
    })).toBe('running');
  });
  it.each([['❌ failed', 'failed'], ['answer', 'success'], ['  ', 'idle']] as const)('latest assistant %s produces %s', (content, status) => {
    expect(resolveSessionCardState(params({
      sessions: [session([{
        role: 'assistant',
        content: '❌ previous'
      }, {
        role: 'user',
        content: 'query'
      }, {
        content,
        role: 'assistant'
      }])]
    }))).toBe(status);
  });
  it('finished empty assistant is successful while user-only and empty conversations idle', () => {
    expect(resolveSessionCardState(params({
      sessions: [session([{
        role: 'assistant',
        content: '',
        finalized: true
      }])]
    }))).toBe('success');
    expect(resolveSessionCardState(params({
      sessions: [session([{
        role: 'user',
        content: 'query'
      }])]
    }))).toBe('idle');
    expect(resolveSessionCardState(params({
      sessions: [session([])]
    }))).toBe('idle');
  });
});
