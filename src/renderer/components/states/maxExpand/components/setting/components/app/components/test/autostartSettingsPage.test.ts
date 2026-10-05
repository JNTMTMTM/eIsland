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
 * @file autostartSettingsPage.test.ts
 * @description AutostartSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutostartSettingsPage } from '../AutostartSettingsPage';
import { elementProps, elements, findElement, invoke, resetState, textContent } from '../../../../../../../../test/elementHarness';
import makeAppSettingsProps from './appSettingsFixture';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = {
  quitApp: vi.fn(() => Promise.resolve(true)),
  restartApp: vi.fn(() => Promise.resolve(true)),
  openLogsFolder: vi.fn(() => Promise.resolve(true)),
  clearLogsCache: vi.fn(() => Promise.resolve(true)),
  autostartSet: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('AutostartSettingsPage', () => {
  it.each(['disabled', 'enabled', 'high-priority'] as const)('shows %s as active and persists selected mode', (mode) => {
    const props = makeAppSettingsProps();
    props.autostartMode = mode;
    const tree = AutostartSettingsPage(props);
    const options = elements(tree).filter((node) => node.type === 'button' && String(elementProps(node).className).includes('settings-lyrics-source-btn'));
    expect(options).toHaveLength(3);
    expect(options.filter((node) => String(elementProps(node).className).includes('active'))).toHaveLength(1);
    invoke(options[2], 'onClick');
    expect(props.setAutostartMode).toHaveBeenCalledWith('high-priority');
    expect(api.autostartSet).toHaveBeenCalledWith('high-priority');
  });
  it('disables clearing action while a previous clear is pending', () => {
    resetState(['clearing']);
    const tree = AutostartSettingsPage(makeAppSettingsProps());
    expect(elementProps(findElement(tree, (node) => textContent(node) === 'settings.app.autostart.logsClearing')).disabled).toBe(true);
  });
});
