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
 * @file useOverviewWorldClockConfig.test.ts
 * @description 总览时区真实持久化规范化、广播同步、公开 setter 与卸载保护测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOverviewWorldClockConfig } from '../useOverviewWorldClockConfig';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import { DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG, OVERVIEW_TIMEZONES_STORE_KEY } from '../../config/overviewWorldClockConfig';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const api = { storeRead: vi.fn<Window['api']['storeRead']>(), onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>() };
const unsubscribe = vi.fn<() => void>();
/**
 * 提交真实配置加载 effect。
 * @returns 当前配置及公开 setter。
 */
async function view() {
  renderWithHooks(useOverviewWorldClockConfig);
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  return renderWithHooks(useOverviewWorldClockConfig);
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  api.storeRead.mockResolvedValue(null);
  api.onSettingsChanged.mockReturnValue(unsubscribe);
  vi.stubGlobal('window', { api });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
describe('useOverviewWorldClockConfig real storage normalization', () => {
  it('loads default and accepts public local edits', async () => {
    const [config, setConfig] = await view();
    expect(config).toEqual(DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG);
    expect(api.storeRead).toHaveBeenCalledWith(OVERVIEW_TIMEZONES_STORE_KEY);
    setConfig({ timezones: ['UTC'] });
    expect((await view())[0]).toEqual({ timezones: ['UTC'] });
  });
  it('normalizes aliases and invalid values, accepts legacy broadcasts and ignores unrelated channels', async () => {
    api.storeRead.mockResolvedValueOnce({ timezones: ['US/Eastern', 'America/New_York', 3, 'bad', 'Asia/Shanghai', 'UTC'] });
    expect((await view())[0]).toEqual({ timezones: ['America/New_York', 'Asia/Shanghai'] });
    const [[listener]] = api.onSettingsChanged.mock.calls;
    listener('unrelated', { timezones: [] });
    expect((await view())[0].timezones).toHaveLength(2);
    listener(`store:${OVERVIEW_TIMEZONES_STORE_KEY}`, { firstTimezone: 'UTC', secondTimezone: 'Europe/London' });
    expect((await view())[0]).toEqual({ timezones: ['UTC', 'Europe/London'] });
  });
  it('contains native read rejection', async () => {
    api.storeRead.mockRejectedValueOnce(new Error('offline'));
    expect((await view())[0]).toEqual(DEFAULT_OVERVIEW_WORLD_CLOCK_CONFIG);
  });
  it('ignores pending reads and retained callbacks after cleanup', async () => {
    let resolve!: (value: unknown) => void;
    api.storeRead.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const [original] = await view();
    const [[listener]] = api.onSettingsChanged.mock.calls;
    unmountHooks();
    resolve({ timezones: ['UTC'] });
    listener(`store:${OVERVIEW_TIMEZONES_STORE_KEY}`, { timezones: ['Asia/Shanghai'] });
    await Promise.resolve();
    expect((await view())[0]).toBe(original);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
