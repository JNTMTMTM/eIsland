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
 * @file useAppScreen.ts
 * @description 交互模式的界面切换：主菜单、仓库管理与本机测试
 * @author 鸡哥
 */

import { useCallback, useState } from 'react';

import type { MenuEntry, Screen, UseAppScreenReturn } from '../types/uiTypes';

/**
 * 管理当前界面
 * @returns 当前界面、进入与返回回调
 */
export default function useAppScreen(): UseAppScreenReturn {
  const [screen, setScreen] = useState<Screen>('menu');
  const open = useCallback((entry: MenuEntry) => setScreen(entry), []);
  const back = useCallback(() => setScreen('menu'), []);
  return { screen, open, back };
}
