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
 * @file useShapeSetting.ts
 * @description 引导灵动岛形态设置逻辑 Hook
 * @author 鸡哥
 */

import { useState, useCallback, useEffect } from 'react';
import type { IslandShapeMode } from '../../../../../store/types';

interface UseShapeSettingReturn {
  /** 当前形态模式 */
  mode: IslandShapeMode;
  /** 切换形态模式 */
  setMode: (mode: IslandShapeMode) => void;
}

/**
 * 灵动岛形态设置逻辑 Hook
 * @description 从存储加载形态模式，管理状态并实时同步。
 *   监听 onShapeModeChanged 事件，确保外部变更（快捷键、主窗口等）时 UI 保持一致。
 */
export function useShapeSetting(): UseShapeSettingReturn {
  const [mode, setModeState] = useState<IslandShapeMode>('notch');

  /** 初始化时从存储加载 */
  useEffect(() => {
    window.api.shapeModeGet().then((val) => {
      const safe: IslandShapeMode = val === 'notch' || val === 'pill' ? val : 'notch';
      setModeState(safe);
    }).catch(() => {});
  }, []);

  /** 监听形态模式外部变更（快捷键 / 主窗口设置页等） */
  useEffect(() => {
    const unsub = window.api.onSettingsChanged((channel, value) => {
      if (channel === 'island:shape-mode') {
        const safe: IslandShapeMode = value === 'notch' || value === 'pill' ? value : 'notch';
        setModeState(safe);
      }
    });
    return unsub;
  }, []);

  const setMode = useCallback((newMode: IslandShapeMode): void => {
    setModeState(newMode);
    window.api.shapeModeSet(newMode).catch(() => {});
  }, []);

  return { mode, setMode };
}
