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
import type { SyncedLyricLine } from '../../../../../store/types';
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
    { playing: false, loading: true, lyrics: null, idle: true },
    { playing: true, loading: false, lyrics: null, idle: true },
    { playing: true, loading: false, lyrics: [], idle: true },
    { playing: true, loading: true, lyrics: null, idle: false },
    { playing: true, loading: false, lyrics: [{ time_ms: 0, text: '歌词' }], idle: false },
  ] satisfies Array<{ playing: boolean; loading: boolean; lyrics: SyncedLyricLine[] | null; idle: boolean }>)('播放$playing/加载$loading/空歌词条件触发idle=$idle', ({ playing, loading, lyrics, idle }) => {
    renderWithHooks(() => useAutoIdle(playing, loading, lyrics, useIslandStore.getState().setIdle)); runEffects();
    expect(useIslandStore.getState().state).toBe(idle ? 'idle' : 'lyrics'); expect(collapseWindow).toHaveBeenCalledTimes(idle ? 1 : 0);
  });
  it('同一输入不重复执行窗口动作，播放停止的最新依赖才触发真实idle', () => {
    const lines = [{ time_ms: 0, text: '歌词' }]; const {setIdle} = useIslandStore.getState();
    renderWithHooks(() => useAutoIdle(true, false, lines, setIdle)); runEffects();
    renderWithHooks(() => useAutoIdle(true, false, lines, setIdle)); runEffects(); expect(collapseWindow).not.toHaveBeenCalled();
    renderWithHooks(() => useAutoIdle(false, false, lines, setIdle)); runEffects();
    expect(useIslandStore.getState().state).toBe('idle'); expect(collapseWindow).toHaveBeenCalledOnce();
  });
});
