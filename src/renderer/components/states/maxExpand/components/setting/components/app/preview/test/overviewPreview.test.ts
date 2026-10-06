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
 * @file overviewPreview.test.ts
 * @description OverviewPreview 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewPreview } from '../OverviewPreview';
import { elementProps, elements, findElement, resetState, textContent } from '../../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
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
describe('OverviewPreview', () => {
  it.each([
    ['shortcuts', 'overview.shortcuts.title'], ['todo', 'overview.todo.title'],
    ['song', 'settings.app.layout.previewMock'], ['countdown', 'overview.countdown'],
    ['pomodoro', 'overview.pomodoro'], ['urlFavorites', 'overview.urlFavorites'],
    ['album', 'overview.album'], ['mokugyo', 'overview.mokugyo'],
    ['breakReminder', 'overview.breakReminder'], ['worldClock', 'overview.worldClock'],
    ['alarm', 'overview.alarm'],
  ] as const)('renders %s widget with a real branch', (widget, label) => {
    const config: ComponentProps<typeof OverviewPreview>['layoutConfig'] = { left: widget, right: 'todo', clockStyle: 'classic', gradientColors: { start: '#000000', middle: '#888888', end: '#ffffff' } };
    const tree = OverviewPreview({ layoutConfig: config });
    expect(textContent(tree)).toContain(label);
    expect(elements(tree).length).toBeGreaterThan(10);
  });
  it.each(['gradient', 'minimal'] as const)('applies %s clock gradient variables', (clockStyle) => {
    const tree = OverviewPreview({ layoutConfig: { clockStyle, left: 'todo', right: 'shortcuts', gradientColors: { start: '#123456', middle: '#654321', end: '#ffffff' } } });
    expect(elementProps(findElement(tree, (node) => String(node.props.className).includes('ov-dash-time--') && typeof node.props.style === 'object')).style).toMatchObject({ '--ov-clock-gradient-start': '#123456', '--ov-clock-gradient-middle': '#654321', '--ov-clock-gradient-end': '#ffffff' });
  });
});
