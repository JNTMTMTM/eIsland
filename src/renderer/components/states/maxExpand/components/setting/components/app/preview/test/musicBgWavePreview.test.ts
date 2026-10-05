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
 * @file musicBgWavePreview.test.ts
 * @description MusicBgWavePreview 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicBgWavePreview } from '../MusicBgWavePreview';
import { elementProps, resetState, hookMocks } from '../../../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 7));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('MusicBgWavePreview', () => {
  it.each([false, true])('creates preview canvas playing=%s and schedules only active animation', (playing) => {
    const tree = MusicBgWavePreview({ playing, color: [10, 20, 30] });
    expect(tree.type).toBe('canvas');
    expect(elementProps(tree).className).toBe('settings-music-bg-wave-canvas');
    const effect = hookMocks.useEffect.mock.calls[0][0] as () => () => void;
    const cleanup = effect();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(playing ? 1 : 0);
    cleanup();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(playing ? 7 : 0);
  });
});
