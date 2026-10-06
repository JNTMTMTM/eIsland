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
 * @file soundSettingsPage.test.ts
 * @description SoundSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundSettingsPage } from '../SoundSettingsPage';
import { elementProps, elements, findElement, invoke, resetState, } from '../../../../../../../../test/elementHarness';
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
describe('SoundSettingsPage', () => {
  it('renders three volume controls with explicit bounds', () => {
    const controls = elements(SoundSettingsPage()).filter((node) => elementProps(node).type === 'range');
    expect(controls).toHaveLength(3);
    controls.forEach((control) => expect(elementProps(control)).toMatchObject({ min: 0, max: 100, value: 100 }));
  });
  it.each([['200', 1], ['-20', 0], ['NaN', 0], ['25', 0.25]] as const)('normalizes %s before persisting', (input, expected) => {
    invoke(findElement(SoundSettingsPage(), (node) => elementProps(node).type === 'range'), 'onChange', { target: { value: input } });
    expect(api.storeWrite).toHaveBeenCalledWith('sound-volume-global', expected);
  });
});
