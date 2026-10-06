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
 * @file aboutFeedbackLifecycle.test.tsx
 * @description 关于页反馈、上传、历史、账号订阅与卸载清理的真实回调及生命周期覆盖测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, elements, find, flushEffects, render, resetLifecycle, settle, text, trigger, unmount } from './settingsLifecycleHarness';
import type { ReactElement } from 'react';
import type { AboutSettingsPageKey } from '../components/AboutSettingsPageDots';
import type { SubmitUserIssueFeedbackPayload, UserAccountResult, UserFeedbackUploadOptions, FeedbackQqGroupConfig } from '../../../../../../../../api/user/userAccountApi';
const {
  AboutSettingsSection
} = await import('../AboutSettingsSection');
interface Profile {
  email?: string;
  username?: string;
}
const io = vi.hoisted(() => ({
  token: ((): string | null => 'token')(),
  profile: null as Profile | null,
  listener: null as (() => void) | null,
  unsubscribe: vi.fn<() => void>(),
  list: vi.fn<(token: string, options: {
    status?: string;
    page: number;
    pageSize: number;
  }) => Promise<UserAccountResult<unknown>>>(),
  submit: vi.fn<(token: string, value: SubmitUserIssueFeedbackPayload) => Promise<UserAccountResult<unknown>>>(),
  qq: vi.fn<() => Promise<FeedbackQqGroupConfig | null>>(),
  log: vi.fn<(file: File, token: string, options: UserFeedbackUploadOptions) => Promise<string>>(),
  screenshot: vi.fn<(file: File, token: string, options: UserFeedbackUploadOptions) => Promise<string>>(),
  captcha: vi.fn<(account: string) => Promise<{
    ticket: string;
    randstr: string;
    sign: string;
  } | null>>(),
  pickLog: vi.fn<() => Promise<string | null>>(),
  pickScreenshot: vi.fn<() => Promise<string | null>>(),
  bytes: vi.fn<(file: string) => Promise<Uint8Array | null>>(),
  open: vi.fn<(url: string) => Promise<void>>(),
  read: vi.fn<(key: string) => Promise<unknown>>(),
  write: vi.fn<(key: string, value: unknown) => Promise<boolean>>()
}));
vi.mock('../../../../../../../../api/user/userAccountApi', () => ({
  fetchMyIssueFeedbackList: io.list,
  submitUserIssueFeedback: io.submit,
  fetchFeedbackQqGroupConfig: io.qq,
  uploadUserFeedbackLog: io.log,
  uploadUserFeedbackScreenshot: io.screenshot
}));
vi.mock('../../../../../../../../utils/userAccount', () => ({
  readLocalToken: () => io.token,
  readLocalProfile: () => io.profile,
  subscribeUserAccountSessionChanged: (listener: () => void) => {
    io.listener = listener;
    return io.unsubscribe;
  }
}));
vi.mock('../../../../../../../../utils/sliderCaptcha', () => ({
  runSliderCaptcha: io.captcha
}));
const createUrl = vi.fn<(file: Blob | MediaSource) => string>();
const revokeUrl = vi.fn<(url: string) => void>();
let page: AboutSettingsPageKey = 'feedback';
let version = ' 1.2.3 ';
/**
 * 渲染当前真实组件。
 * @returns 当前真实组件树。
 */
function view(): ReactElement {
  return render(AboutSettingsSection, {
    aboutVersion: version,
    initialPage: page
  });
}
/**
 * 按动作翻译键查找真实按钮。
 * @param tree - 当前组件树
 * @param action - 动作键结尾
 * @returns 真实按钮
 */
function button(tree: ReactElement, action: string): ReactElement<Record<string, unknown>> {
  return find(tree, (node) => node.type === 'button' && text(node).endsWith(`.${action}`));
}
/**
 * 修改真实表单字段。
 * @param kind - 标题、内容、联系信息或反馈类型
 * @param value - 输入值
 */
