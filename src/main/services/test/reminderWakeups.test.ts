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
 * @file reminderWakeups.test.ts
 * @description 主进程统一管理到期唤醒，不依赖隐藏页面定时器。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { registerReminderWakeups } from '../reminderWakeups';
const electron = vi.hoisted(() => ({ handle: vi.fn(), app: new Map<string, () => void>(), power: new Map<string, () => void>() }));
vi.mock('electron', () => ({
  ipcMain: { handle: electron.handle },
  app: { once: (key: string, fn: () => void) => electron.app.set(key, fn) },
  powerMonitor: { on: (key: string, fn: () => void) => electron.power.set(key, fn), removeListener: vi.fn() },
}));
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); registerReminderWakeups(); });
afterEach(() => { electron.app.get('before-quit')?.(); vi.useRealTimers(); });
function client() {
  const sender = Object.assign(new EventEmitter(), { send: vi.fn(), isDestroyed: () => false });
  const schedule = (id: unknown, deadline: unknown): boolean => electron.handle.mock.calls[0][1]({ sender }, id, deadline);
  return { sender, schedule };
}
it('shares one timer and sends one event per due task, with no idle timer', () => {
  const { sender, schedule } = client();
  expect(vi.getTimerCount()).toBe(0);
  schedule('one', 1000); schedule('two', 2000);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(1000);
  expect(sender.send).toHaveBeenCalledWith('settings:changed', 'runtime:wakeup', 'one');
  schedule('two', null);
  expect(vi.getTimerCount()).toBe(0);
});
it('caps each renderer, rejects malformed requests and clears navigation/destruction', () => {
  const { sender, schedule } = client();
  expect(schedule('', 1)).toBe(false); expect(schedule('bad', Infinity)).toBe(false);
  Array.from({ length: 64 }, (_, id) => expect(schedule(String(id), 1000)).toBe(true));
  expect(schedule('overflow', 1000)).toBe(false);
  sender.emit('did-start-navigation', {}, 'url', false, true);
  expect(vi.getTimerCount()).toBe(0);
  expect(schedule('new', 1000)).toBe(true);
  sender.emit('destroyed');
  expect(vi.getTimerCount()).toBe(0);
});
it('reconciles elapsed wall time after resume and releases all work on quit', () => {
  const { sender, schedule } = client();
  schedule('alarm', 60_000); vi.setSystemTime(3_600_000); electron.power.get('resume')?.();
  expect(sender.send).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
  schedule('next', 9_000_000); electron.app.get('before-quit')?.();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(['timer', 'resume'])('notifies timezone changes before due events through %s without shifting deadlines', (trigger) => {
  const { sender, schedule } = client();
  const initialOffset = new Date().getTimezoneOffset();
  schedule('alarm', 60_000); schedule('countdown', 90_000);
  vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(initialOffset + 60);
  if (trigger === 'timer') vi.advanceTimersByTime(60_000);
  else { vi.setSystemTime(60_000); electron.power.get('resume')?.(); }
  expect(sender.send.mock.calls).toEqual([
    ['settings:changed', 'runtime:clock-changed', initialOffset + 60],
    ['settings:changed', 'runtime:wakeup', 'alarm'],
  ]);
  vi.advanceTimersByTime(30_000);
  expect(sender.send.mock.calls.at(-1)).toEqual(['settings:changed', 'runtime:wakeup', 'countdown']);
  expect(sender.send).toHaveBeenCalledTimes(3);
  expect(vi.getTimerCount()).toBe(0);
});
