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
 * @file layoutPreviewSettingsPage.test.ts
 * @description LayoutPreviewSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutPreviewSettingsPage } from '../LayoutPreviewSettingsPage';
import { elementProps, elements, findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../../test/elementHarness';
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
vi.mock('../../../../../../../hover/pages/lyric/components/SilkyWave', () => ({ SilkyWave: vi.fn() }));
vi.mock('../../preview/MusicBgWavePreview', () => ({ MusicBgWavePreview: vi.fn() }));
const api = {
  storeRead: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite?.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('LayoutPreviewSettingsPage', () => {
  it('forwards widget and clock selection with current preview configuration', () => {
    const props = makeAppSettingsProps();
    const tree = LayoutPreviewSettingsPage(props);
    const previews = elements(tree).filter((node) => node.type === props.OverviewPreviewComponent);
    expect(elementProps(previews[0]).layoutConfig).toBe(props.layoutConfig);
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'Todo'), 'onClick');
    expect(props.updateLayout).toHaveBeenCalledWith('left', 'todo');
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'Gradient'), 'onClick');
    expect(props.updateClockStyle).toHaveBeenCalledWith('gradient');
  });
  it('keeps gradient colors editable across clock styles', () => {
    const props = makeAppSettingsProps();
    expect(elements(LayoutPreviewSettingsPage(props)).filter((node) => elementProps(node).type === 'color')).toHaveLength(1);
    props.layoutConfig.clockStyle = 'gradient';
    rewindState();
    const tree = LayoutPreviewSettingsPage(props);
    const colors = elements(tree).filter((node) => elementProps(node).type === 'color');
    expect(colors.length).toBeGreaterThan(0);
    invoke(colors[0], 'onChange', { target: { value: '#123456' } });
    expect(props.updateGradientColor).toHaveBeenCalledWith('#123456');
  });
});
