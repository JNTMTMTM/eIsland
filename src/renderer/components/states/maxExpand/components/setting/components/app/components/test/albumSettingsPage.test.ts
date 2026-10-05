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
 * @file albumSettingsPage.test.ts
 * @description AlbumSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumSettingsPage } from '../AlbumSettingsPage';
import { elementProps, elements, invoke, resetState, rewindState, } from '../../../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = {
  storeRead: vi.fn(() => Promise.resolve(true)),
  onSettingsChanged: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite?.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('AlbumSettingsPage', () => {
  it('renders documented defaults and saves interval without losing other fields', () => {
    const tree = AlbumSettingsPage();
    const intervals = elements(tree).filter((node) => elementProps(node).name === 'album-interval');
    expect(intervals.map((node) => elementProps(node).checked)).toEqual([false, true, false]);
    invoke(intervals[0], 'onChange');
    expect(api.storeWrite).toHaveBeenCalledWith('overview-album-config', expect.objectContaining({ intervalMs: 3000, orderMode: 'sequential', mediaFilter: 'all', videoMuted: true }));
    rewindState();
    expect(elements(AlbumSettingsPage()).filter((node) => elementProps(node).name === 'album-interval').map((node) => elementProps(node).checked)).toEqual([true, false, false]);
  });
  it('shows alternate order, filter, and playback states', () => {
    resetState([{ intervalMs: 8000, autoRotate: false, orderMode: 'random', mediaFilter: 'video', clickBehavior: 'none', videoAutoPlay: false, videoMuted: false }]);
    const tree = AlbumSettingsPage();
    expect(elements(tree).filter((node) => elementProps(node).name === 'album-order-mode').map((node) => elementProps(node).checked)).toEqual([false, true]);
    expect(elements(tree).filter((node) => elementProps(node).type === 'checkbox').map((node) => elementProps(node).checked)).toEqual([false, false, false]);
  });
});
