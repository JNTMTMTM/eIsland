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
 * @file useBindEmail.test.ts
 * @description 绑定邮箱 Hook 的真实滑块、账号 API、重复操作、冷却与 OAuth 状态导航测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { api, builtinCaptcha, modal, modalRoot, renderWithHooks, resetBrowser, responses, runEffects, settle, unmountHooks } from '../../../register/hooks/test/authHookHarness';
import useIslandStore from '../../../../../store/slices';
import { useBindEmail } from '../useBindEmail';
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
  useIslandStore.setState({ state: 'bindEmail', authReturnState: null, uiStateLocked: false,
    bindEmailContext: { tempToken: 'original-token', suggestedUsername: 'original-user' } });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 输入有效邮箱及验证码并重新求值真实 Hook。
 * @returns 保留真实状态的绑定邮箱交互结果。
 */
function validForm(): ReturnType<typeof useBindEmail> {
  const initial = renderWithHooks(useBindEmail);
  initial.setEmail(' Person@Example.com '); initial.setEmailCode(' 123456 ');
  return renderWithHooks(useBindEmail);
}
describe('useBindEmail 真实请求与状态', () => {
  it('拒绝无效邮箱和空验证码，不发送请求', async () => {
    let result = renderWithHooks(useBindEmail); runEffects();
    await result.handleSendCode(); await result.handleSubmit();
    expect(renderWithHooks(useBindEmail).feedback?.text).toContain('emailInvalid');
    result.setEmail('person@example.com');
    result = renderWithHooks(useBindEmail);
    await result.handleSubmit();
    expect(renderWithHooks(useBindEmail).feedback?.text).toContain('emailCodeRequired');
    expect(api.netFetch).not.toHaveBeenCalled();
  });
  it('执行真实滑块挑战并发送归一化邮箱、票据，冷却及卸载清理', async () => {
    let result = validForm();
    builtinCaptcha({ code: 200, data: { retryAfterSeconds: 2 } });
    const pending = result.handleSendCode(); await settle();
    expect(renderWithHooks(useBindEmail).sendingCode).toBe(true);
    expect(modal.props).not.toBeNull();
    modal.props?.onConfirm(42); await pending;
    result = renderWithHooks(useBindEmail); runEffects();
    expect(result.feedback?.type).toBe('success');
    expect(result.sendCooldownSeconds).toBe(2);
    expect(JSON.parse(api.netFetch.mock.calls[2][1]?.body ?? '{}')).toEqual({
      email: 'person@example.com', scene: 'BIND_EMAIL', captchaTicket: 'challenge', captchaRandstr: '42', captchaSign: 'signature',
    });
    await result.handleSendCode();
    expect(api.netFetch).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(1000); result = renderWithHooks(useBindEmail); runEffects();
    expect(result.sendCooldownSeconds).toBe(1);
    unmountHooks(); expect(vi.getTimerCount()).toBe(0);
  });
  it('请求进行中抑制重复发送，取消滑块后释放发送状态', async () => {
    const result = validForm();
    builtinCaptcha({ code: 200 });
    const pending = result.handleSendCode(); await settle();
    await renderWithHooks(useBindEmail).handleSendCode();
    expect(api.netFetch).toHaveBeenCalledTimes(2);
    modal.props?.onCancel(); await pending;
    const updated = renderWithHooks(useBindEmail);
    expect(updated.sendingCode).toBe(false);
    expect(updated.feedback?.text).toContain('captchaCancelled');
  });
  it.each([new Error('native-failure'), 'native-failure'])('滑块叶边界异常转换为反馈：%s', async (failure) => {
    const result = validForm(); builtinCaptcha({ code: 200 }); modal.failure = failure;
    await result.handleSendCode();
    const updated = renderWithHooks(useBindEmail);
    expect(updated.sendingCode).toBe(false);
    expect(updated.feedback?.text).toBe(failure instanceof Error ? failure.message : 'settings.user.feedback.emailCodeSendFailed');
  });
  it('验证码接口失败保留服务端原因', async () => {
    const result = validForm(); responses.push({ code: 200, data: { enabled: false } }, { code: 429, message: 'limited' });
    await result.handleSendCode();
    expect(renderWithHooks(useBindEmail).feedback).toEqual({ type: 'error', text: 'limited' });
  });
  it.each([undefined, 0, -3])('验证码冷却遵循返回值与缺省：%s', async (seconds) => {
    const result = validForm();
    responses.push({ code: 200, data: { enabled: false } }, { code: 200, data: seconds === undefined ? undefined : { retryAfterSeconds: seconds } });
    await result.handleSendCode();
    expect(renderWithHooks(useBindEmail).sendCooldownSeconds).toBe(seconds === -3 ? 0 : 60);
  });
  it.each([
    [{ status: 'BIND_OAUTH', tempToken: 'revalidated', username: 'known', email: 'known@example.com' }, 'bindOAuth', { tempToken: 'revalidated', username: 'known', email: 'known@example.com' }],
    [{ status: 'BIND_OAUTH', tempToken: 'revalidated' }, 'bindOAuth', { tempToken: 'revalidated', username: '', email: 'person@example.com' }],
    [{ status: 'SET_PASSWORD', tempToken: 'new', username: 'new-user', email: 'new@example.com' }, 'setPassword', { tempToken: 'new', suggestedUsername: 'new-user', email: 'new@example.com' }],
    [{ status: 'SET_PASSWORD' }, 'setPassword', { tempToken: 'original-token', suggestedUsername: 'original-user', email: 'person@example.com' }],
    [{ status: 'BIND_OAUTH' }, 'setPassword', { tempToken: 'original-token', suggestedUsername: 'original-user', email: 'person@example.com' }],
  ] as const)('邮箱判断结果导航到 %s', async (data, state, context) => {
    const result = validForm(); responses.push({ data, code: 200 });
    await result.handleSubmit();
    expect(useIslandStore.getState().state).toBe(state);
    expect(state === 'bindOAuth' ? useIslandStore.getState().bindOAuthContext : useIslandStore.getState().setPasswordContext).toEqual(context);
    expect(JSON.parse(api.netFetch.mock.calls[0][1]?.body ?? '{}')).toEqual({ tempToken: 'original-token', email: 'person@example.com', emailCode: '123456' });
    expect(renderWithHooks(useBindEmail).submitting).toBe(false);
  });
  it.each([{ code: 400, message: 'denied' }, { code: 200 }])('失败或缺少数据不导航：%s', async (reply) => {
    const result = validForm(); responses.push(reply); await result.handleSubmit();
    expect(useIslandStore.getState().state).toBe('bindEmail');
    expect(renderWithHooks(useBindEmail).feedback?.type).toBe('error');
  });
  it.each([new Error('window-failure'), 'window-failure'])('后续窗口导航 IPC 抛出异常释放提交状态：%s', async (failure) => {
    const result = validForm(); responses.push({ code: 200, data: { status: 'SET_PASSWORD' } });
    api.expandWindowSettings.mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 原生 IPC 叶边界可抛出非 Error，验证真实 catch 分支。
      throw failure;
    });
    await result.handleSubmit();
    expect(renderWithHooks(useBindEmail).feedback?.text).toBe(failure instanceof Error ? failure.message : 'settings.user.feedback.operationFailed');
    expect(renderWithHooks(useBindEmail).submitting).toBe(false);
  });
  it('请求进行中忽略重复提交', async () => {
    const result = validForm(); responses.push({ code: 200, data: { status: 'SET_PASSWORD' } });
    const pending = result.handleSubmit();
    await renderWithHooks(useBindEmail).handleSubmit(); await pending;
    expect(api.netFetch).toHaveBeenCalledTimes(1);
  });
  it('真实网络叶边界抛出空消息时验证码失败使用翻译反馈', async () => {
    const result = validForm();
    api.netFetch.mockResolvedValueOnce({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: { enabled: false } }) }).mockRejectedValueOnce(new Error(''));
    await result.handleSendCode();
    expect(renderWithHooks(useBindEmail).feedback?.text).toBe('settings.user.feedback.emailCodeSendFailed');
  });
  it('真实网络叶边界抛出空消息时提交失败使用翻译反馈', async () => {
    const result = validForm(); api.netFetch.mockRejectedValueOnce(new Error(''));
    await result.handleSubmit();
    expect(renderWithHooks(useBindEmail).feedback?.text).toBe('settings.user.feedback.operationFailed');
    expect(renderWithHooks(useBindEmail).submitting).toBe(false);
  });
});
