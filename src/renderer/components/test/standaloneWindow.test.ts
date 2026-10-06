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
 * @file standaloneWindow.test.ts
 * @description StandaloneWindow 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StandaloneWindow } from '../StandaloneWindow';
import { elementProps, findElement, invoke, resetState } from './elementHarness';
const shell = vi.hoisted(() => ({ activeTab: 'todo', switchTab: vi.fn(), bgMedia: null, bgVideoFit: 'cover', bgVideoMuted: true, bgVideoVolume: 0.6, bgVideoHwDecode: true, bgVideoElementRef: { current: null }, bgImageOpacity: 80, bgImageBlur: 5, standaloneMacControls: false, handleVideoLoadedMetadata: vi.fn(), handleVideoCanPlay: vi.fn() }));
const store = vi.hoisted(() => ({ state: 'idle' }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('./elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../hooks/useStandaloneWindowShell', () => ({ useStandaloneWindowShell: () => shell }));
vi.mock('../../store/slices', () => ({ default: (selector: (value: typeof store) => unknown) => selector(store) }));
vi.mock('../components/StandaloneWindowViewport', () => ({ StandaloneWindowViewport: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('StandaloneWindow', () => {
  it.each(['todo', 'settings'])('forwards the %s tab and window media options to its actual child nodes', (activeTab) => {
    shell.activeTab = activeTab;
    const tree = StandaloneWindow();
    expect(elementProps(tree).className).toBe('cw-root');
    const viewport = findElement(tree, (node) => 'state' in elementProps(node));
    expect(elementProps(viewport)).toMatchObject({ activeTab, state: 'idle' });
    const background = findElement(tree, (node) => 'bgImageOpacity' in elementProps(node));
    expect(elementProps(background)).toMatchObject({ bgImageOpacity: 80, bgImageBlur: 5, bgVideoVolume: 0.6 });
    const chrome = findElement(tree, (node) => 'switchTab' in elementProps(node));
    invoke(chrome, 'switchTab', 'memo');
    expect(shell.switchTab).toHaveBeenCalledWith('memo');
  });
});
