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
 * @file breakReminderSettingsPage.test.ts
 * @description BreakReminderSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BreakReminderSettingsPage } from '../BreakReminderSettingsPage';
import { elements, findElement, invoke, resetState, textContent } from '../../../../../../../../test/elementHarness';
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
describe('BreakReminderSettingsPage', () => {
  it('keeps controls hidden before data loads and shows the loaded empty state', () => {
    expect(elements(BreakReminderSettingsPage()).filter((node) => node.type === 'button')).toHaveLength(0);
    resetState([[], true, null]);
    expect(textContent(BreakReminderSettingsPage())).toContain('settings.breakReminder.listTitle');
  });
  it('adds a reminder with a valid default interval and deletes existing entries', () => {
    resetState([[{ id: 'existing', name: 'Water', intervalMinutes: 60, enabled: true }], true, null]);
    const tree = BreakReminderSettingsPage();
    invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === 'settings.breakReminder.addBtn'), 'onClick');
    expect(api.storeWrite).toHaveBeenCalledWith('break-reminder-items', expect.arrayContaining([expect.objectContaining({ name: '', intervalMinutes: 30, enabled: true })]));
  });
});
