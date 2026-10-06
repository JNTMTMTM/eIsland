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
 * @file useCalendar.test.ts
 * @description 日历真实日期差、语言格式化、键盘导航、午夜与休眠恢复生命周期测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from './calendarHookHarness';
import type { KeyboardEvent } from 'react';

const localization = vi.hoisted(() => ({ language: 'zh-CN', resolvedLanguage: undefined as string | undefined }));
vi.doMock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: localization }) }));
const { useCalendar } = await import('../useCalendar');
let nativeWindow: EventTarget;

/** 提交真实日历生命周期。
 * @returns 当前日期状态及操作
 */
function render(): ReturnType<typeof useCalendar> {
  const hook = renderHook(useCalendar); flushHookEffects(); return hook;
}

beforeEach(() => {
  resetHook(); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 5, 12));
  localization.language = 'zh-CN'; localization.resolvedLanguage = undefined;
  nativeWindow = Object.assign(new EventTarget(), { setTimeout, clearTimeout });
  vi.stubGlobal('window', nativeWindow);
});
afterEach(() => { unmountHook(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each([-1, 0, 1])('computes real day differences and translated relative labels: %s', (difference) => {
  let hook = render(); hook.selectDate(new Date(2026, 9, 5 + difference, 23)); hook = render();
  expect(hook.difference).toBe(difference); expect(hook.selectedDay).toBe(5 + difference);
  const keys = { '-1': 'daysBefore', 0: 'today', 1: 'daysAfter' };
  expect(hook.relativeLabel).toBe(`maxExpand.calendar.${keys[String(difference) as keyof typeof keys]}`);
  expect(hook.formats.full.format(hook.selectedDate)).toContain('2026');
});

it('uses the resolved language when provided and otherwise the requested language', () => {
  expect(render().locale).toBe('zh-CN');
  localization.resolvedLanguage = 'en-US';
  const hook = render(); expect(hook.locale).toBe('en-US'); expect(hook.formats.month.format(hook.selectedDate)).toBe('October 2026');
});

it.each([
  { key: 'ArrowLeft', date: [9, 4] }, { key: 'ArrowRight', date: [9, 6] },
  { key: 'ArrowUp', date: [8, 28] }, { key: 'ArrowDown', date: [9, 12] },
  { key: 'Home', date: [9, 4] }, { key: 'End', date: [9, 10] },
  { key: 'PageUp', date: [8, 5] }, { key: 'PageDown', date: [10, 5] },
])('navigates through the real calendar utility on $key', ({ key, date }) => {
  const event = { key, preventDefault: vi.fn() };
  let hook = render(); hook.handleDateKeyDown(event as unknown as KeyboardEvent<HTMLElement>, hook.selectedDate); hook = render();
  expect(hook.month).toBe(date[0]); expect(hook.selectedDay).toBe(date[1]);
  expect(event.preventDefault).toHaveBeenCalledOnce(); expect(hook.focusDateRef.current).toBe(true);
});

it.each(['Enter', 'constructor', '__proto__'])('ignores unsupported native keys %s', (key) => {
  const event = { key, preventDefault: vi.fn() }; const hook = render();
  hook.handleDateKeyDown(event as unknown as KeyboardEvent<HTMLElement>, hook.selectedDate);
  expect(render().selectedDay).toBe(5); expect(event.preventDefault).not.toHaveBeenCalled();
});

it('refreshes today at midnight and on focus while preserving the selected date and removing listeners', async () => {
  render(); await vi.advanceTimersByTimeAsync(12 * 3600000 + 101);
  let hook = render(); expect(hook.today.getDate()).toBe(6); expect(hook.selectedDay).toBe(5);
  expect(vi.getTimerCount()).toBe(1);
  vi.setSystemTime(new Date(2026, 9, 8, 12)); nativeWindow.dispatchEvent(new Event('focus'));
  hook = render(); expect(hook.today.getDate()).toBe(8); expect(hook.selectedDay).toBe(5);
  unmountHook(); expect(vi.getTimerCount()).toBe(0);
  nativeWindow.dispatchEvent(new Event('focus'));
});
