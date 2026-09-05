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
 * @file WorldClockCityPicker.tsx
 * @description 城市时区搜索选择器弹窗
 * @author 鸡哥
 */

import { useState, useMemo, useCallback, useRef, useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorldClockCity, TimezoneOption } from '../types/worldClockTypes';
import { PICKER_SEARCH_DEBOUNCE_MS } from '../config/worldClockConfig';

interface WorldClockCityPickerProps {
  /** 已存在的时区（用于灰显） */
  existingTimezones: string[];
  /** 选择回调 */
  onSelect: (city: WorldClockCity) => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 可选时区列表 */
  options: TimezoneOption[];
}

/** 城市时区选择器 */
export function WorldClockCityPicker({
  existingTimezones,
  onSelect,
  onClose,
  options,
}: WorldClockCityPickerProps): ReactElement {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  /** 自动聚焦 */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /** 防抖搜索 */
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, PICKER_SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  /** 已添加时区 Set */
  const existingSet = useMemo(() => new Set(existingTimezones), [existingTimezones]);

  /** 过滤列表 */
  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    const list = q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.timezone.toLowerCase().includes(q),
        )
      : options;
    return list.slice(0, 50);
  }, [options, debouncedQuery]);

  /** ESC 关闭 */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="world-clock-picker-overlay" onClick={onClose}>
      <div
        className="world-clock-picker"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="world-clock-picker-header">
          <span className="world-clock-picker-title">
            {t('maxExpand.worldClock.addCity', { defaultValue: '添加城市' })}
          </span>
          <button
            className="world-clock-picker-close"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <input
          ref={inputRef}
          className="world-clock-picker-search"
          type="text"
          placeholder={t('maxExpand.worldClock.searchTimezone', { defaultValue: '搜索时区...' })}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        <div className="world-clock-picker-list">
          {filtered.length === 0 && (
            <div className="world-clock-picker-empty">
              {t('maxExpand.worldClock.noResults', { defaultValue: '未找到结果' })}
            </div>
          )}
          {filtered.map((opt) => {
            const added = existingSet.has(opt.timezone);
            return (
              <button
                key={opt.timezone}
                className={`world-clock-picker-item${added ? ' world-clock-picker-item--added' : ''}`}
                type="button"
                disabled={added}
                onClick={() => onSelect({ timezone: opt.timezone, label: opt.label, order: 0 })}
              >
                <span className="world-clock-picker-item-label">{opt.label}</span>
                <span className="world-clock-picker-item-tz">{opt.timezone}</span>
                {added && (
                  <span className="world-clock-picker-item-badge">
                    {t('maxExpand.worldClock.alreadyAdded', { defaultValue: '已添加' })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
