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
 * @file useUpdateSourceSelect.ts
 * @description 引导更新源选择步骤 — 更新源选择逻辑 Hook
 * @author 鸡哥
 */

import { useState, useCallback, useEffect } from 'react';
import { normalizeUpdateSource } from '../../../../config/dynamicIslandUpdateSource';
import { UPDATE_SOURCE_STORE_KEY, DEFAULT_UPDATE_SOURCE } from '../config/updateSourceOptions';
import type { UseUpdateSourceSelectReturn } from '../types';

/**
 * 更新源选择逻辑 Hook
 * @description 从存储加载当前更新源，管理选中状态并实时同步
 */
export function useUpdateSourceSelect(): UseUpdateSourceSelectReturn {
  const [selected, setSelected] = useState<string>(DEFAULT_UPDATE_SOURCE);

  /** 初始化时从存储加载当前更新源 */
  useEffect(() => {
    window.api.storeRead(UPDATE_SOURCE_STORE_KEY).then((value) => {
      setSelected(normalizeUpdateSource(value));
    }).catch(() => {});
  }, []);

  const handleSelect = useCallback((key: string): void => {
    const source = normalizeUpdateSource(key);
    setSelected(source);
    window.api.storeWrite(UPDATE_SOURCE_STORE_KEY, source).catch(() => {});
  }, []);

  return { selected, handleSelect };
}
