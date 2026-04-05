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
 * @file index.ts
 * @description 灵动岛状态管理 Store - 使用 Slice 模式模块化
 * @author 鸡哥
 */

import { create } from 'zustand';
import type { IIslandStore } from '../types';
import { createIslandSlice } from './islandSlice';
import { createWeatherSlice } from './weatherSlice';
import { createTimerSlice } from './timerSlice';
import { createNotificationSlice } from './notificationSlice';
import { createMediaSlice } from './mediaSlice';
import { createAiSlice } from './aiSlice';

const useIslandStore = create<IIslandStore>()((set, get, store) => ({
  ...createIslandSlice(set, get, store),
  ...createWeatherSlice(set, get, store),
  ...createTimerSlice(set, get, store),
  ...createNotificationSlice(set, get, store),
  ...createMediaSlice(set, get, store),
  ...createAiSlice(set, get, store),
}));

export default useIslandStore;