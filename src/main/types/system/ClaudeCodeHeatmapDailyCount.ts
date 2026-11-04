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
 * @file ClaudeCodeHeatmapDailyCount.ts
 * @description Claude Code 热力图每日计数类型定义
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

/** 单日热力图计数：按指标分别统计 */
export interface ClaudeCodeHeatmapDailyCount {
  /** 会话数 */
  session: number;
  /** 工具调用数 */
  tool: number;
  /** 提示词数 */
  prompt: number;
}

/** 热力图按天累计计数，键为 `年-月-日`（月、日均不补零，与渲染层一致） */
export type ClaudeCodeHeatmapDaily = Record<string, ClaudeCodeHeatmapDailyCount>;
