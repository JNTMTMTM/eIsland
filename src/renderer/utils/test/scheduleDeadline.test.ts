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
 * @file scheduleDeadline.test.ts
 * @description 使用主进程到期事件，避免后台节流导致提醒丢失。
 * @author 鸡哥
 */

import { afterEach, expect, it, vi } from 'vitest';
import scheduleDeadline from '../scheduleDeadline';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('delivers once through main IPC without a renderer timer and cancels cleanup', async () => {
  vi.useFakeTimers();
  let listener: (channel: string, value: unknown) => void = () => {};
  const unsubscribe = vi.fn();
  const scheduleWakeup = vi.fn().mockResolvedValue(true);
  vi.stubGlobal('window', { api: { scheduleWakeup, onSettingsChanged: (fn: typeof listener) => { listener = fn; return unsubscribe; } } });
  const callback = vi.fn();
  const cancel = scheduleDeadline(Date.now() + 1000, callback);
  await Promise.resolve();
  expect(vi.getTimerCount()).toBe(0);
  const id = scheduleWakeup.mock.calls[0][0];
  listener('runtime:wakeup', id); listener('runtime:wakeup', id);
  expect(callback).toHaveBeenCalledOnce();
  cancel(); expect(scheduleWakeup).toHaveBeenLastCalledWith(id, null);
});
it('late main failure after cancellation cannot install a fallback', async () => {
  vi.useFakeTimers();
  let reject: (error: Error) => void = () => {};
  const pending = new Promise<boolean>((_resolve, onReject) => { reject = onReject; });
  const scheduleWakeup = vi.fn().mockImplementation((_id, deadline) => deadline === null ? Promise.resolve(true) : pending);
  vi.stubGlobal('window', { api: { scheduleWakeup, onSettingsChanged: () => () => {} } });
  const callback = vi.fn(); const cancel = scheduleDeadline(Date.now() + 1000, callback);
  cancel(); reject(new Error('closed'));
  await Promise.resolve(); await Promise.resolve();
  expect(vi.getTimerCount()).toBe(0); expect(callback).not.toHaveBeenCalled();
});
