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
 * @file todoIcons.tsx
 * @description TodoList 内部使用的图标和动画子组件。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import styles from '../styles/todo-list.module.css';

/** 拼接 CSS Module 类名，可选 active 修饰 */
export const classNames = (base: string, active = false): string => `${base}${active ? ` ${styles.active}` : ''}`;

/** 已完成圆形勾选图标 */
export function CheckIcon({ active }: { active?: boolean }): ReactElement {
  return (
    <svg className={classNames(styles.itemIcon, active)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 进行中箭头图标 */
export function ArrowIcon({ active }: { active?: boolean }): ReactElement {
  return (
    <svg className={classNames(`${styles.itemIcon} ${styles.strong}`, active)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 待办虚线圆圈图标 */
export function DashedIcon({ active }: { active?: boolean }): ReactElement {
  return (
    <svg className={classNames(styles.itemIcon, active)} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="1.8 3.6" strokeLinecap="round" />
    </svg>
  );
}

/** 单个数字的滚动动画 */
export function RollDigit({ character }: { character: string }): ReactElement {
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

/** 滚动数字计数器（如 "3/5"） */
export function RollingCount({ value }: { value: string }): ReactElement {
  return (
    <span className={styles.rollCount} aria-label={value}>
      {value.split('').map((character, index) => <RollDigit key={`${character}-${index}`} character={character} />)}
    </span>
  );
}

/** 全部完成填充勾选图标 */
export function FilledCheckIcon(): ReactElement {
  return (
    <svg className={styles.completedIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" fill="currentColor" />
    </svg>
  );
}
