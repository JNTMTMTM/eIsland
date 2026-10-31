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
 * @file cliUtils.test.ts
 * @description CLI 状态活跃会话选取、图标选择与待授权命令解析测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { GifIcon } from '../../../../../utils/GifIcon/gif-icon';
import { AgentIcon } from '../../../../../utils/SvgIcon';
import { extractPermissionCommand, resolveStateIcon, selectActiveSession } from '../cliUtils';
import type { CliHookEvent, CliSessionSnapshot } from '../../../maxExpand/components/cli/types/types';

const session = (overrides: Partial<CliSessionSnapshot>): CliSessionSnapshot => ({
  id: 's', title: 'S', phase: 'running', lastEventAt: 0, pendingPermission: null, ...overrides,
} as CliSessionSnapshot);
const event = (overrides: Partial<CliHookEvent>): CliHookEvent => ({ sessionId: 's', kind: 'message', ...overrides } as CliHookEvent);

describe('cliUtils', () => {
  it('选取最近活跃的未完成会话及其事件，无活跃会话时回退全局最新事件', () => {
    const latest = session({ id: 'b', lastEventAt: 2 });
    const tool = event({ sessionId: 'b', kind: 'tool' });
    expect(selectActiveSession({ sessions: [session({ id: 'a', lastEventAt: 1 }), latest, session({ id: 'c', phase: 'completed', lastEventAt: 3 })], events: [event({ sessionId: 'a' }), tool] }))
      .toEqual({ activeSession: latest, latestEvent: tool });
    const global = event({ sessionId: 'x' });
    expect(selectActiveSession({ sessions: [], events: [global] })).toEqual({ activeSession: null, latestEvent: global });
    expect(selectActiveSession({ sessions: [latest], events: [global] }).latestEvent).toBeNull();
  });

  it('Codex 固定品牌图标，Claude 按会话阶段与事件类型切换 GIF', () => {
    expect(resolveStateIcon('codex', null, null)).toBe(AgentIcon.CODEX);
    expect(resolveStateIcon('claude', null, null)).toBe(GifIcon.CLAWD_IDLE);
    expect(resolveStateIcon('claude', session({ phase: 'idle' }), null)).toBe(GifIcon.CLAWD_IDLE);
    expect(resolveStateIcon('claude', session({ phase: 'waiting_permission' }), null)).toBe(GifIcon.CLAWD_REVIEW);
    expect(resolveStateIcon('claude', session({}), event({ kind: 'tool' }))).toBe(GifIcon.CLAWD_WAVING);
    expect(resolveStateIcon('claude', session({}), event({}))).toBe(GifIcon.CLAWD_WAITING);
  });

  it('仅等待授权且有命令或描述时解析待授权命令，兼容三种输入字段', () => {
    const waiting = (raw: Record<string, unknown>, toolName?: string) => session({ phase: 'waiting_permission', pendingPermission: event({ raw, toolName }) });
    expect(extractPermissionCommand(null)).toBeNull();
    expect(extractPermissionCommand(session({}))).toBeNull();
    expect(extractPermissionCommand(waiting({}))).toBeNull();
    expect(extractPermissionCommand(waiting({ tool_input: { command: 1 } }))).toBeNull();
    expect(extractPermissionCommand(waiting({ tool_input: { command: 'ls' } }, 'Bash'))).toEqual({ command: 'ls', description: '', toolName: 'Bash' });
    expect(extractPermissionCommand(waiting({ toolInput: { description: 'Read' } }))).toEqual({ command: '', description: 'Read', toolName: '' });
    expect(extractPermissionCommand(waiting({ input: { command: 'pwd', description: 'Where' } }))?.command).toBe('pwd');
  });
});
