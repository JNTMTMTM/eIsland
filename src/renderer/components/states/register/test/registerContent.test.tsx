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
 * @file registerContent.test.tsx
 * @description RegisterContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, find, invoke, text } from '../../test/tree';

import { RegisterContent } from '../RegisterContent';
import type { TreeElement } from '../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ store: { setLogin: vi.fn(), setMaxExpand: vi.fn(), setMaxExpandTab: vi.fn(), returnFromAuth: vi.fn() }, register: vi.fn().mockResolvedValue({ ok: true, data: { token: 'token' } }), sendCode: vi.fn().mockResolvedValue({ ok: true, data: { retryAfterSeconds: 60 } }), captcha: vi.fn().mockResolvedValue({ ticket: 'ticket', randstr: 'rand', sign: 'sign' }), cooldown: { cooldownSeconds: 0, setCooldown: vi.fn() }, updateToken: vi.fn() }));
vi.mock('../../../../store/slices', () => ({ default: () => model.store }));
vi.mock('../../../../api/user/userAccountApi', () => ({ registerUserWithCode: model.register, sendUserEmailCode: model.sendCode }));
vi.mock('../../../../utils/authSession', () => ({ updateSessionToken: model.updateToken }));
vi.mock('../../../../utils/sliderCaptcha', () => ({ runSliderCaptcha: model.captcha }));
vi.mock('../utils/readStandaloneWindowMode', () => ({ readStandaloneWindowMode: () => Promise.resolve('island') }));
vi.mock('../hooks/useSendCooldown', () => ({ useSendCooldown: () => model.cooldown }));
function render() { slots.cursor = 0; return ((RegisterContent() as TreeElement)); }
function validValues() { slots.values = [' User ', ' User@example.com ', ' 123456 ', 'pass12345', 'pass12345', false, false, false, false, null]; }
describe('RegisterContent', () => {
  it('renders all editable fields and forwards updates', () => { const root = render(); const inputs = elements(root).filter((node) => node.type === 'input'); expect(inputs).toHaveLength(5); invoke(inputs[0], 'onChange', { target: { value: 'Next' } }); expect(slots.values[0]).toBe('Next'); });
  it.each([[0, '', 'usernameRequired'], [0, 'bad!', 'usernameFormatInvalid'], [1, '', 'emailRequired'], [3, '', 'passwordRequired'], [2, '', 'emailCodeRequired'], [4, '', 'confirmPasswordRequired'], [4, 'different', 'passwordNotMatch']] as const)('rejects invalid field %i before network submission', (index, value, key) => { validValues(); slots.values[index] = value; invoke(byClass(render(), 'settings-user-primary-btn'), 'onClick'); expect(slots.values[9]).toEqual({ type: 'error', text: `settings.user.feedback.${key}` }); expect(model.register).not.toHaveBeenCalled(); });
  it('registers normalized form and navigates after session update', async () => { validValues(); invoke(byClass(render(), 'settings-user-primary-btn'), 'onClick'); await Promise.resolve(); await Promise.resolve(); expect(model.register).toHaveBeenCalledWith('User', 'User@example.com', 'pass12345', '123456'); expect(model.updateToken).toHaveBeenCalledWith('token'); expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('settings'); });
  it('rejects invalid email before captcha and sends normalized email with challenge credentials', async () => { validValues(); slots.values[1] = 'invalid'; const send = () => invoke(find(render(), (node) => node.type === 'button' && text(node) === 'settings.user.actions.sendCode'), 'onClick'); send(); expect(model.captcha).not.toHaveBeenCalled(); slots.values[1] = ' User@example.com '; send(); await Promise.resolve(); await Promise.resolve(); expect(model.sendCode).toHaveBeenCalledWith('user@example.com', 'REGISTER', { ticket: 'ticket', randstr: 'rand', sign: 'sign' }); expect(model.cooldown.setCooldown).toHaveBeenCalledWith(60); });
  it('disables registration while submitting', () => { validValues(); slots.values[7] = true; const root = render(); expect(byClass(root, 'settings-user-primary-btn').props.disabled).toBe(true); invoke(byClass(root, 'settings-user-primary-btn'), 'onClick'); expect(model.register).not.toHaveBeenCalled(); });
});
