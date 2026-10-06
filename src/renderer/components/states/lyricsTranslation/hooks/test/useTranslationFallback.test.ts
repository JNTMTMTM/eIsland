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
 * @file useTranslationFallback.test.ts
 * @description 翻译歌词回退 Hook 的真实Zustand普通歌词状态动作、窗口调用和有效翻译保留测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import useIslandStore from '../../../../../store/slices';
import { useTranslationFallback } from '../useTranslationFallback';
import { resetStandalone, surface } from '../../../../hooks/test/standaloneIpcHarness';
import type { LyricLine } from '../../../../../api/lyrics/lrcApi';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
const expandWindowLyrics = vi.fn(); const enableMousePassthrough = vi.fn();
beforeEach(() => {
  resetStandalone(); vi.stubGlobal('window', Object.assign(surface, { api: { expandWindowLyrics, enableMousePassthrough } }));
  useIslandStore.setState({ state: 'lyricsTranslation', uiStateLocked: false, animationSpeed: 'medium' });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
describe('翻译缺失时真实状态回退', () => {
  it.each([null, []] satisfies Array<LyricLine[] | null>)('缺失翻译%j进入普通歌词且执行真实窗口行为', (translation) => {
    renderWithHooks(() => useTranslationFallback(translation)); runEffects();
    expect(useIslandStore.getState().state).toBe('lyrics'); expect(expandWindowLyrics).toHaveBeenCalledTimes(2);
    expect(enableMousePassthrough).toHaveBeenCalledOnce();
  });
  it('有效翻译保持状态，同一数组不重复执行，清空后才回退', () => {
    const lines = [{ time_ms: 0, text: '翻译' }];
    renderWithHooks(() => useTranslationFallback(lines)); runEffects();
    renderWithHooks(() => useTranslationFallback(lines)); runEffects();
    expect(useIslandStore.getState().state).toBe('lyricsTranslation'); expect(expandWindowLyrics).not.toHaveBeenCalled();
    renderWithHooks(() => useTranslationFallback([])); runEffects();
    expect(useIslandStore.getState().state).toBe('lyrics'); expect(enableMousePassthrough).toHaveBeenCalledOnce();
  });
  it('没有原生API时仍完成内存状态回退', () => {
    vi.stubGlobal('window', Object.assign(surface, { api: undefined }));
    renderWithHooks(() => useTranslationFallback(null)); runEffects();
    expect(useIslandStore.getState().state).toBe('lyrics'); expect(expandWindowLyrics).not.toHaveBeenCalled();
  });
});
