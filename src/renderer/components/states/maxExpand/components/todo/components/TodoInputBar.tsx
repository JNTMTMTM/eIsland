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
 * @file TodoInputBar.tsx
 * @description Todo 输入栏组件：文本输入 + 优先级选择 + 大小选择 + 添加按钮。
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { PRIORITIES, SIZES } from '../config/todoConfig';
import type { TodoInputBarProps } from '../types/todoTypes';

/**
 * Todo 输入栏
 * @description 输入待办文本、选择优先级和大小、点击添加
 */
export function TodoInputBar({
  input, setInput, priority, setPriority, size, setSize,
  inputRef, onAdd, onKeyDown,
}: TodoInputBarProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="expand-todo-input-bar">
      <input
        ref={inputRef}
        className="expand-todo-input"
        type="text"
        placeholder={t('todo.addPlaceholder', { defaultValue: '添加待办...' })}
        aria-label={t('todo.addPlaceholder')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {/* 紧急程度选择 */}
      <div className="expand-todo-selector">
        {PRIORITIES.map(p => (
          <button
            key={p.value}
            className={`expand-todo-tag ${priority === p.value ? 'active' : ''}`}
            style={{ '--tag-color': p.color } as CSSProperties}
            onClick={() => setPriority(priority === p.value ? undefined : p.value)}
            aria-pressed={priority === p.value}
            title={t('todo.priorityTitle', { defaultValue: '紧急程度 {{label}}', label: p.label })}
          >
            {p.label}
          </button>
        ))}
      </div>
      {/* 大小选择 */}
      <div className="expand-todo-selector">
        {SIZES.map(s => (
          <button
            key={s.value}
            className={`expand-todo-tag size ${size === s.value ? 'active' : ''}`}
            style={{ '--tag-color': s.color } as CSSProperties}
            onClick={() => setSize(size === s.value ? undefined : s.value)}
            aria-pressed={size === s.value}
            title={t('todo.sizeTitle', { defaultValue: '事件大小 {{label}}', label: s.label })}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button className="expand-todo-add" disabled={!input.trim()} onClick={onAdd}>{t('todo.add')}</button>
    </div>
  );
}
