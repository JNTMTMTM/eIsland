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
 * @file useSettingsBehavior.test.ts
 * @description 窗口行为 Hook 进程白名单大小写开关、过滤、加载失败和忙碌状态回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsBehavior } from '../useSettingsBehavior';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
const api = {
  hideProcessListSet: vi.fn<(...args: unknown[]) => Promise<void>>(),
  autoHideFullscreenWindowsSet: vi.fn<(enabled: boolean) => Promise<void>>(),
  getOpenWindowsWithIcons: vi.fn<() => Promise<unknown>>()
};
/**
 * 重复执行实际窗口行为 Hook。
 * @returns 窗口管理实际状态与操作。
 */
function render() {
  return renderWithHooks(useSettingsBehavior);
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  api.hideProcessListSet.mockResolvedValue(undefined);
  api.autoHideFullscreenWindowsSet.mockResolvedValue(undefined);
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('窗口进程筛选和开关', () => {
  it('空进程名忽略，添加保留名称，大小写移除所有重复项并保存', async () => {
    render().toggleHideProcess('  ');
    expect(api.hideProcessListSet).not.toHaveBeenCalled();
    render().toggleHideProcess(' App.exe ');
    expect(render().hideProcessList).toEqual([' App.exe ']);
    render().setHideProcessList([' App.exe ', 'APP.EXE', 'other.exe']);
    api.hideProcessListSet.mockRejectedValue(new Error('write'));
    render().toggleHideProcess('app.exe');
    await Promise.resolve();
    await Promise.resolve();
    expect(render().hideProcessList).toEqual(['other.exe']);
    expect(api.hideProcessListSet).toHaveBeenLastCalledWith(['other.exe']);
  });
  it('过滤词trim小写，全屏自动隐藏保存失败不反转本地状态', async () => {
    render().setHideProcessFilter(' App.EXE ');
    expect(render().hideProcessKeyword).toBe('app.exe');
    api.autoHideFullscreenWindowsSet.mockRejectedValue(new Error('write'));
    render().setAutoHideFullscreenWindows(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(render().autoHideFullscreenWindows).toBe(true);
    expect(api.autoHideFullscreenWindowsSet).toHaveBeenCalledWith(true);
  });
  it('窗口列表仅保留带字符串标题条目', async () => {
    const valid = {
      id: '1',
      title: 'Editor',
      processName: 'editor.exe',
      processPath: null,
      processId: 1,
      iconDataUrl: null
    };
    api.getOpenWindowsWithIcons.mockResolvedValue([valid, null, {}, {
      title: 42
    }]);
    await render().refreshRunningProcesses();
    expect(render().runningProcesses).toEqual([valid]);
    expect(render().hideProcessLoading).toBe(false);
  });
  it.each(['non-array', 'rejected'])('刷新%s清空旧条目并恢复busy', async (mode) => {
    render().setRunningProcesses([{
      id: '1',
      title: 'old',
      processName: 'old.exe',
      processPath: null,
      processId: 1,
      iconDataUrl: null
    }]);
    api.getOpenWindowsWithIcons.mockResolvedValue(42);
    if (mode === 'rejected') api.getOpenWindowsWithIcons.mockRejectedValue(new Error('read'));
    await render().refreshRunningProcesses();
    expect(render().runningProcesses).toEqual([]);
    expect(render().hideProcessLoading).toBe(false);
  });
  it('异步窗口列表返回前busy为true', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    api.getOpenWindowsWithIcons.mockReturnValue(new Promise((done) => {
      resolve = done;
    }));
    const pending = render().refreshRunningProcesses();
    expect(render().hideProcessLoading).toBe(true);
    resolve([]);
    await pending;
    expect(render().hideProcessLoading).toBe(false);
  });
});
