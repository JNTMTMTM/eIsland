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
 * @file useSettingsBehaviorEffects.ts
 * @description 进程列表与全屏自动隐藏配置加载
 * @author 鸡哥
 */

import { useEffect } from 'react';
import { type RunningWindowItem } from '../config/settingsTabConfig';
import type { useSettingsBehavior } from './useSettingsBehavior';

interface SettingsBehaviorEffectsOptions {
  setHideProcessList: ReturnType<typeof useSettingsBehavior>['setHideProcessList'];
  setAutoHideFullscreenWindowsState: ReturnType<typeof useSettingsBehavior>['setAutoHideFullscreenWindowsState'];
  setRunningProcesses: ReturnType<typeof useSettingsBehavior>['setRunningProcesses'];
}

/**
 * 进程列表与全屏自动隐藏配置加载，保留原有依赖数组与卸载清理。
 * @param options - 初始化与同步所需的状态和操作
 * @returns 无返回值
 */
export function useSettingsBehaviorEffects(options: SettingsBehaviorEffectsOptions): void {
  const {
    setHideProcessList,
    setAutoHideFullscreenWindowsState,
    setRunningProcesses,
  } = options;

  useEffect(() => {
    let cancelled = false;
    window.api.hideProcessListGet().then((list) => {
      if (cancelled) return;
      if (Array.isArray(list)) setHideProcessList(list);
    }).catch(() => { });
    window.api.autoHideFullscreenWindowsGet().then((enabled) => {
      if (cancelled) return;
      setAutoHideFullscreenWindowsState(enabled === true);
    }).catch(() => { });
    window.api.getOpenWindowsWithIcons().then((list) => {
      if (cancelled) return;
      if (Array.isArray(list)) {
        setRunningProcesses(list.filter((item): item is RunningWindowItem => Boolean(item && typeof item.title === 'string')));
      }
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);
}
