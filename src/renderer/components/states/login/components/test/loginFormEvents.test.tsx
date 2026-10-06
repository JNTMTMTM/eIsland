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
 * @file loginFormEvents.test.tsx
 * @description 验证登录表单真实验证码输入、异步发送、页面导航和按钮禁用约束。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { elements, findElement, invoke } from '../../../../test/elementHarness';
import { LoginForm } from '../LoginForm';
import type { LoginFormProps } from '../../types';

const translation = createInstance();
await translation.init({ lng: 'en', resources: { en: { translation: {} } } });

/** 构造公开登录表单参数与行为边界。
 * @returns 可记录真实表单调用的合法参数。
 */
function fixture(): LoginFormProps {
  return {
    account: 'person', setAccount: vi.fn(), verificationEmail: 'person@example.test',
    maskedVerificationEmail: 'p***@example.test', emailCode: '', setEmailCode: vi.fn(),
    password: 'password12', setPassword: vi.fn(), passwordVisible: false, setPasswordVisible: vi.fn(),
    submitting: false, sendingCode: false, sendCooldownSeconds: 0, needsEmailVerification: true,
    isEmailAccount: false, feedback: null, handleSendCode: vi.fn<() => Promise<void>>().mockResolvedValue(),
    handleSubmit: vi.fn<() => Promise<void>>().mockResolvedValue(), setRegister: vi.fn(),
    setResetPassword: vi.fn(), returnFromAuth: vi.fn(), githubLoading: false,
    handleGitHubLogin: vi.fn<() => Promise<void>>().mockResolvedValue(), microsoftLoading: false,
    handleMicrosoftLogin: vi.fn<() => Promise<void>>().mockResolvedValue(), wechatLoading: false,
    handleWechatLogin: vi.fn<() => Promise<void>>().mockResolvedValue(), giteeLoading: false,
    handleGiteeLogin: vi.fn<() => Promise<void>>().mockResolvedValue(), kookLoading: false,
    handleKookLogin: vi.fn<() => Promise<void>>().mockResolvedValue(), disabledProviders: new Set<string>(),
    t: translation.t,
  } satisfies LoginFormProps;
}

describe('登录表单公开验证码和导航回调', () => {
  it('邮箱验证码输入原样回传，发送按钮调用一次异步处理器', () => {
    const props = fixture();
    const tree = LoginForm(props);
    const input = findElement(tree, ({ type, props: attributes }) => type === 'input' && attributes.value === '');
    invoke(input, 'onChange', { target: { value: '012345' } });
    expect(props.setEmailCode).toHaveBeenCalledExactlyOnceWith('012345');
    const button = findElement(tree, ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']);
    expect(button.props.disabled).toBe(false);
    invoke(button, 'onClick');
    expect(props.handleSendCode).toHaveBeenCalledOnce();
  });

  it('三个页面跳转按钮调用各自导航而不提交账号', () => {
    const props = fixture();
    const buttons = elements(LoginForm(props)).filter(({ props: attributes }) => attributes.className === 'settings-user-secondary-btn');
    buttons.forEach((button) => { expect(button.props.disabled).toBe(false); invoke(button, 'onClick'); });
    expect(props.setRegister).toHaveBeenCalledOnce();
    expect(props.setResetPassword).toHaveBeenCalledOnce();
    expect(props.returnFromAuth).toHaveBeenCalledOnce();
    expect(props.handleSubmit).not.toHaveBeenCalled();
  });

  it('验证码发送中与冷却中按钮禁用，提交中所有导航禁用', () => {
    const props = fixture();
    props.sendingCode = true;
    expect(findElement(LoginForm(props), ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']).props.disabled).toBe(true);
    props.sendingCode = false;
    props.sendCooldownSeconds = 20;
    expect(findElement(LoginForm(props), ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']).props.disabled).toBe(true);
    props.submitting = true;
    expect(elements(LoginForm(props)).filter(({ props: attributes }) => attributes.className === 'settings-user-secondary-btn').every(({ props: attributes }) => attributes.disabled)).toBe(true);
  });
});
