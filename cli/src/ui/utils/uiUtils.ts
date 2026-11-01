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
 * @file uiUtils.ts
 * @description 交互界面的纯计算：布局尺寸、输出窗口、翻页、任务切换与选择器窗口
 * @author 鸡哥
 */

import {
  BOTTOM_CHROME_ROWS, BOTTOM_RATIO, FALLBACK_ROWS, MIN_BOTTOM_ROWS, OUTPUT_CHROME_ROWS,
} from '../config/uiConfig';
import { t } from '../../core/i18n';

import type { Action, DashboardLayout, OutputRow } from '../types/uiTypes';
import type { Task } from '../../core/taskManager';

/**
 * 计算输出窗口的起始行
 * @description 翻看时以起始行而非距底部偏移定位，新输出持续到达时画面保持不动
 * @param length - 输出总行数
 * @param height - 可展示行数
 * @param anchor - 固定的起始行，null 表示跟随最新输出
 * @returns 起始行下标，不超过跟随最新时的起始行
 */
export function windowStart(length: number, height: number, anchor: number | null): number {
  const follow = Math.max(0, length - height);
  return anchor === null ? follow : Math.max(0, Math.min(anchor, follow));
}

/**
 * 截取输出窗口内的行
 * @param lines - 全部输出行
 * @param start - 起始行下标
 * @param height - 可展示行数
 * @returns 以绝对行号标识的可见行
 */
export function outputRows(lines: readonly string[], start: number, height: number): OutputRow[] {
  return Array.from({ length: Math.min(height, lines.length - start) }, (value, offset) => ({
    id: start + offset,
    text: lines[start + offset],
  }));
}

/**
 * 向上翻一页后的固定起始行
 * @param length - 输出总行数
 * @param height - 可展示行数
 * @param anchor - 当前固定的起始行
 * @returns 新的起始行，不小于 0
 */
export function pageUpAnchor(length: number, height: number, anchor: number | null): number {
  return Math.max(0, windowStart(length, height, anchor) - height);
}

/**
 * 向下翻一页后的固定起始行
 * @param length - 输出总行数
 * @param height - 可展示行数
 * @param anchor - 当前固定的起始行
 * @returns 新的起始行；翻到底部时返回 null 以恢复跟随最新输出
 */
export function pageDownAnchor(length: number, height: number, anchor: number | null): number | null {
  const nextStart = windowStart(length, height, anchor) + height;
  return nextStart >= windowStart(length, height, null) ? null : nextStart;
}

/**
 * 计算任务界面各区域尺寸
 * @param windowRows - 终端行数，非终端输出流为 0 或 undefined
 * @returns 输出面板与操作区的尺寸
 */
export function computeLayout(windowRows: number | undefined): DashboardLayout {
  const rows = windowRows || FALLBACK_ROWS;
  const bottomHeight = Math.max(MIN_BOTTOM_ROWS, Math.floor(rows * BOTTOM_RATIO));
  return {
    rows,
    bottomHeight,
    bottomInnerRows: bottomHeight - BOTTOM_CHROME_ROWS,
    outputHeight: Math.max(1, rows - bottomHeight - OUTPUT_CHROME_ROWS),
  };
}

/**
 * 根据当前任务生成可用操作
 * @param current - 当前查看的任务
 * @returns 运行中提供结束，已结束提供关闭，没有任务时两者都不提供
 */
export function dashboardActions(current: Task | undefined): Action[] {
  if (!current) return ['run', 'quit'];
  return ['run', current.status === 'running' ? 'stop' : 'close', 'quit'];
}

/**
 * 切换到相邻任务的下标
 * @param currentIndex - 当前任务下标
 * @param length - 任务总数
 * @param backwards - 是否向前切换（Shift+Tab）
 * @returns 循环后的下标
 */
export function nextTaskIndex(currentIndex: number, length: number, backwards: boolean): number {
  return (currentIndex + (backwards ? -1 : 1) + length) % length;
}

/**
 * 计算任务列表需折叠的任务数
 * @param total - 任务总数
 * @param maxListed - 可用行数
 * @returns 折叠数量；折叠提示本身占一行
 */
export function hiddenTaskCount(total: number, maxListed: number): number {
  return total > maxListed ? total - Math.max(1, maxListed - 1) : 0;
}

/**
 * 计算选择器窗口的起始下标，使光标尽量居中
 * @param index - 光标下标
 * @param total - 匹配总数
 * @param pageSize - 可见行数
 * @returns 起始下标
 */
export function pickerWindowStart(index: number, total: number, pageSize: number): number {
  return Math.max(0, Math.min(index - Math.floor(pageSize / 2), total - pageSize));
}

/**
 * 获取任务状态文案
 * @param task - 任务
 * @returns 本地化状态，失败时包含退出码
 */
export function statusText(task: Task): string {
  return task.status === 'failed' ? t('devCli.dashboard.status.failed', { code: task.code }) : t(`devCli.dashboard.status.${task.status}`);
}
