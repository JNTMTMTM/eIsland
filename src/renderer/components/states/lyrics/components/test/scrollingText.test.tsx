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
 * @file scrollingText.test.tsx
 * @description ScrollingText 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, text } from '../../../test/tree';

import { ScrollingText } from '../ScrollingText';
import type { TreeElement } from '../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('ScrollingText', () => {
  it('keeps fitting content static without scroll styles', () => { const root = ((ScrollingText({ children: 'Fits', className: 'custom' }) as TreeElement)); expect(root.props.className).toBe('custom scroll-text'); expect(byClass(root, 'scroll-text-content').props.style).toBeUndefined(); expect(text(root)).toBe('Fits'); });
  it.each([[-1, '0px'], [0.5, '90px'], [2, '180px']] as const)('clamps progress %s and maps overflow offset', (scrollProgress, offset) => { slots.values = [180]; const root = ((ScrollingText({ scrollProgress, children: 'Overflow', className: 'custom' }) as TreeElement)); expect(root.props.className).toContain('is-progress-driven'); expect(byClass(root, 'scroll-text-content').props.style).toEqual({ '--scroll-text-distance': '180px', '--scroll-text-duration': '14s', '--scroll-text-offset': offset }); });
  it('uses timed scrolling when no explicit progress is supplied', () => { slots.values = [18]; const root = ((ScrollingText({ children: 'Overflow', className: 'custom' }) as TreeElement)); expect(root.props.className).toContain('is-overflowing'); expect(root.props.className).not.toContain('is-progress-driven'); expect(byClass(root, 'scroll-text-content').props.style).toMatchObject({ '--scroll-text-duration': '6s' }); });
});
