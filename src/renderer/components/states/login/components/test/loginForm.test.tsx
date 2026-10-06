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
 * @file loginForm.test.tsx
 * @description 组件渲染分支、交互和边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text, translate } from '../../../test/tree';
import { LoginForm } from '../LoginForm';

function fixture() {
  return {
    account: 'saved-' + 'account',
    setAccount: vi.fn(),
    maskedVerificationEmail: 'saved-' + 'maskedVerificationEmail',
    emailCode: 'saved-' + 'emailCode',
    setEmailCode: vi.fn(),
    password: 'saved-' + 'password',
    setPassword: vi.fn(),
    passwordVisible: false,
    setPasswordVisible: vi.fn(),
    submitting: false,
    sendingCode: false,
    sendCooldownSeconds: 0,
    needsEmailVerification: false,
    isEmailAccount: false,
    feedback: null,
    handleSendCode: vi.fn(),
    handleSubmit: vi.fn(),
    setRegister: vi.fn(),
    setResetPassword: vi.fn(),
    returnFromAuth: vi.fn(),
    githubLoading: false,
    handleGitHubLogin: vi.fn(),
    microsoftLoading: false,
    handleMicrosoftLogin: vi.fn(),
    wechatLoading: false,
    handleWechatLogin: vi.fn(),
    giteeLoading: false,
    handleGiteeLogin: vi.fn(),
    kookLoading: false,
    handleKookLogin: vi.fn(),
    disabledProviders: new Set<string>(),
    t: translate,
  };
}

function render(props = fixture()) { return LoginForm(props as unknown as Parameters<typeof LoginForm>[0]); }

describe('LoginForm', () => {
  it('forwards account changes', () => {
    const props = fixture();
    const input = find(render(props), (node) => node.type === 'input' && node.props.value === props.account);
    invoke(input, 'onChange', { target: { value: 'next' } });
    expect(props.setAccount).toHaveBeenCalledWith('next');
  });
  it('forwards password changes', () => {
    const props = fixture();
    const input = find(render(props), (node) => node.type === 'input' && node.props.value === props.password);
    invoke(input, 'onChange', { target: { value: 'next' } });
    expect(props.setPassword).toHaveBeenCalledWith('next');
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
  it('switches password visibility and delegates toggle updater', () => {
    const props = fixture();
    const hidden = find(render(props), (node) => node.type === 'input' && node.props.value === props.password);
    expect(hidden.props.type).toBe('password');
    const buttons = elements(render(props)).filter((node) => node.props['aria-label'] === 'settings.user.actions.showPassword');
    invoke(buttons[0], 'onClick');
    expect(props.setPasswordVisible).toHaveBeenCalledOnce();
    expect((props.setPasswordVisible.mock.calls[0][0] as (previous: boolean) => boolean)(false)).toBe(true);
    props.passwordVisible = true;
    expect(find(render(props), (node) => node.type === 'input' && node.props.value === props.password).props.type).toBe('text');
  });
  it('disables sending when sendingCode', () => {
    const props = fixture(); props.needsEmailVerification = true; props.sendingCode = true;
    const button = find(render(props), (node) => node.type === 'button' && text(node).includes('settings.user.feedback.emailCodeSending'));
    expect(button.props.disabled).toBe(true);
  });
  it('disables sending when sendCooldownSeconds', () => {
    const props = fixture(); props.needsEmailVerification = true; props.sendCooldownSeconds = 12;
    const button = find(render(props), (node) => node.type === 'button' && text(node).includes('settings.user.actions.sendCodeCooldown'));
    expect(button.props.disabled).toBe(true);
  });
  it('shows verification fields only when required and masks bound email for username accounts', () => {
    const props = fixture();
    expect(elements(render(props)).filter((node) => node.type === 'input')).toHaveLength(2);
    props.needsEmailVerification = true;
    expect(elements(render(props)).filter((node) => node.type === 'input')).toHaveLength(4);
    props.isEmailAccount = true;
    expect(elements(render(props)).filter((node) => node.type === 'input')).toHaveLength(3);
  });
  it('delegates github login and respects provider availability', () => {
    const props = fixture();
    invoke(byClass(render(props), 'auth-oauth-btn--github'), 'onClick');
    expect(props.handleGitHubLogin).toHaveBeenCalledOnce();
    props.disabledProviders.add('github');
    expect(byClass(render(props), 'auth-oauth-btn--github').props.disabled).toBe(true);
    props.githubLoading = true;
    expect(text(render(props))).toContain('oauth.github.loading');
    expect(elements(render(props)).filter((node) => String(node.props.className).includes('auth-oauth-btn--')).every((node) => node.props.disabled === true)).toBe(true);
  });
  it('delegates microsoft login and respects provider availability', () => {
    const props = fixture();
    invoke(byClass(render(props), 'auth-oauth-btn--microsoft'), 'onClick');
    expect(props.handleMicrosoftLogin).toHaveBeenCalledOnce();
    props.disabledProviders.add('microsoft');
    expect(byClass(render(props), 'auth-oauth-btn--microsoft').props.disabled).toBe(true);
    props.microsoftLoading = true;
    expect(text(render(props))).toContain('oauth.microsoft.loading');
    expect(elements(render(props)).filter((node) => String(node.props.className).includes('auth-oauth-btn--')).every((node) => node.props.disabled === true)).toBe(true);
  });
  it('delegates wechat login and respects provider availability', () => {
    const props = fixture();
    invoke(byClass(render(props), 'auth-oauth-btn--wechat'), 'onClick');
    expect(props.handleWechatLogin).toHaveBeenCalledOnce();
    props.disabledProviders.add('wechat');
    expect(byClass(render(props), 'auth-oauth-btn--wechat').props.disabled).toBe(true);
    props.wechatLoading = true;
    expect(text(render(props))).toContain('oauth.wechat.loading');
    expect(elements(render(props)).filter((node) => String(node.props.className).includes('auth-oauth-btn--')).every((node) => node.props.disabled === true)).toBe(true);
  });
  it('delegates gitee login and respects provider availability', () => {
    const props = fixture();
    invoke(byClass(render(props), 'auth-oauth-btn--gitee'), 'onClick');
    expect(props.handleGiteeLogin).toHaveBeenCalledOnce();
    props.disabledProviders.add('gitee');
    expect(byClass(render(props), 'auth-oauth-btn--gitee').props.disabled).toBe(true);
    props.giteeLoading = true;
    expect(text(render(props))).toContain('oauth.gitee.loading');
    expect(elements(render(props)).filter((node) => String(node.props.className).includes('auth-oauth-btn--')).every((node) => node.props.disabled === true)).toBe(true);
  });
  it('delegates kook login and respects provider availability', () => {
    const props = fixture();
    invoke(byClass(render(props), 'auth-oauth-btn--kook'), 'onClick');
    expect(props.handleKookLogin).toHaveBeenCalledOnce();
    props.disabledProviders.add('kook');
    expect(byClass(render(props), 'auth-oauth-btn--kook').props.disabled).toBe(true);
    props.kookLoading = true;
    expect(text(render(props))).toContain('oauth.kook.loading');
    expect(elements(render(props)).filter((node) => String(node.props.className).includes('auth-oauth-btn--')).every((node) => node.props.disabled === true)).toBe(true);
  });
});
