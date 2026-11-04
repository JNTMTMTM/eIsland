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
 * @file ClaudeCodeSessionSnapshot.ts
 * @description Claude Code 会话快照类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import type { ClaudeCodeHookEvent } from './ClaudeCodeHookEvent';

/** Claude Code 会话阶段 */
export type ClaudeCodeSessionPhase = 'idle' | 'running' | 'waiting_permission' | 'completed';

/** Claude Code 会话快照 */
export interface ClaudeCodeSessionSnapshot {
  /** 会话唯一标识 */
  id: string;
  /** 会话标题 */
  title: string;
  /** 会话阶段 */
  phase: ClaudeCodeSessionPhase;
  /** 工作目录 */
  cwd: string | null;
  /** 转录文件路径 */
  transcriptPath: string | null;
  /** 最近事件摘要 */
  lastSummary: string;
  /** 最后事件时间戳（毫秒） */
  lastEventAt: number;
  /** 待处理的授权请求 */
  pendingPermission: ClaudeCodeHookEvent | null;
  /** 会话事件列表 */
  events: ClaudeCodeHookEvent[];
}
