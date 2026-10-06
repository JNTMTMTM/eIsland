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
 * @file contentFrameAndAnimationRuntime.test.ts
 * @description 全展开内容就绪帧与切页动画真实 IPC 事件、卸载竞争测试
 * @author 鸡哥
 */
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import { useContentReady } from '../useContentReady';
import { useTabAnimation } from '../useTabAnimation';
let events: EventEmitter;
let read: ReturnType<typeof deferred<unknown>>;
beforeEach(() => {
  resetHook(); vi.useFakeTimers(); events = new EventEmitter(); read = deferred<unknown>();
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(16), 16), cancelAnimationFrame: (id: number) => clearTimeout(id),
    api: { storeRead: () => read.promise, onSettingsChanged: (listener: (channel: string, value: unknown) => void) => {
      events.on('settings', listener); return () => { events.off('settings', listener); };
    } },
  }));
});
afterEach(() => { unmountHook(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it.each([false, true])('marks content ready for native deferContent=%s', async (defer) => {
  expect(renderHook(useContentReady, defer)).toBe(!defer); flushHookEffects(); await vi.advanceTimersByTimeAsync(16);
  expect(renderHook(useContentReady, defer)).toBe(true);
});
it('cancels the ready frame on unmount or immediate mode', () => {
  renderHook(useContentReady, true); flushHookEffects(); expect(vi.getTimerCount()).toBe(1);
  renderHook(useContentReady, false); flushHookEffects(); expect(vi.getTimerCount()).toBe(0); expect(renderHook(useContentReady, false)).toBe(true);
  renderHook(useContentReady, true); flushHookEffects(); unmountHook(); expect(vi.getTimerCount()).toBe(0);
});
it.each([false, true, null])('reads real animation setting %s and filters IPC channels', async (value) => {
  expect(renderHook(useTabAnimation)).toBe(true); flushHookEffects(); read.resolve(value); await settleHook();
  expect(renderHook(useTabAnimation)).toBe(value !== false); events.emit('settings', 'other', false); expect(renderHook(useTabAnimation)).toBe(value !== false);
  events.emit('settings', 'settings:maxexpand-tab-animation', false); expect(renderHook(useTabAnimation)).toBe(false);
  events.emit('settings', 'settings:maxexpand-tab-animation', true); expect(renderHook(useTabAnimation)).toBe(true);
});
it.each(['resolve', 'reject'])('discards animation read work after unmount: %s', async (outcome) => {
  renderHook(useTabAnimation); flushHookEffects(); unmountHook();
  if (outcome === 'resolve') read.resolve(false); else read.reject(new Error('IPC failed'));
  await settleHook(); expect(renderHook(useTabAnimation)).toBe(true); expect(events.listenerCount('settings')).toBe(0);
});
it('contains IPC failure and an emitter snapshot already queued before another listener unmounts', async () => {
  events.on('settings', () => unmountHook()); renderHook(useTabAnimation); flushHookEffects(); read.reject(new Error('IPC failed')); await settleHook();
  events.emit('settings', 'settings:maxexpand-tab-animation', false); expect(renderHook(useTabAnimation)).toBe(true);
});
