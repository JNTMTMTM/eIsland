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
 * @file resetPasswordForm.test.tsx
 * @description 组件渲染分支、交互和边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text, translate } from '../../../test/tree';
import { ResetPasswordForm } from '../ResetPasswordForm';

function fixture() {
  return {
    email: 'saved-' + 'email',
    setEmail: vi.fn(),
    emailCode: 'saved-' + 'emailCode',
    setEmailCode: vi.fn(),
    newPassword: 'saved-' + 'newPassword',
    setNewPassword: vi.fn(),
    confirmPassword: 'saved-' + 'confirmPassword',
    setConfirmPassword: vi.fn(),
    newPasswordVisible: false,
    setNewPasswordVisible: vi.fn(),
    confirmPasswordVisible: false,
    setConfirmPasswordVisible: vi.fn(),
    sendingCode: false,
    sendCooldownSeconds: 0,
    submitting: false,
    feedback: null,
    handleSendCode: vi.fn(),
    handleSubmit: vi.fn(),
    setLogin: vi.fn(),
    setRegister: vi.fn(),
    t: translate,
  };
}

function render(props = fixture()) { return ResetPasswordForm(props as unknown as Parameters<typeof ResetPasswordForm>[0]); }

describe('ResetPasswordForm', () => {
  it('forwards email changes', () => {
    const props = fixture();
    const input = find(render(props), (node) => node.type === 'input' && node.props.value === props.email);
    invoke(input, 'onChange', { target: { value: 'next' } });
    expect(props.setEmail).toHaveBeenCalledWith('next');
  });
  it('forwards emailCode changes', () => {
    const props = fixture();
    const input = find(render(props), (node) => node.type === 'input' && node.props.value === props.emailCode);
    invoke(input, 'onChange', { target: { value: 'next' } });
    expect(props.setEmailCode).toHaveBeenCalledWith('next');
  });
  it('forwards newPassword changes', () => {
    const props = fixture();
    const input = find(render(props), (node) => node.type === 'input' && node.props.value === props.newPassword);
    invoke(input, 'onChange', { target: { value: 'next' } });
    expect(props.setNewPassword).toHaveBeenCalledWith('next');
  });
  it('forwards confirmPassword changes', () => {
    const props = fixture();
    const input = find(render(props), (node) => node.type === 'input' && node.props.value === props.confirmPassword);
    invoke(input, 'onChange', { target: { value: 'next' } });
    expect(props.setConfirmPassword).toHaveBeenCalledWith('next');
  });
  it('submits, guards busy actions and stops island click propagation', () => {
    const props = fixture(); const root = render(props);
    invoke(byClass(root, 'settings-user-primary-btn'), 'onClick');
    expect(props.handleSubmit).toHaveBeenCalledOnce();
    const stopPropagation = vi.fn(); invoke(elements(root)[0], 'onClick', { stopPropagation }); expect(stopPropagation).toHaveBeenCalledOnce();
    props.submitting = true;
    expect(byClass(render(props), 'settings-user-primary-btn').props.disabled).toBe(true);
    expect(text(render(props))).toContain('settings.user.feedback.submitting');
    expect(elements(render(props)).filter((node) => String(node.props.className).includes('settings-user-secondary-btn')).every((node) => node.props.disabled === true)).toBe(true);
  });
  it('switches newPassword visibility and delegates toggle updater', () => {
    const props = fixture();
    const hidden = find(render(props), (node) => node.type === 'input' && node.props.value === props.newPassword);
    expect(hidden.props.type).toBe('password');
    const buttons = elements(render(props)).filter((node) => node.props['aria-label'] === 'settings.user.actions.showPassword');
    invoke(buttons[0], 'onClick');
    expect(props.setNewPasswordVisible).toHaveBeenCalledOnce();
    expect((props.setNewPasswordVisible.mock.calls[0][0] as (previous: boolean) => boolean)(false)).toBe(true);
    props.newPasswordVisible = true;
    expect(find(render(props), (node) => node.type === 'input' && node.props.value === props.newPassword).props.type).toBe('text');
  });
  it('switches confirmPassword visibility and delegates toggle updater', () => {
    const props = fixture();
    const hidden = find(render(props), (node) => node.type === 'input' && node.props.value === props.confirmPassword);
    expect(hidden.props.type).toBe('password');
    const buttons = elements(render(props)).filter((node) => node.props['aria-label'] === 'settings.user.actions.showPassword');
    invoke(buttons[1], 'onClick');
    expect(props.setConfirmPasswordVisible).toHaveBeenCalledOnce();
    expect((props.setConfirmPasswordVisible.mock.calls[0][0] as (previous: boolean) => boolean)(false)).toBe(true);
    props.confirmPasswordVisible = true;
    expect(find(render(props), (node) => node.type === 'input' && node.props.value === props.confirmPassword).props.type).toBe('text');
  });
  it('disables sending when sendingCode', () => {
    const props = fixture();  props.sendingCode = true;
    const button = find(render(props), (node) => node.type === 'button' && text(node).includes('settings.user.feedback.emailCodeSending'));
    expect(button.props.disabled).toBe(true);
  });
  it('disables sending when sendCooldownSeconds', () => {
    const props = fixture();  props.sendCooldownSeconds = 12;
    const button = find(render(props), (node) => node.type === 'button' && text(node).includes('settings.user.actions.sendCodeCooldown'));
    expect(button.props.disabled).toBe(true);
  });
});
