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
 * @file guideFooter.test.tsx
 * @description GuideFooter 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text, translate } from '../../../test/tree';

import { GuideFooter } from '../GuideFooter';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

function fixture() { return { t: translate, page: 0, isLast: false, pageCount: 3, onSelectPage: vi.fn(), onFinish: vi.fn(), onPrev: vi.fn(), onNext: vi.fn() }; }
function render(props = fixture()) { return ((GuideFooter(props as unknown as Parameters<typeof GuideFooter>[0]) as TreeElement)); }
describe('GuideFooter', () => {
  it('marks the current dot and forwards page selection, skip and next', () => {
    const props = fixture(); const root = render(props); const dots = elements(root).filter((node) => String(node.props.className).includes('guide-nav-dot '));
    expect(dots).toHaveLength(3); expect(dots[0].props.className).toContain('active'); invoke(dots[2], 'onClick'); expect(props.onSelectPage).toHaveBeenCalledWith(2);
    invoke(byClass(root, 'guide-btn-secondary'), 'onClick'); expect(props.onFinish).toHaveBeenCalledOnce();
    invoke(byClass(root, 'guide-btn-primary'), 'onClick'); expect(props.onNext).toHaveBeenCalledOnce(); expect(text(root)).not.toContain('guide.actions.prev');
  });
  it('removes skip on last page and exposes previous plus start', () => {
    const props = fixture(); props.page = 2; props.isLast = true; const root = render(props);
    expect(text(root)).not.toContain('guide.actions.skip'); expect(text(root)).toContain('guide.actions.start');
    invoke(byClass(root, 'guide-btn-secondary'), 'onClick'); expect(props.onPrev).toHaveBeenCalledOnce();
  });
  it('handles a single-page guide without dots outside its page range', () => { const props = fixture(); props.pageCount = 1; props.isLast = true; expect(elements(render(props)).filter((node) => node.props['aria-label'] === 'guide.nav.pageAria')).toHaveLength(1); });
});
