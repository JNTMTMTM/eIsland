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
 * @file TodoSubItem.tsx
 * @description 子待办条目组件：显示单条子任务的完成状态、文本、优先级、大小。
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { PRIORITIES, SIZES } from '../config/todoConfig';
import type { TodoSubItemProps } from '../types/todoTypes';

/**
 * 子待办条目
 * @description 显示单条子任务，支持切换完成和删除
 */
export function TodoSubItem({ sub, parentId, onToggleSubDone, onRemoveSubTodo }: TodoSubItemProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={`expand-todo-sub ${sub.done ? 'done' : ''}`}>
      <button
        className="expand-todo-sub-check"
        aria-pressed={sub.done}
        aria-label={sub.done ? t('todo.markUndone') : t('todo.markDone')}
        onClick={() => onToggleSubDone(parentId, sub.id)}
      >
        {sub.done ? '✓' : ''}
      </button>
      <span className="expand-todo-sub-text">{sub.text}</span>
      {sub.priority && (
        <span
          className="expand-todo-priority-badge"
          style={{ '--tag-color': PRIORITIES.find(p => p.value === sub.priority)?.color } as CSSProperties}
        >
          {sub.priority}
        </span>
      )}
      {sub.size && (
        <span
          className="expand-todo-size-badge"
          style={{ '--tag-color': SIZES.find(s => s.value === sub.size)?.color } as CSSProperties}
        >
          {sub.size}
        </span>
      )}
      <button
        className="expand-todo-sub-delete"
        onClick={() => onRemoveSubTodo(parentId, sub.id)}
      >
        {t('todo.delete')}
      </button>
    </div>
  );
}
