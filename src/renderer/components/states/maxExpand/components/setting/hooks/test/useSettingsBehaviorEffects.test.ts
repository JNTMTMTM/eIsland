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
 * @file useSettingsBehaviorEffects.test.ts
 * @description 隐藏进程及全屏配置读取类型过滤、失败隔离和卸载取消回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsBehaviorEffects } from '../useSettingsBehaviorEffects';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './settingsCoverageHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
const setters = {
  setHideProcessList: vi.fn(),
  setAutoHideFullscreenWindowsState: vi.fn(),
  setRunningProcesses: vi.fn()
};
const api = {
  hideProcessListGet: vi.fn<() => Promise<unknown>>(),
  autoHideFullscreenWindowsGet: vi.fn<() => Promise<unknown>>(),
  getOpenWindowsWithIcons: vi.fn<() => Promise<unknown>>()
};
/**
 * 执行真实进程设置读取 effect。
 * @returns 无返回值。
 */
function mount(): void {
  renderWithHooks(() => useSettingsBehaviorEffects(setters));
  runEffects();
}
/**
 * 等待配置读取回调。
 * @returns 异步回调处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.hideProcessListGet.mockResolvedValue(['App.exe']);
  api.autoHideFullscreenWindowsGet.mockResolvedValue(true);
  api.getOpenWindowsWithIcons.mockResolvedValue([{
    title: 'Editor',
    id: '1'
  }, null, {}, {
    title: 42
  }]);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
describe('真实进程和全屏初始化', () => {
  it('成功读取只保留字符串标题条目', async () => {
    mount();
    await settle();
    expect(setters.setHideProcessList).toHaveBeenCalledWith(['App.exe']);
    expect(setters.setAutoHideFullscreenWindowsState).toHaveBeenCalledWith(true);
    expect(setters.setRunningProcesses).toHaveBeenCalledWith([{
      title: 'Editor',
      id: '1'
    }]);
  });
  it('非法列表不覆盖，只接受true为全屏隐藏启用', async () => {
    api.hideProcessListGet.mockResolvedValue(42);
    api.getOpenWindowsWithIcons.mockResolvedValue(null);
    api.autoHideFullscreenWindowsGet.mockResolvedValue('true');
    mount();
    await settle();
    expect(setters.setHideProcessList).not.toHaveBeenCalled();
    expect(setters.setRunningProcesses).not.toHaveBeenCalled();
    expect(setters.setAutoHideFullscreenWindowsState).toHaveBeenCalledWith(false);
  });
  it('全部服务拒绝由实际catch隔离', async () => {
    Object.values(api).forEach((fn) => {
      fn.mockRejectedValue(new Error('read'));
    });
    mount();
    await settle();
    Object.values(setters).forEach((setter) => {
      expect(setter).not.toHaveBeenCalled();
    });
  });
  it('卸载不应用迟到配置', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    const pending = new Promise((done) => {
      resolve = done;
    });
    Object.values(api).forEach((fn) => {
      fn.mockReturnValue(pending);
    });
    mount();
    unmountHooks();
    resolve([]);
    await settle();
    Object.values(setters).forEach((setter) => {
      expect(setter).not.toHaveBeenCalled();
    });
  });
});
