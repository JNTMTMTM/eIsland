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
 * @file expandLayoutSettingsPage.test.ts
 * @description ExpandLayoutSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpandLayoutSettingsPage } from '../ExpandLayoutSettingsPage';
import { elementProps, elements, invoke, resetState } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = {};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ExpandLayoutSettingsPage', () => {
  it('protects fixed pages and endpoint moves while toggling optional visibility', () => {
    const props = makeAppSettingsProps();
    const tree = ExpandLayoutSettingsPage(props);
    const visibility = elements(tree).filter((node) => node.type === 'button' && String(elementProps(node).className).includes('item-toggle'));
    expect(elementProps(visibility[0]).disabled).toBe(true);
    invoke(visibility[0], 'onClick');
    expect(props.updateExpandNavLayout).not.toHaveBeenCalled();
    invoke(visibility[1], 'onClick');
    expect(props.updateExpandNavLayout).toHaveBeenCalledWith([{ id: 'overview', visible: true }, { id: 'todo', visible: false }]);
    expect(props.expandNavLayout[1].visible).toBe(true);
  });
  it('reorders by drag and ignores a drop without a source', () => {
    const props = makeAppSettingsProps();
    const tree = ExpandLayoutSettingsPage(props);
    const rows = elements(tree).filter((node) => elementProps(node).draggable === true);
    invoke(rows[1], 'onDrop');
    expect(props.updateExpandNavLayout).not.toHaveBeenCalled();
    invoke(rows[0], 'onDragStart');
    invoke(rows[1], 'onDrop');
    expect(props.updateExpandNavLayout).toHaveBeenCalledWith([{ id: 'todo', visible: true }, { id: 'overview', visible: true }]);
  });
});
