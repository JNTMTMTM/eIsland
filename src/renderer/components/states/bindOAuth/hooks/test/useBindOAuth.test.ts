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
 * @file useBindOAuth.test.ts
 * @description 绑定第三方登录Hook 保留真实OAuth请求、会话写入与Zustand导航的输入/失败/提交中分支测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import useIslandStore from '../../../../../store/slices';
import { api, browser, resetBrowser, responses, settle, storage } from '../../../register/hooks/test/authHookHarness';
import { deferredBackground } from '../../../../hooks/test/standaloneIpcHarness';
import { useBindOAuth } from '../useBindOAuth';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../../store/slices')>();
  const bound = Object.assign(() => actual.default.getState(), actual.default);
  return { ...actual, default: bound };
});
beforeEach(() => {
  resetBrowser(); Object.assign(browser, { api });
  api.netFetch.mockReset().mockImplementation(() => Promise.resolve({ ok: true, status: 200, body: JSON.stringify(responses.shift() ?? { code: 200 }) }));
  useIslandStore.setState({ state: 'bindOAuth', uiStateLocked: false, authReturnState: 'hover', maxExpandTab: 'todo',
    bindOAuthContext: { tempToken: 'temporary-token', username: '账号', email: 'user@example.test' } });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 提交真实Hook并使用公开setter填写密码。
 * @param password - 用户填写的原始密码。
 * @returns 捕获当前输入值的提交动作。
 */
function fill(password: string): ReturnType<typeof useBindOAuth> {
  renderWithHooks(useBindOAuth).setPassword(password); return renderWithHooks(useBindOAuth);
}
describe('绑定OAuth真实请求与导航', () => {
  it('展示原生绑定上下文，密码可见性更新且登录导航执行真实状态动作', () => {
    const initial = renderWithHooks(useBindOAuth); expect(initial).toMatchObject({ username: '账号', email: 'user@example.test', password: '', passwordVisible: false, submitting: false, feedback: null });
    initial.setPasswordVisible(true); expect(renderWithHooks(useBindOAuth).passwordVisible).toBe(true);
    initial.setLogin(); expect(useIslandStore.getState().state).toBe('login'); expect(api.expandWindowSettings).toHaveBeenCalled();
  });
  it('缺少密码显示必填反馈且不发起原生网络请求', async () => {
    await renderWithHooks(useBindOAuth).handleSubmit();
    expect(renderWithHooks(useBindOAuth).feedback).toEqual({ type: 'error', text: 'settings.user.feedback.passwordRequired' });
    expect(api.netFetch).not.toHaveBeenCalled();
  });
  it('有效密码经真实OAuth客户端发送，成功写入token并切到用户设置中心', async () => {
    responses.push({ code: 200, data: { token: 'session-token' } }); await fill('密 码').handleSubmit();
    expect(api.netFetch.mock.calls[0][0]).toMatch(/\/auth\/oauth\/bind$/);
    expect(JSON.parse(api.netFetch.mock.calls[0][1]?.body ?? '{}')).toEqual({ tempToken: 'temporary-token', password: '密 码' });
    expect(storage.get('user-account-token')).toBe('session-token'); expect(api.storeWrite).toHaveBeenCalledWith('user-account-token', 'session-token');
    expect(useIslandStore.getState()).toMatchObject({ state: 'maxExpand', maxExpandTab: 'settings', authReturnState: null });
    expect(renderWithHooks(useBindOAuth)).toMatchObject({ submitting: false, feedback: { type: 'success', text: 'oauth.bindOAuth.bindSuccess' } });
  });
  it.each([{ code: 403, message: '密码错误' }, { code: 200, message: '缺少账号数据' }])('API结果$code/$message不发布会话或导航', async (reply) => {
    responses.push(reply); await fill('password').handleSubmit();
    expect(renderWithHooks(useBindOAuth)).toMatchObject({ submitting: false, feedback: { type: 'error', text: reply.message } });
    expect(storage.has('user-account-token')).toBe(false); expect(useIslandStore.getState().state).toBe('bindOAuth');
  });
  it.each([new Error('离线'), new Error('')])('真实请求客户端处理网络错误并保留失败反馈：%s', async (error) => {
    api.netFetch.mockRejectedValueOnce(error); await fill('password').handleSubmit();
    expect(renderWithHooks(useBindOAuth).feedback).toEqual({ type: 'error', text: error.message || 'oauth.bindOAuth.bindFailed' });
    expect(storage.has('user-account-token')).toBe(false); expect(useIslandStore.getState().state).toBe('bindOAuth');
  });
  it('提交过程中清空旧反馈并阻止已禁用按钮重复请求，真实晚返回恢复提交状态', async () => {
    await renderWithHooks(useBindOAuth).handleSubmit();
    const pending = deferredBackground<Awaited<ReturnType<typeof api.netFetch>>>(); api.netFetch.mockReturnValueOnce(pending.promise);
    const submit = fill('password').handleSubmit(); await settle();
    const busy = renderWithHooks(useBindOAuth); expect(busy).toMatchObject({ submitting: true, feedback: null });
    await busy.handleSubmit(); expect(api.netFetch).toHaveBeenCalledOnce();
    pending.resolve({ ok: true, status: 200, body: JSON.stringify({ code: 403, message: '权限拒绝' }) }); await submit;
    expect(renderWithHooks(useBindOAuth)).toMatchObject({ submitting: false, feedback: { type: 'error', text: '权限拒绝' } });
  });
});
