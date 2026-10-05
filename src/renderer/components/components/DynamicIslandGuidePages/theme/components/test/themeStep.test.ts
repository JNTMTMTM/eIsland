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
 * @file themeStep.test.ts
 * @description ThemeStep 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeStep } from '../ThemeStep';
import { elementProps, elements, findElement, invoke, resetState } from '../../../../../test/elementHarness';
const hooks = vi.hoisted(() => ({ mode: 'dark', opacity: 50, setMode: vi.fn(), setOpacity: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../hooks/useThemeSetting', () => ({ useThemeSetting: () => hooks }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('ThemeStep', () => {
  it.each(['dark', 'light', 'system'])('renders %s as selected and forwards explicit opacity values', (mode) => {
    hooks.mode = mode;
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const tree = ThemeStep({ onNext, onPrev });
    const choices = elements(tree).filter((node) => String(elementProps(node).className).startsWith('guide-theme-mode-btn'));
    expect(choices.filter((node) => String(elementProps(node).className).includes('selected'))).toHaveLength(1);
    invoke(choices[2], 'onClick');
    expect(hooks.setMode).toHaveBeenCalledWith('system');
    const range = findElement(tree, (node) => elementProps(node).type === 'range');
    expect(elementProps(range)).toMatchObject({ min: 10, max: 100, value: 50 });
    invoke(range, 'onInput', { target: { value: '10' } });
    expect(hooks.setOpacity).toHaveBeenCalledWith(10);
    invoke(findElement(tree, (node) => elementProps(node).className === 'guide-next-btn'), 'onClick');
    expect(onNext).toHaveBeenCalledOnce();
  });
});
