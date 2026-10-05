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
 * @file loginHeatmap.test.ts
 * @description LoginHeatmap 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginHeatmap } from '../LoginHeatmap';
import { elementProps, elements, resetState } from '../../../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('LoginHeatmap', () => {
  it.each([false, true])('renders compact=%s with logged-in and future days separated', (compact) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T12:00:00'));
    const tree = LoginHeatmap({ compact, loginDays: new Set(['2026-10-5', '2026-10-7']), visible: true });
    expect(String(elementProps(tree).className).includes('--compact')).toBe(compact);
    const loggedIn = elements(tree).filter((node) => String(elementProps(node).className).includes('--login'));
    expect(loggedIn).toHaveLength(1);
    expect(elementProps(loggedIn[0]).title).toContain('maxExpand.cli.heatmap.loggedIn');
    expect(elements(tree).filter((node) => String(elementProps(node).className).includes('--today'))).toHaveLength(1);
    vi.useRealTimers();
  });
  it('renders an empty login set without marking any day logged in', () => {
    const tree = LoginHeatmap({ loginDays: new Set(), visible: false });
    expect(elements(tree).filter((node) => String(elementProps(node).className).includes('--login'))).toHaveLength(0);
  });
});
