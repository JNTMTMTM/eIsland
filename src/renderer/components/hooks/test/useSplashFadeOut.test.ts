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
 * @file useSplashFadeOut.test.ts
 * @description 启动画面淡出 Hook 的真实原生指令、状态幂等更新和订阅清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { useSplashFadeOut } from '../useSplashFadeOut';
import { ipc, removals, resetSplashBoundary, splashEvent } from './splashHookHarness';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(resetSplashBoundary);
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
describe('启动淡出真实事件状态', () => {
  it('默认显示，收到原生淡出才置true，重复指令幂等且重渲染不重复订阅', () => {
    expect(renderWithHooks(useSplashFadeOut).fadeOut).toBe(false); runEffects();
    splashEvent('unrelated'); expect(renderWithHooks(useSplashFadeOut).fadeOut).toBe(false);
    splashEvent('splash:fade-out'); expect(renderWithHooks(useSplashFadeOut).fadeOut).toBe(true);
    splashEvent('splash:fade-out'); expect(renderWithHooks(useSplashFadeOut).fadeOut).toBe(true);
    runEffects(); expect(ipc.on).toHaveBeenCalledExactlyOnceWith('splash:fade-out', expect.any(Function)); expect(ipc.send).not.toHaveBeenCalled();
  });
  it('卸载移除原生淡出订阅，后续指令不能改变尚未淡出的状态', () => {
    renderWithHooks(useSplashFadeOut); runEffects(); unmountHooks();
    expect(removals.get('splash:fade-out')).toHaveBeenCalledOnce();
    splashEvent('splash:fade-out'); expect(renderWithHooks(useSplashFadeOut).fadeOut).toBe(false);
  });
});
