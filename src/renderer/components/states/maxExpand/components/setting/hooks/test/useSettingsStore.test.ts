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
 * @file useSettingsStore.test.ts
 * @description 设置共享 Store 共享状态选择器及工作区取消、去重、数组边界回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../useSettingsStore';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';
vi.mock('zustand/react/shallow', () => ({
  useShallow: <T,>(selector: T): T => selector
}));
const store = vi.hoisted(() => ({
  aiConfig: {
    workspaces: null as string[] | null
  },
  setAiConfig: vi.fn(),
  fetchWeatherData: vi.fn(),
  setLogin: vi.fn(),
  setRegister: vi.fn(),
  setNotification: vi.fn()
}));
vi.mock('../../../../../../../store/slices', () => ({
  default: (selector: (value: typeof store) => unknown) => selector(store)
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
const pick = vi.fn<() => Promise<string | null>>();
/**
 * 执行真实共享 Store Hook，执行目标创建的状态选择器。
 * @returns 真正选择出的状态、动作及工作区回调。
 */
function render() {
  return renderWithHooks(useSettingsStore);
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  store.aiConfig.workspaces = ['C:/Work'];
  pick.mockReset().mockResolvedValue('D:/Projects');
  vi.stubGlobal('window', {
    api: {
      pickLocalSearchDirectory: pick
    }
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('工作区配置实际回调', () => {
  it('返回真实状态选择器选择的服务和账号动作', () => {
    const result = render();
    expect(result.aiConfig).toBe(store.aiConfig);
    expect(result.setAiConfig).toBe(store.setAiConfig);
    expect(result.fetchWeatherData).toBe(store.fetchWeatherData);
    expect(result.setLogin).toBe(store.setLogin);
    expect(result.setRegister).toBe(store.setRegister);
    expect(result.setNotification).toBe(store.setNotification);
  });
  it.each([null, 'c:/work'])('选择取消或重复%s不更新', async (dir) => {
    pick.mockResolvedValue(dir);
    await render().onAddWorkspace();
    expect(store.setAiConfig).not.toHaveBeenCalled();
  });
  it('新目录追加并保留原序；非数组历史值回退空数组', async () => {
    await render().onAddWorkspace();
    expect(store.setAiConfig).toHaveBeenLastCalledWith({
      workspaces: ['C:/Work', 'D:/Projects']
    });
    store.aiConfig.workspaces = null;
    await render().onAddWorkspace();
    expect(store.setAiConfig).toHaveBeenLastCalledWith({
      workspaces: ['D:/Projects']
    });
  });
  it('删除有效索引保留其余目录，非数组和越界保留安全结果', () => {
    store.aiConfig.workspaces = ['one', 'two'];
    render().onRemoveWorkspace(0);
    expect(store.setAiConfig).toHaveBeenLastCalledWith({
      workspaces: ['two']
    });
    render().onRemoveWorkspace(99);
    expect(store.setAiConfig).toHaveBeenLastCalledWith({
      workspaces: ['one', 'two']
    });
    store.aiConfig.workspaces = null;
    render().onRemoveWorkspace(0);
    expect(store.setAiConfig).toHaveBeenLastCalledWith({
      workspaces: []
    });
  });
  it('目录选择失败保留真实Promise拒绝契约', async () => {
    pick.mockRejectedValue(new Error('picker'));
    await expect(render().onAddWorkspace()).rejects.toThrow('picker');
    expect(store.setAiConfig).not.toHaveBeenCalled();
  });
});
