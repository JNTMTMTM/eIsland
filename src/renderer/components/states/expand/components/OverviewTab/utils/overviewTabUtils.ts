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
 * @file overviewTabUtils.ts
 * @description Expanded 总览 Tab 的布局配置归一化、时钟字段与渐变变量计算，以及待办与快捷启动的不可变更新。
 * @author 鸡哥
 */

import {
  DEFAULT_LAYOUT,
  DEFAULT_OVERVIEW_GRADIENT_COLORS,
  OVERVIEW_CLOCK_STYLE_OPTIONS,
  OVERVIEW_WIDGET_OPTIONS,
} from '../config/overviewConfig';
import type { CSSProperties } from 'react';
import type {
  OverviewClockParts,
  OverviewClockStyle,
  OverviewLayoutConfig,
  OverviewWidgetType,
} from '../types/overviewTypes';
import type { TodoItem } from './types';

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * 标准化总览布局配置。
 * @param raw - 存储中的原始配置
 * @returns 合法的布局配置，非法字段回退默认值
 */
export function normalizeOverviewLayoutConfig(raw: unknown): OverviewLayoutConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_LAYOUT;
  }
  const candidate = raw as {
    left?: unknown;
    right?: unknown;
    clockStyle?: unknown;
    gradientColors?: {
      start?: unknown;
      middle?: unknown;
      end?: unknown;
    };
  };
  const widgetValues = new Set<OverviewWidgetType>(OVERVIEW_WIDGET_OPTIONS.map((item) => item.value));
  const clockStyleValues = new Set<OverviewClockStyle>(OVERVIEW_CLOCK_STYLE_OPTIONS.map((item) => item.value));
  const gradientColorsRaw = candidate.gradientColors;

  return {
    left: typeof candidate.left === 'string' && widgetValues.has(candidate.left as OverviewWidgetType)
      ? candidate.left as OverviewWidgetType
      : DEFAULT_LAYOUT.left,
    right: typeof candidate.right === 'string' && widgetValues.has(candidate.right as OverviewWidgetType)
      ? candidate.right as OverviewWidgetType
      : DEFAULT_LAYOUT.right,
    clockStyle: typeof candidate.clockStyle === 'string' && clockStyleValues.has(candidate.clockStyle as OverviewClockStyle)
      ? candidate.clockStyle as OverviewClockStyle
      : DEFAULT_LAYOUT.clockStyle,
    gradientColors: {
      start: isHexColor(gradientColorsRaw?.start) ? gradientColorsRaw.start : DEFAULT_OVERVIEW_GRADIENT_COLORS.start,
      middle: isHexColor(gradientColorsRaw?.middle) ? gradientColorsRaw.middle : DEFAULT_OVERVIEW_GRADIENT_COLORS.middle,
      end: isHexColor(gradientColorsRaw?.end) ? gradientColorsRaw.end : DEFAULT_OVERVIEW_GRADIENT_COLORS.end,
    },
  };
}

/**
 * 拆分中间时钟所需的补零日期时间字段。
 * @param now - 当前时间
 * @returns 时、分、秒、年、月、日
 */
export function getOverviewClockParts(now: Date): OverviewClockParts {
  return {
    hh: now.getHours().toString().padStart(2, '0'),
    mm: now.getMinutes().toString().padStart(2, '0'),
    ss: now.getSeconds().toString().padStart(2, '0'),
    yyyy: now.getFullYear(),
    month: (now.getMonth() + 1).toString().padStart(2, '0'),
    day: now.getDate().toString().padStart(2, '0'),
  };
}

/**
 * 渐变与极简时钟样式使用的 CSS 渐变变量。
 * @param layoutConfig - 布局配置
 * @returns CSS 变量，经典样式为 undefined
 */
export function buildGradientClockVars(layoutConfig: OverviewLayoutConfig): CSSProperties | undefined {
  if (layoutConfig.clockStyle !== 'gradient' && layoutConfig.clockStyle !== 'minimal') return undefined;
  return {
    '--ov-clock-gradient-start': layoutConfig.gradientColors.start,
    '--ov-clock-gradient-middle': layoutConfig.gradientColors.middle,
    '--ov-clock-gradient-end': layoutConfig.gradientColors.end,
  } as CSSProperties;
}

/**
 * 切换指定待办的完成状态。
 * @param todos - 待办列表
 * @param id - 待办 ID
 * @returns 新列表
 */
export function toggleTodoDone(todos: TodoItem[], id: number): TodoItem[] {
  return todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
}

/**
 * 切换指定子待办的完成状态。
 * @param todos - 待办列表
 * @param todoId - 父待办 ID
 * @param subId - 子待办 ID
 * @returns 新列表
 */
export function toggleSubTodoDone(todos: TodoItem[], todoId: number, subId: number): TodoItem[] {
  return todos.map(t => {
    if (t.id !== todoId || !t.subTodos) return t;
    return { ...t, subTodos: t.subTodos.map(s => s.id === subId ? { ...s, done: !s.done } : s) };
  });
}

/**
 * 删除指定待办。
 * @param todos - 待办列表
 * @param id - 待办 ID
 * @returns 新列表
 */
export function removeTodoById(todos: TodoItem[], id: number): TodoItem[] {
  return todos.filter(t => t.id !== id);
}

/**
 * 将元素从一个位置移到另一个位置。
 * @param items - 原列表
 * @param fromIndex - 原位置
 * @param toIndex - 目标位置
 * @returns 新列表
 */
export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const updated = [...items];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  return updated;
}
