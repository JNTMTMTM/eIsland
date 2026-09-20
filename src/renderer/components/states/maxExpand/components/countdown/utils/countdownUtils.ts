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
 * @file countdownUtils.ts
 * @description 倒数日模块纯工具函数。
 * @author 鸡哥
 */

import type { TFunction } from 'i18next';
import type { CountdownItem, CountdownDraft, EventType } from '../types/countdownTypes';

/**
 * 判断 src 是否可直接用于图片渲染。
 * @param src - 图片地址
 * @returns 是否支持直接渲染
 */
export function isRenderableImageSource(src: string): boolean {
  return src.startsWith('data:')
    || src.startsWith('http://')
    || src.startsWith('https://')
    || src.startsWith('file://')
    || src.startsWith('blob:')
    || src.startsWith('/');
}

/**
 * 将图片路径标准化为可渲染地址。
 * @param src - 本地路径或图片 URL
 * @returns 可渲染地址或空值
 */
export async function normalizeImageSource(src: string | undefined): Promise<string | undefined> {
  if (!src) return undefined;
  if (isRenderableImageSource(src)) return src;
  const dataUrl = await window.api.loadWallpaperFile(src).catch(() => null);
  return dataUrl || src;
}

/**
 * Date 转本地日期字符串。
 * @param d - 本地日期
 * @returns YYYY-MM-DD 字符串
 */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 按本地日历日期计算天数，使用 UTC 日期序号避免夏令时产生 23/25 小时偏差。
 * @param targetStr - YYYY-MM-DD 日期
 * @param now - 当前本地时间
 * @returns 日期差；无效日期为 NaN
 */
export function diffDays(targetStr: string, now = new Date()): number {
  const target = new Date(`${targetStr}T00:00:00`);
  return Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
    - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

/**
 * 推导本次周期日期，2 月 29 日在平年落到 2 月最后一天。
 * @param item - 事件
 * @param now - 当前日期
 * @returns 本周期目标日期
 */
export function occurrenceDate(item: CountdownItem, now = new Date()): string {
  if (item.repeat !== 'yearly' || item.mode === 'up') return item.date;
  const source = new Date(`${item.date}T00:00:00`);
  const inYear = (year: number): string => toLocalDateStr(new Date(year, source.getMonth(),
    Math.min(source.getDate(), new Date(year, source.getMonth() + 1, 0).getDate())));
  const year = Math.max(source.getFullYear(), now.getFullYear());
  const candidate = inYear(year);
  return diffDays(candidate, now) < 0 ? inYear(year + 1) : candidate;
}

/**
 * 统一归档判定：到期当天保留，到期次日归档；重复及正数事件不自动归档。
 * @param item - 事件
 * @param now - 当前日期
 * @returns 是否在归档列表展示
 */
export function isArchived(item: CountdownItem, now = new Date()): boolean {
  return Boolean(item.archived) || (item.expiryAction === 'archive' && item.repeat !== 'yearly'
    && item.mode !== 'up' && diffDays(item.date, now) < 0);
}

/**
 * 排序：置顶优先，然后临近的未到期事件，最后已过期/正数事件。
 * @param items - 待排序事件
 * @param now - 当前日期
 * @returns 不修改原数组的排序结果
 */
export function sortCountdownItems(items: CountdownItem[], now = new Date()): CountdownItem[] {
  const rank = (item: CountdownItem): number => {
    const days = diffDays(occurrenceDate(item, now), now);
    return days >= 0 ? days : 1000000 + Math.abs(days);
  };
  return [...items].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
    || rank(a) - rank(b) || a.id - b.id);
}

/**
 * 生成所有卡片共用的天数文案。
 * @param item - 事件及计时规则
 * @param t - 翻译函数
 * @param now - 当前日期
 * @returns 本地化日期关系文案
 */
export function countdownText(item: CountdownItem, t: TFunction, now = new Date()): string {
  const days = diffDays(occurrenceDate(item, now), now);
  if (!Number.isFinite(days)) return t('countdown.days.placeholder');
  if (item.mode === 'up' && days <= 0) {
    return t('countdown.days.elapsed', { days: Math.abs(days) + Number(Boolean(item.includeToday)) });
  }
  if (days === 0) return t('countdown.days.today');
  if (days === 1) return t('countdown.days.tomorrow');
  if (days === -1) return t('countdown.days.yesterday');
  return t(days > 0 ? 'countdown.days.after' : 'countdown.days.before', { days: Math.abs(days) });
}

/**
 * 新建分类的默认规则；历史条目不自动迁移。
 * @param type - 事件分类
 * @returns 默认计时方式和到期行为
 */
export function defaultRules(type: EventType): Pick<CountdownDraft, 'mode' | 'repeat' | 'expiryAction'> {
  return { mode: type === 'anniversary' ? 'up' : 'down',
    repeat: type === 'birthday' || type === 'holiday' ? 'yearly' : 'none', expiryAction: 'continue' };
}

/**
 * 校验存储数据，避免损坏条目使卡片和提醒产生无效日期。
 * @param data - 磁盘或同步通道内容
 * @returns 有效事件列表
 */
export function parseCountdownItems(data: unknown): CountdownItem[] {
  if (!Array.isArray(data)) return [];
  return (data as unknown[]).filter((raw): raw is CountdownItem => {
    if (!raw || typeof raw !== 'object') return false;
    const item = raw as Record<string, unknown>;
    return typeof item.id === 'number' && Number.isFinite(item.id) && typeof item.name === 'string'
      && typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      && Number.isFinite(diffDays(item.date))
      && toLocalDateStr(new Date(`${item.date}T00:00:00`)) === item.date
      && typeof item.color === 'string' && typeof item.type === 'string'
      && ['countdown', 'anniversary', 'birthday', 'holiday', 'exam'].includes(item.type);
  });
}
