/**
 * @file useNotificationStore.ts
 * @description 通知 Zustand 状态管理 store，管理通知列表、未读计数、增删改查操作
 * @author 鸡哥
 */

import { create } from 'zustand';
import type { Notification } from '../types/notification';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  setNotifications: (notifications: Notification[]) => void;
  getNotificationsByApp: (appId: string) => Notification[];
  getAggregatedNotifications: () => Map<string, Notification[]>;
}

/**
 * 通知状态管理 Hook，提供通知列表、未读计数及增删改查方法
 */
export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;

      const newNotifications = [notification, ...state.notifications].slice(0, 100);
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.read).length,
      };
    });
  },

  removeNotification: (id) => {
    set((state) => {
      const newNotifications = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.read).length,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const newNotifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  setNotifications: (notifications) => {
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  },

  getNotificationsByApp: (appId) => {
    return get().notifications.filter((n) => n.appId === appId);
  },

  getAggregatedNotifications: () => {
    const map = new Map<string, Notification[]>();
    for (const notification of get().notifications) {
      const existing = map.get(notification.appId) || [];
      map.set(notification.appId, [...existing, notification]);
    }
    return map;
  },
}));
