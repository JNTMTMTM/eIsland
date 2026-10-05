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
 * @file behaviorSettingsPage.test.ts
 * @description BehaviorSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSettingsPage } from '../BehaviorSettingsPage';
import { elementProps, elements, invoke, resetState, } from '../../../../../../../../test/elementHarness';
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
  idleClickExpandGet: vi.fn(() => Promise.resolve(true)),
  shapeModeGet: vi.fn(() => Promise.resolve(true)),
  onSettingsChanged: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
  settingsPreview: vi.fn(() => Promise.resolve(true)),
  shapeModeSet: vi.fn(() => Promise.resolve(true)),
  expandMouseleaveIdleSet: vi.fn(() => Promise.resolve(true)),
  maxexpandMouseleaveIdleSet: vi.fn(() => Promise.resolve(true)),
  idleClickExpandSet: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite?.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('BehaviorSettingsPage', () => {
  it('renders current external switches and persists mouse-leave changes', () => {
    const props = makeAppSettingsProps();
    props.expandLeaveIdle = true;
    const tree = BehaviorSettingsPage(props);
    const checkboxes = elements(tree).filter((node) => elementProps(node).type === 'checkbox');
    expect(elementProps(checkboxes[0]).checked).toBe(true);
    invoke(checkboxes[0], 'onChange', { target: { checked: false } });
    expect(props.setExpandLeaveIdle).toHaveBeenCalledWith(false);
    expect(api.expandMouseleaveIdleSet).toHaveBeenCalledWith(false);
  });
  it('switches shape and standalone modes through actual radio callbacks', () => {
    const tree = BehaviorSettingsPage(makeAppSettingsProps());
    const shapes = elements(tree).filter((node) => elementProps(node).name === 'island-shape-mode');
    invoke(shapes[1], 'onChange');
    expect(api.shapeModeSet).toHaveBeenCalledWith('pill');
    const windows = elements(tree).filter((node) => elementProps(node).name === 'standalone-window-mode');
    invoke(windows[1], 'onChange');
    expect(api.storeWrite).toHaveBeenCalledWith('standalone-window-mode', 'standalone');
    expect(store.setNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'restart-required' }));
  });
});
