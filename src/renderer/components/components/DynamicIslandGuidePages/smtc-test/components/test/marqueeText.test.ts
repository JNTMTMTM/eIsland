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
 * @file marqueeText.test.ts
 * @description MarqueeText 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarqueeText } from '../MarqueeText';
import { elementProps, findElement, resetState, textContent } from '../../../../../test/elementHarness';
const hooks = vi.hoisted(() => ({ containerRef: { current: null }, textRef: { current: null }, distance: 0 }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../hooks/useMarqueeOverflow', () => ({ useMarqueeOverflow: () => hooks }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('MarqueeText', () => {
  it.each([0, 40])('scrolls only overflowing content at distance=%s', (distance) => {
    hooks.distance = distance;
    const tree = MarqueeText({ children: 'Long song title', className: 'title' });
    expect(elementProps(tree).className).toBe('title');
    const text = findElement(tree, (node) => node.type === 'span');
    expect(textContent(tree)).toBe('Long song title');
    expect(String(elementProps(text).className).includes('scrolling')).toBe(distance > 0);
    expect(elementProps(text).style).toEqual(distance > 0 ? { '--marquee-distance': '-40px' } : undefined);
  });
});
