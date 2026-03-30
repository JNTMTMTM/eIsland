/**
 * @file useSettings.ts
 * @description 设置管理 Hook，封装设置的加载、保存、重置操作
 * @author 鸡哥
 */

import { useCallback, useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { Settings } from '../types/settings';

/**
 * 设置管理 Hook，封装设置的加载、保存、重置操作
 * @returns 设置对象及 loadSettings / saveSettings / resetSettings 方法
 */
export function useSettings() {
  const settings = useSettingsStore();

  const loadSettings = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getSettings();
        if (data && Object.keys(data).length > 0) {
          settings.updateSettings(data as Partial<Settings>);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, [settings]);

  const saveSettings = useCallback(
    async (newSettings: Partial<Settings>) => {
      try {
        settings.updateSettings(newSettings);
        if (window.electronAPI) {
          await window.electronAPI.updateSettings(newSettings);
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    },
    [settings],
  );

  const resetSettings = useCallback(async () => {
    settings.resetToDefaults();
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateSettings({});
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }, [settings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    ...settings,
    loadSettings,
    saveSettings,
    resetSettings,
  };
}
