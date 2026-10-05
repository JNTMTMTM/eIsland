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
 * @file bindOAuthForm.test.tsx
 * @description 组件渲染分支、交互和边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text, translate } from '../../../test/tree';
import { BindOAuthForm } from '../BindOAuthForm';

function fixture() {
  return {
    password: 'saved-' + 'password',
    setPassword: vi.fn(),
    passwordVisible: false,
    setPasswordVisible: vi.fn(),
    submitting: false,
    feedback: null,
    handleSubmit: vi.fn(),
    setLogin: vi.fn(),
    username: 'saved-' + 'username',
    email: 'saved-' + 'email',
    t: translate,
  };
}

function render(props = fixture()) { return BindOAuthForm(props as unknown as Parameters<typeof BindOAuthForm>[0]); }

describe('BindOAuthForm', () => {
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
  it('locks bound identity fields', () => { const props = fixture(); [props.username, props.email].forEach((value) => { const input = find(render(props), (node) => node.props.value === value); expect(input.props.readOnly).toBe(true); expect(input.props.disabled).toBe(true); }); });
});
