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
 * @file bindEmailFormEvents.test.tsx
 * @description 验证绑定邮箱表单真实发送验证码、返回登录回调及忙碌按钮约束。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { elements, findElement, invoke } from '../../../../test/elementHarness';
import { BindEmailForm } from '../BindEmailForm';

const translation = createInstance();
await translation.init({ lng: 'en', resources: { en: { translation: {} } } });

/** 构造公开邮箱绑定表单参数。
 * @returns 具有实际异步回调边界的合法参数。
 */
function fixture(): Parameters<typeof BindEmailForm>[0] {
  return {
    email: 'person@example.test', setEmail: vi.fn(), emailCode: '', setEmailCode: vi.fn(),
    sendingCode: false, sendCooldownSeconds: 0, submitting: false, feedback: null,
    handleSendCode: vi.fn<() => Promise<void>>().mockResolvedValue(),
    handleSubmit: vi.fn<() => Promise<void>>().mockResolvedValue(), setLogin: vi.fn(), t: translation.t,
  };
}

describe('绑定邮箱表单发送和返回登录回调', () => {
  it('发送验证码与返回登录分别调用公开处理器', () => {
    const props = fixture();
    const tree = BindEmailForm(props);
    const send = findElement(tree, ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']);
    expect(send.props.disabled).toBe(false);
    invoke(send, 'onClick');
    invoke(findElement(tree, ({ props: attributes }) => attributes.className === 'settings-user-secondary-btn'), 'onClick');
    expect(props.handleSendCode).toHaveBeenCalledOnce();
    expect(props.setLogin).toHaveBeenCalledOnce();
    expect(props.handleSubmit).not.toHaveBeenCalled();
  });

  it('忙碌和冷却场景提供禁用按钮而不派发点击', () => {
    const props = fixture();
    props.sendingCode = true;
    expect(findElement(BindEmailForm(props), ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']).props.disabled).toBe(true);
    props.sendingCode = false;
    props.sendCooldownSeconds = 15;
    expect(findElement(BindEmailForm(props), ({ type, props: attributes }) => type === 'button' && attributes.className === 'auth-password-toggle' && !attributes['aria-label']).props.disabled).toBe(true);
    props.submitting = true;
    expect(elements(BindEmailForm(props)).filter(({ props: attributes }) => String(attributes.className).includes('settings-user-')).every(({ props: attributes }) => attributes.disabled)).toBe(true);
    expect(props.handleSendCode).not.toHaveBeenCalled();
    expect(props.setLogin).not.toHaveBeenCalled();
  });
});
