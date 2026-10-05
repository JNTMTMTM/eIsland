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
 * @file updateSettingsPageDots.test.ts
 * @description UpdateSettingsPageDots 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateSettingsPageDots } from '../UpdateSettingsPageDots';
import { elementProps, findElement, invoke, resetState } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('UpdateSettingsPageDots', () => {
  it.each([false, true])('forwards selected page and expansion=%s to navigation', (expanded) => {
    const callback = vi.fn();
    const props: ComponentProps<typeof UpdateSettingsPageDots> = {
      expanded,
      updateSettingsPage: 'update-check',
      updateSettingsPages: ['update-check', 'info-sync'],
      settingsTabLabels: { "update-check": "Update", "info-sync": "Sync" },
      setUpdateSettingsPage: callback,
    };
    const tree = UpdateSettingsPageDots(props);
    expect(elementProps(tree)).toMatchObject({ expanded, activePage: 'update-check', pages: ['update-check', 'info-sync'], navigationLabel: 'settings.update.pagination' });
    invoke(findElement(tree, (node) => typeof elementProps(node).onSelectPage === 'function'), 'onSelectPage', 'info-sync');
    expect(callback).toHaveBeenCalledWith('info-sync');
    props.updateSettingsPages = [];
    expect(elementProps(UpdateSettingsPageDots(props)).pages).toEqual([]);
  });
});
