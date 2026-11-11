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
 * @file useAutoIdle.test.ts
 * @description 歌词自动返回idle Hook 的真实Zustand动作、音乐停止/加载/空歌词条件和稳定依赖测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import useIslandStore from '../../../../../store/slices';
import { useAutoIdle } from '../useAutoIdle';
import { resetStandalone, surface } from '../../../../hooks/test/standaloneIpcHarness';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
const collapseWindow = vi.fn(); const enableMousePassthrough = vi.fn();
beforeEach(() => {
  resetStandalone(); vi.stubGlobal('window', Object.assign(surface, { api: { collapseWindow, enableMousePassthrough } }));
  useIslandStore.setState({ state: 'lyrics', uiStateLocked: false });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
describe('真实歌词播放状态回退', () => {
  it.each([
    { playing: false, idle: true },
    { playing: true, idle: false },
  ])('播放$playing时触发idle=$idle（没有歌词也保持歌词状态，以前奏样式显示歌名）', ({ playing, idle }) => {
    renderWithHooks(() => useAutoIdle(playing, useIslandStore.getState().setIdle)); runEffects();
    expect(useIslandStore.getState().state).toBe(idle ? 'idle' : 'lyrics'); expect(collapseWindow).toHaveBeenCalledTimes(idle ? 1 : 0);
  });
  it('同一输入不重复执行窗口动作，播放停止的最新依赖才触发真实idle', () => {
    const { setIdle } = useIslandStore.getState();
    renderWithHooks(() => useAutoIdle(true, setIdle)); runEffects();
    renderWithHooks(() => useAutoIdle(true, setIdle)); runEffects(); expect(collapseWindow).not.toHaveBeenCalled();
    renderWithHooks(() => useAutoIdle(false, setIdle)); runEffects();
    expect(useIslandStore.getState().state).toBe('idle'); expect(collapseWindow).toHaveBeenCalledOnce();
  });
});
