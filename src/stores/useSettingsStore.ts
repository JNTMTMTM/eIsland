/**
 * @file useSettingsStore.ts
 * @description 设置 Zustand 状态管理 store，持久化用户配置，支持白名单、黑名单管理
 * @author 鸡哥
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '../types/settings';
import { defaultSettings } from '../types/settings';

interface SettingsStore extends Settings {
  setTheme: (theme: Settings['theme']) => void;
  setAlwaysOnTop: (value: boolean) => void;
  setAutoStart: (value: boolean) => void;
  setNotificationSound: (value: boolean) => void;
  setCompactMode: (value: boolean) => void;
  setOpacity: (value: number) => void;
  setPosition: (position: Settings['position']) => void;
  setShortcut: (shortcut: string) => void;
  addToWhitelist: (appId: string) => void;
  removeFromWhitelist: (appId: string) => void;
  addToBlacklist: (appId: string) => void;
  removeFromBlacklist: (appId: string) => void;
  setDataRetention: (days: number) => void;
  resetToDefaults: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
}

/**
 * 设置状态管理 Hook，提供配置项及白名单、黑名单管理方法（持久化存储）
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => set({ theme }),
      setAlwaysOnTop: (alwaysOnTop) => set({ alwaysOnTop }),
      setAutoStart: (autoStart) => set({ autoStart }),
      setNotificationSound: (notificationSound) => set({ notificationSound }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setOpacity: (opacity) => set({ opacity: Math.max(0.1, Math.min(1, opacity)) }),
      setPosition: (position) => set({ position }),
      setShortcut: (shortcut) => set({ shortcut }),

      addToWhitelist: (appId) =>
        set((state) => ({
          whitelist: state.whitelist.includes(appId)
            ? state.whitelist
            : [...state.whitelist, appId],
        })),

      removeFromWhitelist: (appId) =>
        set((state) => ({
          whitelist: state.whitelist.filter((id) => id !== appId),
        })),

      addToBlacklist: (appId) =>
        set((state) => ({
          blacklist: state.blacklist.includes(appId)
            ? state.blacklist
            : [...state.blacklist, appId],
        })),

      removeFromBlacklist: (appId) =>
        set((state) => ({
          blacklist: state.blacklist.filter((id) => id !== appId),
        })),

      setDataRetention: (dataRetention) => set({ dataRetention }),
      resetToDefaults: () => set(defaultSettings),

      updateSettings: (settings) => set(settings),
    }),
    {
      name: 'eisland-settings',
    },
  ),
);
