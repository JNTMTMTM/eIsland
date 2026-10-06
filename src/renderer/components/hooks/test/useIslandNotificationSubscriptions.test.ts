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
 * @file useIslandNotificationSubscriptions.test.ts
 * @description 通知订阅 Hook 的真实更新 API、剪贴板元信息、开关状态与订阅清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { api as network, browser, renderWithHooks, resetBrowser, responses, runEffects, settle, storage, unmountHooks } from '../../states/register/hooks/test/authHookHarness';
import useIslandStore from '../../../store/isLandStore';
import { SvgIcon } from '../../../utils/SvgIcon';
import { CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY } from '../../config/dynamicIslandConfig';
import { useIslandNotificationSubscriptions } from '../useIslandNotificationSubscriptions';
import type { NotificationData } from '../../../store/types';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
const listeners = new Map<string, (data: unknown) => void>();
const cleanups = new Map<string, ReturnType<typeof vi.fn>>();
const subscriptions = ['onSourceSwitchRequest', 'onUpdaterAvailable', 'onUpdaterDownloaded', 'onExternalAgentStarted', 'onExternalAgentStopped', 'onClipboardUrlsDetected'] as const;
/**
 * 创建原生 IPC 订阅叶边界，清理时移除回调。
 * @param name - 原生订阅方法名称。
 * @returns 注册回调的函数。
 */
