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
 * @file autoHideWatcher.ts
 * @description 自动隐藏监听器模块
 * @description 监控指定窗口标题名单，仅焦点窗口命中时自动隐藏灵动岛
 * @author 鸡哥
 */

import { BrowserWindow } from 'electron';
import { hasAnyFocusedWindowTitle } from './runningProcesses';

interface CreateAutoHideWatcherOptions {
  getMainWindow: () => BrowserWindow | null;
  defaultWindowTitleList: string[];
  pollIntervalMs?: number;
}

interface AutoHideWatcherService {
  start: () => void;
  stop: () => void;
  checkNow: () => Promise<void>;
  getAutoHideWindowTitleList: () => string[];
  setAutoHideWindowTitleList: (list: string[]) => void;
  getConfiguredHideWindowTitleList: () => string[];
  setConfiguredHideWindowTitleList: (list: string[]) => void;
  getHiddenByAutoHideProcess: () => boolean;
  setHiddenByAutoHideProcess: (hidden: boolean) => void;
}

/**
 * 创建自动隐藏监听器服务
 * @description 初始化并返回自动隐藏监控服务，根据进程列表控制窗口显示/隐藏
 * @param options - 服务配置选项，包含窗口获取和进程列表配置
 * @returns 自动隐藏监听器服务对象
 */
export function createAutoHideWatcher(options: CreateAutoHideWatcherOptions): AutoHideWatcherService {
  const pollIntervalMs = options.pollIntervalMs ?? 2500;

  let autoHideWindowTitleList: string[] = [...options.defaultWindowTitleList];
  let configuredHideWindowTitleList: string[] = [...options.defaultWindowTitleList];
  let watcherTimer: NodeJS.Timeout | null = null;
  let checkInFlight = false;
  let hiddenByAutoHideProcess = false;

  async function checkNow(): Promise<void> {
    if (checkInFlight) return;
    const mainWindow = options.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    checkInFlight = true;
    try {
      if (!autoHideWindowTitleList.length) {
        if (hiddenByAutoHideProcess && !mainWindow.isVisible()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
        hiddenByAutoHideProcess = false;
        return;
      }

      const shouldHide = await hasAnyFocusedWindowTitle(autoHideWindowTitleList);

      if (shouldHide) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        }
        hiddenByAutoHideProcess = true;
        return;
      }

      if (hiddenByAutoHideProcess) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
        hiddenByAutoHideProcess = false;
      }
    } finally {
      checkInFlight = false;
    }
  }

  function start(): void {
    if (watcherTimer) {
      clearInterval(watcherTimer);
      watcherTimer = null;
    }

    checkNow().catch(() => {});
    watcherTimer = setInterval(() => {
      checkNow().catch(() => {});
    }, pollIntervalMs);
  }

  function stop(): void {
    if (watcherTimer) {
      clearInterval(watcherTimer);
      watcherTimer = null;
    }
  }

  return {
    start,
    stop,
    checkNow,
    getAutoHideWindowTitleList: () => autoHideWindowTitleList,
    setAutoHideWindowTitleList: (list) => {
      autoHideWindowTitleList = list;
    },
    getConfiguredHideWindowTitleList: () => configuredHideWindowTitleList,
    setConfiguredHideWindowTitleList: (list) => {
      configuredHideWindowTitleList = list;
    },
    getHiddenByAutoHideProcess: () => hiddenByAutoHideProcess,
    setHiddenByAutoHideProcess: (hidden) => {
      hiddenByAutoHideProcess = hidden;
    },
  };
}
