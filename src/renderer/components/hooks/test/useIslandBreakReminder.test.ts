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
 * @file useIslandBreakReminder.test.ts
 * @description 休息提醒真实轮询、图标迁移、间隔通知、稍后提醒事件与原生存储失败测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIslandBreakReminder } from '../useIslandBreakReminder';
import { SvgIcon } from '../../../utils/SvgIcon';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './startupHookHarness';
import type { NotificationData } from '../../../store/types';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('./startupHookHarness');
  return createHookReactMock(actual);
});

const read = vi.fn();
const write = vi.fn();
const notification = vi.fn<(data: NotificationData) => void>();
let nativeWindow: EventTarget & { api?: { storeRead: typeof read; storeWrite: typeof write } };
let items: unknown;
let options: Parameters<typeof useIslandBreakReminder>[0];

/** 创建外部存储中的提醒条目。
 * @param extra - 需要替换的持久化字段
 * @returns 原生存储快照
 */
function item(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'water', name: 'Drink water', enabled: true, intervalMinutes: 1, icon: 'water.svg', ...extra };
}

/** 提交真实生命周期并等待首次原生读取。 */
async function mount(): Promise<void> {
  renderHook(useIslandBreakReminder, options);
  flushHookEffects();
  await settleHook();
}

/** 前进真实轮询时钟。
 * @param ms - 前进的毫秒数，默认一次轮询
 */
async function tick(ms = 10000): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await settleHook();
}

/** 通过真实窗口事件触发稍后提醒。
 * @param detail - 来自通知界面的事件载荷
 */
function snooze(detail: unknown): void {
  nativeWindow.dispatchEvent(new CustomEvent('break-reminder-snooze', { detail }));
}

beforeEach(() => {
  resetHook();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date(2026, 9, 5, 8, 0, 0));
  items = [];
  read.mockReset().mockImplementation(() => Promise.resolve(items));
  write.mockReset().mockResolvedValue(true);
  notification.mockReset();
  nativeWindow = Object.assign(new EventTarget(), { api: { storeRead: read, storeWrite: write } });
  vi.stubGlobal('window', nativeWindow);
  options = { language: 'zh-CN', setNotificationRef: { current: notification }, t: (key) => key };
});

afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('reminder polling', () => {
  it.each([null, {}, []])('ignores unusable stored lists %j', async (data) => {
    items = data;
    await mount();
    await tick();
    expect(notification).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it.each([item({ enabled: false }), item({ intervalMinutes: 0 }), item({ name: '' }), item({ name: '  ' }), item({ name: undefined })])('does not initialize invalid or disabled reminders %j', async (invalid) => {
    items = [invalid];
    await mount();
    await tick(60000);
    expect(notification).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it('initializes timing immediately and notifies only when the interval elapses', async () => {
    items = [item()];
    await mount();
    expect(read).toHaveBeenCalledWith('break-reminder-items');
    expect(write).toHaveBeenCalledWith('break-reminder-last-fired', { water: Date.now() });
    write.mockClear();
    await tick(50000);
    expect(notification).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    await tick();
    expect(notification).toHaveBeenCalledWith({ title: 'settings.breakReminder.notificationTitle', body: 'settings.breakReminder.notificationBody', icon: 'water.svg', breakReminderItemId: 'water' });
    await tick(60000);
    expect(notification).toHaveBeenCalledTimes(2);
  });

  it('migrates missing icons while preserving already configured icons', async () => {
    items = [item({ icon: undefined }), item({ id: 'stretch', icon: 'stretch.svg' })];
    await mount();
    expect(write).toHaveBeenCalledWith('break-reminder-items', [item({ icon: SvgIcon.BREAK }), item({ id: 'stretch', icon: 'stretch.svg' })]);
    await tick(60000);
    expect(notification.mock.calls.map(([data]) => data.icon)).toEqual([SvgIcon.BREAK, 'stretch.svg']);
  });

  it('prunes deleted entries and initializes their replacement from the current time', async () => {
    items = [item()];
    await mount();
    items = [item({ id: 'stretch' })];
    await tick();
    expect(write).toHaveBeenLastCalledWith('break-reminder-last-fired', { stretch: Date.now() });
    await tick(60000);
    expect(notification.mock.calls[0]?.[0].breakReminderItemId).toBe('stretch');
  });

  it('contains native read and write failures and continues polling', async () => {
    read.mockRejectedValueOnce(new Error('read unavailable'));
    write.mockRejectedValue(new Error('write unavailable'));
    items = [item({ icon: undefined })];
    await mount();
    await tick();
    await tick(60000);
    expect(notification).toHaveBeenCalledOnce();
    snooze({ itemId: 'water', snoozeMinutes: 2 });
    await settleHook();
  });

  it('cleans intervals and event listeners on dependency change and unmount', async () => {
    items = [item()];
    await mount();
    options = { ...options, language: 'en-US' };
    await mount();
    expect(vi.getTimerCount()).toBe(1);
    unmountHook();
    write.mockClear();
    snooze({ itemId: 'water', snoozeMinutes: 2 });
    await tick(60000);
    expect(write).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });

  it('contains an absent native bridge', async () => {
    nativeWindow.api = undefined;
    await mount();
    snooze({ itemId: 'unknown', snoozeMinutes: 2 });
    expect(write).not.toHaveBeenCalled();
  });
});

describe('snooze events', () => {
  it.each([undefined, {}, { itemId: '', snoozeMinutes: 2 }, { itemId: 'water', snoozeMinutes: 0 }])('ignores incomplete event detail %j', async (detail) => {
    await mount();
    snooze(detail);
    expect(write).not.toHaveBeenCalled();
  });

  it('delays a cached reminder by the requested time and then resumes its interval', async () => {
    items = [item()];
    await mount();
    const now = Date.now();
    snooze({ itemId: 'water', snoozeMinutes: 2 });
    expect(write).toHaveBeenLastCalledWith('break-reminder-last-fired', { water: now + 60000 });
    await tick(110000);
    expect(notification).not.toHaveBeenCalled();
    await tick();
    expect(notification).toHaveBeenCalledOnce();
  });

  it.each([{ data: [] }, { data: [item({ intervalMinutes: 0 })] }])('records an uncached or zero-interval item with the current time: $data', async ({ data }) => {
    items = data;
    await mount();
    snooze({ itemId: 'water', snoozeMinutes: 2 });
    expect(write).toHaveBeenLastCalledWith('break-reminder-last-fired', { water: Date.now() });
  });
});
