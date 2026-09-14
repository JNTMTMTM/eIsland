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
 * @file TodoScheduleEditor.tsx
 * @description 任务截止日期月历、跨周周期条与常驻描述编辑区。
 * @author 鸡哥
 */

import { useState, type CSSProperties, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TodoItem } from '../types/todoTypes';
import { formatTodoDate, getTodoColor, getTodoMonthWeeks, getTodoStartDate, getTodoWeekSegment, parseTodoDate } from '../utils/todoCalendarUtils';

/** 日程与描述编辑回调。 */
interface TodoScheduleEditorProps {
  todo: TodoItem;
  todos: TodoItem[];
  onSaveDesc: (id: number, description: string) => void;
  onSetDueDate: (id: number, dueDate: string) => void;
}

/** 渲染可选择 DDL 的月历，按周展示所有已排期任务的完整周期。 */
export function TodoScheduleEditor({ todo, todos, onSaveDesc, onSetDueDate }: TodoScheduleEditorProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(() => parseTodoDate(todo.dueDate ?? '') ?? new Date());
  const weeks = getTodoMonthWeeks(month);
  const start = getTodoStartDate(todo);
  const today = formatTodoDate(new Date());
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const monthLabel = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(month);
  const scheduled = todos.filter(item => item.dueDate && parseTodoDate(item.dueDate) && item.dueDate >= getTodoStartDate(item));
  const period = todo.dueDate ? `${start} → ${todo.dueDate}` : t('todo.noDeadline');

  return (
    <div className="expand-todo-schedule-editor">
      <div className="expand-todo-calendar">
        <div className="expand-todo-deadline-control">
          <label>
            <span>{t('todo.deadline')}</span>
            <input
              type="date"
              min={start}
              value={todo.dueDate ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                const date = parseTodoDate(value);
                if (value && (!date || value < start)) return;
                onSetDueDate(todo.id, value);
                if (date) setMonth(date);
              }}
            />
          </label>
          {todo.dueDate && <button type="button" onClick={() => onSetDueDate(todo.id, '')}>{t('todo.clearDeadline')}</button>}
        </div>
        <div className="expand-todo-calendar-nav">
          <button type="button" aria-label={t('todo.previousMonth')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
          <span aria-live="polite">{monthLabel}</span>
          <button type="button" aria-label={t('todo.nextMonth')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
        </div>
        <div className="expand-todo-calendar-weekdays" aria-hidden="true">
          {weeks[0].map(day => <span key={day.getDay()}>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}</span>)}
        </div>
        <div className="expand-todo-calendar-weeks">
          {weeks.map(week => (
            <div className="expand-todo-calendar-week" key={formatTodoDate(week[0])}>
              <div className="expand-todo-calendar-days">
                {week.map(day => {
                  const date = formatTodoDate(day);
                  return (
                    <button
                      key={date}
                      type="button"
                      className={`expand-todo-calendar-day${day.getMonth() !== month.getMonth() ? ' outside' : ''}${date === today ? ' today' : ''}`}
                      aria-label={t('todo.chooseDeadline', { date })}
                      aria-pressed={date === todo.dueDate}
                      disabled={date < start}
                      onClick={() => onSetDueDate(todo.id, date)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="expand-todo-calendar-periods">
                {scheduled.map(item => {
                  const segment = getTodoWeekSegment(getTodoStartDate(item), item.dueDate!, week);
                  if (!segment) return null;
                  const label = `${item.text}: ${getTodoStartDate(item)} → ${item.dueDate}`;
                  return (
                    <div key={item.id} className="expand-todo-calendar-period-row">
                      <span
                        className={`expand-todo-calendar-period${item.id === todo.id ? ' selected' : ''}${item.done ? ' done' : ''}`}
                        style={{ gridColumn: `${segment.column} / span ${segment.span}`, '--period-color': getTodoColor(item.id) } as CSSProperties}
                        title={label}
                        aria-label={label}
                      >
                        {item.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="expand-todo-calendar-range" title={period}>{period}</div>
      </div>
      <textarea
        className="expand-todo-desc"
        aria-label={t('todo.editDescTitle')}
        placeholder={t('todo.descPlaceholder')}
        value={todo.description ?? ''}
        onChange={(event) => onSaveDesc(todo.id, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
