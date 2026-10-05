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
 * @file hideProcessSettingsPage.test.ts
 * @description HideProcessSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HideProcessSettingsPage } from '../HideProcessSettingsPage';
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
describe('HideProcessSettingsPage', () => {
  it('shows empty selection and disables refresh while loading', () => {
    const props = makeAppSettingsProps();
    expect(textContent(HideProcessSettingsPage(props))).toContain('settings.app.hideProcess.empty');
    props.hideProcessLoading = true;
    const tree = HideProcessSettingsPage(props);
    expect(elementProps(findElement(tree, (node) => node.type === 'button' && node.props.disabled === true)).disabled).toBe(true);
  });
  it('renders selected processes and forwards blacklist removal and filter changes', () => {
    const props = makeAppSettingsProps();
    props.hideProcessList.push('editor.exe');
    const tree = HideProcessSettingsPage(props);
    invoke(findElement(tree, (node) => elementProps(node).title === 'settings.app.hideProcess.removeWindow'), 'onClick');
    expect(props.toggleHideProcess).toHaveBeenCalledWith('editor.exe');
    invoke(findElement(tree, (node) => node.type === 'input' && elementProps(node).type === 'text'), 'onChange', { target: { value: 'editor' } });
    expect(props.setHideProcessFilter).toHaveBeenCalledWith('editor');
  });
});
