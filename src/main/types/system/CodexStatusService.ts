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
 * @file CodexStatusService.ts
 * @description Codex CLI 本地会话监视服务接口。
 * @author 鸡哥
 */

import type { ClaudeCodeStatusSnapshot } from './ClaudeCodeStatusSnapshot';

/** Codex 监视开关操作结果 */
export interface CodexMonitorMutationResult {
  ok: boolean;
  message: string;
  snapshot: ClaudeCodeStatusSnapshot;
}

/** Codex CLI 状态服务接口 */
export interface CodexStatusService {
  start: () => Promise<void>;
  stop: () => void;
  getSnapshot: () => ClaudeCodeStatusSnapshot;
  enableMonitor: () => Promise<CodexMonitorMutationResult>;
  disableMonitor: () => Promise<CodexMonitorMutationResult>;
  clearEvents: () => ClaudeCodeStatusSnapshot;
  deleteSessions: (sessionIds: string[]) => ClaudeCodeStatusSnapshot;
}