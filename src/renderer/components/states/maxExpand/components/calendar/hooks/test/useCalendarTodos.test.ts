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
 * @file useCalendarTodos.test.ts
 * @description 日历待办真实标准化、原生事件同步、存储回退与卸载竞争测试
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEY, STORE_KEY, TODOS_UPDATED_EVENT } from '../../../todo/config/todoConfig';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './calendarHookHarness';

const { useCalendarTodos } = await import('../useCalendarTodos');
let events: EventEmitter;
let nativeWindow: EventTarget;
let read: ReturnType<typeof deferred<unknown>>;
let storage: Map<string, string>;
let getItem: ReturnType<typeof vi.fn<(key: string) => string | null>>;
const todo = { id: 1, text: '真实待办', completed: false, createdAt: 1 };

/** 提交真实生命周期并返回同步后的待办。
 * @returns 标准化待办列表
 */
function render(): ReturnType<typeof useCalendarTodos> {
  const result = renderHook(useCalendarTodos); flushHookEffects(); return result;
}

beforeEach(() => {
  resetHook(); events = new EventEmitter(); read = deferred<unknown>(); storage = new Map();
  nativeWindow = Object.assign(new EventTarget(), { api: {
    storeRead: vi.fn(() => read.promise),
    onSettingsChanged: (listener: (channel: string, value: unknown) => void) => {
      events.on('settings', listener); return () => { events.off('settings', listener); };
    },
  } });
  vi.stubGlobal('window', nativeWindow);
  getItem = vi.fn((key: string) => storage.get(key) ?? null);
  vi.stubGlobal('localStorage', { getItem });
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });

it('reads and normalizes the actual stored todos without writing data', async () => {
  expect(render()).toEqual([]); read.resolve([todo]); await settleHook();
  expect(render()).toEqual([expect.objectContaining({ id: 1, text: '真实待办', subTodos: [] })]);
  expect(window.api.storeRead).toHaveBeenCalledWith(STORE_KEY);
});

it.each([null, {}, 'invalid'])('falls back to local storage for non-array IPC data %s', async (value) => {
  storage.set(LOCAL_STORAGE_KEY, JSON.stringify([todo])); render(); read.resolve(value); await settleHook();
  expect(render()[0].text).toBe('真实待办');
});

it.each(['absent', 'invalid', 'non-array', 'throws'])('preserves an empty list for unavailable cache: %s', async (mode) => {
  if (mode === 'invalid') storage.set(LOCAL_STORAGE_KEY, '{');
  if (mode === 'non-array') storage.set(LOCAL_STORAGE_KEY, '{}');
  if (mode === 'throws') getItem.mockImplementation(() => { throw new Error('storage blocked'); });
  render(); read.reject(new Error('IPC failed')); await settleHook(); expect(render()).toEqual([]);
});

it('accepts matching native IPC broadcasts and ignores unrelated channels and malformed payloads', () => {
  render(); events.emit('settings', 'store:other', [todo]); expect(render()).toEqual([]);
  events.emit('settings', `store:${STORE_KEY}`, [todo]); expect(render()[0].id).toBe(1);
  events.emit('settings', `store:${STORE_KEY}`, null); expect(render()[0].id).toBe(1);
});

it.each(['resolve', 'reject'])('keeps live local updates when the initial read later %s', async (outcome) => {
  render(); nativeWindow.dispatchEvent(new CustomEvent(TODOS_UPDATED_EVENT, { detail: [todo] }));
  if (outcome === 'resolve') read.resolve([]); else read.reject(new Error('late failure'));
  await settleHook(); expect(render()[0].id).toBe(1);
});

it.each(['resolve', 'reject'])('discards initial storage work after unmount: %s', async (outcome) => {
  render(); unmountHook();
  if (outcome === 'resolve') read.resolve([todo]); else read.reject(new Error('late failure'));
  await settleHook(); expect(getItem).not.toHaveBeenCalled();
  expect(events.listenerCount('settings')).toBe(0);
});

it('ignores an IPC listener already in the native emitter snapshot when another listener unmounts the hook', () => {
  events.on('settings', () => unmountHook()); render(); events.emit('settings', `store:${STORE_KEY}`, [todo]);
  expect(renderHook(useCalendarTodos)).toEqual([]);
});
