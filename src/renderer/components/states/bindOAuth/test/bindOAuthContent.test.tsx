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
 * @file bindOAuthContent.test.tsx
 * @description 组件渲染分支、交互和边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { BindOAuthContent } from '../BindOAuthContent';
import { BindOAuthForm } from '../components/BindOAuthForm';
const mocks = vi.hoisted(() => ({ model: {} }));
vi.mock('../hooks/useBindOAuth', () => ({ useBindOAuth: () => mocks.model }));

describe('BindOAuthContent', () => {
  it('passes every model value and action unchanged to the form', () => {
    mocks.model = { password: { field: 'password' }, setPassword: { field: 'setPassword' }, passwordVisible: { field: 'passwordVisible' }, setPasswordVisible: { field: 'setPasswordVisible' }, submitting: { field: 'submitting' }, feedback: { field: 'feedback' }, handleSubmit: { field: 'handleSubmit' }, setLogin: { field: 'setLogin' }, username: { field: 'username' }, email: { field: 'email' }, t: { field: 't' } };
    const result = BindOAuthContent();
    expect(result.type).toBe(BindOAuthForm);
    expect(result.props).toEqual(mocks.model);
  });
  it('updates boundary values when the model changes', () => {
    mocks.model = { submitting: true, feedback: null, email: '', password: '' };
    const result = BindOAuthContent();
    const props = result.props as Record<string, unknown>;
    expect(props.submitting).toBe(true);
    expect(props.feedback).toBeNull();
    expect(props.password ?? props.email).toBe('');
  });
});
