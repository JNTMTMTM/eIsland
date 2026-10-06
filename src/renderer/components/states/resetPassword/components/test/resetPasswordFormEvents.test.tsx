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
 * @file resetPasswordFormEvents.test.tsx
 * @description 验证重置密码表单真实验证码发送、登录注册导航及提交状态禁用约束。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { elements, findElement, invoke } from '../../../../test/elementHarness';
import { ResetPasswordForm } from '../ResetPasswordForm';

const translation = createInstance();
await translation.init({ lng: 'en', resources: { en: { translation: {} } } });

/** 构造公开重置密码表单参数。
 * @returns 包含全部 Hook 公开字段的合法表单参数。
 */
function fixture(): Parameters<typeof ResetPasswordForm>[0] {
  return {
    email: 'person@example.test', setEmail: vi.fn(), emailCode: '', setEmailCode: vi.fn(),
    newPassword: 'password12', setNewPassword: vi.fn(), confirmPassword: 'password12', setConfirmPassword: vi.fn(),
    newPasswordVisible: false, setNewPasswordVisible: vi.fn(), confirmPasswordVisible: false, setConfirmPasswordVisible: vi.fn(),
    sendingCode: false, sendCooldownSeconds: 0, submitting: false, feedback: null,
    handleSendCode: vi.fn<() => Promise<void>>().mockResolvedValue(),
    handleSubmit: vi.fn<() => Promise<void>>().mockResolvedValue(), setLogin: vi.fn(), setRegister: vi.fn(),
    returnFromAuth: vi.fn(), t: translation.t,
  };
}

describe('重置密码表单发送和页面导航回调', () => {
  it('验证码发送按钮调用公开异步处理器', () => {
    const props = fixture();
    const button = findElement(ResetPasswordForm(props), ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']);
    expect(button.props.disabled).toBe(false);
    invoke(button, 'onClick');
    expect(props.handleSendCode).toHaveBeenCalledOnce();
    expect(props.handleSubmit).not.toHaveBeenCalled();
  });

  it('登录、注册、返回用户中心分别委托正确状态导航', () => {
    const props = fixture();
    const buttons = elements(ResetPasswordForm(props)).filter(({ props: attributes }) => attributes.className === 'settings-user-secondary-btn');
    buttons.forEach((button) => { expect(button.props.disabled).toBe(false); invoke(button, 'onClick'); });
    expect(props.setLogin).toHaveBeenCalledTimes(2);
    expect(props.setRegister).toHaveBeenCalledOnce();
    expect(props.handleSubmit).not.toHaveBeenCalled();
  });

  it('验证码忙碌、冷却与提交状态维持禁用交互', () => {
    const props = fixture();
    props.sendingCode = true;
    expect(findElement(ResetPasswordForm(props), ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']).props.disabled).toBe(true);
    props.sendingCode = false;
    props.sendCooldownSeconds = 1;
    expect(findElement(ResetPasswordForm(props), ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']).props.disabled).toBe(true);
    props.submitting = true;
    expect(elements(ResetPasswordForm(props)).filter(({ props: attributes }) => attributes.className === 'settings-user-secondary-btn').every(({ props: attributes }) => attributes.disabled)).toBe(true);
    expect(props.handleSendCode).not.toHaveBeenCalled();
  });
});
