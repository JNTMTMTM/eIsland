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
 * @file resetPasswordContent.test.tsx
 * @description 组件渲染分支、交互和边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { ResetPasswordContent } from '../ResetPasswordContent';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
const mocks = vi.hoisted(() => ({ model: {} }));
vi.mock('../hooks/useResetPassword', () => ({ useResetPassword: () => mocks.model }));

describe('ResetPasswordContent', () => {
  it('passes every model value and action unchanged to the form', () => {
    mocks.model = { email: { field: 'email' }, setEmail: { field: 'setEmail' }, emailCode: { field: 'emailCode' }, setEmailCode: { field: 'setEmailCode' }, newPassword: { field: 'newPassword' }, setNewPassword: { field: 'setNewPassword' }, confirmPassword: { field: 'confirmPassword' }, setConfirmPassword: { field: 'setConfirmPassword' }, newPasswordVisible: { field: 'newPasswordVisible' }, setNewPasswordVisible: { field: 'setNewPasswordVisible' }, confirmPasswordVisible: { field: 'confirmPasswordVisible' }, setConfirmPasswordVisible: { field: 'setConfirmPasswordVisible' }, sendingCode: { field: 'sendingCode' }, sendCooldownSeconds: { field: 'sendCooldownSeconds' }, submitting: { field: 'submitting' }, feedback: { field: 'feedback' }, handleSendCode: { field: 'handleSendCode' }, handleSubmit: { field: 'handleSubmit' }, setLogin: { field: 'setLogin' }, setRegister: { field: 'setRegister' }, t: { field: 't' } };
    const result = ResetPasswordContent();
    expect(result.type).toBe(ResetPasswordForm);
    expect(result.props).toEqual(mocks.model);
  });
  it('updates boundary values when the model changes', () => {
    mocks.model = { submitting: true, feedback: null, email: '', password: '' };
    const result = ResetPasswordContent();
    const props = result.props as Record<string, unknown>;
    expect(props.submitting).toBe(true);
    expect(props.feedback).toBeNull();
    expect(props.password ?? props.email).toBe('');
  });
});
