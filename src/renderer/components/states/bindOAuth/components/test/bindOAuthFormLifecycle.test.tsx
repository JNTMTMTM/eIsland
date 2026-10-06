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
 * @file bindOAuthFormLifecycle.test.tsx
 * @description OAuth绑定表单执行真实输入setter、显示切换、登录导航和API提交Hook，并验证反馈和只读身份。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../../test/elementHarness';
import useIslandStore from '../../../../../store/slices';
import i18n from '../../../../../i18n';
import { api, browser, resetBrowser, responses, settle } from '../../../register/hooks/test/authHookHarness';
import { useBindOAuth } from '../../hooks/useBindOAuth';
import { BindOAuthForm } from '../BindOAuthForm';
vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null });
});
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: i18n.t }) }));
vi.mock('../../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../../store/slices')>();
  return { ...actual, default: Object.assign(() => actual.default.getState(), actual.default) };
});
beforeEach(() => {
  resetBrowser(); Object.assign(browser, { api }); api.netFetch.mockReset().mockImplementation(() => Promise.resolve({ ok: true, status: 200, body: JSON.stringify(responses.shift() ?? { code: 200 }) }));
  useIslandStore.setState({ state: 'bindOAuth', uiStateLocked: false, bindOAuthContext: { tempToken: 'temp', username: 'User', email: 'user@example.test' } });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 将真实Hook返回属性交给真实表单，保留功能setter和提交回调。
 * @returns 实际元素树。
 */
function render() { return renderWithHooks(() => BindOAuthForm(useBindOAuth())); }
describe('OAuth表单真实输入与提交组合', () => {
  it('账号只读且根点击停止冒泡，密码输入与函数式可见性setter真实更新', () => {
    let root = render(); const identity = elements(root).filter((element) => element.type === 'input' && element.props.disabled);
    expect(identity.map((element) => element.props.value)).toEqual(['User', 'user@example.test']); expect(identity.every((element) => element.props.readOnly === true)).toBe(true);
    const stopPropagation = vi.fn(); invoke(findElement(root, (element) => element.props.className === 'auth-state-content'), 'onClick', { stopPropagation }); expect(stopPropagation).toHaveBeenCalledOnce();
    invoke(findElement(root, (element) => element.type === 'input' && element.props.type === 'password'), 'onChange', { target: { value: 'p1234567' } });
    invoke(findElement(root, (element) => element.props.className === 'auth-password-toggle'), 'onClick');
    root = render(); expect(findElement(root, (element) => element.type === 'input' && element.props.type === 'text').props.value).toBe('p1234567');
    invoke(findElement(root, (element) => element.props.className === 'auth-password-toggle'), 'onClick');
    expect(findElement(render(), (element) => element.type === 'input' && element.props.type === 'password').props.value).toBe('p1234567');
  });
  it('缺少密码点提交展示真实必填反馈，输入后提交中禁用两个操作且显示错误反馈', async () => {
    let root = render(); invoke(findElement(root, (element) => element.props.className === 'settings-user-primary-btn'), 'onClick'); await settle();
    expect(textContent(render())).toContain(i18n.t('settings.user.feedback.passwordRequired')); expect(api.netFetch).not.toHaveBeenCalled();
    root = render(); invoke(findElement(root, (element) => element.type === 'input' && element.props.type === 'password'), 'onChange', { target: { value: 'password' } });
    responses.push({ code: 403, message: '绑定失败' });
    invoke(findElement(render(), (element) => element.props.className === 'settings-user-primary-btn'), 'onClick');
    const busy = render(); expect(findElement(busy, (element) => element.props.className === 'settings-user-primary-btn').props.disabled).toBe(true);
    expect(findElement(busy, (element) => element.props.className === 'settings-user-secondary-btn').props.disabled).toBe(true);
    await settle(); expect(textContent(render())).toContain('绑定失败'); expect(api.netFetch).toHaveBeenCalledOnce();
  });
  it('取消按钮执行真实登录状态导航而不提交密码', () => {
    invoke(findElement(render(), (element) => element.props.className === 'settings-user-secondary-btn'), 'onClick');
    expect(useIslandStore.getState().state).toBe('login'); expect(api.expandWindowSettings).toHaveBeenCalledOnce(); expect(api.netFetch).not.toHaveBeenCalled();
  });
});
