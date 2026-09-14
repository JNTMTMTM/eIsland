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
 * @file TodoItem.tsx
 * @description 待办条目组件：标题行 + 展开详情（描述编辑、子任务列表）。
 * @author 鸡哥
 */

import { useId, type CSSProperties, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { PRIORITIES, SIZES } from '../config/todoConfig';
import type { TodoItemProps } from '../types/todoTypes';
import { formatCreatedTime } from '../utils/todoUtils';
import { TodoSubItem } from './TodoSubItem';
import { TodoTitleInput } from './TodoTitleInput';
import { TodoScheduleEditor } from './TodoScheduleEditor';

/**
 * 待办条目
 * @description 显示单条待办的标题行，展开后可编辑描述和管理子任务
 */
export function TodoItem({
  todo, todos, isExpanded,
  subInput, setSubInput, subPriority, setSubPriority, subSize, setSubSize, subInputRef,
  onToggleDone, onRemove, onToggleExpand, onSaveTitle, onSaveSubTitle, onSaveDesc, onSetDueDate,
  onAddSubTodo, onToggleSubDone, onRemoveSubTodo,
}: TodoItemProps): ReactElement {
  const { t } = useTranslation();
  const detailId = useId();
  const subs = todo.subTodos ?? [];
  const subDone = subs.filter(s => s.done).length;

  return (
    <div className={`expand-todo-item ${todo.done ? 'done' : ''} ${isExpanded ? 'expanded' : ''}`}>
      {/* 标题行 */}
      <div className="expand-todo-row">
        <button
          className="expand-todo-check"
          onClick={(e) => { e.stopPropagation(); onToggleDone(todo.id); }}
          aria-pressed={todo.done}
          aria-label={todo.done
            ? t('todo.markUndone', { defaultValue: '标记未完成' })
            : t('todo.markDone', { defaultValue: '标记完成' })}
        >
          {todo.done ? '✓' : ''}
        </button>
        <div
          className="expand-todo-body"
          onClick={() => onToggleExpand(todo.id)}
        >
          <span className="expand-todo-summary">
            <TodoTitleInput
              className="expand-todo-text"
              text={todo.text}
              label={t('todo.editTitle')}
              onSave={(text) => onSaveTitle(todo.id, text)}
            />
            {todo.priority && (
              <span
                className="expand-todo-priority-badge"
                style={{ '--tag-color': PRIORITIES.find(p => p.value === todo.priority)?.color } as CSSProperties}
              >
                {todo.priority}
              </span>
            )}
            {todo.size && (
              <span
                className="expand-todo-size-badge"
                style={{ '--tag-color': SIZES.find(s => s.value === todo.size)?.color } as CSSProperties}
              >
                {todo.size}
              </span>
            )}
            {subs.length > 0 && (
              <span className="expand-todo-progress-wrap">
                <span className="expand-todo-progress-bar">
                  <span className="expand-todo-progress-fill" style={{ width: `${subs.length > 0 ? (subDone / subs.length) * 100 : 0}%` }} />
                </span>
                <span className="expand-todo-progress-label">{subDone}/{subs.length}</span>
              </span>
            )}
            {todo.dueDate && <span className="expand-todo-deadline-badge">{t('todo.deadline')} {todo.dueDate}</span>}
            <span className="expand-todo-time">{formatCreatedTime(todo.createdAt ?? todo.id)}</span>
          </span>
          {todo.description && (
            <span className="expand-todo-desc-preview" aria-hidden={isExpanded} title={todo.description}>{todo.description}</span>
          )}
        </div>
        <button
          className="expand-todo-expand"
          type="button"
          aria-expanded={isExpanded}
          aria-controls={detailId}
          onClick={() => onToggleExpand(todo.id)}
        >
          {isExpanded ? t('todo.collapse') : t('todo.expand')}
        </button>
        <button
          className="expand-todo-delete"
          onClick={(e) => { e.stopPropagation(); onRemove(todo.id); }}
          aria-label={t('todo.delete', { defaultValue: '删除' })}
        >
          {t('todo.delete')}
        </button>
      </div>

      {/* 保留详情节点以播放收起动画，折叠时禁用交互并释放共享输入框引用。 */}
      <div
        id={detailId}
        className="expand-todo-collapse"
        aria-hidden={!isExpanded}
        inert={!isExpanded}
      >
        <div className="expand-todo-collapse-inner">
          <div className="expand-todo-detail" onClick={(e) => e.stopPropagation()}>
            {/* 子待办列表 */}
            <div className="expand-todo-subs">
              {subs.length > 0 && (
                <div className="expand-todo-subs-header">{t('todo.subtasks')}</div>
              )}
              {subs.map(sub => (
                <TodoSubItem
                  key={sub.id}
                  sub={sub}
                  parentId={todo.id}
                  onToggleSubDone={onToggleSubDone}
                  onRemoveSubTodo={onRemoveSubTodo}
                  onSaveSubTitle={onSaveSubTitle}
                />
              ))}
              {/* 添加子待办 */}
              <div className="expand-todo-sub-add">
                <input
                  ref={isExpanded ? subInputRef : undefined}
                  className="expand-todo-sub-input"
                  type="text"
                  placeholder={t('todo.addSubPlaceholder', { defaultValue: '添加子任务...' })}
                  aria-label={t('todo.addSubPlaceholder')}
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); onAddSubTodo(todo.id); }
                  }}
                />
                <div className="expand-todo-selector">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      className={`expand-todo-tag ${subPriority === p.value ? 'active' : ''}`}
                      style={{ '--tag-color': p.color } as CSSProperties}
                      onClick={() => setSubPriority(subPriority === p.value ? undefined : p.value)}
                      aria-pressed={subPriority === p.value}
                      title={t('todo.priorityTitle', { label: p.label })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="expand-todo-selector">
                  {SIZES.map(s => (
                    <button
                      key={s.value}
                      className={`expand-todo-tag size ${subSize === s.value ? 'active' : ''}`}
                      style={{ '--tag-color': s.color } as CSSProperties}
                      onClick={() => setSubSize(subSize === s.value ? undefined : s.value)}
                      aria-pressed={subSize === s.value}
                      title={t('todo.sizeTitle', { label: s.label })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button className="expand-todo-sub-add-btn" disabled={!subInput.trim()} onClick={() => onAddSubTodo(todo.id)}>{t('todo.add')}</button>
              </div>
            </div>

            {/* 描述区域 */}
            <TodoScheduleEditor
              todo={todo}
              todos={todos}
              onSaveDesc={onSaveDesc}
              onSetDueDate={onSetDueDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
