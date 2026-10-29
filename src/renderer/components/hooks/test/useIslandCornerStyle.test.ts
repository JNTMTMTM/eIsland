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
 * @file useIslandCornerStyle.test.ts
 * @description 验证边角设置只展示已提交值、保存失败反馈以及过期请求隔离。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIslandCornerStyle } from '../useIslandCornerStyle';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../states/maxExpand/components/setting/components/app/components/test/themeHookHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../test/elementHarness')).hookMocks,
  ...(await import('../../states/maxExpand/components/setting/components/app/components/test/themeHookHarness')).lifecycleHooks,
}));
const api = {
  storeRead: vi.fn<() => Promise<unknown>>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<boolean>>(),
  onSettingsChanged: vi.fn<(callback: (channel: string, value: unknown) => void) => () => void>(),
};
/**
 * 求值实际 Hook 并保留状态与生命周期。
 * @returns 当前 Hook 的状态与保存函数。
 */
function render() { return renderWithHooks(useIslandCornerStyle); }
/** 等待保存请求的微任务完成。 */
async function settle(): Promise<void> { await Promise.resolve(); await Promise.resolve(); }
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.storeRead.mockResolvedValue('rounded');
  api.storeWrite.mockResolvedValue(true);
  api.onSettingsChanged.mockReturnValue(vi.fn());
  vi.stubGlobal('window', { api });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('committed corner styles', () => {
  it.each(['false', 'rejection'])('retains the committed style and exposes %s save failures', async (failure) => {
    render(); runEffects(); await settle();
    if (failure === 'false') api.storeWrite.mockResolvedValue(false);
    else api.storeWrite.mockRejectedValue(new Error('disk full'));
    render()[1]('concave');
    await settle();
    expect(render()[0]).toBe('rounded');
    expect(render()[2]).toBe(true);
    expect(api.storeWrite).toHaveBeenCalledWith('island-corner-style', 'concave');
  });
  it('uses the main-process broadcast instead of displaying an uncommitted local preview', async () => {
    render(); runEffects(); await settle();
    render()[1]('concave');
    expect(render()[0]).toBe('rounded');
    api.onSettingsChanged.mock.calls[0][0]('store:island-corner-style', 'concave');
    await settle();
    expect(render()[0]).toBe('concave');
    expect(render()[2]).toBe(false);
  });
  it('ignores a stale failure after a newer selection succeeds', async () => {
    let rejectOld: (error: Error) => void = () => {};
    api.storeWrite.mockImplementationOnce(() => new Promise((resolve, reject) => { void resolve; rejectOld = reject; }));
    render(); runEffects(); await settle();
    render()[1]('concave');
    render()[1]('rounded');
    api.onSettingsChanged.mock.calls[0][0]('store:island-corner-style', 'rounded');
    await settle();
    rejectOld(new Error('old save failed'));
    await settle();
    expect(render()[0]).toBe('rounded');
    expect(render()[2]).toBe(false);
  });
  it('does not update error state after unmount', async () => {
    let resolveSave: (saved: boolean) => void = () => {};
    api.storeWrite.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    render(); runEffects(); await settle();
    render()[1]('concave');
    unmountHooks();
    resolveSave(false); await settle();
    expect(render()[2]).toBe(false);
  });
});
