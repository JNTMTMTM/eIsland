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
 * @file alarmSettingsPage.test.ts
 * @description AlarmSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlarmSettingsPage } from '../AlarmSettingsPage';
import { elementProps, elements, findElement, invoke, resetState, rewindState, } from '../../../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
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
describe('AlarmSettingsPage', () => {
  it('shows defaults and changes sound and notification independently', () => {
    const tree = AlarmSettingsPage();
    const switches = elements(tree).filter((node) => elementProps(node).type === 'checkbox');
    expect(switches.map((node) => elementProps(node).checked)).toEqual([true, true]);
    invoke(switches[0], 'onChange', { target: { checked: false } });
    expect(api.storeWrite).toHaveBeenCalledWith('alarm-sound-enabled', false);
    invoke(switches[1], 'onChange', { target: { checked: false } });
    expect(api.storeWrite).toHaveBeenCalledWith('alarm-notification-enabled', false);
  });
  it('rolls back the switch when persistence fails', async () => {
    api.storeWrite.mockRejectedValueOnce(new Error('write failed'));
    invoke(findElement(AlarmSettingsPage(), (node) => elementProps(node).type === 'checkbox'), 'onChange', { target: { checked: false } });
    await Promise.resolve();
    rewindState();
    expect(elementProps(findElement(AlarmSettingsPage(), (node) => node.props.type === 'checkbox')).checked).toBe(true);
  });
});
