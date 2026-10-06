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
 * @file userSettingsSection.test.ts
 * @description UserSettingsSection 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSettingsSection } from '../UserSettingsSection';
import { elementProps, elements, findElement, invoke, resetState, rewindState, textContent } from '../../../../../../../test/elementHarness';
const session = vi.hoisted(() => ({ token: null as string | null, profile: null as Record<string, unknown> | null }));
const store = vi.hoisted(() => ({ setLogin: vi.fn(), setRegister: vi.fn(), setPayment: vi.fn(), setQuestionnaire: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../../../../../../../utils/userAccount', () => ({ readLocalToken: () => session.token, readLocalProfile: () => session.profile, clearLocalAccount: vi.fn(), writeLocalProfile: vi.fn(), writeLocalToken: vi.fn(), subscribeUserAccountSessionChanged: vi.fn() }));
vi.mock('../../../../../../../../store/slices', () => ({ default: () => store }));
vi.mock('../../../../../../../components/DynamicIslandQuestionnaireBanner', () => ({ QuestionnaireBanner: vi.fn(), useAnnouncementQuestionnaire: () => ({ questionnaire: null, count: 0, dismiss: vi.fn() }) }));
vi.mock('../utils/loginHeatmapStorage', () => ({ readLoginDays: () => new Set<string>(), recordLoginDay: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  session.token = null;
  session.profile = null;
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('UserSettingsSection', () => {
  it('renders authentication prompt and routes login and registration', () => {
    const tree = UserSettingsSection({});
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.user.auth.gotoLogin'), 'onClick');
    expect(store.setLogin).toHaveBeenCalledOnce();
    invoke(findElement(tree, (n) => n.type === 'button' && textContent(n) === 'settings.user.auth.gotoRegister'), 'onClick');
    expect(store.setRegister).toHaveBeenCalledOnce();
  });
  it.each(['info', 'edit', 'password', 'pro', 'recharge', 'orders', 'account', 'oauth', 'image-translation', 'ocr-history', 'questionnaire'] as const)('renders authenticated %s page without starting network effects', (initialProfilePage) => {
    session.token = 'opaque';
    session.profile = { username: 'reader', nickname: 'Reader', email: 'reader@example.com', gender: 'undisclosed', balance: 0, isPro: false };
    const tree = UserSettingsSection({ initialProfilePage });
    expect(textContent(tree)).toContain('settings.labels.user');
    expect(elements(tree).some((n) => 'activePage' in elementProps(n) && elementProps(n).activePage === initialProfilePage)).toBe(true);
    expect(textContent(tree)).not.toContain('settings.user.auth.gotoLogin');
  });
  it.each([
    { code: '', password: '', confirmation: '', message: 'emailCodeRequired' },
    { code: '123456', password: '', confirmation: '', message: 'passwordRequired' },
    { code: '123456', password: 'short', confirmation: '', message: 'passwordTooShort' },
    { code: '123456', password: 'Password123', confirmation: '', message: 'passwordConfirmRequired' },
    { code: '123456', password: 'Password123', confirmation: 'Different123', message: 'passwordConfirmMismatch' },
  ])('validates password form $message before requesting a password update', ({ code, password, confirmation, message }) => {
    session.token = 'opaque';
    session.profile = { username: 'reader', nickname: 'Reader', email: 'reader@example.com', gender: 'undisclosed', balance: 0, isPro: false };
    const initial = UserSettingsSection({ initialProfilePage: 'password' });
    const fields = elements(initial).filter((node) => node.type === 'input');
    invoke(fields[0], 'onChange', { target: { value: code } });
    invoke(fields[1], 'onChange', { target: { value: password } });
    invoke(fields[2], 'onChange', { target: { value: confirmation } });
    rewindState();
    const changed = UserSettingsSection({ initialProfilePage: 'password' });
    invoke(findElement(changed, (node) => node.type === 'button' && textContent(node) === 'settings.user.actions.changePassword'), 'onClick');
    rewindState();
    expect(textContent(UserSettingsSection({ initialProfilePage: 'password' }))).toContain(`settings.user.feedback.${message}`);
  });
  it('toggles password visibility without changing the password value', () => {
    session.token = 'opaque';
    session.profile = { username: 'reader', nickname: 'Reader', email: 'reader@example.com', gender: 'undisclosed', balance: 0, isPro: false };
    const initial = UserSettingsSection({ initialProfilePage: 'password' });
    const [, password] = elements(initial).filter((node) => node.type === 'input');
    invoke(password, 'onChange', { target: { value: 'Password123' } });
    invoke(findElement(initial, (node) => elementProps(node)['aria-label'] === 'settings.user.actions.showPassword'), 'onClick');
    rewindState();
    const [, visible] = elements(UserSettingsSection({ initialProfilePage: 'password' })).filter((node) => node.type === 'input');
    expect(elementProps(visible)).toMatchObject({ type: 'text', value: 'Password123' });
  });
  it('opens and cancels account deletion confirmation while incomplete credentials disable submission', () => {
    session.token = 'opaque';
    session.profile = { username: 'reader', nickname: 'Reader', email: 'reader@example.com', gender: 'undisclosed', balance: 0, isPro: false };
    const initial = UserSettingsSection({ initialProfilePage: 'account' });
    invoke(findElement(initial, (node) => node.type === 'button' && textContent(node) === 'settings.user.actions.unregister'), 'onClick');
    rewindState();
    const confirming = UserSettingsSection({ initialProfilePage: 'account' });
    expect(elementProps(findElement(confirming, (node) => node.type === 'button' && textContent(node) === 'settings.user.actions.confirmUnregister')).disabled).toBe(true);
    invoke(findElement(confirming, (node) => node.type === 'button' && textContent(node) === 'settings.user.actions.cancel'), 'onClick');
    rewindState();
    expect(elements(UserSettingsSection({ initialProfilePage: 'account' })).some((node) => textContent(node) === 'settings.user.actions.confirmUnregister')).toBe(false);
  });
});
