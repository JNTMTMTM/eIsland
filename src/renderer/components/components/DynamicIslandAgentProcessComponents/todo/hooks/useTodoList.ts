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
 * @file useTodoList.ts
 * @description TodoList 组件的状态管理 hook
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import type { AgentTodoItem, UseTodoListReturn } from '../types/todoTypes';

/**
 * 管理 TodoList 的折叠状态和进度计算。
 * @param items - 当前任务列表。
 * @returns 折叠状态、进度信息和切换函数。
 */
export function useTodoList(items: AgentTodoItem[]): UseTodoListReturn {
  const completedCount = items.reduce((count, item) => count + (item.status === 'completed' ? 1 : 0), 0);
  const allCompleted = items.length > 0 && completedCount === items.length;
  const hasStarted = items.some((item) => item.status !== 'pending');
  const progress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);

  const [collapsed, setCollapsed] = useState(allCompleted);
  const prevItemCountRef = useRef(items.length);

  /** 全部完成时自动折叠 */
  useEffect(() => {
    if (allCompleted) setCollapsed(true);
  }, [allCompleted]);

  /** 新增未完成项时自动展开 */
  useEffect(() => {
    if (items.length > prevItemCountRef.current && !allCompleted) {
      setCollapsed(false);
    }
    prevItemCountRef.current = items.length;
  }, [items.length, allCompleted]);

  const toggle = (): void => {
    setCollapsed((current) => !current);
  };

  return { collapsed, completedCount, allCompleted, hasStarted, progress, toggle };
}
