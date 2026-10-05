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
 * @file islandContentTransition.test.ts
 * @description islandContentTransition 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import IslandContentTransition from '../islandContentTransition';
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
describe('islandContentTransition', () => {
  it.each([false, true])('initial content is active with performance=%s', (performanceModeEnabled) => {
    const child = createElement('section', {}, 'Active');
    const tree = IslandContentTransition({ performanceModeEnabled, state: 'idle', animationSpeed: 'medium', springAnimation: true, children: child });
    const layer = findElement(tree, (node) => elementProps(node)['data-island-state'] === 'idle');
    expect(elementProps(layer)).toMatchObject({ hidden: false, inert: false, style: { display: 'contents' } });
    expect(textContent(tree)).toBe('Active');
  });
  it('keeps a heavy outgoing layer hidden until its replacement can mount', () => {
    const outgoing = createElement('section', {}, 'Old');
    const next = createElement('section', {}, 'New');
    resetState([{ target: 'expanded', pending: true, retained: { state: 'expanded', element: outgoing } }]);
    const tree = IslandContentTransition({ state: 'maxExpand', animationSpeed: 'medium', springAnimation: true, performanceModeEnabled: true, children: next, fallback: 'Loading' });
    const old = findElement(tree, (node) => elementProps(node)['data-island-state'] === 'expanded');
    expect(elementProps(old)).toMatchObject({ hidden: true, inert: true, 'aria-hidden': true });
    expect(textContent(tree)).toContain('OldLoading');
    expect(textContent(tree)).not.toContain('New');
    resetState([{ target: 'expanded', pending: true, retained: { state: 'expanded', element: outgoing } }]);
    const disabled = IslandContentTransition({ state: 'maxExpand', animationSpeed: 'medium', springAnimation: true, performanceModeEnabled: false, children: next, fallback: 'Loading' });
    expect(textContent(disabled)).toBe('New');
  });
});
