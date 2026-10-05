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
 * @file processIndicator.test.ts
 * @description ProcessIndicator 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessIndicator } from '../ProcessIndicator';
import { elementProps, elements, resetState } from '../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ProcessIndicator', () => {
  it.each([[0, 0, []], [3, 1, ['completed', 'active', 'inactive']], [3, 4, ['completed', 'completed', 'completed']]] as const)('renders total=%s current=%s with expected segment classes', (total, current, expected) => {
    const tree = ProcessIndicator({ total, current });
    const segments = elements(tree).filter((node) => String(elementProps(node).className).startsWith('process-indicator-segment'));
    expect(segments.map((node) => String(elementProps(node).className).split(' ')[1])).toEqual(expected);
    expect(elementProps(tree).style).toHaveProperty('--process-indicator-duration');
  });
});
