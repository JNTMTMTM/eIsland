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
 * @file musicProvidersLoginContent.test.tsx
 * @description MusicProvidersLoginContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, find, invoke, text } from '../../../test/tree';

import { MusicProvidersLoginContent } from '../MusicProvidersLoginContent';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

const model = vi.hoisted(() => ({ store: { musicProviderLogin: 'qishui', returnFromAuth: vi.fn(), setMaxExpandTab: vi.fn(), setMaxExpand: vi.fn() }, login: { authState: 'waiting', qrContent: 'https://login.example.com/qr', loading: false, refresh: vi.fn() } }));
vi.mock('../../../../../store/slices', () => ({ default: () => model.store }));
vi.mock('../../hooks/useMusicProviderQrLogin', () => ({ useMusicProviderQrLogin: () => model.login }));
beforeEach(() => { model.login.authState = 'waiting'; model.login.qrContent = 'https://login.example.com/qr'; model.login.loading = false; });
describe('MusicProvidersLoginContent', () => {
  it('renders QR and forwards refresh and back actions', () => { const root = ((MusicProvidersLoginContent() as TreeElement)); expect(find(root, (node) => node.props.value === model.login.qrContent).props.size).toBe(180); invoke(byClass(root, 'settings-user-primary-btn'), 'onClick'); expect(model.login.refresh).toHaveBeenCalledOnce(); invoke(byClass(root, 'settings-user-secondary-btn'), 'onClick'); expect(model.store.returnFromAuth).toHaveBeenCalledOnce(); });
  it('renders loading placeholder and unavailable QR states', () => { model.login.qrContent = ''; model.login.loading = true; let root = ((MusicProvidersLoginContent() as TreeElement)); expect(text(root)).toContain('settings.musicProviderLogin.loading'); expect(byClass(root, 'settings-user-primary-btn').props.disabled).toBe(true); model.login.loading = false; root = ((MusicProvidersLoginContent() as TreeElement)); expect(text(root)).toContain('settings.musicProviderLogin.qrUnavailable'); });
  it('renders confirmed success with done and report actions', () => { model.login.authState = 'confirmed'; const root = ((MusicProvidersLoginContent() as TreeElement)); expect(text(root)).toContain('settings.musicProviderLogin.success'); expect(elements(root).some((node) => node.props.value === model.login.qrContent)).toBe(false); invoke(byClass(root, 'settings-user-primary-btn'), 'onClick'); expect(model.store.returnFromAuth).toHaveBeenCalledOnce(); });
});
