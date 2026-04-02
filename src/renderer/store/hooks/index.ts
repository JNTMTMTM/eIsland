/**
 * @file index.ts
 * @description 灵动岛状态管理 Store - 使用 Slice 模式模块化
 */

import { create } from 'zustand';
import type { IIslandStore } from '../types';
import { createIslandSlice } from './islandSlice';
import { createWeatherSlice } from './weatherSlice';
import { createTimerSlice } from './timerSlice';
import { createNotificationSlice } from './notificationSlice';
import { createMediaSlice } from './mediaSlice';

const useIslandStore = create<IIslandStore>()((set, get, store) => ({
  ...createIslandSlice(set, get, store),
  ...createWeatherSlice(set, get, store),
  ...createTimerSlice(set, get, store),
  ...createNotificationSlice(set, get, store),
  ...createMediaSlice(set, get, store),
}));

export default useIslandStore;