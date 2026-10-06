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
 * @file useCitiesPersistence.test.ts
 * @description 城市持久化 Hook 真实规范化、默认值、外部广播去回写、失败与卸载保护测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCitiesPersistence } from '../useCitiesPersistence';
import { DEFAULT_CITIES } from '../../config/worldClockConfig';
import { STORE_KEY } from '../../types/worldClockTypes';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));

const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  storeWrite: vi.fn<Window['api']['storeWrite']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>()
};
const unsubscribe = vi.fn<() => void>();

/**
 * 渲染真实 Hook，保留持久化状态。
 * @returns 当前城市列表和公开 setter。
 */
function view() {
  return renderWithHooks(useCitiesPersistence);
}

/**
 * 执行加载和持久化的真实 effect。
 * @returns 更新后的城市状态。
 */
async function commit(): Promise<ReturnType<typeof view>> {
  view();
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  view();
  runEffects();
  await Promise.resolve();
  return view();
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  api.storeRead.mockResolvedValue([]);
  api.storeWrite.mockResolvedValue(true);
  api.onSettingsChanged.mockReturnValue(unsubscribe);
  vi.stubGlobal('window', { api });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

describe('useCitiesPersistence actual normalization and lifecycle', () => {
  it.each([[], null, 'bad'])('loads defaults for empty or nonarray native state %j', async (stored) => {
    api.storeRead.mockResolvedValueOnce(stored);
    expect((await commit()).cities).toEqual(DEFAULT_CITIES);
    expect(view().loaded).toBe(true);
    expect(api.storeWrite).toHaveBeenCalledWith(STORE_KEY, DEFAULT_CITIES);
  });

  it('normalizes legacy data, exposes public edits and contains write failure', async () => {
    api.storeRead.mockResolvedValueOnce([{ timezone: 'Asia/Shanghai' }, { label: 'Fallback' }]);
    api.storeWrite.mockRejectedValueOnce(new Error('denied'));
    expect((await commit()).cities).toEqual([
      { timezone: 'Asia/Shanghai', label: 'Asia/Shanghai', labelKey: undefined, order: 0 },
      { timezone: 'UTC', label: 'Fallback', labelKey: undefined, order: 1 }
    ]);
    view().setCities([]);
    await commit();
    expect(api.storeWrite).toHaveBeenLastCalledWith(STORE_KEY, []);
  });

  it('uses defaults after native read failure', async () => {
    api.storeRead.mockRejectedValueOnce(new Error('offline'));
    expect((await commit()).cities).toEqual(DEFAULT_CITIES);
    expect(view().loaded).toBe(true);
  });

  it('accepts only matching array broadcasts without echo and then persists a public edit', async () => {
    await commit();
    api.storeWrite.mockClear();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    listener('unrelated', []);
    listener(`store:${STORE_KEY}`, null);
    expect(view().cities).toEqual(DEFAULT_CITIES);
    listener(`store:${STORE_KEY}`, [{ timezone: 'UTC', label: 'External', order: 6 }]);
    await commit();
    expect(view().cities).toEqual([{ timezone: 'UTC', label: 'External', labelKey: undefined, order: 6 }]);
    expect(api.storeWrite).not.toHaveBeenCalled();
    view().setCities([]);
    await commit();
    expect(api.storeWrite).toHaveBeenCalledWith(STORE_KEY, []);
  });

  it.each(['success', 'failure'])('ignores late initial %s and stale broadcasts after cleanup', async (completion) => {
    let resolve!: (value: unknown) => void;
    let reject!: (error: Error) => void;
    api.storeRead.mockReturnValueOnce(new Promise((done, fail) => { resolve = done; reject = fail; }));
    view();
    runEffects();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    unmountHooks();
    listener(`store:${STORE_KEY}`, [{ timezone: 'UTC' }]);
    if (completion === 'success') resolve([{ timezone: 'UTC' }]);
    else reject(new Error('late failure'));
    await Promise.resolve();
    await Promise.resolve();
    expect(view().cities).toEqual([]);
    expect(view().loaded).toBe(false);
    expect(api.storeWrite).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
