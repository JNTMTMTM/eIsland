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
 * @file waveEffect.test.ts
 * @description WaveEffect 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaveEffect } from '../WaveEffect';
import { elementProps, resetState } from '../../../../test/elementHarness';
const { renderer } = vi.hoisted(() => ({ renderer: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../hooks/useWaveRenderer', () => ({ useWaveRenderer: renderer }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('WaveEffect', () => {
  it.each([false, true])('renders background canvas with playing=%s and forwards color values', (playing) => {
    resetState([[0.1, 0.2, 0.3]]);
    const tree = WaveEffect({ playing, accentColor: [10, 20, 30] });
    expect(tree.type).toBe('canvas');
    expect(elementProps(tree).className).toBe('splash-wave-canvas');
    expect(renderer).toHaveBeenCalledWith(expect.objectContaining({ current: null }), [0.1, 0.2, 0.3], playing, [10, 20, 30]);
  });
  it('uses playing=true by default and accepts no accent color', () => {
    WaveEffect({});
    expect(renderer.mock.calls[0][2]).toBe(true);
    expect(renderer.mock.calls[0][3]).toBeUndefined();
  });
});
