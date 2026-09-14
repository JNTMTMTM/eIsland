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
 * @file TodoHeader.tsx
 * @description Todo 标题栏组件：显示标题与统计数据。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TodoHeaderProps } from '../types/todoTypes';

/**
 * Todo 标题栏
 * @description 显示标题、完成数、未完成数、各优先级数量
 */
export function TodoHeader({ doneCount, undoneCount, p0Count, p1Count, p2Count }: TodoHeaderProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="expand-todo-header">
      <span className="expand-todo-title">{t('todo.title', { defaultValue: '待办事项' })}</span>
      <div className="expand-todo-stats">
        <span className="expand-todo-stat">{t('todo.doneCount', { count: doneCount })}</span>
        <span className="expand-todo-stat">{t('todo.undoneCount', { count: undoneCount })}</span>
        {p0Count > 0 && <span className="expand-todo-stat p0">P0 {p0Count}</span>}
        {p1Count > 0 && <span className="expand-todo-stat p1">P1 {p1Count}</span>}
        {p2Count > 0 && <span className="expand-todo-stat p2">P2 {p2Count}</span>}
      </div>
    </div>
  );
}
