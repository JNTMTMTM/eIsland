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
 * @file useCountdownItems.test.ts
 * @description 倒数日读取失败恢复、并发冲突重试与窗口同步回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateCreator } from 'zustand/vanilla';
import type { CountdownItem } from '../../types/countdownTypes';

const { effectMock } = vi.hoisted(() => ({ effectMock: vi.fn() }));
vi.mock('react', () => ({ useEffect: effectMock }));
// 使用真实 Zustand 状态存储，仅替换需要 React 渲染器的订阅入口。
vi.mock('zustand', async () => {
  const { createStore } = await import('zustand/vanilla');
  return {
    create: <T>(initializer: StateCreator<T>) => {
      const store = createStore(initializer);
      return Object.assign(() => store.getState(), store);
    },
  };
});

const first: CountdownItem = { id: 1, name: 'First', date: '2026-09-23', color: '#fff', type: 'countdown' };
const second: CountdownItem = { id: 2, name: 'Second', date: '2026-09-24', color: '#fff', type: 'countdown' };
const api = { storeRead: vi.fn(), storeCompareAndSwap: vi.fn(), onSettingsChanged: vi.fn() };
let useItems: typeof import('../useCountdownItems').useCountdownItems;
let sync: (channel: string, data: unknown) => void;
let cleanup: (() => void) | undefined;

/**
 * 等待初始读取 Promise 完成。
 * @returns 当前共享状态
 */
async function mountItems() {
  useItems();
  const effect = effectMock.mock.calls[0][0] as () => (() => void);
  cleanup = effect();
  await Promise.resolve();
  await Promise.resolve();
  return useItems();
}

beforeEach(async () => {
  vi.resetModules();
  effectMock.mockReset();
  api.storeRead.mockReset().mockResolvedValue([]);
  api.storeCompareAndSwap.mockReset().mockResolvedValue('updated');
  api.onSettingsChanged.mockReset().mockImplementation((callback) => {
    sync = callback;
    return vi.fn();
  });
  vi.stubGlobal('window', { api });
  useItems = (await import('../useCountdownItems')).useCountdownItems;
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
});

describe('useCountdownItems', () => {
  it('leaves loading after a failed read and permits a later save', async () => {
    api.storeRead.mockRejectedValueOnce(new Error('read failed'));
    const state = await mountItems();
    expect(state).toMatchObject({ loaded: true, error: true, saving: false });
    expect(await state.updateItems((items) => [...items, first])).toBe(true);
    expect(useItems()).toMatchObject({ items: [first], error: false, saving: false });
    expect(api.storeRead).toHaveBeenCalledWith('countdown-dates', true);
  });

  it('reapplies an update to fresh data after another window wins the race', async () => {
    const state = await mountItems();
    api.storeRead.mockResolvedValueOnce([]).mockResolvedValueOnce([first]);
    api.storeCompareAndSwap.mockResolvedValueOnce('conflict').mockResolvedValueOnce('updated');
    expect(await state.updateItems((items) => [...items, second])).toBe(true);
    expect(api.storeCompareAndSwap).toHaveBeenNthCalledWith(1, 'countdown-dates', [], [second]);
    expect(api.storeCompareAndSwap).toHaveBeenNthCalledWith(2, 'countdown-dates', [first], [first, second]);
    expect(useItems().items).toEqual([first, second]);
  });

  it('compares the raw snapshot even when invalid entries are filtered', async () => {
    const state = await mountItems();
    const raw = [first, { invalid: true }];
    api.storeRead.mockResolvedValueOnce(raw);
    expect(await state.updateItems((items) => [...items, second])).toBe(true);
    expect(api.storeCompareAndSwap).toHaveBeenCalledWith('countdown-dates', raw, [first, second]);
  });

  it('stops after repeated conflicts and allows the user to retry', async () => {
    const state = await mountItems();
    api.storeCompareAndSwap.mockResolvedValue('conflict');
    expect(await state.updateItems((items) => [...items, first])).toBe(false);
    expect(api.storeCompareAndSwap).toHaveBeenCalledTimes(5);
    expect(useItems()).toMatchObject({ items: [], error: true, saving: false });
    api.storeCompareAndSwap.mockResolvedValue('updated');
    expect(await state.updateItems((items) => [...items, first])).toBe(true);
  });

  it('does not attempt a write when the latest data cannot be read', async () => {
    const state = await mountItems();
    api.storeRead.mockRejectedValueOnce(new Error('read failed'));
    expect(await state.updateItems(() => [first])).toBe(false);
    expect(api.storeCompareAndSwap).not.toHaveBeenCalled();
    expect(useItems()).toMatchObject({ items: [], error: true, saving: false });
  });

  it('reports a failed write without committing local data', async () => {
    const state = await mountItems();
    api.storeCompareAndSwap.mockResolvedValueOnce('error');
    expect(await state.updateItems(() => [first])).toBe(false);
    expect(useItems()).toMatchObject({ items: [], error: true, saving: false });
  });

  it('does not replace a newer broadcast with a delayed successful save response', async () => {
    const state = await mountItems();
    api.storeCompareAndSwap.mockImplementationOnce(async () => {
      sync('store:countdown-dates', [first]);
      sync('store:countdown-dates', [first, second]);
      return 'updated';
    });
    expect(await state.updateItems(() => [first])).toBe(true);
    expect(useItems().items).toEqual([first, second]);
  });

  it.each(['resolve', 'reject'])('ignores a late initial read %s after a valid broadcast', async (outcome) => {
    let resolveRead!: (data: unknown) => void;
    let rejectRead!: (error: Error) => void;
    api.storeRead.mockReturnValueOnce(new Promise((resolve, reject) => {
      resolveRead = resolve;
      rejectRead = reject;
    }));
    await mountItems();
    sync('store:countdown-dates', [first]);
    if (outcome === 'resolve') resolveRead([]);
    else rejectRead(new Error('read failed'));
    await Promise.resolve();
    await Promise.resolve();
    expect(useItems()).toMatchObject({ loaded: true, error: false, items: [first] });
  });
});
