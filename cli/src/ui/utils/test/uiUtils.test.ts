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
 * @file uiUtils.test.ts
 * @description 验证交互界面的布局、输出窗口、翻页、任务切换与选择器窗口计算
 * @author 鸡哥
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { initI18n } from '../../../core/i18n';
import {
  computeLayout, dashboardActions, hiddenTaskCount, nextTaskIndex, outputRows, pageDownAnchor, pageUpAnchor,
  pickerWindowStart, statusText, windowStart,
} from '../uiUtils';

import type { Task } from '../../../core/taskManager';

const task = (status: Task['status'], code: number | null = null): Task => ({ status, code, id: 1, name: 'dev', lines: [] });

beforeAll(() => initI18n('en-US'));

describe('windowStart', () => {
  it('跟随最新输出时展示末尾一屏', () => {
    expect(windowStart(100, 10, null)).toBe(90);
    expect(windowStart(5, 10, null)).toBe(0);
  });

  it('固定起始行不超过跟随位置', () => {
    expect(windowStart(100, 10, 40)).toBe(40);
    expect(windowStart(100, 10, 95)).toBe(90);
  });
});

describe('outputRows', () => {
  it('以绝对行号截取窗口内的行', () => {
    expect(outputRows(['a', 'b', 'c', 'd'], 1, 2)).toEqual([{ id: 1, text: 'b' }, { id: 2, text: 'c' }]);
    expect(outputRows(['a', 'b'], 1, 5)).toEqual([{ id: 1, text: 'b' }]);
  });
});

describe('翻页', () => {
  it('向上翻页不越过首行', () => {
    expect(pageUpAnchor(100, 10, null)).toBe(80);
    expect(pageUpAnchor(100, 10, 5)).toBe(0);
  });

  it('向下翻到底部时恢复跟随', () => {
    expect(pageDownAnchor(100, 10, 40)).toBe(50);
    expect(pageDownAnchor(100, 10, 80)).toBeNull();
  });
});

describe('computeLayout', () => {
  it('操作区占 40% 且至少 10 行，输出面板占用剩余高度', () => {
    expect(computeLayout(40)).toEqual({ rows: 40, bottomHeight: 16, bottomInnerRows: 13, outputHeight: 21 });
    expect(computeLayout(20)).toEqual({ rows: 20, bottomHeight: 10, bottomInnerRows: 7, outputHeight: 7 });
  });

  it('非终端输出流缺少行数时回退到 24 行', () => {
    expect(computeLayout(undefined).rows).toBe(24);
    expect(computeLayout(0).rows).toBe(24);
  });
});

describe('dashboardActions', () => {
  it('按当前任务状态提供结束或关闭', () => {
    expect(dashboardActions(undefined)).toEqual(['run', 'quit']);
    expect(dashboardActions(task('running'))).toEqual(['run', 'stop', 'quit']);
    expect(dashboardActions(task('failed', 1))).toEqual(['run', 'close', 'quit']);
  });
});

describe('nextTaskIndex', () => {
  it('前后循环切换', () => {
    expect(nextTaskIndex(2, 3, false)).toBe(0);
    expect(nextTaskIndex(0, 3, true)).toBe(2);
  });
});

describe('hiddenTaskCount', () => {
  it('超出可用行数时折叠，并为折叠提示预留一行', () => {
    expect(hiddenTaskCount(3, 5)).toBe(0);
    expect(hiddenTaskCount(8, 5)).toBe(4);
  });
});

describe('pickerWindowStart', () => {
  it('光标尽量居中且不越界', () => {
    expect(pickerWindowStart(0, 50, 10)).toBe(0);
    expect(pickerWindowStart(20, 50, 10)).toBe(15);
    expect(pickerWindowStart(49, 50, 10)).toBe(40);
  });
});

describe('statusText', () => {
  it('失败状态包含退出码', () => {
    expect(statusText(task('failed', 2))).toBe('failed (2)');
    expect(statusText(task('running'))).toBe('running');
  });
});
