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
 * @file useLogin.test.ts
 * @description 登录 Hook 的真实账号请求、二次邮箱验证、OAuth 轮询、会话持久化与窗口导航测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { api, browser, builtinCaptcha, modal, modalRoot, renderWithHooks, resetBrowser, responses, runEffects, settle, storage, unmountHooks } from '../../../register/hooks/test/authHookHarness';
import useIslandStore from '../../../../../store/slices';
import { useLogin } from '../useLogin';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-dom/client', () => ({ createRoot: () => modalRoot }));
vi.mock('../../../../../store/slices', async (load) => {
  resetBrowser();
  const actual = await load<typeof import('../../../../../store/slices')>();
  return { ...actual, default: Object.assign(() => actual.default.getState(), actual.default) };
});
beforeEach(() => {
  vi.useFakeTimers(); resetBrowser();
  api.clipboardOpenUrl.mockResolvedValue(); api.storeRead.mockResolvedValue('integrated');
  useIslandStore.setState({ state: 'login', authReturnState: null, uiStateLocked: false });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 填写合法账号密码，保留 Hook 的真实状态。
 * @param account - 当前账号输入。
 * @returns 登录交互结果。
 */
function validForm(account = ' person '): ReturnType<typeof useLogin> {
  const result = renderWithHooks(useLogin);
  result.setAccount(account); result.setPassword('password123'); result.setEmailCode(' 123456 ');
  return renderWithHooks(useLogin);
}
const oauthHandlers = {
  github: 'handleGitHubLogin', microsoft: 'handleMicrosoftLogin', wechat: 'handleWechatLogin', gitee: 'handleGiteeLogin', kook: 'handleKookLogin',
} as const;
/**
 * 通过真实授权 URL、轮询和消费 API 执行 OAuth 登录。
 * @param provider - OAuth 提供方。
 * @param data - 后端消费授权会话的响应数据。
 * @returns 登录流程的完成结果。
 */
async function oauth(provider: keyof typeof oauthHandlers, data: unknown): Promise<void> {
  responses.push({ code: 200, data: { authorizeUrl: 'https://login.example/authorize' } }, { code: 200, data: { ready: true } }, { data, code: 200 });
  const pending = renderWithHooks(useLogin)[oauthHandlers[provider]]();
  await settle(); await vi.advanceTimersByTimeAsync(2000); await pending;
}
describe('useLogin 真实认证状态', () => {
  it.each([
    ['', 'password123', '', 'accountRequired'], ['person', '', '', 'passwordRequired'],
    ['bad@', 'password123', '', 'emailInvalid'], ['person@example.com', 'password123', '', 'emailCodeRequired'],
  ])('拒绝输入 %s/%s/%s', async (account, password, code, key) => {
    const initial = renderWithHooks(useLogin); initial.setAccount(account); initial.setPassword(password); initial.setEmailCode(code);
    await renderWithHooks(useLogin).handleSubmit();
    expect(renderWithHooks(useLogin).feedback?.text).toBe(`settings.user.feedback.${  key}`);
    expect(api.netFetch).not.toHaveBeenCalled();
  });
  it('同步邮箱显示字段且独立控制密码可见状态', () => {
    let result = validForm(' Person@Example.com '); result.setPasswordVisible(true);
    responses.push({ code: 200, data: [] }); runEffects();
    result = renderWithHooks(useLogin);
    expect(result.verificationEmail).toBe('person@example.com');
    expect(result.maskedVerificationEmail).toBe('person@example.com');
    expect(result.passwordVisible).toBe(true); expect(result.needsEmailVerification).toBe(true);
  });
  it.each(['person', ' Person@Example.com '])('使用真实登录接口与归一化请求字段：%s', async (account) => {
    const result = validForm(account); responses.push({ code: 200, data: { token: 'session-token' } });
    const pending = result.handleSubmit(); await renderWithHooks(useLogin).handleSubmit(); await pending;
    expect(api.netFetch).toHaveBeenCalledTimes(1);
    const body: unknown = JSON.parse(api.netFetch.mock.calls[0][1]?.body ?? '{}');
    expect(body).toEqual(account.includes('@') ? { email: 'person@example.com', password: 'password123', emailCode: '123456' } : { username: 'person', password: 'password123' });
    expect(storage.get('user-account-token')).toBe('session-token');
    expect(useIslandStore.getState().state).toBe('maxExpand'); expect(useIslandStore.getState().maxExpandTab).toBe('settings');
    expect(renderWithHooks(useLogin).submitting).toBe(false);
  });
  it.each([
    { verificationEmail: ' Person@Example.com ', maskedEmail: ' p***@example.com ' },
    { verificationEmail: 'Person@Example.com', maskedEmail: ' ' },
    { verificationEmail: 3, maskedEmail: 4 },
    undefined,
  ])('428 二次验证响应转换及验证码重新提交：%s', async (data) => {
    let result = validForm(); responses.push({ data, code: 428, message: 'verify-first' }); await result.handleSubmit();
    result = renderWithHooks(useLogin);
    expect(result.needsEmailVerification).toBe(true); expect(result.feedback?.text).toBe('verify-first');
    const expectedEmail = typeof data?.verificationEmail === 'string' ? 'person@example.com' : '';
    expect(result.verificationEmail).toBe(expectedEmail);
    expect(result.maskedVerificationEmail).toBe(typeof data?.maskedEmail === 'string' && data.maskedEmail.trim() ? 'p***@example.com' : expectedEmail);
    result.setEmailCode(''); await renderWithHooks(useLogin).handleSubmit();
    expect(renderWithHooks(useLogin).feedback?.text).toContain('emailCodeRequired');
    result.setEmailCode(' 999999 '); result = renderWithHooks(useLogin);
    responses.push({ code: 200, data: { token: 'step-up-token' } }); await result.handleSubmit();
    expect(JSON.parse(api.netFetch.mock.calls[1][1]?.body ?? '{}')).toEqual({ username: 'person', password: 'password123', emailCode: '999999' });
    expect(renderWithHooks(useLogin).maskedVerificationEmail).toBe('');
    expect(renderWithHooks(useLogin).needsEmailVerification).toBe(false);
  });
  it.each([{ code: 400, message: 'denied' }, { code: 200 }])('拒绝失败或无登录数据：%s', async (reply) => {
    const result = validForm(); responses.push(reply); await result.handleSubmit();
    expect(renderWithHooks(useLogin).feedback?.type).toBe('error'); expect(storage.has('user-account-token')).toBe(false);
  });
  it.each(['idle', 'login', 'register', null] as const)('认证返回状态影响成功导航：%s', async (authReturnState) => {
    useIslandStore.setState({ authReturnState });
    const result = validForm(); responses.push({ code: 200, data: { token: 'token' } }); await result.handleSubmit();
    expect(useIslandStore.getState().state).toBe(authReturnState === 'idle' ? 'idle' : 'maxExpand');
  });
  it('独立窗口模式成功后选择设置页且不展开集成窗口', async () => {
    api.storeRead.mockResolvedValue('standalone');
    const result = validForm(); responses.push({ code: 200, data: { token: 'token' } }); await result.handleSubmit();
    expect(useIslandStore.getState().state).toBe('maxExpand'); expect(useIslandStore.getState().authReturnState).toBeNull();
    expect(api.expandWindowSettings).not.toHaveBeenCalled();
  });
  it('验证码请求校验邮箱', async () => {
    await renderWithHooks(useLogin).handleSendCode(); expect(renderWithHooks(useLogin).feedback?.text).toContain('emailInvalid');
  });
  it('真实滑块与 LOGIN 发送场景，重复发送与冷却 effect', async () => {
    let result = validForm(' Person@Example.com '); builtinCaptcha({ code: 200, data: { retryAfterSeconds: 1 } });
    const pending = result.handleSendCode(); await settle();
    await renderWithHooks(useLogin).handleSendCode(); expect(api.netFetch).toHaveBeenCalledTimes(2);
    modal.props?.onConfirm(9); await pending;
    result = renderWithHooks(useLogin);
    expect(result.sendCooldownSeconds).toBe(1);
    // 只让倒计时 effect 注册；提供方查询使用真实 API。
    responses.push({ code: 200, data: [] }); runEffects(); await settle();
    await result.handleSendCode();
    expect(JSON.parse(api.netFetch.mock.calls[2][1]?.body ?? '{}')).toEqual({ email: 'person@example.com', scene: 'LOGIN', captchaTicket: 'challenge', captchaRandstr: '9', captchaSign: 'signature' });
    vi.advanceTimersByTime(1000); result = renderWithHooks(useLogin); runEffects();
    expect(result.sendCooldownSeconds).toBe(0);
  });
  it('取消真实滑块后释放发送状态', async () => {
    const result = validForm('person@example.com'); builtinCaptcha({ code: 200 });
    const pending = result.handleSendCode(); await settle(); modal.props?.onCancel(); await pending;
    expect(renderWithHooks(useLogin).feedback?.text).toContain('captchaCancelled'); expect(renderWithHooks(useLogin).sendingCode).toBe(false);
  });
  it.each([new Error('render-failed'), 'render-failed'])('滑块渲染叶边界异常：%s', async (failure) => {
    const result = validForm('person@example.com'); builtinCaptcha({ code: 200 }); modal.failure = failure;
    await result.handleSendCode(); expect(renderWithHooks(useLogin).feedback?.text).toBe(failure instanceof Error ? failure.message : 'settings.user.feedback.emailCodeSendFailed');
  });
  it('验证码发送失败保留服务端原因', async () => {
    const result = validForm('person@example.com'); responses.push({ code: 200, data: { enabled: false } }, { code: 400, message: 'send-failed' });
    await result.handleSendCode(); expect(renderWithHooks(useLogin).feedback?.text).toBe('send-failed');
  });
  it.each([undefined, 0, -1])('验证码缺省及非正冷却：%s', async (seconds) => {
    const result = validForm('person@example.com'); responses.push({ code: 200, data: { enabled: false } }, { code: 200, data: seconds === undefined ? undefined : { retryAfterSeconds: seconds } });
    await result.handleSendCode(); expect(renderWithHooks(useLogin).sendCooldownSeconds).toBe(seconds === -1 ? 0 : 60);
  });
  it.each(['login', 'register', 'payment', 'resetPassword', 'idle'] as const)('重置密码入口保存来源状态：%s', (state) => {
    useIslandStore.setState({ state, authReturnState: 'expanded' });
    renderWithHooks(useLogin).setResetPassword();
    expect(useIslandStore.getState().state).toBe('resetPassword');
    expect(useIslandStore.getState().authReturnState).toBe(state === 'idle' ? 'idle' : 'expanded');
  });
  it('独立窗口来源重置密码回到 maxExpand', () => {
    browser.location.pathname = '/DynamicIslandStandalone.html'; useIslandStore.setState({ state: 'idle' });
    renderWithHooks(useLogin).setResetPassword();
    expect(useIslandStore.getState().authReturnState).toBe('maxExpand'); expect(api.expandWindowSettings).not.toHaveBeenCalled();
  });
  it.each(['missing', 'throwing'] as const)('location 边界仍允许进入重置状态：%s', (mode) => {
    Object.defineProperty(browser, 'location', { configurable: true, get: () => { if (mode === 'throwing') throw new Error('denied'); return undefined; } });
    renderWithHooks(useLogin).setResetPassword(); expect(useIslandStore.getState().state).toBe('resetPassword');
  });
  it('无 API 时重置导航仍保存状态', () => {
    vi.stubGlobal('window', {}); renderWithHooks(useLogin).setResetPassword(); expect(useIslandStore.getState().state).toBe('resetPassword');
  });
  it('提供方大小写归一化，未知与禁用提供方保持禁用', async () => {
    responses.push({ code: 200, data: [{ provider: 'GITHUB' }, { provider: 'kook' }] }); renderWithHooks(useLogin); runEffects(); await settle();
    expect([...renderWithHooks(useLogin).disabledProviders]).toEqual(['microsoft', 'wechat', 'gitee']);
  });
  it.each([{ code: 500 }, { code: 200, data: {} }])('非法提供方响应忽略：%s', async (reply) => {
    responses.push(reply); renderWithHooks(useLogin); runEffects(); await settle();
    expect(renderWithHooks(useLogin).disabledProviders.size).toBe(0);
  });
  it('卸载后到达的提供方响应不更新状态', async () => {
    responses.push({ code: 200, data: [] }); renderWithHooks(useLogin); runEffects(); unmountHooks(); await settle();
    expect(renderWithHooks(useLogin).disabledProviders.size).toBe(0);
  });
  it.each(Object.keys(oauthHandlers) as (keyof typeof oauthHandlers)[])('执行 %s 的真实授权、轮询及 token 持久化', async (provider) => {
    await oauth(provider, { status: 'LOGIN', token: 'oauth-token', message: '' });
    expect(api.netFetch.mock.calls[0][0]).toContain(`/${  provider  }/authorize`);
    expect(api.clipboardOpenUrl).toHaveBeenCalledWith(expect.stringContaining('state='));
    expect(storage.get('user-account-token')).toBe('oauth-token'); expect(useIslandStore.getState().state).toBe('maxExpand');
  });
  it.each([
    ['github', { status: 'SET_PASSWORD', tempToken: 'temp', username: 'user', email: 'user@example.com' }, 'setPassword'],
    ['github', { status: 'SET_PASSWORD', tempToken: 'temp' }, 'setPassword'],
    ['wechat', { status: 'SET_PASSWORD', tempToken: 'temp' }, 'bindEmail'],
    ['kook', { status: 'SET_PASSWORD', tempToken: 'temp', username: 'user' }, 'bindEmail'],
    ['wechat', { status: 'SET_PASSWORD', tempToken: 'temp', email: 'user@example.com' }, 'setPassword'],
    ['github', { status: 'BIND_OAUTH', tempToken: 'temp' }, 'bindOAuth'],
    ['github', { status: 'BIND_OAUTH', tempToken: 'temp', username: 'user', email: 'user@example.com' }, 'bindOAuth'],
  ] as const)('OAuth %s 回调 %s 进入 %s', async (provider, data, state) => {
    await oauth(provider, data); expect(useIslandStore.getState().state).toBe(state);
    if (state === 'bindEmail') expect(useIslandStore.getState().bindEmailContext).toEqual({ tempToken: 'temp', suggestedUsername: 'username' in data ? data.username : '' });
    if (state === 'setPassword') expect(useIslandStore.getState().setPasswordContext).toEqual({ tempToken: 'temp', suggestedUsername: 'username' in data ? data.username : '', email: 'email' in data ? data.email : '' });
    if (state === 'bindOAuth') expect(useIslandStore.getState().bindOAuthContext).toEqual({ tempToken: 'temp', username: 'username' in data ? data.username : '', email: 'email' in data ? data.email : '' });
  });
  it.each([{ status: 'LOGIN' }, { status: 'SET_PASSWORD' }, { status: 'BIND_OAUTH' }, { status: 'ERROR', message: 'oauth-error' }])('OAuth 状态缺少凭据返回失败：%s', async (data) => {
    await oauth('github', data); expect(renderWithHooks(useLogin).feedback?.text).toBe('message' in data ? data.message : 'settings.user.feedback.operationFailed');
    expect(renderWithHooks(useLogin).githubLoading).toBe(false);
  });
  it('授权失败视为取消', async () => {
    responses.push({ code: 500 }); await renderWithHooks(useLogin).handleGitHubLogin();
    expect(renderWithHooks(useLogin).feedback?.text).toContain('loginCancelled');
  });
  it('原生浏览器打开失败恢复 loading 并显示失败', async () => {
    responses.push({ code: 200, data: { authorizeUrl: 'https://login.example' } }); api.clipboardOpenUrl.mockRejectedValueOnce(new Error('blocked'));
    await renderWithHooks(useLogin).handleGitHubLogin(); expect(renderWithHooks(useLogin).githubLoading).toBe(false);
    expect(renderWithHooks(useLogin).feedback?.text).toContain('operationFailed');
  });
  it('授权进行中忽略同一提供方重复触发', async () => {
    responses.push({ code: 200, data: { authorizeUrl: 'https://login.example' } }, { code: 200, data: { ready: true } }, { code: 200, data: { status: 'ERROR', message: 'no-login' } });
    const pending = renderWithHooks(useLogin).handleGitHubLogin(); await settle();
    expect(renderWithHooks(useLogin).githubLoading).toBe(true);
    await renderWithHooks(useLogin).handleGitHubLogin(); expect(api.clipboardOpenUrl).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(2000); await pending; expect(renderWithHooks(useLogin).githubLoading).toBe(false);
  });
  it('真实网络叶边界抛出空消息时验证码失败使用翻译反馈', async () => {
    const result = validForm('person@example.com');
    api.netFetch.mockResolvedValueOnce({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: { enabled: false } }) }).mockRejectedValueOnce(new Error(''));
    await result.handleSendCode();
    expect(renderWithHooks(useLogin).feedback?.text).toBe('settings.user.feedback.emailCodeSendFailed');
  });
  it('真实网络叶边界抛出空消息时提交失败使用翻译反馈', async () => {
    const result = validForm(); api.netFetch.mockRejectedValueOnce(new Error(''));
    await result.handleSubmit();
    expect(renderWithHooks(useLogin).feedback?.text).toBe('settings.user.feedback.operationFailed');
    expect(renderWithHooks(useLogin).submitting).toBe(false);
  });
});
