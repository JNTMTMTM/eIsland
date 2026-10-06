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
 * @file useEscToClose.test.ts
 * @description 城市选择器可见性、Escape 按键、回调更新和原生事件清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEscToClose } from '../useEscToClose';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
let surface: EventTarget;
const close = vi.fn<() => void>();
/**
 * 注册真实 Hook 的键盘监听。
 * @param visible - 面板可见性。
 * @param callback - 当前关闭操作。
 */
function view(visible: boolean, callback = close): void {
  renderWithHooks(() => useEscToClose(visible, callback));
  runEffects();
}
/**
 * 派发公开键盘事件。
 * @param key - 按键。
 */
function key(key: string): void {
  surface.dispatchEvent(Object.assign(new Event('keydown'), { key }));
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  surface = new EventTarget();
  vi.stubGlobal('window', surface);
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
describe('useEscToClose native event lifecycle', () => {
  it('listens only when visible and only reacts to Escape', () => {
    view(false);
    key('Escape');
    expect(close).not.toHaveBeenCalled();
    view(true);
    key('Enter');
    expect(close).not.toHaveBeenCalled();
    key('Escape');
    expect(close).toHaveBeenCalledOnce();
    view(false);
    key('Escape');
    expect(close).toHaveBeenCalledOnce();
  });
  it('replaces callbacks and removes the listener on unmount', () => {
    const replacement = vi.fn<() => void>();
    view(true);
    view(true, replacement);
    key('Escape');
    expect(close).not.toHaveBeenCalled();
    expect(replacement).toHaveBeenCalledOnce();
    unmountHooks();
    key('Escape');
    expect(replacement).toHaveBeenCalledOnce();
  });
});
