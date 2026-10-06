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
 * @file useWorldClockState.test.ts
 * @description 世界时钟组合 Hook 真实存储、城市操作、tick 定时刷新和界面状态集成测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldClockState } from '../useWorldClockState';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import { CLOCK_UPDATE_INTERVAL_MS } from '../../config/worldClockConfig';
import { STORE_KEY } from '../../types/worldClockTypes';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const language = vi.hoisted(() => ({ resolvedLanguage: 'en-US', language: 'zh-CN' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: language }) }));
vi.mock('@multisystemsuite/timezone-engine-core', async (original) => ({ ...(await original<typeof import('@multisystemsuite/timezone-engine-core')>()), getUserTimezone: () => 'UTC' }));
const api = { storeRead: vi.fn<Window['api']['storeRead']>(), storeWrite: vi.fn<Window['api']['storeWrite']>(), onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>() };
const unsubscribe = vi.fn<() => void>();
/**
 * 提交真实组合 Hook 的加载和定时刷新 effect。
 * @returns 真实城市、tick 与界面公开操作。
 */
async function view() {
  renderWithHooks(useWorldClockState);
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  renderWithHooks(useWorldClockState);
  runEffects();
  await Promise.resolve();
  return renderWithHooks(useWorldClockState);
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
  language.resolvedLanguage = 'en-US';
  language.language = 'zh-CN';
  api.storeRead.mockResolvedValue([{ timezone: 'UTC', label: 'UTC', order: 0 }]);
  api.storeWrite.mockResolvedValue(true);
  api.onSettingsChanged.mockReturnValue(unsubscribe);
  vi.stubGlobal('window', { api });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useWorldClockState actual child hooks', () => {
  it('loads native cities, persists public additions/removals and drives real clock ticks', async () => {
    const current = await view();
    expect(current).toMatchObject({ loaded: true, localTimezone: 'UTC', showPicker: false });
    expect(current.ticks[0].handAngles.second).toBe(30);
    current.setShowPicker(true);
    current.addCity({ timezone: 'Asia/Shanghai', label: 'Shanghai', order: 99 });
    const added = await view();
    expect(added.showPicker).toBe(true);
    expect(added.cities).toHaveLength(2);
    expect(added.ticks).toHaveLength(2);
    expect(api.storeWrite).toHaveBeenLastCalledWith(STORE_KEY, added.cities);
    added.addCity({ timezone: 'Etc/UTC', label: 'Alias', order: 99 });
    expect((await view()).cities).toHaveLength(2);
    vi.advanceTimersByTime(CLOCK_UPDATE_INTERVAL_MS);
    expect((await view()).ticks[0].handAngles.second).toBe(36);
    (await view()).removeCity('Asia/Shanghai');
    expect((await view()).ticks).toHaveLength(1);
    (await view()).setShowPicker(false);
    expect((await view()).showPicker).toBe(false);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it('uses fallback language when resolvedLanguage is empty and handles empty broadcasts', async () => {
    language.resolvedLanguage = '';
    const current = await view();
    expect(current.ticks[0].formattedDate).toBe(new Intl.DateTimeFormat('zh-CN', { timeZone: 'UTC', month: 'numeric', day: 'numeric' }).format(new Date()));
    const [[listener]] = api.onSettingsChanged.mock.calls;
    listener(`store:${STORE_KEY}`, []);
    expect((await view()).ticks).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
