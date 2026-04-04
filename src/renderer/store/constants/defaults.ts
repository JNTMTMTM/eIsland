/**
 * @file defaults.ts
 * @description 灵动岛 Store 默认值配置，包含倒计时、计时器和通知等默认数据
 * @author 鸡哥
 */

import type { CountdownConfig, TimerData } from '../types';

/**
 * 获取默认倒计时配置（24小时内）
 */
export function getDefaultCountdown(): CountdownConfig {
  const now = new Date();
  const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    targetDate: target.toISOString(),
    label: '明天',
    enabled: true,
  };
}

/**
 * 获取默认计时器数据
 */
export function getDefaultTimerData(): TimerData {
  return {
    state: 'idle',
    remainingSeconds: 0,
    inputHours: '00',
    inputMinutes: '00',
    inputSeconds: '00',
  };
}

/**
 * 空通知数据
 */
export const emptyNotification = {
  title: '',
  body: '',
};

/**
 * 空媒体信息
 */
export const emptyMediaInfo = {
  title: '',
  artist: '',
  album: '',
  duration_ms: 0,
};