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
 * @file setPasswordFormEvents.test.tsx
 * @description 设置密码表单的密码编辑与取消登录回调测试。
 * @author 鸡哥
 */

import { expect, it, vi } from 'vitest';
import { byClass, find, invoke } from '../../../test/tree';
import { SetPasswordForm } from '../SetPasswordForm';

it('编辑密码后转发完整输入，取消按钮切回登录', () => {
  const setPassword = vi.fn();
  const setLogin = vi.fn();
  const props: Parameters<typeof SetPasswordForm>[0] = {
    setPassword,
    setLogin,
    username: 'name',
    setUsername: vi.fn(),
    password: 'old-value',
    confirmPassword: '',
    setConfirmPassword: vi.fn(),
    passwordVisible: false,
    setPasswordVisible: vi.fn(),
    confirmPasswordVisible: false,
    setConfirmPasswordVisible: vi.fn(),
    submitting: false,
    feedback: null,
    handleSubmit: vi.fn().mockResolvedValue(undefined),
    email: '',
    t: ((key: string) => key) as Parameters<typeof SetPasswordForm>[0]['t'],
  };
  const tree = SetPasswordForm(props);
  invoke(find(tree, (node) => node.type === 'input' && node.props.value === 'old-value'), 'onChange', { target: { value: 'next-value' } });
  expect(setPassword).toHaveBeenCalledExactlyOnceWith('next-value');
  invoke(byClass(tree, 'settings-user-secondary-btn'), 'onClick');
  expect(setLogin).toHaveBeenCalledOnce();
});