function fill(kind: 'title' | 'content' | 'contact' | 'type', value: string): void {
  const tree = view();
  const node = kind === 'type' ? find(tree, (item) => item.type === 'select') : find(tree, (item) => typeof item.props.placeholder === 'string' && item.props.placeholder.endsWith(`.${kind}Placeholder`));
  trigger(node, 'onChange', {
    target: {
      value
    }
  });
}
/** 初始化 effect，并等待模拟服务完成。 */
async function mount(): Promise<void> {
  view();
  flushEffects();
  await settle();
  view();
}
/**
 * 上传选取的日志或图片，并等待真实事件处理结束。
 * @param kind - 上传种类
 */
async function upload(kind: 'Log' | 'Screenshot'): Promise<void> {
  trigger(button(view(), `upload${kind}`), 'onClick');
  await settle();
}
beforeEach(() => {
  resetLifecycle();
  page = 'feedback';
  version = ' 1.2.3 ';
  io.token = 'token';
  io.profile = null;
  io.listener = null;
  io.unsubscribe.mockReset();
  io.list.mockReset();
  io.list.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: {
      items: []
    }
  });
  io.qq.mockReset();
  io.qq.mockResolvedValue(null);
  io.submit.mockReset();
  io.submit.mockResolvedValue({
    ok: true,
    code: 200,
    message: ''
  });
  io.log.mockReset();
  io.log.mockResolvedValue('https://uploaded/log');
  io.screenshot.mockReset();
  io.screenshot.mockResolvedValue('https://uploaded/image');
  io.captcha.mockReset();
  io.captcha.mockResolvedValue({
    ticket: 'ticket',
    randstr: 'random',
    sign: 'sign'
  });
  io.pickLog.mockReset();
  io.pickLog.mockResolvedValue('C:/test/client.log');
  io.pickScreenshot.mockReset();
  io.pickScreenshot.mockResolvedValue('C:/test/image.png');
  io.bytes.mockReset();
  io.bytes.mockResolvedValue(new Uint8Array([1, 2, 3]));
  io.open.mockReset();
  io.open.mockResolvedValue();
  io.read.mockReset();
  io.read.mockResolvedValue(null);
  io.write.mockReset();
  io.write.mockResolvedValue(true);
  createUrl.mockReset();
  createUrl.mockReturnValue('blob:preview');
  revokeUrl.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockImplementation(createUrl);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeUrl);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('window', {
    api: {
      pickFeedbackLogFile: io.pickLog,
      pickFeedbackScreenshotFile: io.pickScreenshot,
      readLocalFileAsBuffer: io.bytes,
      clipboardOpenUrl: io.open,
      storeRead: io.read,
      storeWrite: io.write
    }
  });
});
afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
});
describe('About account lifecycle, prefill and navigation', () => {
  it('subscribes to account changes, updates the view and unsubscribes on unmount', async () => {
    io.token = null;
    await mount();
    expect(text(view())).toContain('.loginRequired');
    io.token = 'token';
    io.listener!();
    expect(text(view())).toContain('.title');
    unmount();
    expect(io.unsubscribe).toHaveBeenCalledOnce();
  });
  it('renders development and changes initial-page state through its real effect', async () => {
    page = 'development';
    await mount();
    expect(text(view())).toContain('eIsland v');
    expect(io.list).not.toHaveBeenCalled();
    page = 'feedbackHistory';
    view();
    flushEffects();
    await settle();
    expect(text(view())).toContain('.history.title');
  });
  it('executes the actual pagination toggle updater and page-selection callback', async () => {
    await mount();
    const nav = find(view(), (node) => typeof node.type === 'function' && 'onToggle' in node.props);
    trigger(nav, 'onToggle');
    expect(find(view(), (node) => 'onToggle' in node.props).props.expanded).toBe(true);
    const dots = find(view(), (node) => 'setAboutPage' in node.props);
    trigger(dots, 'setAboutPage', 'feedbackHistory');
    expect(text(view())).toContain('.history.title');
  });
  it.each([{
    title: ' title ',
    content: ' details '
  }, {
    title: 7,
    content: ' details '
  }, {
    title: ' title ',
    content: null
  }])('prefills usable agent output %s and clears the stored payload', async (value) => {
    io.read.mockResolvedValue(value);
    io.write.mockRejectedValueOnce(new Error('denied'));
    await mount();
    expect(text(view())).toContain('.prefilledFromAgent');
    expect(io.write).toHaveBeenCalledWith('settings-about-feedback-prefill', null);
  });
  it.each([null, 'invalid', {}, {
    title: ' ',
    content: ''
  }])('ignores unavailable or empty agent output %s', async (value) => {
    io.read.mockResolvedValue(value);
    await mount();
    expect(io.write).not.toHaveBeenCalled();
  });
  it('ignores a rejected store read and a payload arriving after unmount', async () => {
    io.read.mockRejectedValueOnce(new Error('denied'));
    await mount();
    expect(io.write).not.toHaveBeenCalled();
    resetLifecycle();
    const read = deferred<unknown>();
    io.read.mockReturnValue(read.promise);
    view();
    flushEffects();
    unmount();
    read.resolve({
      title: 'late'
    });
    await settle();
    expect(io.write).not.toHaveBeenCalled();
  });
  it('opens a configured QQ group and handles unavailable configuration', async () => {
    io.qq.mockResolvedValueOnce({
      qqInviteUrl: 'https://qq.test/invite'
    });
    await mount();
    trigger(button(view(), 'join'), 'onClick');
    expect(io.open).toHaveBeenCalledWith('https://qq.test/invite');
    resetLifecycle();
    io.qq.mockRejectedValueOnce(new Error('offline'));
    await mount();
    expect(text(view())).not.toContain('.qqGroup.join');
  });
  it.each([null, {}, {
    email: ''
  }])('reports an absent bound email %s', async (profile) => {
    io.profile = profile;
    await mount();
    trigger(button(view(), 'useBoundEmail'), 'onClick');
    expect(text(view())).toContain('.boundEmailNotFound');
  });
  it('normalizes the bound email and reports a failed GitHub navigation', async () => {
    io.profile = {
      email: ' PERSON@EXAMPLE.COM '
    };
    await mount();
    trigger(button(view(), 'useBoundEmail'), 'onClick');
    expect(find(view(), (node) => typeof node.props.placeholder === 'string' && node.props.placeholder.endsWith('.contactPlaceholder')).props.value).toBe('person@example.com');
    io.open.mockRejectedValueOnce(new Error('offline'));
    trigger(button(view(), 'openGithubIssue'), 'onClick');
    await settle();
    expect(text(view())).toContain('.openGithubIssueFailed');
  });
});
describe('About feedback picker and upload boundaries', () => {
  it.each(['Log', 'Screenshot'] as const)('ignores a cancelled %s picker', async (kind) => {
    (kind === 'Log' ? io.pickLog : io.pickScreenshot).mockResolvedValue(null);
    await mount();
    await upload(kind);
    expect(io.bytes).not.toHaveBeenCalled();
  });
  it.each([['Log', 'C:/test/', '.logOnly'], ['Log', 'C:/test/a.txt', '.logOnly'], ['Screenshot', 'C:/test/', '.screenshotOnly'], ['Screenshot', 'C:/test/a.gif', '.screenshotOnly']] as const)('rejects unsupported %s path %s', async (kind, file, message) => {
    (kind === 'Log' ? io.pickLog : io.pickScreenshot).mockResolvedValue(file);
    await mount();
    await upload(kind);
    expect(text(view())).toContain(message);
    expect(io.bytes).not.toHaveBeenCalled();
  });
  it.each(['Log', 'Screenshot'] as const)('reports missing, empty and rejected %s file reads', async (kind) => {
    await mount();
    io.bytes.mockResolvedValueOnce(null);
    await upload(kind);
    expect(text(view())).toContain(kind === 'Log' ? '.logReadFailed' : '.screenshotReadFailed');
    io.bytes.mockResolvedValueOnce(new Uint8Array());
    await upload(kind);
    io.bytes.mockRejectedValueOnce(new Error('denied'));
    await upload(kind);
    expect(text(view())).toContain(kind === 'Log' ? '.logReadFailed' : '.screenshotReadFailed');
  });
  it.each(['Log', 'Screenshot'] as const)('rejects an oversized %s file before calling upload', async (kind) => {
    io.bytes.mockResolvedValue(new Uint8Array((kind === 'Log' ? 5 : 10) * 1024 * 1024 + 1));
    await mount();
    await upload(kind);
    expect(text(view())).toContain(kind === 'Log' ? '.logTooLarge' : '.screenshotTooLarge');
    expect(io.log).not.toHaveBeenCalled();
    expect(io.screenshot).not.toHaveBeenCalled();
  });
  it.each([['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['webp', 'image/webp'], ['bmp', 'image/bmp']])('uploads %s screenshots with an inferred MIME type', async (extension, type) => {
    io.pickScreenshot.mockResolvedValue(`C:/test/image.${extension}`);
    await mount();
    await upload('Screenshot');
    expect(io.screenshot.mock.calls[0][0].type).toBe(type);
    expect(io.screenshot.mock.calls[0][1]).toBe('token');
    expect(text(view())).toContain('.screenshotUploadSuccess');
    expect(createUrl).toHaveBeenCalledOnce();
  });
  it('updates log progress, disables simultaneous actions and removes the completed log card', async () => {
    const task = deferred<string>();
    io.log.mockImplementation((file, token, options) => {
      void file;
      void token;
      options.onUploadProgress?.(47);
      return task.promise;
    });
    await mount();
    trigger(button(view(), 'uploadLog'), 'onClick');
    await settle();
    expect(text(view())).toContain('47%');
    expect(button(view(), 'uploadScreenshot').props.disabled).toBe(true);
    task.resolve('https://uploaded/log');
    await settle();
    expect(text(view())).toContain('client.log');
    trigger(button(view(), 'clearLog'), 'onClick');
    expect(text(view())).not.toContain('client.log');
  });
  it('updates screenshot progress, replaces and removes previews and cleans up on unmount', async () => {
    const task = deferred<string>();
    io.screenshot.mockImplementationOnce((file, token, options) => {
      void file;
      void token;
      options.onUploadProgress?.(62);
      return task.promise;
    });
    await mount();
    trigger(button(view(), 'uploadScreenshot'), 'onClick');
    await settle();
    expect(text(view())).toContain('62%');
    expect(button(view(), 'uploadLog').props.disabled).toBe(true);
    task.resolve('https://uploaded/image');
    await settle();
    view();
    flushEffects();
    await upload('Screenshot');
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview');
    trigger(button(view(), 'clearScreenshot'), 'onClick');
    expect(elements(view()).some((node) => node.props.className === 'settings-about-feedback-screenshot-preview')).toBe(false);
    await upload('Screenshot');
    view();
    flushEffects();
    unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview');
  });
  it.each(['Log', 'Screenshot'] as const)('renders Error and non-Error %s upload failures and resets busy state', async (kind) => {
    const uploader = kind === 'Log' ? io.log : io.screenshot;
    uploader.mockRejectedValueOnce(new Error('upload denied'));
    await mount();
    await upload(kind);
    expect(text(view())).toContain('upload denied');
    uploader.mockRejectedValueOnce('offline');
    await upload(kind);
    expect(text(view())).toContain(kind === 'Log' ? '.logUploadFailed' : '.screenshotUploadFailed');
    expect(button(view(), `upload${kind}`).props.disabled).toBe(false);
  });
});
describe('About feedback submission and history', () => {
  it('requires title and content and updates the actual form inputs', async () => {
    await mount();
    trigger(button(view(), 'submit'), 'onClick');
    await settle();
    expect(text(view())).toContain('.titleRequired');
    fill('title', ' Title ');
    trigger(button(view(), 'submit'), 'onClick');
    await settle();
    expect(text(view())).toContain('.contentRequired');
    fill('content', ' Details ');
    fill('contact', ' contact ');
    fill('type', 'feature');
    expect(io.captcha).not.toHaveBeenCalled();
  });
  it.each([{
    profile: {
      email: 'email@test'
    },
    contact: '',
    account: 'email@test'
  }, {
    profile: {
      username: 'user'
    },
    contact: '',
    account: 'user'
  }, {
    profile: null,
    contact: ' contact ',
    account: 'contact'
  }, {
    profile: null,
    contact: '',
    account: 'issue-feedback'
  }])('uses the appropriate captcha account $account', async ({
    profile,
    contact,
    account
  }) => {
    io.profile = profile;
    io.captcha.mockResolvedValue(null);
    await mount();
    fill('title', 'Title');
    fill('content', 'Details');
    fill('contact', contact);
    trigger(button(view(), 'submit'), 'onClick');
    await settle();
    expect(io.captcha).toHaveBeenCalledWith(account);
    expect(text(view())).toContain('.captchaCancelled');
    expect(io.submit).not.toHaveBeenCalled();
  });
  it('submits without assets and clears an already removed screenshot safely', async () => {
    await mount();
    await upload('Screenshot');
    const remove = button(view(), 'clearScreenshot');
    trigger(remove, 'onClick');
    trigger(remove, 'onClick');
    fill('title', 'Title');
    fill('content', 'Details');
    trigger(button(view(), 'submit'), 'onClick');
    await settle();
    expect(text(view())).toContain('.submitSuccess');
    expect(io.submit.mock.calls[0][1]).toMatchObject({
      feedbackScreenshotUrl: '',
      feedbackLogUrl: ''
    });
  });
  it('submits trimmed fields and uploaded assets, shows busy state and refreshes history', async () => {
    const task = deferred<UserAccountResult<unknown>>();
    io.submit.mockReturnValue(task.promise);
    await mount();
    await upload('Log');
    await upload('Screenshot');
    fill('title', ' Title ');
    fill('content', ' Details ');
    fill('contact', ' person@test ');
    fill('type', 'feature');
    trigger(button(view(), 'submit'), 'onClick');
    await settle();
    expect(button(view(), 'submitting').props.disabled).toBe(true);
    expect(io.submit.mock.calls[0]).toEqual(['token', {
      feedbackType: 'feature',
      title: 'Title',
      content: 'Details',
      contact: 'person@test',
      feedbackLogUrl: 'https://uploaded/log',
      feedbackScreenshotUrl: 'https://uploaded/image',
      clientVersion: '1.2.3',
      captchaTicket: 'ticket',
      captchaRandstr: 'random',
      captchaSign: 'sign'
    }]);
    task.resolve({
      ok: true,
      code: 200,
      message: ''
    });
    await settle();
    expect(text(view())).toContain('.submitSuccess');
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview');
    expect(io.list).toHaveBeenCalledTimes(2);
    expect(find(view(), (node) => typeof node.props.placeholder === 'string' && node.props.placeholder.endsWith('.titlePlaceholder')).props.value).toBe('');
  });
  it.each(['server rejected', ''])('renders failed submission message %s without clearing entered fields', async (message) => {
    io.submit.mockResolvedValue({
      message,
      ok: false,
      code: 500
    });
    await mount();
    version = '';
    fill('title', 'Title');
    fill('content', 'Details');
    trigger(button(view(), 'submit'), 'onClick');
    await settle();
    expect(text(view())).toContain(message || '.submitFailed');
    expect(io.submit.mock.calls[0][1]).toMatchObject({
      feedbackLogUrl: '',
      feedbackScreenshotUrl: '',
      clientVersion: ''
    });
  });
  it.each([new Error('captcha failed'), 'captcha failed'])('handles thrown submission failure %s', async (failure) => {
    io.captcha.mockRejectedValue(failure);
    await mount();
    fill('title', 'Title');
    fill('content', 'Details');
    trigger(button(view(), 'submit'), 'onClick');
    await settle();
    expect(text(view())).toContain(failure instanceof Error ? failure.message : '.submitFailed');
    expect(button(view(), 'submit').props.disabled).toBe(false);
  });
  it('loads history while logged out and shows empty, loading and populated history states', async () => {
    io.token = null;
    page = 'feedbackHistory';
    await mount();
    trigger(button(view(), 'refresh'), 'onClick');
    await settle();
    expect(io.list).not.toHaveBeenCalled();
    expect(text(view())).toContain('.history.loginHint');
    io.token = 'token';
    io.listener!();
    const task = deferred<UserAccountResult<unknown>>();
    io.list.mockReturnValueOnce(task.promise);
    view();
    flushEffects();
    expect(text(view())).toContain('.history.loading');
    task.resolve({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: []
      }
    });
    await settle();
    expect(text(view())).toContain('.history.empty');
  });
  it.each([401, 4011, 500])('shows feedback history API failure %s', async (code) => {
    io.list.mockResolvedValue({
      code,
      ok: false,
      message: code === 500 ? 'server failure' : ''
    });
    await mount();
    expect(text(view())).toContain(code === 500 ? 'server failure' : '.loginRequired');
  });
  it('shows fallback history errors and normalizes malformed list payloads', async () => {
    io.list.mockResolvedValueOnce({
      ok: true,
      code: 200,
      message: ''
    });
    await mount();
    expect(text(view())).toContain('.loadFailed');
    io.list.mockResolvedValueOnce({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: null
      }
    });
    page = 'feedbackHistory';
    view();
    flushEffects();
    view();
    trigger(button(view(), 'refresh'), 'onClick');
    await settle();
    expect(text(view())).toContain('.history.empty');
  });
  it('renders all history statuses, reply and absent-field fallbacks and refreshes a selected filter', async () => {
    page = 'feedbackHistory';
    io.list.mockResolvedValue({
      ok: true,
      code: 200,
      message: '',
      data: {
        items: ['RESOLVED', 'rejected', 'pending', 'invalid', ''].map((status, id) => ({
          status,
          id,
          title: id ? '' : 'title',
          content: id ? '' : 'content',
          feedbackType: id ? '' : 'bug',
          createdAt: id ? '' : 'today',
          adminReply: id ? '' : 'reply'
        }))
      }
    });
    await mount();
    expect(text(view())).toContain('.status.resolved');
    expect(text(view())).toContain('.status.rejected');
    expect(text(view())).toContain('.status.pending');
    expect(text(view())).toContain('.adminReply');
    const filter = find(view(), (node) => node.type === 'select');
    trigger(filter, 'onChange', {
      target: {
        value: 'resolved'
      }
    });
    view();
    flushEffects();
    await settle();
    expect(io.list).toHaveBeenLastCalledWith('token', {
      status: 'resolved',
      page: 1,
      pageSize: 20
    });
    trigger(button(view(), 'refresh'), 'onClick');
    await settle();
    expect(io.list).toHaveBeenCalledTimes(3);
  });
});

describe('公开配置边界的剩余反馈分支', () => {
  it('开发页真实依赖表同时渲染有链接和无链接的项目', async () => {
    page = 'development'; await mount();
    const dependencies = elements(view()).filter((node) => node.props.className === 'settings-about-dep');
    expect(dependencies.some((node) => node.type === 'a')).toBe(true);
    expect(dependencies.some((node) => node.type === 'span')).toBe(true);
    expect(text(view())).toContain('Electron');
  });
  it('公开群配置在渲染后失去邀请地址时点击真实旧按钮忽略打开', async () => {
    const config: FeedbackQqGroupConfig = { qqInviteUrl: 'https://qq.test/invite' };
    io.qq.mockResolvedValue(config); await mount();
    const join = button(view(), 'join'); config.qqInviteUrl = '';
    trigger(join, 'onClick'); expect(io.open).not.toHaveBeenCalled();
  });
});
