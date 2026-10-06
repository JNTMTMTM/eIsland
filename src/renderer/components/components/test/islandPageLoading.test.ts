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
 * @file islandPageLoading.test.ts
 * @description islandPageLoading 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IslandPageLoading from '../islandPageLoading';
import { elementProps, findElement, resetState, textContent } from '../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('islandPageLoading', () => {
  it('omits disabled loading and exposes polite status with both messages when enabled', () => {
    expect(IslandPageLoading({ title: 'Calendar', description: 'Loading', performanceModeEnabled: false })).toBeNull();
    const tree = IslandPageLoading({ title: 'Calendar', description: 'Loading', performanceModeEnabled: true });
    expect(elementProps(tree)).toMatchObject({ role: 'status', 'aria-live': 'polite' });
    expect(textContent(tree)).toBe('CalendarLoading');
    expect(elementProps(findElement(tree, (node) => node.props['aria-hidden'] === 'true')).className).toContain('spinner');
  });
});
