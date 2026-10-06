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
 * @file animationSettingsPage.test.ts
 * @description AnimationSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimationSettingsPage } from '../AnimationSettingsPage';
import { elementProps, elements, findElement, invoke, resetState } from '../../../../../../../../test/elementHarness';
const { store } = vi.hoisted(() => ({
  store: { setNotification: vi.fn(), springAnimation: true, animationSpeed: 'normal', dominantColor: [20, 40, 60] },
}));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../../../../../store/slices', () => ({ default: Object.assign((selector?: (state: typeof store) => unknown) => selector ? selector(store) : store, { getState: () => store }) }));
vi.mock('../../../../../../../../components/DynamicIslandSharedWaveEffect', () => ({ WaveEffect: vi.fn() }));
const api = {
  storeRead: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
  settingsPreview: vi.fn(() => Promise.resolve(true)),
  springAnimationSet: vi.fn(() => Promise.resolve(true)),
  animationSpeedSet: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('AnimationSettingsPage', () => {
  it('reflects stored animation choices and persists expanded-tab changes', () => {
    const tree = AnimationSettingsPage();
    const boxes = elements(tree).filter((node) => elementProps(node).type === 'checkbox');
    invoke(boxes[1], 'onChange', { target: { checked: false } });
    expect(api.storeWrite).toHaveBeenCalledWith('expand-tab-animation', false);
    expect(api.settingsPreview).toHaveBeenCalledWith('settings:expand-tab-animation', false);
    resetState([false, false, false, '#123456', true]);
    const alternate = AnimationSettingsPage();
    expect(elements(alternate).filter((node) => elementProps(node).type === 'checkbox').slice(1, 4)
      .map((node) => elementProps(node).checked)).toEqual([false, false, false]);
    expect(elementProps(findElement(alternate, (node) => node.props.type === 'color')).value).toBe('#123456');
  });
  it('resets splash background and disables the idle stop action', () => {
    const tree = AnimationSettingsPage();
    invoke(findElement(tree, (node) => node.type === 'button' && elementProps(node).title === 'settings.app.animation.resetDefault'), 'onClick');
    expect(api.storeWrite).toHaveBeenCalledWith('splash-bg-color', null);
    const disabled = elements(tree).filter((node) => node.type === 'button' && elementProps(node).disabled === true);
    expect(disabled.length).toBeGreaterThan(0);
  });
});
