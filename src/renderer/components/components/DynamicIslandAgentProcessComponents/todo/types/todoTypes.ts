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
 * @file todoTypes.ts
 * @description Agent 任务清单组件的数据类型。
 * @author 鸡哥
 */

/** Agent 任务清单中的单个任务。 */
export interface AgentTodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

/** TodoList 组件 Props */
export interface TodoListProps {
  /** 当前任务列表 */
  items: AgentTodoItem[];
  /** 所属 turn 编号（可选，用于时间线上下文） */
  turn?: number;
}

/** useTodoList hook 返回值类型 */
export interface UseTodoListReturn {
  /** 是否折叠 */
  collapsed: boolean;
  /** 已完成数量 */
  completedCount: number;
  /** 是否全部完成 */
  allCompleted: boolean;
  /** 是否已开始（有非 pending 项） */
  hasStarted: boolean;
  /** 完成进度百分比 */
  progress: number;
  /** 切换折叠/展开 */
  toggle: () => void;
}