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
 * @file ClaudeCodeStatusService.ts
 * @description Claude Code 状态服务接口类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import type { ClaudeCodeStatusSnapshot } from './ClaudeCodeStatusSnapshot';

/** 授权决策：批准 / 永久批准 / 拒绝 */
export type PermissionDecision = 'allow' | 'always' | 'deny';

/** Claude Code 设置变更结果 */
export interface ClaudeSettingsMutationResult {
  /** 操作是否成功 */
  ok: boolean;
  /** 结果消息 */
  message: string;
  /** 更新后的状态快照 */
  snapshot: ClaudeCodeStatusSnapshot;
}

/** Claude Code 状态服务接口 */
export interface ClaudeCodeStatusService {
  /** 启动服务 */
  start: () => Promise<void>;
  /** 停止服务 */
  stop: () => void;
  /** 获取当前状态快照 */
  getSnapshot: () => ClaudeCodeStatusSnapshot;
  /** 安装 hook */
  installHook: () => Promise<ClaudeSettingsMutationResult>;
  /** 卸载 hook */
  uninstallHook: () => Promise<ClaudeSettingsMutationResult>;
  /** 清除事件 */
  clearEvents: () => ClaudeCodeStatusSnapshot;
  /** 删除会话 */
  deleteSessions: (sessionIds: string[]) => ClaudeCodeStatusSnapshot;
  /** 解决授权请求 */
  resolvePermission: (sessionId: string, decision: PermissionDecision) => ClaudeCodeStatusSnapshot;
}
