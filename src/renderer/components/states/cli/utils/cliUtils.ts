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
 * @file cliUtils.ts
 * @description CLI 状态的活跃会话选取、左侧图标选择与待授权命令解析。
 * @author 鸡哥
 */

import { GifIcon } from '../../../../utils/GifIcon/gif-icon';
import { AgentIcon } from '../../../../utils/SvgIcon';
import type { CliProvider } from '../../../../store/types';
import type { CliHookEvent, CliSessionSnapshot, CliStatusSnapshot } from '../../maxExpand/components/cli/types/types';
import type { CliActiveSelection, CliPermissionCommand } from '../types/cliTypes';

/**
 * 选取最近活跃的未完成会话及其最新流事件；没有活跃会话时取全局最新事件。
 * @param snapshot - CLI 状态快照
 * @returns 活跃会话与最新事件
 */
export function selectActiveSession(snapshot: Pick<CliStatusSnapshot, 'sessions' | 'events'>): CliActiveSelection {
  const active = snapshot.sessions
    .filter((session) => session.phase !== 'completed')
    .sort((a, b) => b.lastEventAt - a.lastEventAt);
  const session = active[0] ?? null;
  const event = session
    ? snapshot.events.find((item) => item.sessionId === session.id) ?? null
    : snapshot.events[0] ?? null;
  return { activeSession: session, latestEvent: event };
}

/**
 * 选择左侧图标：Codex 固定品牌图标；Claude 按会话状态切换 GIF——空闲、等待授权 review、调用工具挥手、运行中等待。
 * @param provider - CLI 提供方
 * @param activeSession - 活跃会话
 * @param latestEvent - 最新流事件
 * @returns 图标地址
 */
export function resolveStateIcon(
  provider: CliProvider,
  activeSession: CliSessionSnapshot | null,
  latestEvent: CliHookEvent | null,
): string {
  if (provider === 'codex') return AgentIcon.CODEX;
  if (!activeSession || activeSession.phase === 'idle') return GifIcon.CLAWD_IDLE;
  if (activeSession.phase === 'waiting_permission') return GifIcon.CLAWD_REVIEW;
  if (latestEvent?.kind === 'tool') return GifIcon.CLAWD_WAVING;
  return GifIcon.CLAWD_WAITING;
}

/**
 * 等待授权时，从待授权事件的 tool_input 中取出 command 与 description。
 * @param activeSession - 活跃会话
 * @returns 待授权命令，非等待授权或无可展示内容时为 null
 */
export function extractPermissionCommand(activeSession: CliSessionSnapshot | null): CliPermissionCommand | null {
  if (!activeSession || activeSession.phase !== 'waiting_permission') return null;
  const raw = activeSession.pendingPermission?.raw as Record<string, unknown> | undefined;
  const toolInput = (raw?.tool_input ?? raw?.toolInput ?? raw?.input) as Record<string, unknown> | undefined;
  if (!toolInput) return null;
  const command = typeof toolInput.command === 'string' ? toolInput.command : '';
  const description = typeof toolInput.description === 'string' ? toolInput.description : '';
  if (!command && !description) return null;
  return { command, description, toolName: activeSession.pendingPermission?.toolName ?? '' };
}
