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
 * @file useTrayMenuState.ts
 * @description 订阅托盘菜单打开事件，同步菜单状态、界面语言与用户摘要
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import i18n from '../../../../i18n';
import { readTrayUserSummary } from '../utils/trayUserSummary';
import type { TrayMenuState } from '../../../../../shared/trayMenu';
import type { TrayUserSummary } from '../types';

interface TrayMenuSnapshot {
  /** 主进程下发的菜单状态，首次打开前为 null */
  menuState: TrayMenuState | null;
  /** 当前用户摘要 */
  user: TrayUserSummary;
  /** 打开次数，每次打开递增，用于触发重新测量 */
  openCount: number;
}

/**
 * 跟踪托盘菜单每次打开时的状态
 * @returns 菜单状态、用户摘要与打开次数
 */
export function useTrayMenuState(): TrayMenuSnapshot {
  const [snapshot, setSnapshot] = useState<TrayMenuSnapshot>(() => ({
    menuState: null,
    user: readTrayUserSummary(),
    openCount: 0,
  }));

  useEffect(() => {
    // 菜单窗口常驻后台，语言以主进程读取的存储为准，先切换再渲染避免测量到旧文案。
    const handleOpen = async (menuState: TrayMenuState): Promise<void> => {
      if (i18n.language !== menuState.language) {
        try {
          await i18n.changeLanguage(menuState.language);
        } catch {
          // 切换失败时沿用当前语言
        }
      }
      setSnapshot((previous) => ({
        menuState,
        user: readTrayUserSummary(),
        openCount: previous.openCount + 1,
      }));
    };
    const unsubscribe = window.api.onTrayMenuOpen((menuState) => {
      // eslint-disable-next-line promise/prefer-await-to-then -- IPC 回调需同步返回，handleOpen 内部已兜底语言切换失败。
      handleOpen(menuState).catch(() => undefined);
    });
    // 订阅完成后再通知主进程，避免页面加载完成但尚未订阅时丢失首次打开的状态。
    window.api.trayMenuMounted();
    return unsubscribe;
  }, []);

  return snapshot;
}
