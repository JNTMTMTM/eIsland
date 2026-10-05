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
 * @file positionSettingsPage.test.ts
 * @description PositionSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionSettingsPage } from '../PositionSettingsPage';
import { elementProps, findElement, invoke, resetState, textContent } from '../../../../../../../../test/elementHarness';
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
describe('PositionSettingsPage', () => {
  it('renders locked state, input boundaries, unchanged and pending actions', () => {
    const props = makeAppSettingsProps();
    let tree = PositionSettingsPage(props);
    expect(elementProps(findElement(tree, (node) => textContent(node) === 'settings.app.position.apply')).disabled).toBe(true);
    props.islandPositionInputChanged = true;
    props.islandPositionLocked = true;
    tree = PositionSettingsPage(props);
    expect(elementProps(findElement(tree, (node) => node.props.type === 'checkbox')).checked).toBe(true);
    expect(elementProps(findElement(tree, (node) => node.props.type === 'number'))).toMatchObject({ min: -2000, max: 2000, value: '20' });
    expect(elementProps(findElement(tree, (node) => textContent(node) === 'settings.app.position.apply')).disabled).toBe(false);
  });
  it('moves relative to existing offsets and handles Enter only', () => {
    const props = makeAppSettingsProps();
    const tree = PositionSettingsPage(props);
    invoke(findElement(tree, (node) => textContent(node) === 'settings.app.position.moveLeft'), 'onClick');
    expect(props.applyIslandPositionOffset).toHaveBeenCalledWith(10, 30);
    const input = findElement(tree, (node) => elementProps(node).type === 'number');
    const preventDefault = vi.fn();
    invoke(input, 'onKeyDown', { preventDefault, key: 'Escape' });
    expect(props.applyIslandPositionInput).not.toHaveBeenCalled();
    invoke(input, 'onKeyDown', { preventDefault, key: 'Enter' });
    expect(props.applyIslandPositionInput).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });
});
