/**
 * @file settings.ts
 * @description 应用设置的类型定义，包含所有可配置项及默认值
 * @author 鸡哥
 */

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  alwaysOnTop: boolean;
  autoStart: boolean;
  notificationSound: boolean;
  compactMode: boolean;
  opacity: number;
  position: 'top' | 'bottom';
  shortcut: string;
  whitelist: string[];
  blacklist: string[];
  dataRetention: number;
}

/**
 * 默认设置值，用于初始化和重置
 */
export const defaultSettings: Settings = {
  theme: 'dark',
  alwaysOnTop: true,
  autoStart: false,
  notificationSound: true,
  compactMode: false,
  opacity: 1,
  position: 'top',
  shortcut: 'CommandOrControl+Shift+D',
  whitelist: [],
  blacklist: [],
  dataRetention: 30,
};
