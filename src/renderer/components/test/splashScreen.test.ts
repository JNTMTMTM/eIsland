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
 * @file splashScreen.test.ts
 * @description SplashScreen 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SplashScreen } from '../SplashScreen';
import { elementProps, findElement, invoke, resetState } from './elementHarness';
const shell = vi.hoisted(() => ({ fadeOut: false, videoRef: { current: null }, handleVideoEnded: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('./elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../hooks/useSplash', () => ({ useSplash: () => shell }));
vi.mock('../components/DynamicIslandSharedWaveEffect', () => ({ WaveEffect: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('SplashScreen', () => {
  it.each([false, true])('renders fadeOut=%s and forwards media completion', (fadeOut) => {
    shell.fadeOut = fadeOut;
    const tree = SplashScreen();
    expect(String(elementProps(tree).className).includes('fade-out')).toBe(fadeOut);
    expect(elementProps(tree).style).toEqual({ background: '#000000' });
    const video = findElement(tree, (node) => node.type === 'video');
    expect(elementProps(video).muted).toBe(true);
    invoke(video, 'onEnded');
    expect(shell.handleVideoEnded).toHaveBeenCalledOnce();
  });
  it('renders a custom background color supplied by its local state', () => {
    resetState(['#123456']);
    expect(elementProps(SplashScreen()).style).toEqual({ background: '#123456' });
  });
});
