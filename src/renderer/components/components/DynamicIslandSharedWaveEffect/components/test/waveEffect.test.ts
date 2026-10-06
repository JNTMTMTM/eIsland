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
import { elementProps, resetState, rewindState, hookMocks } from '../../../../test/elementHarness';
const { renderer } = vi.hoisted(() => ({ renderer: vi.fn<typeof import('../../hooks/useWaveRenderer')['useWaveRenderer']>() }));
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

it.each(['#ff8000', 'invalid'])('applies explicit color %s through the actual conversion and avoids store reads', (color) => {
  const storeRead = vi.fn<(key: string) => Promise<unknown>>();
  vi.stubGlobal('window', { api: { storeRead } });
  WaveEffect({ color });
  hookMocks.useEffect.mock.calls[0][0]();
  rewindState();
  WaveEffect({ color });
  expect(renderer.mock.lastCall?.[1]).toEqual(color === '#ff8000' ? [1, 128 / 255, 0] : [0.002, 0.004, 0.005]);
  expect(storeRead).not.toHaveBeenCalled();
});
it.each(['#00ff80', '', null, 42])('uses only a nonempty persisted color %j', async (value) => {
  const storeRead = vi.fn<(key: string) => Promise<unknown>>().mockResolvedValue(value);
  vi.stubGlobal('window', { api: { storeRead } });
  WaveEffect({});
  hookMocks.useEffect.mock.calls[0][0]();
  await Promise.resolve();
  rewindState();
  WaveEffect({});
  expect(storeRead).toHaveBeenCalledWith('splash-bg-color');
  expect(renderer.mock.lastCall?.[1]).toEqual(value === '#00ff80' ? [0, 1, 128 / 255] : [0.002, 0.004, 0.005]);
});
it('keeps the default shader color when storage rejects', async () => {
  vi.stubGlobal('window', { api: { storeRead: vi.fn().mockRejectedValue(new Error('store')) } });
  WaveEffect({});
  hookMocks.useEffect.mock.calls[0][0]();
  await Promise.resolve();
  await Promise.resolve();
  rewindState();
  WaveEffect({});
  expect(renderer.mock.lastCall?.[1]).toEqual([0.002, 0.004, 0.005]);
});
