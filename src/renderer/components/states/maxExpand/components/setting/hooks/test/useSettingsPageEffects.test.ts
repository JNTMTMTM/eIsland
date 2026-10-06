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
 * @file useSettingsPageEffects.test.ts
 * @description 页面切换重置、市场详情互斥及窗口导航读取取消回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsPageEffects } from '../useSettingsPageEffects';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './settingsCoverageHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
type Options = Parameters<typeof useSettingsPageEffects>[0];
const setters = {
  setUserInitialProfilePage: vi.fn(),
  setAboutInitialPage: vi.fn(),
  setWallpaperSearchExpanded: vi.fn(),
  setStandaloneMacControls: vi.fn(),
  setExpandNavLayout: vi.fn()
};
const storeRead = vi.fn<(key: string) => Promise<unknown>>();
let options: Options;
/**
 * 执行实际页面 effect。
 * @returns 无返回值。
 */
function mount(): void {
  renderWithHooks(() => useSettingsPageEffects(options));
  runEffects();
}
/**
 * 等待设置读取异步回调。
 * @returns 回调处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  options = {
    ...setters,
    activeTab: 'index',
    wallpaperDetailOpen: false,
    pluginMarketNavigationExpanded: false
  };
  storeRead.mockImplementation((key) => Promise.resolve(key === 'standalone-window-mac-controls' ? true : [{
    id: 'song',
    visible: false
  }]));
  vi.stubGlobal('window', {
    api: {
      storeRead
    }
  });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
describe('真实页面切换与读取', () => {
  it.each(['user', 'about', 'index'] as const)('切换%s仅重置其他详情页', async (activeTab) => {
    options.activeTab = activeTab;
    mount();
    await settle();
    expect(setters.setUserInitialProfilePage).toHaveBeenCalledTimes(activeTab === 'user' ? 0 : 1);
    expect(setters.setAboutInitialPage).toHaveBeenCalledTimes(activeTab === 'about' ? 0 : 1);
    expect(setters.setStandaloneMacControls).toHaveBeenCalledWith(true);
    expect(setters.setExpandNavLayout).toHaveBeenCalledWith(expect.arrayContaining([{
      id: 'song',
      visible: false
    }, {
      id: 'overview',
      visible: true
    }]));
  });
  it.each([{
    detail: false,
    navigation: true
  }, {
    detail: true,
    navigation: false
  }, {
    detail: true,
    navigation: true
  }])('壁纸详情=$detail导航展开=$navigation', ({
    detail,
    navigation
  }) => {
    options.wallpaperDetailOpen = detail;
    options.pluginMarketNavigationExpanded = navigation;
    mount();
    expect(setters.setWallpaperSearchExpanded).toHaveBeenCalledTimes(detail && navigation ? 1 : 0);
  });
  it('非布尔Mac配置和读失败不覆盖当前状态', async () => {
    storeRead.mockResolvedValue(null);
    mount();
    await settle();
    expect(setters.setStandaloneMacControls).not.toHaveBeenCalled();
    resetLifecycle();
    setters.setExpandNavLayout.mockClear();
    storeRead.mockRejectedValue(new Error('read'));
    mount();
    await settle();
    expect(setters.setExpandNavLayout).not.toHaveBeenCalled();
  });
  it('卸载忽略窗口和布局的迟到数据', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    storeRead.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    mount();
    unmountHooks();
    resolve(true);
    await settle();
    expect(setters.setStandaloneMacControls).not.toHaveBeenCalled();
    expect(setters.setExpandNavLayout).not.toHaveBeenCalled();
  });
});
