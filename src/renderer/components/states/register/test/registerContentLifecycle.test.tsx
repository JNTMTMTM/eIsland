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
 * @file registerContentLifecycle.test.tsx
 * @description 注册内容组件真实输入、captcha、注册API、会话、独立导航与cooldown Hook完整交互集成测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../test/elementHarness';
import useIslandStore from '../../../../store/slices';
import { api, browser, builtinCaptcha, modal, modalRoot, resetBrowser, responses, settle, storage } from '../hooks/test/authHookHarness';
import { deferredBackground } from '../../../hooks/test/standaloneIpcHarness';
import { FeedbackMessage } from '../components/FeedbackMessage';
import { RegisterContent } from '../RegisterContent';
import type { ReactElement } from 'react';
vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null });
});
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-dom/client', () => ({ createRoot: () => modalRoot }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../store/slices')>();
  return { ...actual, default: Object.assign(() => actual.default.getState(), actual.default) };
});
beforeEach(() => {
  vi.useFakeTimers(); resetBrowser(); Object.assign(browser, { api });
  api.netFetch.mockReset().mockImplementation(() => Promise.resolve({ ok: true, status: 200, body: JSON.stringify(responses.shift() ?? { code: 200, data: { enabled: false } }) }));
  api.storeRead.mockReset().mockResolvedValue('integrated');
  useIslandStore.setState({ state: 'register', authReturnState: 'idle', uiStateLocked: false, maxExpandTab: 'todo' });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
interface Fields { username: string; email: string; code: string; password: string; confirm: string }
const valid: Fields = { username: '  User123 ', email: ' User@Example.Test ', code: ' 123456 ', password: 'p1234567', confirm: 'p1234567' };
/**
 * 通过真实五个input的onChange填写账号，不修改组件私有Hook槽。
 * @param fields - 原始用户输入。
 * @returns 最新组件树。
 */
function fill(fields: Fields = valid): ReactElement {
  const root = renderWithHooks(RegisterContent);
  elements(root).filter((element) => element.type === 'input').forEach((element, index) => {
    invoke(element, 'onChange', { target: { value: [fields.username, fields.email, fields.code, fields.password, fields.confirm][index] } });
  });
  return renderWithHooks(RegisterContent);
}
/**
 * 触发可用的真实注册按钮并排空真实请求微任务。
 * @returns 微任务完成。
 */
async function submit(): Promise<void> {
  const button = findElement(renderWithHooks(RegisterContent), (element) => element.props.className === 'settings-user-primary-btn');
  expect(button.props.disabled).toBe(false); invoke(button, 'onClick'); await settle();
}
/**
 * 执行可用邮箱验证码按钮。
 */
function send(): void {
  const button = elements(renderWithHooks(RegisterContent)).find((element) => element.props.className === 'auth-password-toggle');
  expect(button?.props.disabled).toBe(false); invoke(button!, 'onClick');
}
/**
 * 执行真实反馈子组件并取得可见文本。
 * @returns 当前反馈文本。
 */
function feedback(): string {
  const root = renderWithHooks(RegisterContent); const element = findElement(root, (node) => node.type === FeedbackMessage);
  return textContent(FeedbackMessage(element.props as unknown as Parameters<typeof FeedbackMessage>[0]));
}
describe('真实注册状态输入与请求', () => {
  it.each([
    { patch: { username: ' ' }, key: 'usernameRequired' },
    { patch: { username: 'bad-name' }, key: 'usernameFormatInvalid' },
    { patch: { email: ' ' }, key: 'emailRequired' },
    { patch: { password: '' }, key: 'passwordRequired' },
    { patch: { code: ' ' }, key: 'emailCodeRequired' },
    { patch: { confirm: '' }, key: 'confirmPasswordRequired' },
    { patch: { confirm: 'different' }, key: 'passwordNotMatch' },
  ])('字段校验$key保持真实未提交状态', async ({ patch, key }) => {
    fill({ ...valid, ...patch }); await submit();
    expect(feedback()).toBe(`settings.user.feedback.${  key}`); expect(api.netFetch).not.toHaveBeenCalled();
  });
  it('实际密码与确认密码分别执行函数式可见性切换，点击根停止冒泡', () => {
    let root = fill(); const stopPropagation = vi.fn(); invoke(findElement(root, (element) => element.props.className === 'auth-state-content'), 'onClick', { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    const toggles = elements(root).filter((element) => element.props['aria-label'] === 'settings.user.actions.showPassword');
    toggles.forEach((toggle) => invoke(toggle, 'onClick')); root = renderWithHooks(RegisterContent);
    expect(elements(root).filter((element) => element.type === 'input' && element.props.type === 'text')).toHaveLength(2);
    elements(root).filter((element) => element.props['aria-label'] === 'settings.user.actions.hidePassword').forEach((toggle) => invoke(toggle, 'onClick'));
    expect(elements(renderWithHooks(RegisterContent)).filter((element) => element.type === 'input' && element.props.type === 'password')).toHaveLength(2);
  });
  it.each(['integrated', 'standalone'])('真实注册成功写入会话并以%s导航设置中心', async (mode) => {
    api.storeRead.mockResolvedValueOnce(mode); responses.push({ code: 200, data: { token: 'registered-token' } });
    fill(); await submit();
    expect(JSON.parse(api.netFetch.mock.calls[0][1]?.body ?? '{}')).toEqual({ username: 'User123', email: 'User@Example.Test', password: 'p1234567', emailCode: '123456' });
    expect(api.netFetch.mock.calls[0][0]).toMatch(/\/auth\/user\/register$/);
    expect(storage.get('user-account-token')).toBe('registered-token'); expect(feedback()).toBe('settings.user.feedback.registerSuccess');
    expect(useIslandStore.getState()).toMatchObject({ state: 'maxExpand', maxExpandTab: 'settings' });
    if (mode === 'standalone') { expect(useIslandStore.getState().authReturnState).toBeNull(); } else { expect(api.expandWindowSettings).toHaveBeenCalled(); }
  });
  it.each([{ code: 403, message: '账号不可用' }, { code: 200, message: '缺少注册数据' }])('API结果$code/$message保留注册并呈现真实错误', async (reply) => {
    responses.push(reply); fill(); await submit(); expect(feedback()).toBe(reply.message);
    expect(storage.has('user-account-token')).toBe(false); expect(useIslandStore.getState().state).toBe('register');
  });
  it('原生网络Error空消息触发注册错误兜底', async () => {
    api.netFetch.mockRejectedValueOnce(new Error('')); fill(); await submit(); expect(feedback()).toBe('settings.user.feedback.operationFailed');
  });
  it('发送验证码先校验邮箱，不请求captcha', async () => {
    fill({ ...valid, email: 'bad' }); send(); await settle(); expect(feedback()).toBe('settings.user.feedback.emailInvalid'); expect(api.netFetch).not.toHaveBeenCalled();
  });
  it('真实builtin captcha完成后发送规范化邮箱与票据，并使用真实cooldown倒计时', async () => {
    fill(); builtinCaptcha({ code: 200, data: { retryAfterSeconds: 2 } }); send(); await settle();
    expect(modal.props).not.toBeNull(); modal.props!.onConfirm(321); await settle();
    const request = api.netFetch.mock.calls.find(([url]) => url.endsWith('/email-code/send'));
    expect(JSON.parse(request?.[1]?.body ?? '{}')).toEqual({ email: 'user@example.test', scene: 'REGISTER', captchaTicket: 'challenge', captchaRandstr: '321', captchaSign: 'signature' });
    expect(feedback()).toBe('settings.user.feedback.emailCodeSent');
    let root = renderWithHooks(RegisterContent); runEffects(); expect(elements(root).find((element) => element.props.className === 'auth-password-toggle')?.props.disabled).toBe(true);
    vi.advanceTimersByTime(1000); renderWithHooks(RegisterContent); runEffects(); vi.advanceTimersByTime(1000); root = renderWithHooks(RegisterContent); runEffects();
    expect(elements(root).find((element) => element.props.className === 'auth-password-toggle')?.props.disabled).toBe(false);
  });
  it('用户取消真实captcha后恢复按钮并显示取消反馈', async () => {
    fill(); builtinCaptcha({ code: 200 }); send(); await settle(); modal.props!.onCancel(); await settle();
    expect(feedback()).toBe('settings.user.feedback.captchaCancelled'); expect(api.netFetch.mock.calls.some(([url]) => url.endsWith('/email-code/send'))).toBe(false);
  });
  it.each([new Error('DOM失败'), 7])('真实modal叶抛出%j时结束验证码请求并处理Error/非Error', async (failure) => {
    fill(); modal.failure = failure; builtinCaptcha({ code: 200 }); send(); await settle();
    expect(feedback()).toBe(failure instanceof Error ? failure.message : 'settings.user.feedback.emailCodeSendFailed');
    expect(elements(renderWithHooks(RegisterContent)).find((element) => element.props.className === 'auth-password-toggle')?.props.disabled).toBe(false);
  });
  it.each([{ code: 403, message: '发送拒绝' }, { code: 403, message: '' }])('验证码发送API失败$message不开始倒计时', async (reply) => {
    responses.push({ code: 200, data: { enabled: false } }, reply); fill(); send(); await settle();
    expect(feedback()).toBe(reply.message || 'failed'); renderWithHooks(RegisterContent); runEffects(); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([undefined, 0, -1])('服务返回retryAfterSeconds=%s保留现有默认/钳制规则', async (retryAfterSeconds) => {
    responses.push({ code: 200, data: { enabled: false } }, { code: 200, data: { retryAfterSeconds } }); fill(); send(); await settle();
    const root = renderWithHooks(RegisterContent); runEffects(); expect(feedback()).toBe('settings.user.feedback.emailCodeSent');
    expect(elements(root).find((element) => element.props.className === 'auth-password-toggle')?.props.disabled).toBe(retryAfterSeconds !== -1);
  });
  it('注册与验证码请求等待时真实busy状态禁用可见操作，完成后恢复', async () => {
    const pending = deferredBackground<Awaited<ReturnType<typeof api.netFetch>>>(); api.netFetch.mockReturnValueOnce(pending.promise);
    fill(); const button = findElement(renderWithHooks(RegisterContent), (element) => element.props.className === 'settings-user-primary-btn'); invoke(button, 'onClick');
    const busy = renderWithHooks(RegisterContent); expect(findElement(busy, (element) => element.props.className === 'settings-user-primary-btn').props.disabled).toBe(true);
    expect(textContent(busy)).toContain('settings.user.feedback.submitting');
    pending.resolve({ ok: true, status: 200, body: JSON.stringify({ code: 403, message: '拒绝' }) }); await settle(); expect(feedback()).toBe('拒绝');
  });

  it('验证码发送等待显示真实busy标签，完成或网络空消息恢复按钮与反馈', async () => {
    fill(); const pending = deferredBackground<Awaited<ReturnType<typeof api.netFetch>>>();
    api.netFetch.mockReturnValueOnce(pending.promise); send();
    const busy = renderWithHooks(RegisterContent);
    expect(textContent(busy)).toContain('settings.user.feedback.emailCodeSending');
    expect(elements(busy).find((element) => element.props.className === 'auth-password-toggle')?.props.disabled).toBe(true);
    const base = api.netFetch.getMockImplementation()!;
    api.netFetch.mockImplementation((url, init) => url.endsWith('/email-code/send') ? Promise.reject(new Error('')) : base(url, init));
    pending.resolve({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: { enabled: false } }) });
    await settle(); expect(feedback()).toBe('settings.user.feedback.emailCodeSendFailed');
    expect(elements(renderWithHooks(RegisterContent)).find((element) => element.props.className === 'auth-password-toggle')?.props.disabled).toBe(false);
  });
  it('登录和取消注册分别执行真实导航动作', () => {
    let root = renderWithHooks(RegisterContent); let secondary = elements(root).filter((element) => element.props.className === 'settings-user-secondary-btn');
    invoke(secondary[0], 'onClick'); expect(useIslandStore.getState().state).toBe('login');
    useIslandStore.setState({ state: 'register', authReturnState: 'idle' }); root = renderWithHooks(RegisterContent); secondary = elements(root).filter((element) => element.props.className === 'settings-user-secondary-btn');
    invoke(secondary[1], 'onClick'); expect(useIslandStore.getState().state).toBe('idle');
  });
});
