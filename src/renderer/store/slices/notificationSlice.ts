/**
 * @file notificationSlice.ts
 * @description 通知相关逻辑
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import type { NotificationSlice } from '../types';
import { emptyNotification } from '../constants/defaults';

export const createNotificationSlice: StateCreator<
  NotificationSlice,
  [],
  [],
  NotificationSlice
> = (set) => ({
  notification: emptyNotification,
});