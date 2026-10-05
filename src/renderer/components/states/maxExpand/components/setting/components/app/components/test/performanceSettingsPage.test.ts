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
 * @file performanceSettingsPage.test.ts
 * @description PerformanceSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceSettingsPage } from '../PerformanceSettingsPage';
import { elementProps, elements, invoke, resetState, rewindState } from '../../../../../../../../test/elementHarness';
const { store } = vi.hoisted(() => ({
  store: { setNotification: vi.fn(), springAnimation: true, animationSpeed: 'normal', dominantColor: [20, 40, 60] },
}));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../../../../../store/slices', () => ({ default: Object.assign((selector?: (state: typeof store) => unknown) => selector ? selector(store) : store, { getState: () => store }) }));
vi.mock('../../../../../../maxExpandContentEagerLoader', () => ({ preloadMaxExpandContentEager: vi.fn() }));
const dispatchEvent = vi.fn();
const api = {
  storeRead: vi.fn(() => Promise.resolve(true)),
  onSettingsChanged: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
  settingsPreview: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('PerformanceSettingsPage', () => {
  it('broadcasts performance changes and renders both frame-limit choices', () => {
    resetState([true, false]);
    const tree = PerformanceSettingsPage();
    const switches = elements(tree).filter((node) => elementProps(node).type === 'checkbox');
    expect(switches.map((node) => elementProps(node).checked)).toEqual([true, false]);
    invoke(switches[0], 'onChange', { target: { checked: false } });
    expect(api.storeWrite).toHaveBeenCalledWith('maxexpand-performance-mode-enabled', false);
    expect(dispatchEvent).toHaveBeenCalled();
  });
  it('requires restart after frame rate changes and updates its checkbox', () => {
    resetState([true, false]);
    const switches = elements(PerformanceSettingsPage()).filter((node) => elementProps(node).type === 'checkbox');
    invoke(switches[1], 'onChange', { target: { checked: true } });
    expect(api.storeWrite).toHaveBeenCalledWith('disable-frame-rate-limit', true);
    expect(store.setNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'restart-required' }));
    rewindState();
    expect(elementProps(elements(PerformanceSettingsPage()).filter((node) => node.props.type === 'checkbox')[1]).checked).toBe(true);
  });
});
