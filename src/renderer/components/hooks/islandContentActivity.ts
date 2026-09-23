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
 * @file islandContentActivity.ts
 * @description 标记形变期间暂留的离场页面，供数据订阅暂停后台更新。
 * @author 鸡哥
 */

import { createContext, useContext } from 'react';

export const IslandContentActivityContext = createContext(true);

/**
 * 获取页面是否仍参与显示和交互；独立窗口默认活跃。
 * @returns 当前页面是否活跃。
 */
export function useIslandContentActive(): boolean {
  return useContext(IslandContentActivityContext);
}
