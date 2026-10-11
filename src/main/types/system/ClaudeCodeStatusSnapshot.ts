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
 * @file ClaudeCodeStatusSnapshot.ts
 * @description Claude Code 状态快照类型定义
 * @author 鸡哥
 */

import type { ClaudeCodeHookEvent } from './ClaudeCodeHookEvent';
import type { ClaudeCodeSessionSnapshot } from './ClaudeCodeSessionSnapshot';
import type { ClaudeCodeHeatmapDaily } from './ClaudeCodeHeatmapDailyCount';

/** Claude Code 状态快照 */
export interface ClaudeCodeStatusSnapshot {
  /** 增量订阅版本，缺口时重新获取摘要。 */
  revision?: number;
  /** 是否启用 */
  enabled: boolean;
  /** 接收器是否运行中 */
  receiverRunning: boolean;
  /** 接收器 URL */
  receiverUrl: string | null;
  /** 设置文件路径 */
  settingsPath: string;
  /** hook 脚本路径 */
  hookScriptPath: string;
  /** 会话列表 */
  sessions: ClaudeCodeSessionSnapshot[];
  /** 事件列表 */
  events: ClaudeCodeHookEvent[];
  /** 热力图数据 */
  heatmap: ClaudeCodeHeatmapDaily;
  /** 更新时间戳（毫秒） */
  updatedAt: number;
}
