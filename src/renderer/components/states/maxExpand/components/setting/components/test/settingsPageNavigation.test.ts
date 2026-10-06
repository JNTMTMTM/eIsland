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
 * @file settingsPageNavigation.test.ts
 * @description SettingsPageNavigation 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPageNavigation, SettingsPageNavigationToggle } from '../SettingsPageNavigation';
import { elementProps, findElement, elements, invoke, resetState } from '../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('SettingsPageNavigation', () => {
  it.each([false, true])('renders navigation expanded=%s with the active page exposed', (expanded) => {
    const onSelectPage = vi.fn();
    const tree = SettingsPageNavigation({ onSelectPage, expanded, activePage: 'a', pages: ['a', 'b'], pageLabels: { a: 'Alpha', b: 'Beta' }, navigationLabel: 'Pages' });
    expect(elementProps(tree)['aria-hidden']).toBe(!expanded);
    const buttons = elements(tree).filter((node) => node.type === 'button');
    expect(buttons).toHaveLength(expanded ? 2 : 0);
    if (expanded) {
      expect(elementProps(buttons[0])['aria-current']).toBe('page');
      expect(elementProps(buttons[1])['aria-current']).toBeUndefined();
      invoke(buttons[1], 'onClick');
      expect(onSelectPage).toHaveBeenCalledWith('b');
    }
  });
  it('handles empty page lists and toggles expansion accessibly', () => {
    expect(elements(SettingsPageNavigation({ activePage: 'a', expanded: true, pages: [], pageLabels: { a: 'Alpha' }, navigationLabel: 'Pages', onSelectPage: vi.fn() })).filter((node) => node.type === 'button')).toHaveLength(0);
    const onToggle = vi.fn();
    const tree = SettingsPageNavigationToggle({ onToggle, expanded: true, label: 'Hide pages' });
    expect(elementProps(tree)).toMatchObject({ 'aria-expanded': true, 'aria-label': 'Hide pages' });
    invoke(findElement(tree, () => true), 'onClick');
    expect(onToggle).toHaveBeenCalledOnce();
  });
});

it('收起导航时开关显示展开图标且维持无障碍状态', () => {
  const onToggle = vi.fn(); const tree = SettingsPageNavigationToggle({ onToggle, expanded: false, label: 'Show pages' });
  expect(elementProps(tree)['aria-expanded']).toBe(false);
  expect(elementProps(findElement(tree, (node) => node.type === 'img')).src).toBeTruthy();
  const expanded = SettingsPageNavigationToggle({ onToggle, expanded: true, label: 'Hide pages' });
  expect(elementProps(findElement(tree, (node) => node.type === 'img')).src).not.toBe(elementProps(findElement(expanded, (node) => node.type === 'img')).src);
  invoke(findElement(tree, (node) => node.type === 'button'), 'onClick'); expect(onToggle).toHaveBeenCalledOnce();
});
