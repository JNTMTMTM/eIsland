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
 * @file LanguageSelect.tsx
 * @description 参照翻译页的国旗语言菜单，支持外部关闭与键盘选择。
 * @author 鸡哥
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { LANGUAGES } from '../config/migrationConfig';
import styles from './migration.module.css';
import type { LanguageSelectProps } from '../types/migrationTypes';
import type { MouseEvent } from 'react';

/**
 * 展示四种界面语言及对应国旗。
 * @param props - 当前语言、翻译函数与切换动作。
 * @param props.t - 界面翻译函数。
 * @param props.language - 当前界面语言代码。
 * @param props.onLanguage - 选择语言后的切换动作。
 * @returns 标题栏语言选择菜单。
 */
export function LanguageSelect({ t, language, onLanguage }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const choose = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    onLanguage(event.currentTarget.value);
    setOpen(false);
    triggerRef.current?.focus();
  }, [onLanguage]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const closeOutside = (event: Event): void => {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const navigate = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') || []);
        const current = items.findIndex((item) => item === document.activeElement);
        let next = event.key === 'ArrowUp' ? (current - 1 + items.length) % items.length : (current + 1) % items.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = items.length - 1;
        items[next]?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    document.addEventListener('keydown', navigate);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
      document.removeEventListener('keydown', navigate);
    };
  }, [open]);

  return (
    <div className={styles.languageSelect} ref={wrapperRef}>
      <button type="button" className={styles.languageTrigger} ref={triggerRef} aria-label={t('language')} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={toggle}>
        <img className={styles.languageFlag} src={selected.icon} alt="" draggable={false} />
        <span className={styles.languageLabel}>{t(`languages.${selected.code}`)}</span>
        <span className={styles.languageArrow} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id={menuId} className={styles.languageMenu} ref={menuRef} role="menu" aria-label={t('language')}>
          {LANGUAGES.map((item) => (
            <button key={item.code} type="button" className={styles.languageItem} role="menuitemradio" aria-checked={item.code === selected.code} value={item.code} tabIndex={-1} onClick={choose}>
              <img className={styles.languageFlag} src={item.icon} alt="" draggable={false} />
              <span>{t(`languages.${item.code}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
