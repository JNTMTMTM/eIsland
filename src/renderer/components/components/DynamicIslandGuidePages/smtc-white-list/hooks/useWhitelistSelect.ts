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
 * @file useWhitelistSelect.ts
 * @description 引导播放器白名单选择逻辑 Hook
 * @author 鸡哥
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { canonicalizeMusicWhitelistEntry, normalizeMusicWhitelist } from '../../../../../utils/musicWhitelist';
import { WHITELIST_OPTIONS } from '../config/whitelistOptions';

/** 默认选中值 */
const DEFAULT_SELECTED = WHITELIST_OPTIONS.filter((opt) => opt.defaultSelected).map((opt) => opt.value);

interface UseWhitelistSelectReturn {
  /** 当前选中的白名单列表 */
  selected: string[];
  /** 切换选项选中状态 */
  toggle: (value: string) => void;
}

/**
 * 白名单选择逻辑 Hook
 * @description 从存储加载当前白名单，管理多选状态
 */
export function useWhitelistSelect(): UseWhitelistSelectReturn {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);
  const selectionChangedRef = useRef(false);

  /** 初始化时从存储加载当前白名单 */
  useEffect(() => {
    let cancelled = false;
    window.api.musicWhitelistGet().then((list) => {
      if (!cancelled && !selectionChangedRef.current && Array.isArray(list)) {
        setSelected(normalizeMusicWhitelist(list));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback((value: string): void => {
    selectionChangedRef.current = true;
    const sourceId = canonicalizeMusicWhitelistEntry(value);
    setSelected((prev) => {
      const current = normalizeMusicWhitelist(prev);
      const next = current.includes(sourceId)
        ? current.filter((v) => v !== sourceId)
        : [...current, sourceId];
      window.api.musicWhitelistSet(next).catch(() => {});
      return next;
    });
  }, []);

  return { selected, toggle };
}
