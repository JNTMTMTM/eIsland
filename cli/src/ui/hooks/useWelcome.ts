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
 * @file useWelcome.ts
 * @description 欢迎界面的终端尺寸、主菜单光标与退出确认
 * @author 鸡哥
 */

import { useInput, useWindowSize } from 'ink';
import { useCallback, useState, useSyncExternalStore } from 'react';

import { FALLBACK_ROWS, MENU_ENTRIES } from '../config/uiConfig';
import { moveCursor } from '../utils/uiUtils';

import type { UseWelcomeReturn, WelcomeProps } from '../types/uiTypes';

/**
 * 监听欢迎界面按键并提供终端尺寸
 * @description ↑↓ 选择功能，Enter 进入；Esc 或 Ctrl+C 退出，从仓库管理返回后仍有运行中的任务时需二次确认
 * @param props - 欢迎界面入参
 * @param props.manager - 任务管理器
 * @param props.onSelect - 选中主菜单项回调
 * @param props.onQuit - 退出回调
 * @returns 终端尺寸、光标与退出确认状态
 */
export default function useWelcome({ manager, onSelect, onQuit }: WelcomeProps): UseWelcomeReturn {
  const { columns, rows } = useWindowSize();
  const tasks = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  const [cursor, setCursor] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState<number | null>(null);

  const handleConfirmQuit = useCallback((confirmed: boolean) => {
    setConfirmQuit(null);
    if (confirmed) onQuit();
  }, [onQuit]);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor(moveCursor(cursor, MENU_ENTRIES.length, -1));
    } else if (key.downArrow) {
      setCursor(moveCursor(cursor, MENU_ENTRIES.length, 1));
    } else if (key.return) {
      onSelect(MENU_ENTRIES[cursor]);
    } else if (key.escape || (key.ctrl && input === 'c')) {
      const running = tasks.filter((task) => task.status === 'running').length;
      if (running > 0) {
        setConfirmQuit(running);
      } else {
        onQuit();
      }
    }
  }, { isActive: confirmQuit === null });

  return {
    columns, confirmQuit, handleConfirmQuit, rows: rows || FALLBACK_ROWS, activeIndex: cursor,
  };
}
