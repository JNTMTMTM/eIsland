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
 * @file maxExpandLayoutSettingsPage.test.ts
 * @description MaxExpandLayoutSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaxExpandLayoutSettingsPage } from '../MaxExpandLayoutSettingsPage';
import { elementProps, elements, findElement, invoke, resetState } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
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
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('MaxExpandLayoutSettingsPage', () => {
  it('renders visible and hidden pages and forwards application mode settings', () => {
    const props = makeAppSettingsProps();
    const tree = MaxExpandLayoutSettingsPage(props);
    expect(elements(tree).filter((node) => String(elementProps(node).className).includes('preview-dot--hidden'))).toHaveLength(1);
    invoke(findElement(tree, (node) => elementProps(node).type === 'checkbox'), 'onChange', { target: { checked: true } });
    expect(api.storeWrite).toHaveBeenCalledWith('maxexpand-app-mode-enabled', true);
  });
  it('moves pages by drag without mutating the input layout', () => {
    const props = makeAppSettingsProps();
    const tree = MaxExpandLayoutSettingsPage(props);
    const rows = elements(tree).filter((node) => elementProps(node).draggable === true);
    invoke(rows[0], 'onDragStart');
    invoke(rows[1], 'onDrop');
    expect(props.updateMaxExpandNavLayout).toHaveBeenCalledWith([{ id: 'calendar', visible: false }, { id: 'todo', visible: true }]);
    expect(props.maxExpandNavLayout[0].id).toBe('todo');
  });
});
