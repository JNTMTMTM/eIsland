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
 * @file guideContent.test.tsx
 * @description GuideContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { elements, find, invoke } from '../../test/tree';

import { GuideContent } from '../GuideContent';

import { GuideStaticPage } from '../components/GuideStaticPage';
import { GuideInteractivePage } from '../components/GuideInteractivePage';
import { GuideFooter } from '../components/GuideFooter';
import type { TreeElement } from '../../test/tree';
vi.mock('../../../../utils/theme', () => ({ getThemeMode: () => 'dark', setThemeMode: vi.fn() }));
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const model = vi.hoisted(() => ({ store: { setIdle: vi.fn(), setLogin: vi.fn(), setRegister: vi.fn() }, nav: { page: 0, setPage: vi.fn(), cardIndex: 0, animDirRef: { current: 'up' }, isLast: false, handleCardWheel: vi.fn(), handlePrev: vi.fn(), handleNext: vi.fn(), resetGuideState: vi.fn() }, mode: 'island' }));
vi.mock('../../../../store/slices', () => ({ default: () => model.store }));
vi.mock('../hooks/useGuideNavigation', () => ({ useGuideNavigation: () => model.nav }));
vi.mock('../../../../utils/userAccount', () => ({ readLocalToken: () => '' }));
vi.mock('../utils/guideContentUtils', () => ({ readStandaloneWindowMode: () => Promise.resolve(model.mode), STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY: 'active-tab', STANDALONE_WINDOW_AUTH_INTENT_STORE_KEY: 'auth-intent', extractDominantColor: () => Promise.resolve([1, 2, 3]) }));
vi.mock('../../../../i18n', () => ({ default: { t: (key: string) => key } }));
beforeEach(() => { model.nav.page = 0; model.mode = 'island'; });
describe('GuideContent', () => {
  it('renders static welcome and forwards footer navigation', () => { const root = ((GuideContent() as TreeElement)); expect(find(root, (node) => node.type === GuideStaticPage).props.current).toMatchObject({ imageSrc: '../svg/app/eisland.svg' }); const footer = find(root, (node) => node.type === GuideFooter); invoke(footer, 'onSelectPage', 2); expect(model.nav.setPage).toHaveBeenCalledWith(2); invoke(footer, 'onPrev'); expect(model.nav.handlePrev).toHaveBeenCalledOnce(); });
  it.each([1, 2, 3, 4])('renders interactive section %i with matching demo', (page) => { model.nav.page = page; const root = ((GuideContent() as TreeElement)); const content = find(root, (node) => node.type === GuideInteractivePage); expect(content.props.cards).toBeInstanceOf(Array); expect(content.props.onWheel).toBe(model.nav.handleCardWheel); const mini = invoke(content, 'renderMini', 0); expect(elements(mini as ReturnType<typeof createElement>)[0].props.demo).toBeDefined(); });
  it('finishes guide by resetting navigation and returning idle', () => { const updaterVersion = vi.fn().mockResolvedValue('1.0'); const storeWrite = vi.fn().mockResolvedValue(true); vi.stubGlobal('window', { api: { updaterVersion, storeWrite } }); invoke(find(((GuideContent() as TreeElement)), (node) => node.type === GuideFooter), 'onFinish'); expect(model.nav.resetGuideState).toHaveBeenCalledOnce(); expect(model.store.setIdle).toHaveBeenCalledWith(true); vi.unstubAllGlobals(); });
  it('opens requested login and register flows from auth guide', async () => { model.nav.page = 5; const content = find(((GuideContent() as TreeElement)), (node) => node.type === GuideStaticPage); invoke(content, 'onAuthLogin'); invoke(content, 'onAuthRegister'); await Promise.resolve(); expect(model.store.setLogin).toHaveBeenCalledOnce(); expect(model.store.setRegister).toHaveBeenCalledOnce(); });
});
