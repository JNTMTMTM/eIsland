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
 * @file themeSettingsPage.test.ts
 * @description ThemeSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeSettingsPage } from '../ThemeSettingsPage';
import { elementProps, findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
const { store } = vi.hoisted(() => ({
  store: { setNotification: vi.fn(), springAnimation: true, animationSpeed: 'normal', dominantColor: [20, 40, 60] },
}));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../../../../../store/slices', () => ({ default: Object.assign((selector?: (state: typeof store) => unknown) => selector ? selector(store) : store, { getState: () => store }) }));
const api = {
  storeRead: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
  settingsPreview: vi.fn(() => Promise.resolve(true)),
  readFontFile: vi.fn(() => Promise.resolve(true)),
  openFontDialog: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ThemeSettingsPage', () => {
  it('hides media-specific controls until a matching background is selected', () => {
    const props = makeAppSettingsProps();
    const empty = textContent(ThemeSettingsPage(props));
    props.bgMediaType = 'video';
    props.bgMediaPreviewUrl = 'blob:video';
    rewindState();
    const video = textContent(ThemeSettingsPage(props));
    expect(video).toContain('settings.app.theme.videoMutedToggle');
    expect(empty).not.toContain('settings.app.theme.videoMutedToggle');
  });
  it('clamps opacity at both boundaries and handles invalid input', () => {
    const props = makeAppSettingsProps();
    vi.useFakeTimers();
    const tree = ThemeSettingsPage(props);
    const opacity = findElement(tree, (node) => elementProps(node).type === 'range' && elementProps(node).min === 10);
    invoke(opacity, 'onChange', { target: { value: '-20' } });
    expect(props.applyIslandOpacity).toHaveBeenLastCalledWith(10);
    invoke(opacity, 'onChange', { target: { value: '999' } });
    expect(props.applyIslandOpacity).toHaveBeenLastCalledWith(100);
    invoke(opacity, 'onChange', { target: { value: 'NaN' } });
    expect(props.applyIslandOpacity).toHaveBeenLastCalledWith(100);
    vi.runAllTimers();
    expect(props.persistIslandOpacity).toHaveBeenCalledWith(100);
    vi.useRealTimers();
  });
});
