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
 * @description 城市时区搜索选择器 — 左侧边栏展开面板
 * @author 鸡哥
 */

import { memo, useState, useMemo, useCallback, useRef, useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { WorldClockCity, TimezoneOption } from '../types/worldClockTypes';
import { PICKER_SEARCH_DEBOUNCE_MS } from '../config/worldClockConfig';
import { filterTimezoneOptions, getCanonicalTimezone, getCityLabel } from '../utils/worldClockUtils';
import { WorldClockFlag } from './WorldClockFlag';

interface WorldClockCityPickerProps {
  /** 面板是否可见 */
  visible: boolean;
  /** 已存在的时区（用于匹配删除目标） */
  existingTimezones: string[];
  /** 选择回调 */
  onSelect: (city: WorldClockCity) => void;
  /** 删除已添加的时钟 */
  onRemove: (timezone: string) => void;
  /** 通知主面板高亮或取消高亮待删除的卡片 */
  onRemoveHover: (timezone: string | null) => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 可选时区列表 */
  options: TimezoneOption[];
}

/** 城市时区选择器 — 左侧边栏面板 */
export const WorldClockCityPicker = memo(function WorldClockCityPicker({
  visible,
  existingTimezones,
  onSelect,
  onRemove,
  onRemoveHover,
  onClose,
  options,
}: WorldClockCityPickerProps): ReactElement {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  /** 展开时自动聚焦 */
  useEffect(() => {
    if (visible) {
      const focusTimer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
      return () => clearTimeout(focusTimer);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
    return undefined;
  }, [visible]);

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

  // 保留存档原始时区名称，确保通过别名找到的条目也能删除对应卡片。
  const existingTimezoneMap = useMemo(
    () => new Map(existingTimezones.map((timezone) => [getCanonicalTimezone(timezone), timezone])),
    [existingTimezones],
  );

  /** 过滤列表 */
  const filtered = useMemo(
    () => visible ? filterTimezoneOptions(options, debouncedQuery, t) : [],
    [visible, options, debouncedQuery, t],
  );

  // 搜索、删除或关闭面板会卸载按钮，届时不能依赖鼠标移出事件清除高亮。
  useEffect(() => () => onRemoveHover(null), [filtered, existingTimezones, onRemoveHover]);

  /** ESC 关闭 */
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  return (
    <div className={`world-clock-picker-sidebar${visible ? ' world-clock-picker-sidebar--visible' : ''}`}>
      <div className="world-clock-picker-header">
        <button
          className="world-clock-picker-close"
          type="button"
          onClick={onClose}
        >
          <img src={SvgIcon.CANCEL} alt="" className="world-clock-picker-close-icon" />
        </button>
        <span className="world-clock-picker-title">
          {t('maxExpand.worldClock.addCity', { defaultValue: '添加城市' })}
        </span>
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
        {visible && filtered.length === 0 && (
          <div className="world-clock-picker-empty">
            {t('maxExpand.worldClock.noResults', { defaultValue: '未找到结果' })}
          </div>
        )}
        {filtered.map((opt) => {
          const existingTimezone = existingTimezoneMap.get(getCanonicalTimezone(opt.timezone));
          const added = existingTimezone !== undefined;
          return (
            <div
              key={`${opt.timezone}:${opt.labelKey}`}
              className={`world-clock-picker-item${added ? ' world-clock-picker-item--added' : ''}`}
            >
              <button
                className="world-clock-picker-select"
                type="button"
                disabled={added}
                onClick={() => onSelect({
                  timezone: opt.timezone,
                  label: opt.label,
                  labelKey: opt.labelKey,
                  order: 0,
                })}
              >
                <WorldClockFlag countryCode={opt.countryCode} />
                <span className="world-clock-picker-item-label">{getCityLabel(opt, t)}</span>
                <span className="world-clock-picker-item-tz">{opt.timezone}</span>
              </button>
              {existingTimezone !== undefined && (
                <button
                  className="world-clock-picker-remove"
                  type="button"
                  title={t('maxExpand.worldClock.removeCity', { defaultValue: '移除' })}
                  aria-label={`${t('maxExpand.worldClock.removeCity', { defaultValue: '移除' })} ${getCityLabel(opt, t)}`}
                  onClick={() => {
                    onRemoveHover(null);
                    onRemove(existingTimezone);
                  }}
                  onMouseEnter={() => onRemoveHover(existingTimezone)}
                  onMouseLeave={() => onRemoveHover(null)}
                  onFocus={() => onRemoveHover(existingTimezone)}
                  onBlur={() => onRemoveHover(null)}
                >
                  <img src={SvgIcon.DELETE} alt="" className="world-clock-picker-remove-icon" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
