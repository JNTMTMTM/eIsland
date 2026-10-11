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
 * @file ClaudeCodeHookEvent.ts
 * @description Claude Code hook 事件类型定义
 * @author 鸡哥
 */

import type { ClaudeCodeHookEventDetailItem } from './ClaudeCodeHookEventDetailItem';

/** Claude Code hook 事件类型 */
export type ClaudeCodeHookEventKind = 'session' | 'message' | 'tool' | 'permission' | 'notification' | 'completed' | 'unknown';

/** Claude Code hook 事件 */
export interface ClaudeCodeHookEvent {
  /** 事件唯一标识 */
  id: string;
  /** 事件名称 */
  eventName: string;
  /** 事件类型 */
  kind: ClaudeCodeHookEventKind;
  /** 会话 ID */
  sessionId: string;
  /** 工作目录 */
  cwd: string | null;
  /** 转录文件路径 */
  transcriptPath: string | null;
  /** 事件摘要 */
  summary: string;
  /** 事件详情 */
  detail: string | null;
  /** 事件详情项列表 */
  detailItems: ClaudeCodeHookEventDetailItem[];
  /** 按需详情提供者；快照只包含短预览。 */
  detailProvider?: 'claude' | 'codex';
  /** 同一事件的外部正文发生回填时递增，避免展开页保留旧正文。 */
  detailRevision?: number;
  /** Codex 原始日志中的字节范围。 */
  detailSource?: { offset: number; bytes: number };
  /** 工具名称（仅 tool 类型事件） */
  toolName: string | null;
  /** 工具输入预览（仅 tool 类型事件） */
  toolInputPreview: string | null;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 原始事件数据 */
  raw: Record<string, unknown>;
}