function subscribe(name: string) {
  return vi.fn((callback: (data: unknown) => void) => {
    listeners.set(name, callback);
    const cleanup = vi.fn(() => { listeners.delete(name); }); cleanups.set(name, cleanup); return cleanup;
  });
}
const storeRead = vi.fn<(key: string) => Promise<unknown>>((key) => Promise.resolve(key === 'agent-notification-enabled' ? true : 'official'));
const subscriptionApi = Object.fromEntries(subscriptions.map((name) => [name, subscribe(name)]));
const notification = vi.fn<(data: NotificationData) => void>();
const t = (key: string): string => key;
const input = { t, language: 'zh-CN' as string | undefined, setNotificationRef: { current: notification } };
beforeEach(() => {
  resetBrowser(); listeners.clear(); cleanups.clear(); storeRead.mockImplementation((key) => Promise.resolve(key === 'agent-notification-enabled' ? true : 'official'));
  // eslint-disable-next-line prefer-object-spread -- 简写排序会将 storeRead 放到基础 API 之前，必须保留最后覆盖顺序。
  vi.stubGlobal('window', Object.assign(browser, { api: Object.assign({}, network, subscriptionApi, { storeRead }) }));
  useIslandStore.setState({ state: 'idle', maxExpandTab: 'todo', maxExpandAppModeEnabled: false, maxExpandLauncherVisible: false });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 注册真实目标的 effect 并提交存储开关状态。
 * @returns 异步订阅初始化完成结果。
 */
async function mount(): Promise<void> {
  renderWithHooks(() => useIslandNotificationSubscriptions(input)); runEffects(); await settle();
  renderWithHooks(() => useIslandNotificationSubscriptions(input)); runEffects();
}
/**
 * 发送原生 IPC 回调并等待真实 API 流程。
 * @param name - 原生 IPC 方法名称。
 * @param data - 模拟原生事件数据。
 * @returns 回调异步结果的完成状态。
 */
async function emit(name: string, data: unknown): Promise<void> {
  const listener = listeners.get(name); expect(listener).toBeDefined(); listener?.(data); await settle();
}
describe('useIslandNotificationSubscriptions 实际订阅与通知', () => {
  it('播放源切换通知保留标题、来源与源标识', async () => {
    await mount(); await emit('onSourceSwitchRequest', { title: 'Song', artist: 'Artist', sourceAppId: 'player.exe' });
    expect(notification).toHaveBeenCalledWith({ title: 'notification.sourceSwitch.title', body: 'Song - Artist（player.exe）', icon: SvgIcon.MUSIC, type: 'source-switch', sourceAppId: 'player.exe' });
  });
  it.each([false, 'invalid', null])('非 true Agent 开关不注册开始或结束通知：%s', async (value) => {
    storeRead.mockResolvedValue(value); await mount();
    expect(listeners.has('onExternalAgentStarted')).toBe(false); expect(listeners.has('onExternalAgentStopped')).toBe(false);
  });
  it('开关读取失败忽略且卸载后迟到开关不注册', async () => {
    storeRead.mockRejectedValueOnce(new Error('storage-failure')); await mount();
    expect(listeners.has('onExternalAgentStarted')).toBe(false);
    unmountHooks(); resetBrowser(); let accept!: (value: unknown) => void;
    storeRead.mockImplementationOnce(() => new Promise((resolve) => { accept = resolve; }));
    renderWithHooks(() => useIslandNotificationSubscriptions(input)); runEffects(); unmountHooks(); accept(true); await settle();
    renderWithHooks(() => useIslandNotificationSubscriptions(input));
    expect(listeners.has('onExternalAgentStarted')).toBe(false);
  });
  it.each(['onExternalAgentStarted', 'onExternalAgentStopped'])('Agent %s 合并进程名称并产生对应通知', async (event) => {
    await mount(); await emit(event, { agentNames: ['Claude', 'Codex'] });
    expect(notification).toHaveBeenCalledWith(expect.objectContaining({ agentName: 'Claude、Codex', icon: SvgIcon.CODING, type: event === 'onExternalAgentStarted' ? 'external-agent-active' : 'external-agent-stopped' }));
  });
  it('更新可用读取真实版本接口与更新源，重复事件只通知一次', async () => {
    await mount(); responses.push({ code: 200, data: { version: '2.0', description: ' Release notes ' } });
    await emit('onUpdaterAvailable', { version: '2.0' }); await emit('onUpdaterAvailable', { version: '2.1' });
    expect(network.netFetch.mock.calls[0][0]).toContain('/v1/version?appName=eisland');
    expect(notification).toHaveBeenCalledOnce(); expect(notification).toHaveBeenCalledWith(expect.objectContaining({ body: 'Release notes', type: 'update-available', updateVersion: '2.0' }));
  });
  it('版本信息失败或无说明使用默认文案，源读取异常也不阻断通知', async () => {
    await mount(); network.netFetch.mockRejectedValueOnce(new Error('offline')); storeRead.mockRejectedValueOnce(new Error('source-unavailable'));
    await emit('onUpdaterAvailable', { version: '2.0' });
    expect(notification).toHaveBeenCalledWith(expect.objectContaining({ body: 'notification.update.availableBody' }));
    expect(typeof notification.mock.calls[0][0].updateSourceLabel).toBe('string');
  });
  it('下载就绪通过真实版本接口上报，立即通知；上报失败不阻断', async () => {
    await mount(); network.netFetch.mockRejectedValueOnce(new Error('offline'));
    await emit('onUpdaterDownloaded', { version: '2.0' });
    expect(notification).toHaveBeenCalledWith(expect.objectContaining({ title: 'notification.update.readyTitle', type: 'update-ready', updateVersion: '2.0' }));
    expect(JSON.parse(network.netFetch.mock.calls[0][1]?.body ?? '{}')).toEqual({ appName: 'eisland', version: '2.0' });
  });
  it.each(['toolbox', 'settings', 'urlFavorites', 'clipboardHistory', 'aiChat'] as const)('可见应用 %s 页抑制剪贴板 URL', async (maxExpandTab) => {
    await mount(); useIslandStore.setState({ maxExpandTab, state: 'maxExpand' }); await emit('onClipboardUrlsDetected', { urls: ['https://example.com'], title: '' });
    expect(notification).not.toHaveBeenCalled();
  });
  it.each(['urlFavorites', 'clipboardHistory', 'aiChat'] as const)('显式关闭收藏页抑制仍产生 URL 通知：%s', async (maxExpandTab) => {
    await mount(); storage.set(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, '0'); useIslandStore.setState({ maxExpandTab, state: 'maxExpand' });
    await emit('onClipboardUrlsDetected', { urls: ['https://example.com/path'], title: '' });
    expect(notification).toHaveBeenCalledWith(expect.objectContaining({ body: 'example.com', icon: 'https://example.com/favicon.ico', urls: ['https://example.com/path'] }));
  });
  it.each([
    ['idle', false, false, 'urlFavorites'], ['maxExpand', true, true, 'settings'], ['maxExpand', true, false, 'todo'], ['maxExpand', false, true, 'todo'],
  ] as const)('状态 %s/应用模式 %s/启动器 %s/页 %s 决定可见性', async (state, maxExpandAppModeEnabled, maxExpandLauncherVisible, maxExpandTab) => {
    await mount(); storage.set(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, '1'); useIslandStore.setState({ state, maxExpandAppModeEnabled, maxExpandLauncherVisible, maxExpandTab });
    await emit('onClipboardUrlsDetected', { urls: ['https://example.com'], title: 'Custom title' });
    expect(notification).toHaveBeenCalledWith(expect.objectContaining({ body: 'Custom title' }));
  });
  it('非法 URL 回退原始值与链接图标，存储读取异常不阻断', async () => {
    await mount(); vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); } });
    await emit('onClipboardUrlsDetected', { urls: ['invalid-link'], title: '' });
    expect(notification).toHaveBeenCalledWith(expect.objectContaining({ body: 'invalid-link', icon: SvgIcon.LINK }));
  });
  it('切换语言重订阅，卸载清理所有原生订阅', async () => {
    await mount(); const previous = [...cleanups.values()];
    renderWithHooks(() => useIslandNotificationSubscriptions({ ...input, language: 'en-US' })); runEffects();
    previous.forEach((cleanup) => { expect(cleanup).toHaveBeenCalledOnce(); });
    unmountHooks(); expect(listeners.size).toBe(0); [...cleanups.values()].forEach((cleanup) => { expect(cleanup).toHaveBeenCalledOnce(); });
  });
  it('可选原生订阅 API 缺失仍可初始化和清理', async () => {
    vi.stubGlobal('window', { api: { storeRead, onSourceSwitchRequest: subscriptionApi.onSourceSwitchRequest } });
    await mount(); expect(listeners.size).toBe(1); unmountHooks(); expect(listeners.size).toBe(0);
  });
  it('初始化开关请求后 API 被移除时可选订阅与清理仍安全', async () => {
    renderWithHooks(() => useIslandNotificationSubscriptions(input));
    // 先注册真实存储请求；后续原生能力在窗口关闭时不可用。
    runEffects(); await settle(); vi.stubGlobal('window', {});
    renderWithHooks(() => useIslandNotificationSubscriptions({ ...input, language: undefined })); runEffects();
    unmountHooks(); expect(listeners.size).toBe(0);
  });
});
