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
 * @file useMail.test.ts
 * @description 邮件真实账户读取、内存缓存、原生请求竞争、超时、详情与导航生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMail } from '../useMail';
import useIslandStore from '../../../../../../../store/slices';
import { clearInboxMemoryCache, getInboxMemoryCache, updateInboxMemoryCache } from '../../utils/mailUtils';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import type { MailAccountConfig, MailInboxItem } from '../../types/mailTypes';

const translate = vi.hoisted(() => {
  const localStorage = { getItem: () => null, setItem: () => undefined };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage, api: {}, location: { hostname: 'app' } }));
  return vi.fn<(key: string) => string>((key) => key);
});
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: translate })
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks,
  /**
   * 按公开快照读取真实 Zustand store，手动渲染由生命周期工具驱动。
   * @param subscribe - React 外部状态订阅入口。
   * @param getSnapshot - Zustand 提供的真实快照函数。
   * @returns 当前 store 快照。
   */
  useSyncExternalStore<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
    void subscribe;
    return getSnapshot();
  },
  useDebugValue: vi.fn()
}));

const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  storeWrite: vi.fn<Window['api']['storeWrite']>(),
  mailInboxList: vi.fn<Window['api']['mailInboxList']>(),
  clipboardOpenUrl: vi.fn<Window['api']['clipboardOpenUrl']>()
};
const values = new Map<string, unknown>();
let surface: EventTarget;
const first: MailAccountConfig = { id: 'first', label: 'First', emailAddress: 'first@test', imapHost: 'imap.test', imapPort: '993', imapSecure: true, authUser: 'first', authSecret: 'secret' };
const second: MailAccountConfig = { ...first, id: 'second', label: 'Second', authUser: 'second' };
const message: MailInboxItem = { uid: '1', subject: 'Subject', from: 'author@test', to: 'first@test', date: '2026-1-2', size: 100, preview: 'Preview', body: 'Body' };

/**
 * 渲染真实 Hook，保留账户和邮件请求更新的状态。
 * @returns 当前邮件状态和公开操作。
 */
function view() {
  return renderWithHooks(useMail);
}

/**
 * 等待真实账户读取和原生收件箱 Promise 竞争。
 * @returns 队列处理完成。
 */
