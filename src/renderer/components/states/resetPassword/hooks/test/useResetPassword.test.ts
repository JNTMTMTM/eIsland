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
 * @file useResetPassword.test.ts
 * @description 密码重置 Hook 的真实表单校验、滑块和 API 请求、延迟导航与窗口边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { api, browser, builtinCaptcha, modal, modalRoot, renderWithHooks, resetBrowser, responses, runEffects, settle, unmountHooks } from '../../../register/hooks/test/authHookHarness';
import useIslandStore from '../../../../../store/slices';
import { useResetPassword } from '../useResetPassword';
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
  useIslandStore.setState({ state: 'resetPassword', authReturnState: 'maxExpand', uiStateLocked: false });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 填写合法重置密码字段并保留真实 Hook 状态。
 * @returns 密码重置交互结果。
 */
function validForm(): ReturnType<typeof useResetPassword> {
  const result = renderWithHooks(useResetPassword);
  result.setEmail(' Person@Example.com '); result.setEmailCode(' 123456 ');
  result.setNewPassword('password123'); result.setConfirmPassword('password123');
  return renderWithHooks(useResetPassword);
}
describe('useResetPassword 实际验证、发送与状态导航', () => {
  it.each([
    ['email', '', 'emailInvalid'], ['emailCode', '', 'emailCodeRequired'],
    ['newPassword', '', 'passwordRequired'], ['newPassword', 'short', 'passwordTooShort'],
    ['confirmPassword', '', 'confirmPasswordRequired'], ['confirmPassword', 'different', 'passwordNotMatch'],
  ] as const)('拒绝 %s=%s', async (field, value, key) => {
    let result = validForm();
    const setters = { email: result.setEmail, emailCode: result.setEmailCode, newPassword: result.setNewPassword, confirmPassword: result.setConfirmPassword };
    setters[field](value); result = renderWithHooks(useResetPassword); await result.handleSubmit();
    expect(renderWithHooks(useResetPassword).feedback?.text).toBe(`settings.user.feedback.${  key}`);
    expect(api.netFetch).not.toHaveBeenCalled();
  });
  it('独立控制两个密码可见状态，无效邮箱发送前拒绝', async () => {
    let result = renderWithHooks(useResetPassword);
    result.setNewPasswordVisible(true); result.setConfirmPasswordVisible(true);
    await result.handleSendCode(); result = renderWithHooks(useResetPassword);
    expect(result.newPasswordVisible).toBe(true); expect(result.confirmPasswordVisible).toBe(true);
    expect(result.feedback?.text).toContain('emailInvalid');
  });
  it('保留真实验证码场景、归一化字段以及冷却 effect', async () => {
    let result = validForm(); builtinCaptcha({ code: 200, data: { retryAfterSeconds: 2 } });
    const pending = result.handleSendCode(); await settle();
    await renderWithHooks(useResetPassword).handleSendCode();
    expect(api.netFetch).toHaveBeenCalledTimes(2);
    modal.props?.onConfirm(17); await pending;
    result = renderWithHooks(useResetPassword); runEffects();
    expect(result.sendCooldownSeconds).toBe(2);
    expect(JSON.parse(api.netFetch.mock.calls[2][1]?.body ?? '{}')).toEqual({
      email: 'person@example.com', scene: 'RESET_PASSWORD', captchaTicket: 'challenge', captchaRandstr: '17', captchaSign: 'signature',
    });
    await result.handleSendCode(); expect(api.netFetch).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(1000); result = renderWithHooks(useResetPassword); runEffects();
    expect(result.sendCooldownSeconds).toBe(1);
    vi.advanceTimersByTime(1000); result = renderWithHooks(useResetPassword); runEffects();
    expect(result.sendCooldownSeconds).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('取消滑块后允许再次操作', async () => {
    const result = validForm(); builtinCaptcha({ code: 200 });
    const pending = result.handleSendCode(); await settle(); modal.props?.onCancel(); await pending;
    expect(renderWithHooks(useResetPassword).sendingCode).toBe(false);
    expect(renderWithHooks(useResetPassword).feedback?.text).toContain('captchaCancelled');
  });
  it.each([new Error('modal-failure'), 'modal-failure'])('滑块叶边界错误恢复状态：%s', async (failure) => {
    const result = validForm(); builtinCaptcha({ code: 200 }); modal.failure = failure;
    await result.handleSendCode();
    expect(renderWithHooks(useResetPassword).feedback?.text).toBe(failure instanceof Error ? failure.message : 'settings.user.feedback.emailCodeSendFailed');
    expect(renderWithHooks(useResetPassword).sendingCode).toBe(false);
  });
  it('验证码请求失败反馈服务端原因', async () => {
    const result = validForm(); responses.push({ code: 200, data: { enabled: false } }, { code: 429, message: 'too-fast' });
    await result.handleSendCode(); expect(renderWithHooks(useResetPassword).feedback?.text).toBe('too-fast');
  });
  it.each([undefined, 0, -1])('缺省或负冷却值：%s', async (seconds) => {
    const result = validForm(); responses.push({ code: 200, data: { enabled: false } },
      { code: 200, data: seconds === undefined ? undefined : { retryAfterSeconds: seconds } });
    await result.handleSendCode();
    expect(renderWithHooks(useResetPassword).sendCooldownSeconds).toBe(seconds === -1 ? 0 : 60);
  });
  it('重置成功延迟进入登录并保留返回状态，进行中忽略重复提交', async () => {
    const result = validForm(); responses.push({ code: 200 });
    const pending = result.handleSubmit(); await renderWithHooks(useResetPassword).handleSubmit(); await pending;
    expect(api.netFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(api.netFetch.mock.calls[0][1]?.body ?? '{}')).toEqual({ email: 'person@example.com', emailCode: '123456', password: 'password123' });
    expect(renderWithHooks(useResetPassword).feedback?.type).toBe('success');
    expect(renderWithHooks(useResetPassword).submitting).toBe(false);
    vi.advanceTimersByTime(799); expect(useIslandStore.getState().state).toBe('resetPassword');
    vi.advanceTimersByTime(1); expect(useIslandStore.getState().state).toBe('login');
    expect(useIslandStore.getState().authReturnState).toBe('maxExpand');
    expect(api.expandWindowSettings).toHaveBeenCalledOnce();
  });
  it('服务端拒绝重置后释放提交状态且不安排导航', async () => {
    const result = validForm(); responses.push({ code: 400, message: 'invalid-code' }); await result.handleSubmit();
    expect(renderWithHooks(useResetPassword).feedback?.text).toBe('invalid-code');
    expect(renderWithHooks(useResetPassword).submitting).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['login', 'register'] as const)('独立窗口进入 %s 保留父返回状态且不调尺寸 IPC', (target) => {
    browser.location.pathname = '/DynamicIslandStandalone.html';
    const result = renderWithHooks(useResetPassword);
    if (target === 'login') result.setLogin(); else result.setRegister();
    expect(useIslandStore.getState().state).toBe(target); expect(useIslandStore.getState().authReturnState).toBe('maxExpand');
    expect(api.expandWindowSettings).not.toHaveBeenCalled();
  });
  it.each(['missing', 'throwing'] as const)('缺失或拒绝读取 location 按常规窗口导航：%s', (mode) => {
    Object.defineProperty(browser, 'location', { configurable: true, get: () => {
      if (mode === 'throwing') throw new Error('location-denied');
      return undefined;
    } });
    let result = renderWithHooks(useResetPassword); result.setLogin();
    result = renderWithHooks(useResetPassword); result.setRegister();
    expect(useIslandStore.getState().state).toBe('register'); expect(api.expandWindowSettings).toHaveBeenCalledTimes(2);
  });
  it('缺失 API 时仍能更新登录与注册状态', () => {
    vi.stubGlobal('window', { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
    const result = renderWithHooks(useResetPassword); result.setLogin(); result.setRegister();
    expect(useIslandStore.getState().state).toBe('register');
  });
  it('真实网络叶边界抛出空消息时验证码失败使用翻译反馈', async () => {
    const result = validForm();
    api.netFetch.mockResolvedValueOnce({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: { enabled: false } }) }).mockRejectedValueOnce(new Error(''));
    await result.handleSendCode();
    expect(renderWithHooks(useResetPassword).feedback?.text).toBe('settings.user.feedback.emailCodeSendFailed');
  });
  it('真实网络叶边界抛出空消息时提交失败使用翻译反馈', async () => {
    const result = validForm(); api.netFetch.mockRejectedValueOnce(new Error(''));
    await result.handleSubmit();
    expect(renderWithHooks(useResetPassword).feedback?.text).toBe('settings.user.feedback.resetPasswordFailed');
    expect(renderWithHooks(useResetPassword).submitting).toBe(false);
  });
});
