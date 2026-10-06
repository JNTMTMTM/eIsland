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
 * @file todoIcons.test.ts
 * @description todoIcons 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckIcon, ArrowIcon, DashedIcon, RollDigit, RollingCount, FilledCheckIcon, classNames } from '../todoIcons';
import { elementProps, elements, resetState, textContent } from '../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('todoIcons', () => {
  it.each([CheckIcon, ArrowIcon, DashedIcon])('renders an accessible decorative icon and its active variant', (Icon) => {
    const idle = Icon({ active: false });
    const active = Icon({ active: true });
    expect(idle.type).toBe('svg');
    expect(elementProps(idle)['aria-hidden']).toBe('true');
    expect(elementProps(active).className).not.toBe(elementProps(idle).className);
    expect(classNames('base')).toBe('base');
    expect(classNames('base', true)).toContain('base ');
    expect(FilledCheckIcon().type).toBe('svg');
  });
  it('renders stable and rolling digits and exposes count accessibility text', () => {
    expect(textContent(RollDigit({ character: '3' }))).toBe('3');
    resetState([{ from: '3', to: '4' }, true]);
    expect(textContent(RollDigit({ character: '4' }))).toBe('34');
    const count = RollingCount({ value: '3/5' });
    expect(elementProps(count)['aria-label']).toBe('3/5');
    expect(elements(count).filter((node) => node.type === RollDigit)).toHaveLength(3);
    expect(elements(RollingCount({ value: '' })).filter((node) => node.type === RollDigit)).toHaveLength(0);
  });
});
