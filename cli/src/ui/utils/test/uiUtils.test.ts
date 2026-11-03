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
 * @description 验证交互界面的布局、输出窗口、翻页、任务切换、选择器窗口、说明滚动与 SMTC 展示计算
 * @author 鸡哥
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { initI18n } from '../../../core/i18n';
import {
  computeLayout, dashboardActions, descriptionWidth, formatBytes, formatTime, jsonLines, storageLayout, storeItemCount, storeValueType, formatDuration, hiddenTaskCount, livePosition, marqueeFrame, moveCursor,
  nextTaskIndex, outputRows, padDisplay, pageDownAnchor, pageUpAnchor, pickerRowWidth, pickerWindowStart, progressBar,
  sessionIds, statusText, windowStart,
} from '../uiUtils';

import type { SmtcSession } from '../../../core/smtc';
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
    expect(dashboardActions(undefined)).toEqual(['run', 'menu', 'quit']);
    expect(dashboardActions(task('running'))).toEqual(['run', 'stop', 'menu', 'quit']);
    expect(dashboardActions(task('failed', 1))).toEqual(['run', 'close', 'menu', 'quit']);
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

describe('说明列宽与滚动', () => {
  it('扣除任务框、边框与行首列宽', () => {
    expect(pickerRowWidth(100)).toBe(64);
    expect(pickerRowWidth(10)).toBe(0);
    expect(descriptionWidth(64, 10, '')).toBe(50);
    expect(descriptionWidth(64, 10, '[危险] ')).toBe(43);
    expect(descriptionWidth(10, 10, '')).toBe(0);
  });

  it('放得下时原样返回', () => {
    expect(marqueeFrame('short', 10, 5)).toBe('short');
    expect(marqueeFrame('anything', 0, 3)).toBe('anything');
  });

  it('放不下时按偏移截取并首尾循环', () => {
    expect(marqueeFrame('abcdefgh', 4, -2)).toBe('abcd');
    expect(marqueeFrame('abcdefgh', 4, 2)).toBe('cdef');
    expect(marqueeFrame('abcdefgh', 4, 6)).toBe('gh  ');
    expect(marqueeFrame('abcdefgh', 4, 10)).toBe(' abc');
    expect(marqueeFrame('abcdefgh', 4, 11)).toBe('abcd');
  });

  it('中日文字符按两列计算', () => {
    expect(marqueeFrame('上传发布产物', 4, 0)).toBe('上传');
    expect(marqueeFrame('上传发布产物', 4, 2)).toBe('传发');
  });
});

describe('菜单与 SMTC 展示', () => {
  const session = (overrides: Partial<SmtcSession>): SmtcSession => ({
    app: 'app', title: 't', artist: '', album: '', status: 'playing', position: 10, duration: 100, updated: 1_000, ...overrides,
  });

  it('光标限制在列表范围内', () => {
    expect(moveCursor(0, 2, -1)).toBe(0);
    expect(moveCursor(0, 2, 1)).toBe(1);
    expect(moveCursor(1, 2, 1)).toBe(1);
  });

  it('按显示宽度补齐', () => {
    expect(padDisplay('ab', 4)).toBe('ab  ');
    expect(padDisplay('仓库', 6)).toBe('仓库  ');
    expect(padDisplay('toolong', 3)).toBe('toolong');
  });

  it('播放中按经过时间推算位置并限制在总时长内', () => {
    expect(livePosition(session({}), 6_000)).toBe(15);
    expect(livePosition(session({}), 500_000)).toBe(100);
    expect(livePosition(session({ status: 'paused' }), 6_000)).toBe(10);
    expect(livePosition(session({ updated: -1 }), 6_000)).toBe(10);
    expect(livePosition(session({ duration: 0 }), 6_000)).toBe(0);
  });

  it('格式化时长与进度条', () => {
    expect(formatDuration(65.9)).toBe('1:05');
    expect(formatDuration(3_725)).toBe('1:02:05');
    expect(formatDuration(-3)).toBe('0:00');
    expect(progressBar(50, 100, 10)).toBe('━━━━━─────');
    expect(progressBar(500, 100, 4)).toBe('━━━━');
    expect(progressBar(5, 0, 4)).toBe('────');
  });
});

describe('本地存储展示', () => {
  it('扣除外框、标题、路径、提示与内框后分配行数', () => {
    expect(storageLayout(24)).toEqual({ listRows: 17, detailRows: 13 });
    expect(storageLayout(5)).toEqual({ listRows: 1, detailRows: 1 });
  });

  it('区分值类型并统计成员数', () => {
    expect([{}, [], 'a', 1, true, null].map(storeValueType)).toEqual(['object', 'array', 'string', 'number', 'boolean', 'null']);
    expect(storeItemCount({ a: 1, b: 2 })).toBe(2);
    expect(storeItemCount([1, 2, 3])).toBe(3);
    expect(storeItemCount('abc')).toBeNull();
    expect(storeItemCount(null)).toBeNull();
  });

  it('格式化 JSON 行、字节数与时刻', () => {
    expect(jsonLines({ a: [1] })).toEqual(['{', '  "a": [', '    1', '  ]', '}']);
    expect(jsonLines('x')).toEqual(['"x"']);
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(formatTime(new Date(2026, 0, 2, 3, 4, 5).getTime())).toBe('2026-01-02 03:04:05');
  });
});

describe('sessionIds', () => {
  it('同一应用的多个会话按出现顺序追加序号', () => {
    const sessions = ['Chrome.exe', 'Spotify.exe', 'Chrome.exe'].map((app) => ({ app }) as SmtcSession);
    expect(sessionIds(sessions)).toEqual(['Chrome.exe#0', 'Spotify.exe#0', 'Chrome.exe#1']);
  });
});
