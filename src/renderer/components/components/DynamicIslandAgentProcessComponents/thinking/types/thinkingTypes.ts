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
 * @file thinkingTypes.ts
 * @description thinking 模块类型定义
 * @author 鸡哥
 */

/** ThinkingReasoning 组件入参 */
export interface ThinkingReasoningProps {
  /** 当前思考过程文本 */
  content: string;
  /** 是否仍在接收思考内容 */
  isThinking: boolean;
  /** 已持久化的思考耗时（重启后恢复用） */
  persistedDuration?: number | null;
  /** 思考结束时回调，用于持久化耗时 */
  onDurationComputed?: (seconds: number) => void;
}

/** useThinkingReasoning hook 入参选项 */
export interface UseThinkingReasoningOptions {
  /** 已持久化的思考耗时（重启后恢复用） */
  persistedDuration?: number | null;
  /** 思考结束时回调，用于持久化耗时 */
  onDurationComputed?: (seconds: number) => void;
}

/** useThinkingReasoning hook 返回值类型 */
export interface UseThinkingReasoningReturn {
  /** 是否展开 */
  expanded: boolean;
  /** 当前 open 状态 */
  open: boolean;
  /** 已耗时秒数 */
  elapsedSeconds: number | null;
  /** 视口 ref */
  viewportRef: React.RefObject<HTMLDivElement | null>;
  /** 切换展开/折叠 */
  toggle: () => void;
}
