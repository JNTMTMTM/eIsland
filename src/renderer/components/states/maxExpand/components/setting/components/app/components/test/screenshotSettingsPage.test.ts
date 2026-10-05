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
 * @file screenshotSettingsPage.test.ts
 * @description ScreenshotSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenshotSettingsPage } from '../ScreenshotSettingsPage';
import { elementProps, elements, findElement, invoke, resetState, rewindState } from '../../../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = {
  storeRead: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ScreenshotSettingsPage', () => {
  it('renders engine defaults and forwards alternative engine selections', () => {
    const tree = ScreenshotSettingsPage();
    const radios = elements(tree).filter((node) => elementProps(node).name === 'screenshot-engine');
    expect(radios.map((node) => elementProps(node).checked)).toEqual([true, false]);
    invoke(radios[1], 'onChange');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-engine', 'js');
    rewindState();
    expect(elements(ScreenshotSettingsPage()).filter((node) => elementProps(node).name === 'screenshot-engine').map((node) => elementProps(node).checked)).toEqual([false, true]);
  });
  it('prevents language swap for auto detection and enables it for explicit languages', () => {
    const tree = ScreenshotSettingsPage();
    expect(elements(tree).filter((node) => node.type === 'button' && elementProps(node).disabled === true)).toHaveLength(1);
    resetState(['zh', 'en', 'js', 'local']);
    const explicit = ScreenshotSettingsPage();
    const swap = findElement(explicit, (node) => node.type === 'button' && elementProps(node).disabled === false);
    invoke(swap, 'onClick');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-translate-source-lang', 'en');
    expect(api.storeWrite).toHaveBeenCalledWith('screenshot-translate-target-lang', 'zh');
  });
});
