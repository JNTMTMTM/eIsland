/**
 * @file useNotification.ts
 * @description 通知管理 Hook，封装通知的加载、添加、删除、清空等业务逻辑
 * @author 鸡哥
 */

import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { Notification } from '../types/notification';

/**
 * 通知管理 Hook，封装通知的加载、添加、删除、清空等业务逻辑
 * @returns 通知列表、未读数、增删改查方法及刷新函数
 */
export function useNotification() {
  const {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    setNotifications,
  } = useNotificationStore();

  const loadNotifications = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getNotifications();
        const mapped: Notification[] = data.map((n) => ({
          id: n.id,
          appId: n.appId,
          appName: n.appName,
          title: n.title,
          body: n.body,
          icon: n.icon,
          timestamp: n.timestamp,
          priority: n.priority,
          category: n.category,
          actions: n.actions,
          read: false,
        }));
        setNotifications(mapped);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [setNotifications]);

  const add = useCallback(
    async (notification: Omit<Notification, 'id' | 'read'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const fullNotification: Notification = { ...notification, id, read: false };

      addNotification(fullNotification);

      try {
        if (window.electronAPI) {
          await window.electronAPI.addNotification(fullNotification);
        }
      } catch (error) {
        console.error('Failed to persist notification:', error);
      }
    },
    [addNotification],
  );

  const remove = useCallback(
    async (id: string) => {
      removeNotification(id);
      try {
        if (window.electronAPI) {
          await window.electronAPI.removeNotification(id);
        }
      } catch (error) {
        console.error('Failed to remove notification:', error);
      }
    },
    [removeNotification],
  );

  const clearAllHandler = useCallback(async () => {
    clearAll();
    try {
      if (window.electronAPI) {
        await window.electronAPI.clearAllNotifications();
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, [clearAll]);

  useEffect(() => {
    loadNotifications();

    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI) {
      unsubscribe = window.electronAPI.onNotification((notification) => {
        addNotification({ ...notification, read: false });
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadNotifications, addNotification]);

  return {
    notifications,
    unreadCount,
    add,
    remove,
    markAsRead,
    markAllAsRead,
    clearAll: clearAllHandler,
    refresh: loadNotifications,
  };
}
