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
 */

/**
 * @file codexStatusIpc.ts
 * @description Codex CLI 状态监视 IPC 处理模块。
 * @author 鸡哥
 */

import { ipcMain } from 'electron';
import type { CodexStatusService } from '../../types/system/CodexStatusService';

/**
 * 注册 Codex 状态相关 IPC 处理器
 * @param service - Codex 状态服务实例
 */
export function registerCodexStatusIpcHandlers(service: CodexStatusService): void {
  ipcMain.handle('codex:status:get', () => service.getSnapshot());
  ipcMain.handle('codex:monitor:enable', () => service.enableMonitor());
  ipcMain.handle('codex:monitor:disable', () => service.disableMonitor());
  ipcMain.handle('codex:events:clear', () => service.clearEvents());
  ipcMain.handle('codex:sessions:delete', (_event, sessionIds: string[]) => service.deleteSessions(sessionIds));
}