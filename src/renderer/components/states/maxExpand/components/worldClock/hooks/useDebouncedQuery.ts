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
 * @file useDebouncedQuery.ts
 * @description 防抖搜索 Hook，用于城市选择器搜索输入
 * @author 鸡哥
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UseDebouncedQueryReturn } from '../types/worldClockTypes';
import { PICKER_SEARCH_DEBOUNCE_MS } from '../config/worldClockConfig';

/**
 * 防抖搜索 Hook
 * @param delay - 防抖延迟（默认 PICKER_SEARCH_DEBOUNCE_MS）
 * @returns 查询状态与更新方法
 */
export function useDebouncedQuery(delay = PICKER_SEARCH_DEBOUNCE_MS): UseDebouncedQueryReturn {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, delay);
  }, [delay]);

  const resetQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { query, debouncedQuery, handleQueryChange, resetQuery };
}
