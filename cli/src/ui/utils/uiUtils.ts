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

import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';

import {
  ACTION_BOX_CHROME_COLUMNS, BOTTOM_CHROME_ROWS, BOTTOM_RATIO, FALLBACK_ROWS, MARQUEE_GAP, MIN_BOTTOM_ROWS,
  OUTPUT_CHROME_ROWS, PICKER_ROW_CHROME_COLUMNS, TASK_BOX_WIDTH,
} from '../config/uiConfig';
import { t } from '../../core/i18n';

import type { Action, DashboardLayout, OutputRow } from '../types/uiTypes';
import type { SmtcSession } from '../../core/smtc';
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
 * @returns 运行中提供结束，已结束提供关闭，没有任务时两者都不提供；始终可返回主菜单与退出
 */
export function dashboardActions(current: Task | undefined): Action[] {
  if (!current) return ['run', 'menu', 'quit'];
  return ['run', current.status === 'running' ? 'stop' : 'close', 'menu', 'quit'];
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
 * 计算操作框内每行可用列数
 * @param columns - 终端列数
 * @returns 扣除任务框与操作框边框、内边距后的列数
 */
export function pickerRowWidth(columns: number): number {
  return Math.max(0, columns - TASK_BOX_WIDTH - ACTION_BOX_CHROME_COLUMNS);
}

/**
 * 计算脚本行说明列的可用列数
 * @param rowWidth - 每行可用列数
 * @param nameWidth - 脚本名列宽
 * @param tag - 说明前的危险标记
 * @returns 说明可用列数，不小于 0
 */
export function descriptionWidth(rowWidth: number, nameWidth: number, tag: string): number {
  return Math.max(0, rowWidth - PICKER_ROW_CHROME_COLUMNS - nameWidth - stringWidth(tag));
}

/**
 * 截取滚动说明的当前片段
 * @description 按终端显示宽度截取，中日文字符占两列；首尾以空白衔接循环滚动
 * @param text - 完整说明
 * @param width - 可用列数
 * @param offset - 已滚动的列数，负数视为停留在开头
 * @returns 放得下时原样返回，否则返回宽度不超过可用列数的片段
 */
export function marqueeFrame(text: string, width: number, offset: number): string {
  const textWidth = stringWidth(text);
  if (width <= 0 || textWidth <= width) return text;
  const start = Math.max(0, offset) % (textWidth + MARQUEE_GAP.length);
  return sliceAnsi(`${text}${MARQUEE_GAP}${text}`, start, start + width);
}

/**
 * 在列表中移动光标
 * @param index - 当前下标
 * @param length - 列表长度
 * @param delta - 移动量，-1 向上，1 向下
 * @returns 限制在列表范围内的新下标
 */
export function moveCursor(index: number, length: number, delta: number): number {
  return Math.max(0, Math.min(length - 1, index + delta));
}

/**
 * 按终端显示宽度右侧补齐空格
 * @description 中日文字符占两列，按字符数补齐会导致说明列错位
 * @param text - 文本
 * @param width - 目标列数
 * @returns 补齐后的文本，超出时原样返回
 */
export function padDisplay(text: string, width: number): string {
  return `${text}${' '.repeat(Math.max(0, width - stringWidth(text)))}`;
}

/**
 * 推算当前播放位置
 * @description SMTC 的时间线只在应用上报时更新，播放中按距上次更新的经过时间补齐，避免进度停顿
 * @param session - 媒体会话
 * @param now - 当前时刻（Unix 毫秒）
 * @returns 播放位置（秒），不超过总时长
 */
export function livePosition(session: SmtcSession, now: number): number {
  if (session.duration <= 0) return 0;
  const elapsed = session.status === 'Playing' && session.updated > 0 ? Math.max(0, now - session.updated) / 1000 : 0;
  return Math.min(session.duration, session.position + elapsed);
}

/**
 * 格式化时长
 * @param seconds - 秒数
 * @returns 不足一小时为 m:ss，否则为 h:mm:ss
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (value: number): string => String(value).padStart(2, '0');
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(total % 60)}` : `${minutes}:${pad(total % 60)}`;
}

/**
 * 生成播放进度条
 * @param position - 播放位置（秒）
 * @param duration - 总时长（秒）
 * @param width - 进度条列数
 * @returns 已播放部分为粗线、剩余部分为细线的进度条
 */
export function progressBar(position: number, duration: number, width: number): string {
  const filled = duration > 0 ? Math.round((Math.min(position, duration) / duration) * width) : 0;
  return `${'━'.repeat(filled)}${'─'.repeat(width - filled)}`;
}

/**
 * 获取任务状态文案
 * @param task - 任务
 * @returns 本地化状态，失败时包含退出码
 */
export function statusText(task: Task): string {
  return task.status === 'failed' ? t('devCli.dashboard.status.failed', { code: task.code }) : t(`devCli.dashboard.status.${task.status}`);
}
