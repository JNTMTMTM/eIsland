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
 * @file useSettingsBehavior.ts
 * @description 应用自动隐藏、鼠标移出和剪贴板配置操作
 * @author 鸡哥
 */

import { useState } from 'react';
import { type RunningWindowItem } from '../config/settingsTabConfig';

/**
 * 应用自动隐藏、鼠标移出和剪贴板配置操作。
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsBehavior() {
  const [expandLeaveIdle, setExpandLeaveIdle] = useState<boolean>(false);
  const [maxExpandLeaveIdle, setMaxExpandLeaveIdle] = useState<boolean>(false);
  const [clipboardUrlMonitorEnabled, setClipboardUrlMonitorEnabled] = useState<boolean>(true);
  const [clipboardUrlDetectMode, setClipboardUrlDetectMode] = useState<'https-only' | 'http-https' | 'domain-only'>('http-https');
  const [clipboardUrlBlacklist, setClipboardUrlBlacklist] = useState<string[]>([]);
  const [clipboardUrlSuppressInFavorites, setClipboardUrlSuppressInFavorites] = useState<boolean>(true);
  const [autostartMode, setAutostartMode] = useState<'disabled' | 'enabled' | 'high-priority'>('disabled');
  const [runningProcesses, setRunningProcesses] = useState<RunningWindowItem[]>([]);
  const [hideProcessList, setHideProcessList] = useState<string[]>([]);
  const [hideProcessFilter, setHideProcessFilter] = useState<string>('');
  const [hideProcessLoading, setHideProcessLoading] = useState(false);
  const [autoHideFullscreenWindows, setAutoHideFullscreenWindowsState] = useState<boolean>(false);
  const hideProcessKeyword = hideProcessFilter.trim().toLowerCase();

  const toggleHideProcess = (processName: string): void => {
    const key = processName.trim().toLowerCase();
    if (!key) return;

    setHideProcessList((prev) => {
      const exists = prev.some((name) => name.trim().toLowerCase() === key);
      const next = exists
        ? prev.filter((name) => name.trim().toLowerCase() !== key)
        : [...prev, processName];
      window.api.hideProcessListSet(next).catch(() => { });
      return next;
    });
  };

  const setAutoHideFullscreenWindows = (enabled: boolean): void => {
    setAutoHideFullscreenWindowsState(enabled);
    window.api.autoHideFullscreenWindowsSet(enabled).catch(() => { });
  };

  const refreshRunningProcesses = async (): Promise<void> => {
    setHideProcessLoading(true);
    try {
      const list = await window.api.getOpenWindowsWithIcons();
      setRunningProcesses(
        Array.isArray(list)
          ? list.filter((item): item is RunningWindowItem => Boolean(item && typeof item.title === 'string'))
          : []
      );
    } catch {
      setRunningProcesses([]);
    } finally {
      setHideProcessLoading(false);
    }
  };

  return {
    expandLeaveIdle,
    setExpandLeaveIdle,
    maxExpandLeaveIdle,
    setMaxExpandLeaveIdle,
    clipboardUrlMonitorEnabled,
    setClipboardUrlMonitorEnabled,
    clipboardUrlDetectMode,
    setClipboardUrlDetectMode,
    clipboardUrlBlacklist,
    setClipboardUrlBlacklist,
    clipboardUrlSuppressInFavorites,
    setClipboardUrlSuppressInFavorites,
    autostartMode,
    setAutostartMode,
    runningProcesses,
    setRunningProcesses,
    hideProcessList,
    setHideProcessList,
    hideProcessFilter,
    setHideProcessFilter,
    hideProcessLoading,
    setHideProcessLoading,
    autoHideFullscreenWindows,
    setAutoHideFullscreenWindowsState,
    hideProcessKeyword,
    toggleHideProcess,
    setAutoHideFullscreenWindows,
    refreshRunningProcesses,
  };
}
