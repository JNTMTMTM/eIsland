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
 * @file useLocalTest.ts
 * @description 本机测试列表的光标、测试项切换与返回主菜单
 * @author 鸡哥
 */

import { useInput, useWindowSize } from 'ink';
import { useCallback, useState } from 'react';

import { FALLBACK_ROWS, LOCAL_TEST_ITEMS } from '../config/uiConfig';
import { moveCursor } from '../utils/uiUtils';

import type { LocalTestProps, UseLocalTestReturn } from '../types/uiTypes';

/**
 * 管理本机测试列表
 * @description ↑↓ 选择，Enter 执行测试项或返回主菜单，Esc 或 Ctrl+C 返回主菜单；测试运行时由测试界面接管按键
 * @param props - 本机测试入参
 * @param props.onBack - 返回主菜单回调
 * @returns 终端尺寸、光标与正在运行的测试项
 */
export default function useLocalTest({ onBack }: LocalTestProps): UseLocalTestReturn {
  const { columns, rows } = useWindowSize();
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState<UseLocalTestReturn['running']>(null);
  const closeTest = useCallback(() => setRunning(null), []);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor(moveCursor(cursor, LOCAL_TEST_ITEMS.length, -1));
    } else if (key.downArrow) {
      setCursor(moveCursor(cursor, LOCAL_TEST_ITEMS.length, 1));
    } else if (key.return) {
      const item = LOCAL_TEST_ITEMS[cursor];
      if (item === 'menu') {
        onBack();
      } else {
        setRunning(item);
      }
    } else if (key.escape || (key.ctrl && input === 'c')) {
      onBack();
    }
  }, { isActive: running === null });

  return {
    columns, running, closeTest, rows: rows || FALLBACK_ROWS, activeIndex: cursor,
  };
}
