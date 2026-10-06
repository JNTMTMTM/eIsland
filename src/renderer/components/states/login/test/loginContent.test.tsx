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
 * @file loginContent.test.tsx
 * @description 组件渲染分支、交互和边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { LoginContent } from '../LoginContent';
import { LoginForm } from '../components/LoginForm';
const mocks = vi.hoisted(() => ({ model: {} }));
vi.mock('../hooks/useLogin', () => ({ useLogin: () => mocks.model }));

describe('LoginContent', () => {
  it('passes every model value and action unchanged to the form', () => {
    mocks.model = { account: { field: 'account' }, setAccount: { field: 'setAccount' }, verificationEmail: { field: 'verificationEmail' }, maskedVerificationEmail: { field: 'maskedVerificationEmail' }, emailCode: { field: 'emailCode' }, setEmailCode: { field: 'setEmailCode' }, password: { field: 'password' }, setPassword: { field: 'setPassword' }, passwordVisible: { field: 'passwordVisible' }, setPasswordVisible: { field: 'setPasswordVisible' }, submitting: { field: 'submitting' }, sendingCode: { field: 'sendingCode' }, sendCooldownSeconds: { field: 'sendCooldownSeconds' }, needsEmailVerification: { field: 'needsEmailVerification' }, isEmailAccount: { field: 'isEmailAccount' }, feedback: { field: 'feedback' }, handleSendCode: { field: 'handleSendCode' }, handleSubmit: { field: 'handleSubmit' }, setRegister: { field: 'setRegister' }, setResetPassword: { field: 'setResetPassword' }, returnFromAuth: { field: 'returnFromAuth' }, githubLoading: { field: 'githubLoading' }, handleGitHubLogin: { field: 'handleGitHubLogin' }, microsoftLoading: { field: 'microsoftLoading' }, handleMicrosoftLogin: { field: 'handleMicrosoftLogin' }, wechatLoading: { field: 'wechatLoading' }, handleWechatLogin: { field: 'handleWechatLogin' }, giteeLoading: { field: 'giteeLoading' }, handleGiteeLogin: { field: 'handleGiteeLogin' }, kookLoading: { field: 'kookLoading' }, handleKookLogin: { field: 'handleKookLogin' }, disabledProviders: { field: 'disabledProviders' }, t: { field: 't' } };
    const result = LoginContent();
    expect(result.type).toBe(LoginForm);
    expect(result.props).toEqual(mocks.model);
  });
  it('updates boundary values when the model changes', () => {
    mocks.model = { submitting: true, feedback: null, email: '', password: '' };
    const result = LoginContent();
    const props = result.props as Record<string, unknown>;
    expect(props.submitting).toBe(true);
    expect(props.feedback).toBeNull();
    expect(props.password ?? props.email).toBe('');
  });
});
