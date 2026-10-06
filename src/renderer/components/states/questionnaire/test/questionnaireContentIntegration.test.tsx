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
 * @file questionnaireContentIntegration.test.tsx
 * @description 问卷组件连接真实请求、草稿、题号导航和 Zustand 状态的完整公开交互测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../../components/test/contentLifecycleHarness';
import { api, renderWithHooks, resetBrowser, runEffects, settle, storage, unmountHooks } from '../../register/hooks/test/authHookHarness';
import { byClass, elements, find, invoke, text } from '../../test/tree';
import { QuestionnaireQuestion } from '../components/QuestionnaireQuestion';
import type { ReactElement } from 'react';
vi.mock('react', async (load) => ({
  ...(await load<typeof import('react')>()),
  ...(await import('../../../test/elementHarness')).hookMocks,
  ...(await import('../../../components/test/contentLifecycleHarness')).lifecycleHooks,
}));
vi.mock('react-i18next', async (load) => ({
  ...(await load<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
let Component: typeof import('../QuestionnaireContent').QuestionnaireContent;
let store: typeof import('../../../../store/slices').default;
let list: ReturnType<typeof survey>[];
let social: Record<string, string>;
let submitReply: { code: number; message?: string; data?: unknown };
let deferredSocial: Promise<{ ok: boolean; status: number; body: string }> | undefined;
let deferredSubmit: Promise<{ ok: boolean; status: number; body: string }> | undefined;
const write = vi.fn<Window['api']['storeWrite']>();
const observed = { observe: vi.fn(), disconnect: vi.fn() };
const observer = vi.fn<(callback: IntersectionObserverCallback) => typeof observed>(
  // eslint-disable-next-line prefer-arrow-callback -- 原生浏览器构造函数叶边界必须允许 new。
  function createObserver(callback) { void callback; return observed; },
);
/** 构造真实接口允许的问卷原始数据。
 * @param id - 服务端问卷编号。
 * @returns 可经真实 API 正规化的問卷。
 */
function survey(id: number) {
  return { id, title: `Survey ${id}`, description: id === 1 ? '' : 'Other survey', rewardProDays: id === 1 ? 2 : null, endsAt: '2026-12-01T12:00:00', contentJson: JSON.stringify({ questions: [
    { id: 'required', title: 'Required', type: 'text', required: true },
    { id: 'optional', title: 'Optional', type: 'rating', required: false },
  ] }) };
}
/** 获取实际 Zustand 公共快照。
 * @param subscribe - React 外部订阅入口。
 * @param getSnapshot - 真状态读取入口。
 * @returns 当前状态。
 */
function snapshot<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
  void subscribe;
  return getSnapshot();
}
/** 重新求值真实问卷和两个实际 Hook。
 * @returns 实际元素树。
 */
function view(): ReactElement {
  return renderWithHooks(Component);
}
/** 排空真实初始化链路并重渲染。
 * @returns 完成加载后的元素树。
 */
async function load(): Promise<ReactElement> {
  view(); runEffects(); await settle();
  const root = view(); runEffects(); return root;
}
/** 点击实际文本按钮。
 * @param key - 翻译键，也是叶翻译器公开文本。
 * @returns 无返回值。
 */
function click(key: string): void {
  invoke(find(view(), (node) => node.type === 'button' && text(node) === key), 'onClick');
}
/** 通过实际子问题 props 回调修改答案。
 * @param value - 问题答案。
 * @returns 无返回值。
 */
function answer(value: string): void {
  invoke(elements(view()).filter((node) => node.type === QuestionnaireQuestion)[0], 'onChange', value);
}
beforeEach(async () => {
  vi.useFakeTimers(); resetBrowser();
  storage.set('user-account-token', 'token');
  list = [survey(1), survey(2)];
  social = { bilibiliUrl: 'https://bilibili.com/a', githubUrl: 'https://github.com/a', qqInviteUrl: 'https://qq.com/invite', qqQrImageUrl: '' };
  submitReply = { code: 200, data: { id: 9, rewardProDays: 2, rewardProExpireAt: '2026-11-01T00:00:00', submittedAt: '2026-10-06' } };
  deferredSocial = undefined; deferredSubmit = undefined;
  write.mockReset().mockResolvedValue(true);
  Object.assign(api, { storeWrite: write, expandWindow: vi.fn(), enableMousePassthrough: vi.fn() });
  api.netFetch.mockImplementation((url) => {
    if (url.includes('/social-config')) return deferredSocial ?? Promise.resolve({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: social }) });
    if (url.includes('/results')) return deferredSubmit ?? Promise.resolve({ ok: true, status: 200, body: JSON.stringify(submitReply) });
    return Promise.resolve({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: list }) });
  });
  vi.stubGlobal('IntersectionObserver', observer);
  const react = await vi.importActual<typeof import('react') & { default: typeof import('react') }>('react');
  vi.spyOn(react.default, 'useSyncExternalStore').mockImplementation(snapshot);
  vi.spyOn(react.default, 'useDebugValue').mockImplementation(() => undefined);
  vi.spyOn(react.default, 'useRef').mockImplementation((initial) => lifecycleHooks.useRef(initial));
  vi.spyOn(react.default, 'useCallback').mockImplementation((callback, dependencies) => lifecycleHooks.useCallback(callback, dependencies));
  ({ QuestionnaireContent: Component } = await import('../QuestionnaireContent'));
  ({ default: store } = await import('../../../../store/slices'));
  store.setState({ state: 'questionnaire', uiStateLocked: false });
});
afterEach(() => {
  unmountHooks(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals();
});
describe('问卷组件真实 API 与交互', () => {
  it('空列表允许重试和关闭，并阻止父层点击传播', async () => {
    list = [];
    expect(text(view())).toContain('questionnaire.loading');
    let root = await load();
    expect(text(root)).toContain('questionnaire.emptyTitle');
    const stopPropagation = vi.fn(); invoke(elements(root)[0], 'onClick', { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    list = [survey(1)]; click('questionnaire.retry'); await settle(); root = view(); runEffects();
    expect(text(root)).toContain('Survey 1');
    invoke(byClass(root, 'announcement-close-btn'), 'onClick');
    expect(store.getState().state).toBe('hover');
  });
  it('真实社交配置开链接，列表折叠恢复，问题 ref 与题号跳转实际滚动', async () => {
    let root = await load();
    const stopPropagation = vi.fn(); invoke(elements(root)[0], 'onClick', { stopPropagation });
    ['announcement-bilibili-btn', 'announcement-qq-btn', 'announcement-github-btn'].forEach((className) => invoke(byClass(root, className), 'onClick'));
    expect(api.clipboardOpenUrl.mock.calls).toEqual([[social.bilibiliUrl], [social.qqInviteUrl], [social.githubUrl]]);
    const target = { scrollIntoView: vi.fn() };
    const [, section] = elements(root).filter((node) => node.props.className === 'questionnaire-question-section');
    invoke(section, 'ref', target);
    const container = Object.assign(new EventTarget(), { scrollTo: vi.fn(), scrollTop: 0, scrollHeight: 1000, clientHeight: 200 });
    (byClass(root, 'questionnaire-body').props.ref as { current: unknown }).current = container;
    view(); runEffects();
    const toc = byClass(view(), 'questionnaire-toc');
    invoke(elements(toc).filter((node) => node.type === 'button')[1], 'onClick');
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    vi.advanceTimersByTime(600);
    invoke(byClass(view(), 'announcement-list-toggle-btn'), 'onClick');
    expect(byClass(view(), 'questionnaire-list').props.className).toContain('collapsed');
    invoke(byClass(view(), 'announcement-list-toggle-btn'), 'onClick');
    expect(byClass(view(), 'questionnaire-list').props.className).toBe('questionnaire-list');
    root = view();
    invoke(elements(byClass(root, 'questionnaire-list')).filter((node) => node.type === 'button')[1], 'onClick');
    root = view(); runEffects();
    expect(text(root)).toContain('Other survey');
    expect(elements(root).some((node) => node.props.className === 'questionnaire-reward-banner')).toBe(false);
  });
  it('仅二维码社交配置展示按钮但没有邀请链接时不打开 URL', async () => {
    social = { qqInviteUrl: '', qqQrImageUrl: 'https://qq.com/qr' };
    await load();
    invoke(byClass(view(), 'announcement-qq-btn'), 'onClick');
    expect(api.clipboardOpenUrl).not.toHaveBeenCalled();
  });
  it('真实保存草稿、提交等待、失败提示与编辑恢复，举报入口写入设置意图', async () => {
    await load();
    expect(byClass(view(), 'settings-user-primary-btn').props.disabled).toBe(true);
    click('questionnaire.saveDraft');
    expect(text(view())).toContain('questionnaire.draftSaved');
    answer('answer');
    expect(byClass(view(), 'settings-user-primary-btn').props.disabled).toBe(false);
    let resolve!: (reply: { ok: boolean; status: number; body: string }) => void;
    deferredSubmit = new Promise((done) => { resolve = done; });
    click('questionnaire.submit');
    expect(text(view())).toContain('questionnaire.submitting');
    expect(byClass(view(), 'settings-user-primary-btn').props.disabled).toBe(true);
    await settle();
    resolve({ ok: true, status: 200, body: JSON.stringify({ code: 400, message: 'invalid answer' }) });
    await settle();
    expect(text(view())).toContain('invalid answer (400)');
    answer('fixed');
    expect(text(view())).not.toContain('invalid answer');
    write.mockRejectedValue(new Error('IPC write'));
    click('questionnaire.reportIssue'); await settle();
    expect(write).toHaveBeenCalledWith('settings-open-tab', 'about-feedback');
    expect(store.getState()).toMatchObject({ state: 'maxExpand', maxExpandTab: 'settings' });
  });
  it('409 重复提交消息在真实剩余问卷展示错误样式', async () => {
    submitReply = { code: 409, message: 'already' };
    await load(); answer('answer'); click('questionnaire.submit'); await settle();
    expect(text(view())).toContain('questionnaire.alreadySubmitted');
    expect(byClass(view(), 'error')).toBeDefined();
  });
  it.each([true, false])('成功奖励返回有效期=%s，完成页继续下一份并保留举报按钮', async (expiry) => {
    submitReply = { code: 200, data: { id: 9, rewardProDays: 2, rewardProExpireAt: expiry ? '2026-11-01T00:00:00' : null, submittedAt: '2026-10-06' } };
    await load(); answer('answer'); click('questionnaire.submit'); await settle();
    expect(text(view())).toContain('questionnaire.completedTitle');
    expect(text(view())).toContain('questionnaire.rewardDays');
    expect(text(view()).includes('questionnaire.rewardExpireAt')).toBe(expiry);
    const stopPropagation = vi.fn(); invoke(elements(view())[0], 'onClick', { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    click('questionnaire.continue');
    expect(text(view())).toContain('Survey 2');
    expect(storage.has('questionnaire-completed:1')).toBe(true);
  });
  it('无奖励的单份完成页关闭走真实 hover 状态', async () => {
    list = [survey(1)]; submitReply = { code: 200, data: { id: 9, rewardProDays: 0, rewardProExpireAt: null, submittedAt: '2026-10-06' } };
    await load(); answer('answer'); click('questionnaire.submit'); await settle();
    expect(text(view())).toContain('questionnaire.noReward');
    click('questionnaire.reportIssue');
    expect(store.getState().state).toBe('maxExpand');
    click('questionnaire.close');
    expect(store.getState().state).toBe('hover');
  });
  it('未登录显示提示并禁用提交，草稿仍可保存', async () => {
    storage.delete('user-account-token'); await load(); answer('answer');
    expect(text(view())).toContain('questionnaire.loginRequired');
    expect(byClass(view(), 'settings-user-primary-btn').props.disabled).toBe(true);
    click('questionnaire.saveDraft');
    expect(JSON.parse(storage.get('questionnaire-draft:1') ?? '{}')).toMatchObject({ answers: { required: 'answer' } });
  });
  it('卸载后迟到的真实社交请求不再写入组件状态', async () => {
    let resolve!: (reply: { ok: boolean; status: number; body: string }) => void;
    deferredSocial = new Promise((done) => { resolve = done; });
    await load();
    unmountHooks();
    resolve({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: social }) });
    await settle();
    expect(elements(view()).some((node) => node.props.className === 'announcement-github-btn')).toBe(false);
  });
  it('原生社交请求拒绝由真实 API 捕获并回退空按钮配置', async () => {
    api.netFetch.mockImplementation((url) => url.includes('/social-config')
      ? Promise.reject(new Error('network'))
      : Promise.resolve({ ok: true, status: 200, body: JSON.stringify({ code: 200, data: list }) }));
    await load();
    expect(elements(view()).some((node) => node.props.className === 'announcement-github-btn')).toBe(false);
    expect(text(view())).toContain('Survey 1');
  });

});
