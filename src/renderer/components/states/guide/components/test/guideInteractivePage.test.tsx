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
 * @file guideInteractivePage.test.tsx
 * @description GuideInteractivePage 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { byClass, elements, invoke, text } from '../../../test/tree';

import { GuideInteractivePage } from '../GuideInteractivePage';

import { SvgIcon } from '../../../../../utils/SvgIcon';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
describe('GuideInteractivePage', () => {
  it.each([[-2, 0], [99, 2], [1.9, 1], [NaN, 0], [Infinity, 2], [-Infinity, 0]] as const)('normalizes index %s consistently for card, dot and mini', (cardIndex, expected) => {
    const renderMini = vi.fn(() => createElement('span'));
    const cards = [0, 1, 2].map((index) => ({ iconSrc: 'icon.svg', title: `Card${index}`, desc: '' }));
    const root = ((GuideInteractivePage({ cards, cardIndex, renderMini, page: 0, hint: '', animDir: 'up', onWheel: vi.fn() }) as TreeElement));
    expect(text(root)).toContain(`Card${expected}`);
    expect(renderMini).toHaveBeenCalledWith(expected);
    const dots = elements(root).filter((node) => String(node.props.className).split(' ').includes('guide-interact-dot'));
    expect(dots.filter((node) => String(node.props.className).includes('active'))).toEqual([dots[expected]]);
    expect(byClass(root, 'guide-interact-card').key).toContain(`card-${expected}`);
  });
  it('omits empty cards without invoking a mini renderer', () => {
    const renderMini = vi.fn(() => createElement('span'));
    expect(((GuideInteractivePage({ renderMini, page: 0, cards: [], cardIndex: 0, hint: '', animDir: 'up', onWheel: vi.fn() }) as TreeElement))).toBeNull();
    expect(renderMini).not.toHaveBeenCalled();
  });
  it('clamps a negative card index to the first card', () => {
    const renderMini = vi.fn(() => createElement('span'));
    const root = ((GuideInteractivePage({ renderMini, page: 0, cards: [{ iconSrc: 'icon.svg', title: 'First', desc: '' }], cardIndex: -5, hint: '', animDir: 'up', onWheel: vi.fn() }) as TreeElement));
    expect(text(root)).toContain('First');
    expect(renderMini).toHaveBeenCalledWith(0);
  });
  it.each(['up', 'down'] as const)('renders selected card and %s animation while delegating wheel', (animDir) => {
    const onWheel = vi.fn(); const renderMini = vi.fn(() => createElement('span', {}, 'Demo')); const cards = [{ iconSrc: 'icon.svg', title: 'First', desc: 'One' }, { iconSrc: SvgIcon.POMODORO, title: 'Second', desc: 'Two' }];
    const root = ((GuideInteractivePage({ cards, animDir, onWheel, renderMini, page: 1, cardIndex: 1, hint: 'Wheel hint' }) as TreeElement));
    expect(text(root)).toContain('Second'); expect(text(root)).not.toContain('First'); expect(renderMini).toHaveBeenCalledWith(1);
    expect(byClass(root, 'guide-interact-icon').props.className).toContain('no-invert');
    expect(byClass(root, 'guide-interact-card').props.className).toContain(animDir === 'down' ? 'guide-slide-up' : 'guide-slide-down');
    const event = { deltaY: 5 }; invoke(byClass(root, 'guide-interact-zone'), 'onWheel', event); expect(onWheel).toHaveBeenCalledWith(event);
  });
  it('clamps a stale high card index to the final available card', () => { const renderMini = vi.fn(() => createElement('span')); const root = ((GuideInteractivePage({ renderMini, page: 0, cards: [{ iconSrc: 'icon.svg', title: 'Only', desc: '' }], cardIndex: 99, hint: '', animDir: 'up', onWheel: vi.fn() }) as TreeElement)); expect(text(root)).toContain('Only'); expect(renderMini).toHaveBeenCalledWith(0); });
});
