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
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TodoListProps } from '../types/todoTypes';
import styles from '../styles/todo-list.module.css';

const classNames = (base: string, active = false): string => `${base}${active ? ` ${styles.active}` : ''}`;

function CheckIcon({ active }: { active?: boolean }): ReactElement {
  return (
    <svg className={classNames(styles.itemIcon, active)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon({ active }: { active?: boolean }): ReactElement {
  return (
    <svg className={classNames(`${styles.itemIcon} ${styles.strong}`, active)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DashedIcon({ active }: { active?: boolean }): ReactElement {
  return (
    <svg className={classNames(styles.itemIcon, active)} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="1.8 3.6" strokeLinecap="round" />
    </svg>
  );
}

function RollDigit({ character }: { character: string }): ReactElement {
  const previous = useRef(character);
  const [roll, setRoll] = useState<{ from: string; to: string } | null>(null);
  const [rolled, setRolled] = useState(false);

  useEffect(() => {
    if (character === previous.current) return undefined;
    const from = previous.current;
    previous.current = character;
    setRoll({ from, to: character });
    setRolled(false);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setRolled(true)));
    const timer = window.setTimeout(() => setRoll(null), 380);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [character]);

  if (!roll) return <span className={styles.rollDigit}>{character}</span>;
  return (
    <span className={styles.rollDigit}>
      <span className={`${styles.rollInner}${rolled ? ` ${styles.rolled}` : ''}`}>
        <span>{roll.from}</span>
        <span>{roll.to}</span>
      </span>
    </span>
  );
}

function RollingCount({ value }: { value: string }): ReactElement {
  return (
    <span className={styles.rollCount} aria-label={value}>
      {value.split('').map((character, index) => <RollDigit key={`${character}-${index}`} character={character} />)}
    </span>
  );
}

function FilledCheckIcon(): ReactElement {
  return (
    <svg className={styles.completedIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" fill="currentColor" />
    </svg>
  );
}

/**
 * 渲染可折叠的 Agent 任务清单。
 * @param items - 当前任务及其状态。
 * @param turn - 所属 turn 编号（可选）。
 * @returns Agent 任务清单组件。
 */
export function TodoList({ items, turn }: TodoListProps): ReactElement {
  const { t } = useTranslation();
  const completedCount = items.reduce((count, item) => count + (item.status === 'completed' ? 1 : 0), 0);
  const allCompleted = items.length > 0 && completedCount === items.length;
  const hasStarted = items.some((item) => item.status !== 'pending');
  const [collapsed, setCollapsed] = useState(allCompleted);
  const progress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);
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

  /** 空列表不渲染 */
  if (items.length === 0) return <></>;

  return (
    <section className={styles.container}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={!collapsed}
        aria-label={t('aiChat.timeline.todo.toggle')}
        onClick={() => setCollapsed((current) => !current)}
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
        {turn != null && turn > 0 && (
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