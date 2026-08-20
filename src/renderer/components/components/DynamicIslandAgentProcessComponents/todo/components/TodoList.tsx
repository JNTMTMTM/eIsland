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
 * @file TodoList.tsx
 * @description 展示 Agent 任务清单及实时完成进度。
 * @author 鸡哥
 */

import type { CSSProperties, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TodoListProps } from '../types/todoTypes';
import { useTodoList } from '../hooks/useTodoList';
import { CheckIcon, ArrowIcon, DashedIcon, RollingCount, FilledCheckIcon } from '../utils/todoIcons';
import styles from '../styles/todo-list.module.css';

/**
 * 渲染可折叠的 Agent 任务清单。
 * @param items - 当前任务及其状态。
 * @param turn - 所属 turn 编号（可选）。
 * @returns Agent 任务清单组件。
 */
export function TodoList({ items, turn }: TodoListProps): ReactElement {
  const { t } = useTranslation();
  const { collapsed, completedCount, allCompleted, hasStarted, progress, toggle } = useTodoList(items);

  /** 空列表不渲染 */
  if (items.length === 0) return <></>;

  return (
    <section className={styles.container}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={!collapsed}
        aria-label={t('aiChat.timeline.todo.toggle')}
        onClick={toggle}
      >
        <span className={styles.headerIcon} aria-hidden="true">
          {allCompleted ? <FilledCheckIcon /> : hasStarted ? (
            <span className={styles.progressIcon} style={{ '--todo-progress': `${progress}%` } as CSSProperties}>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray="2.2 4.4" strokeLinecap="round" /></svg>
            </span>
          ) : (
            <svg className={styles.listIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 5h8M13 12h8M13 19h8m-18-2 2 2 4-4M3 7l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m19.5 8.25-7.5 7.5-7.5-7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className={styles.title}>{t('aiChat.timeline.todoTitle')}</span>
        {turn !== undefined && turn > 0 && (
          <span className={styles.turnBadge}>#{turn}</span>
        )}
        <span className={styles.count}><RollingCount value={`${completedCount}/${items.length}`} /></span>
      </button>

      <div className={`${styles.collapsible}${collapsed ? ` ${styles.collapsed}` : ''}`}>
        <div className={styles.inner}>
          <ul className={styles.list}>
            {items.map((item, index) => {
              const done = item.status === 'completed';
              const active = item.status === 'in_progress';
              return (
                <li key={item.id} className={`${styles.item}${done ? ` ${styles.done}` : active ? ` ${styles.running}` : ''}`} style={{ '--todo-index': index } as CSSProperties}>
                  <span className={styles.itemIconWrap}>
                    {done ? <CheckIcon active /> : active ? <ArrowIcon active /> : <DashedIcon active />}
                  </span>
                  <span className={styles.itemText} data-label={item.content}>{item.content}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}