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
 * @file guideStaticPage.test.tsx
 * @description GuideStaticPage 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text, translate } from '../../../test/tree';

import { GuideStaticPage } from '../GuideStaticPage';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

function render(current: Parameters<typeof GuideStaticPage>[0]['current'], page = 0, onAuthLogin = vi.fn(), onAuthRegister = vi.fn()) { return ((GuideStaticPage({ current, page, onAuthLogin, onAuthRegister, t: translate as unknown as Parameters<typeof GuideStaticPage>[0]['t'] }) as TreeElement)); }
describe('GuideStaticPage', () => {
  it('renders welcome image and optional tips', () => { const root = render({ title: 'Welcome', desc: 'Description', imageSrc: 'logo.png', tips: [{ text: 'Tip' }] }); expect(root.props.className).toContain('guide-page-welcome'); expect(byClass(root, 'guide-page-logo').props.src).toBe('logo.png'); expect(text(root)).toContain('Tip'); });
  it('renders text icon without tips on later pages', () => { const root = render({ title: 'Later', desc: 'Details', icon: '☆' }, 1); expect(text(root)).toContain('☆'); expect(root.props.className).not.toContain('guide-page-welcome'); expect(elements(root).some((node) => node.props.className === 'guide-tips')).toBe(false); });
  it('exposes auth calls and a user icon only for auth prompt', () => { const login = vi.fn(); const register = vi.fn(); const root = render({ title: 'Account', desc: '', actionPrompt: 'auth' }, 2, login, register); expect(root.props.className).toContain('guide-page-auth'); expect(byClass(root, 'guide-page-auth-icon').props['aria-hidden']).toBe('true'); invoke(byClass(root, 'guide-btn-primary'), 'onClick'); invoke(byClass(root, 'guide-btn-secondary'), 'onClick'); expect(login).toHaveBeenCalledOnce(); expect(register).toHaveBeenCalledOnce(); });
});
