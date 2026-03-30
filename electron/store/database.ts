/**
 * @file database.ts
 * @description electron-store 持久化模块，封装通知和设置的 CRUD 操作
 * @author 鸡哥
 */

import Store from 'electron-store';
import log from 'electron-log/main';

export interface NotificationRecord {
  id: string;
  app_id: string;
  app_name: string;
  title: string;
  body: string;
  icon: string | null;
  timestamp: number;
  priority: string;
  category: string;
  actions: string | null;
  read: number;
  created_at: number;
}

interface StoreSchema {
  notifications: NotificationRecord[];
  settings: Record<string, unknown>;
}

let store: Store<StoreSchema> | null = null;

export function initDatabase(): void {
  store = new Store<StoreSchema>({
    name: 'eisland-data',
    defaults: {
      notifications: [],
      settings: {},
    },
  });
  log.info('Store initialized at:', store.path);
}

export function getStore(): Store<StoreSchema> {
  if (!store) {
    throw new Error('Store not initialized');
  }
  return store;
}

export function closeDatabase(): void {
  store = null;
  log.info('Store closed');
}

export function getAllNotifications(): NotificationRecord[] {
  const notifications = getStore().get('notifications', []);
  return notifications
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);
}

export function insertNotification(data: {
  id: string;
  app_id: string;
  app_name: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  priority: string;
  category: string;
  actions?: string;
}): void {
  const notifications = getStore().get('notifications', []);
  const record: NotificationRecord = {
    id: data.id,
    app_id: data.app_id,
    app_name: data.app_name,
    title: data.title,
    body: data.body,
    icon: data.icon ?? null,
    timestamp: data.timestamp,
    priority: data.priority,
    category: data.category,
    actions: data.actions ?? null,
    read: 0,
    created_at: Math.floor(Date.now() / 1000),
  };
  notifications.unshift(record);
  getStore().set('notifications', notifications);
}

export function deleteNotification(id: string): void {
  const notifications = getStore().get('notifications', []);
  getStore().set(
    'notifications',
    notifications.filter((n) => n.id !== id),
  );
}

export function clearAllNotifications(): void {
  getStore().set('notifications', []);
}

export function getSetting(key: string): unknown {
  const settings = getStore().get('settings', {});
  return settings[key] ?? null;
}

export function setSetting(key: string, value: unknown): void {
  const settings = getStore().get('settings', {});
  settings[key] = value;
  getStore().set('settings', settings);
}

export function getAllSettings(): Record<string, unknown> {
  return getStore().get('settings', {});
}

export function updateSettings(settings: Record<string, unknown>): void {
  const current = getStore().get('settings', {});
  getStore().set('settings', { ...current, ...settings });
}
