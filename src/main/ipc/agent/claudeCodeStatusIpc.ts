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
 * @file claudeCodeStatusIpc.ts
 * @description Claude Code CLI 状态面板 IPC 处理模块。
 * @author 鸡哥
 */

import { getCliEventDetail } from './cliEventDetail';
import { ipcMain } from 'electron';
import type { ClaudeCodeStatusService, PermissionDecision } from '../../system/claudeCodeStatusService';

interface RegisterClaudeCodeStatusIpcHandlersOptions {
  service: ClaudeCodeStatusService;
}

/**
 * 注册 Claude Code 状态相关的 IPC 处理器
 * @param options - 注册参数，包含状态服务实例
 * @returns void
 */
export function registerClaudeCodeStatusIpcHandlers(options: RegisterClaudeCodeStatusIpcHandlersOptions): void {
  ipcMain.handle('claude-code:event:detail', (_event, id: string, offset?: number) => getCliEventDetail(options.service.getSnapshot(), id, offset));
  ipcMain.handle('claude-code:status:get', () => options.service.getSnapshot());
  ipcMain.handle('claude-code:hook:install', () => options.service.installHook());
  ipcMain.handle('claude-code:hook:uninstall', () => options.service.uninstallHook());
  ipcMain.handle('claude-code:events:clear', () => options.service.clearEvents());
  ipcMain.handle('claude-code:sessions:delete', (_event, sessionIds: string[]) => options.service.deleteSessions(sessionIds));
  ipcMain.handle('claude-code:permission:resolve', (_event, sessionId: string, decision: PermissionDecision) => options.service.resolvePermission(sessionId, decision));
}