async function settle(): Promise<void> {
  await Array.from({ length: 15 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
}

/**
 * 提交真实 effect 并消费初始化回调。
 * @returns 已初始化状态。
 */
async function commit(): Promise<ReturnType<typeof view>> {
  view();
  runEffects();
  await settle();
  return view();
}

/**
 * 构造原生请求的真实可控 Promise。
 * @returns Promise 和成功/失败完成入口。
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

/**
 * 从 Zustand 的公开订阅契约读取真实快照。
 * @param subscribe - React 订阅入口。
 * @param getSnapshot - 真实状态快照。
 * @returns 当前状态。
 */
function snapshot<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
  void subscribe;
  return getSnapshot();
}

beforeEach(async () => {
  resetLifecycle();
  const react = await vi.importActual<typeof import('react') & { default: typeof import('react') }>('react');
  vi.spyOn(react.default, 'useCallback').mockImplementation((callback, dependencies) => lifecycleHooks.useCallback(callback, dependencies));
  vi.spyOn(react.default, 'useSyncExternalStore').mockImplementation(snapshot);
  vi.spyOn(react.default, 'useDebugValue').mockImplementation(() => undefined);
  clearInboxMemoryCache();
  vi.useFakeTimers();
  vi.clearAllMocks();
  values.clear();
  values.set('mail-accounts-config', [first, second]);
  values.set('mail-fetch-limit', 30);
  api.storeRead.mockReset().mockImplementation((key) => Promise.resolve(values.get(key)));
  api.storeWrite.mockReset().mockResolvedValue(true);
  api.mailInboxList.mockReset().mockResolvedValue({ ok: true, message: '', items: [message] });
  api.clipboardOpenUrl.mockReset().mockResolvedValue(true);
  surface = new EventTarget();
  vi.stubGlobal('window', Object.assign(surface, { api }));
  useIslandStore.setState({ maxExpandTab: 'memo', maxExpandLauncherVisible: true });
});
afterEach(() => {
  unmountHooks();
  clearInboxMemoryCache();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Mail account configuration and navigation', () => {
  it('loads native account and fetch-limit data, warms the real cache and opens settings through the real store', async () => {
    expect(view().mailConfigured).toBeNull();
    await commit();
    expect(view().configuredAccounts).toEqual([first, second]);
    expect(view().activeAccount).toEqual(first);
    expect(view().mailConfigured).toBe(true);
    expect(api.mailInboxList).toHaveBeenCalledWith({ emailAddress: first.emailAddress, imapHost: first.imapHost, imapPort: first.imapPort, imapSecure: first.imapSecure, authUser: first.authUser, authSecret: first.authSecret }, 30);
    expect(getInboxMemoryCache()).toEqual([message]);
    api.storeWrite.mockRejectedValue(new Error('write unavailable'));
    view().goMailSettings();
    await settle();
    expect(api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'mail');
    expect(useIslandStore.getState().maxExpandTab).toBe('settings');
    expect(useIslandStore.getState().maxExpandLauncherVisible).toBe(false);
  });

  it.each(['none', 'unconfigured', 'read failure'])('handles account state %s without fetching', async (mode) => {
    if (mode === 'none') values.set('mail-accounts-config', []);
    if (mode === 'unconfigured') values.set('mail-accounts-config', [{ ...first, authSecret: '' }]);
    if (mode === 'read failure') api.storeRead.mockRejectedValue(new Error('store unavailable'));
    await commit();
    expect(view().mailConfigured).toBe(false);
    expect(view().activeAccount).toBeNull();
    expect(api.mailInboxList).not.toHaveBeenCalled();
    view().refreshInbox();
    expect(api.mailInboxList).not.toHaveBeenCalled();
  });

  it('reads a legacy account and uses configured fallback for an unknown switched account ID', async () => {
    values.set('mail-accounts-config', []);
    values.set('mail-account-config', first);
    await commit();
    expect(view().activeAccount?.id).toBe('legacy');
    view().switchAccount({ ...second, id: 'unknown-runtime-account' });
    expect(view().activeAccount?.id).toBe('legacy');
    await settle();
    expect(view().inbox).toEqual([message]);
  });

  it('ignores native account initialization resolving after unmount', async () => {
    const pending = deferred<unknown>();
    api.storeRead.mockReturnValue(pending.promise);
    const remove = vi.spyOn(surface, 'removeEventListener');
    view();
    runEffects();
    unmountHooks();
    pending.resolve([first]);
    await settle();
    expect(api.mailInboxList).not.toHaveBeenCalled();
    expect(view().mailConfigured).toBeNull();
    expect(remove).toHaveBeenCalledWith('message', expect.any(Function));
  });
});

describe('Mail refresh, selected details and native races', () => {
  it('restores memory cache immediately, toggles details and retains only matching refreshed selections', async () => {
    updateInboxMemoryCache([message]);
    expect(view().inbox).toEqual([message]);
    expect(view().selectedItem).toBeNull();
    view().toggleInboxItem('missing');
    expect(view().selectedItem).toBeNull();
    view().toggleInboxItem('1');
    expect(view().selectedItem).toEqual(message);
    expect(view().hasSplit).toBe(true);
    await commit();
    expect(view().expandedUid).toBe('1');
    view().toggleInboxItem('1');
    expect(view().hasSplit).toBe(false);
    view().toggleInboxItem('1');
    api.mailInboxList.mockResolvedValue({ ok: true, message: '', items: [{ ...message, uid: '2' }] });
    view().refreshInbox(undefined, 5);
    await settle();
    expect(view().expandedUid).toBeNull();
    expect(view().inbox[0].uid).toBe('2');
    expect(api.mailInboxList).toHaveBeenLastCalledWith(expect.any(Object), 5);
  });

  it('switches accounts, clears selection/cache while pending and rejects unconfigured explicit refreshes', async () => {
    await commit();
    view().toggleInboxItem('1');
    const pending = deferred<Awaited<ReturnType<typeof api.mailInboxList>>>();
    api.mailInboxList.mockReturnValueOnce(pending.promise);
    view().switchAccount(second);
    expect(view().activeAccount).toEqual(second);
    expect(view().expandedUid).toBeNull();
    expect(view().inbox).toEqual([]);
    expect(getInboxMemoryCache()).toEqual([]);
    expect(view().loadingInbox).toBe(true);
    pending.resolve({ ok: true, message: '', items: [{ ...message, uid: '2' }] });
    await settle();
    expect(view().inbox[0].uid).toBe('2');
    const before = api.mailInboxList.mock.calls.length;
    view().refreshInbox({ ...first, authSecret: '' });
    expect(api.mailInboxList).toHaveBeenCalledTimes(before);
  });

  it.each(['unsuccessful', 'network failure', 'timeout'])('preserves prior successful cache after %s', async (failure) => {
    await commit();
    if (failure === 'unsuccessful') api.mailInboxList.mockResolvedValue({ ok: false, message: 'rejected', items: [] });
    if (failure === 'network failure') api.mailInboxList.mockRejectedValue(new Error('network failure'));
    if (failure === 'timeout') api.mailInboxList.mockReturnValue(new Promise(() => undefined));
    view().refreshInbox();
    expect(view().loadingInbox).toBe(true);
    if (failure === 'timeout') vi.advanceTimersByTime(20_000);
    await settle();
    expect(view().loadingInbox).toBe(false);
    expect(view().inbox).toEqual([message]);
    expect(getInboxMemoryCache()).toEqual([message]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('drops stale native success without changing newer data or stopping a pending new request', async () => {
    await commit();
    const older = deferred<Awaited<ReturnType<typeof api.mailInboxList>>>();
    const newer = deferred<Awaited<ReturnType<typeof api.mailInboxList>>>();
    api.mailInboxList.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    view().refreshInbox();
    view().refreshInbox(second);
    older.resolve({ ok: true, message: '', items: [{ ...message, uid: 'obsolete' }] });
    await settle();
    expect(view().loadingInbox).toBe(true);
    expect(view().inbox).toEqual([message]);
    newer.resolve({ ok: true, message: '', items: [{ ...message, uid: 'latest' }] });
    await settle();
    expect(view().inbox[0].uid).toBe('latest');
    expect(getInboxMemoryCache()[0].uid).toBe('latest');
    expect(view().loadingInbox).toBe(false);
  });
});

describe('Mail iframe message lifecycle', () => {
  it('ignores malformed messages and delegates valid URLs to the native bridge with failure handling', async () => {
    await commit();
    [null, {}, { type: 'unknown', url: 'https://ignored' }, { type: 'mail-open-url', url: 1 }].forEach((data) => surface.dispatchEvent(new MessageEvent('message', { data })));
    expect(api.clipboardOpenUrl).not.toHaveBeenCalled();
    api.clipboardOpenUrl.mockRejectedValue(new Error('browser unavailable'));
    surface.dispatchEvent(new MessageEvent('message', { data: { type: 'mail-open-url', url: 'https://mail-link' } }));
    await settle();
    expect(api.clipboardOpenUrl).toHaveBeenCalledWith('https://mail-link');
    unmountHooks();
    surface.dispatchEvent(new MessageEvent('message', { data: { type: 'mail-open-url', url: 'https://late' } }));
    expect(api.clipboardOpenUrl).toHaveBeenCalledOnce();
  });
});
