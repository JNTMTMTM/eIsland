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
 * @file clipboardUrlState.ts
 * @description 剪贴板 URL 状态管理模块
 * @description 提供剪贴板 URL 监听开关、检测模式和黑名单的状态管理
 * @author 鸡哥
 */

import type { ClipboardUrlDetectMode } from '../config/storeConfig';
import {
  DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED,
  DEFAULT_CLIPBOARD_URL_DETECT_MODE,
  DEFAULT_CLIPBOARD_URL_BLACKLIST,
} from '../config/storeConfig';

interface ClipboardUrlState {
  getMonitorEnabled: () => boolean;
  setMonitorEnabled: (enabled: boolean) => void;
  getDetectMode: () => ClipboardUrlDetectMode;
  setDetectMode: (mode: ClipboardUrlDetectMode) => void;
  getBlacklist: () => string[];
  setBlacklist: (list: string[]) => void;
}

/**
 * 创建剪贴板 URL 状态管理器
 * @description 初始化并返回剪贴板 URL 相关的状态管理接口
 * @returns 包含 getter 和 setter 的状态管理对象
 */
export function createClipboardUrlState(): ClipboardUrlState {
  let monitorEnabled: boolean = DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED;
  let detectMode: ClipboardUrlDetectMode = DEFAULT_CLIPBOARD_URL_DETECT_MODE;
  let blacklist: string[] = [...DEFAULT_CLIPBOARD_URL_BLACKLIST];

  return {
    getMonitorEnabled: () => monitorEnabled,
    setMonitorEnabled: (enabled) => {
      monitorEnabled = enabled;
    },
    getDetectMode: () => detectMode,
    setDetectMode: (mode) => {
      detectMode = mode;
    },
    getBlacklist: () => blacklist,
    setBlacklist: (list) => {
      blacklist = list;
    },
  };
}
