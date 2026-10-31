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
 * @file agentUsageUtils.ts
 * @description Agent 用量页与总览额度卡片共用的 token、额度窗口与重置时间格式化工具。
 * @author 鸡哥
 */

import type { AgentUsageRateLimitWindow } from '../../../../../../../preload/types/agentUsage';
import type { Translate } from '../types/agentUsageTypes';

/**
 * 将 token 数格式化为 K/M/B 紧凑写法。
 * @param value - token 数
 * @returns 紧凑字符串，非正数或非有限值返回 '0'
 */
export function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  const units = ['', 'K', 'M', 'B'];
  let scaled = value;
  let index = 0;
  while (scaled >= 1000 && index < units.length - 1) {
    scaled /= 1000;
    index += 1;
  }
  if (index === 0) return String(Math.round(scaled));
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(scaled >= 10 ? 1 : 2)}${units[index]}`;
}

/**
 * 将剩余毫秒数格式化为 d/h/m 写法，最少 1 分钟。
 * @param ms - 剩余毫秒数
 * @returns 时长字符串
 */
export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/**
 * 根据窗口时长生成额度窗口名称。
 * @param windowMinutes - 窗口分钟数
 * @param t - 翻译函数
 * @returns 窗口名称
 */
export function windowLabel(windowMinutes: number | null, t: Translate): string {
  if (windowMinutes === 300) return t('expanded.agentUsage.window.fiveHour', { defaultValue: '5 小时' });
  if (windowMinutes === 10080) return t('expanded.agentUsage.window.weekly', { defaultValue: '每周' });
  if (windowMinutes && windowMinutes > 0) return t('expanded.agentUsage.window.hours', { defaultValue: '{{count}} 小时', count: Math.round(windowMinutes / 60) });
  return t('expanded.agentUsage.window.unknown', { defaultValue: '额度' });
}

/**
 * 根据已用百分比返回警示等级。
 * @param percent - 已用百分比
 * @returns ≥90 为 danger，≥70 为 warn，否则为 null
 */
export function quotaLevel(percent: number): 'danger' | 'warn' | null {
  if (percent >= 90) return 'danger';
  if (percent >= 70) return 'warn';
  return null;
}

/**
 * 生成额度重置提示。
 * @param resetsAt - 重置时间戳（毫秒）
 * @param now - 当前时间戳（毫秒）
 * @param t - 翻译函数
 * @returns 重置提示，无重置时间时为空串
 */
export function resetLabel(resetsAt: number | null, now: number, t: Translate): string {
  if (resetsAt === null) return '';
  if (resetsAt <= now) return t('expanded.agentUsage.resetDone', { defaultValue: '已重置' });
  return t('expanded.agentUsage.resetIn', { defaultValue: '{{time}}后重置', time: formatDuration(resetsAt - now) });
}

/**
 * 计算额度窗口的展示百分比，已过重置时间但日志未刷新时按 0 处理。
 * @param quota - 额度窗口
 * @param now - 当前时间戳（毫秒）
 * @returns 展示用百分比
 */
export function effectivePercent(quota: AgentUsageRateLimitWindow, now: number): number {
  return quota.resetsAt !== null && quota.resetsAt <= now ? 0 : quota.usedPercent;
}
