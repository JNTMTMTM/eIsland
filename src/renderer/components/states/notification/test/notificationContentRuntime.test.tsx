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
 * @file notificationContentRuntime.test.tsx
 * @description 通知真实收藏、进度、类型重置 Hook 联合运行，覆盖更新、天气、CLI、剪贴板操作与失败回退。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, translationProbe, unmountHook } from '../../../hooks/test/startupHookHarness';
import { byClass, elements, find, invoke, text, type TreeElement } from '../../test/tree';
import type { NotificationContentProps, DownloadProgressData, UrlFavoriteItem } from '../config/notificationTypes';
import type { NotificationData } from '../../../../store/types';
const model = vi.hoisted(() => ({
  store: {
    setIdle: vi.fn(),
    setLyrics: vi.fn(),
    setNotification: vi.fn<(data: NotificationData) => void>(),
    setMaxExpand: vi.fn(),
    setMaxExpandTab: vi.fn(),
    setCli: vi.fn(),
    setCliProvider: vi.fn(),
    isMusicPlaying: false,
    coverImage: '',
    syncedLyrics: [] as string[] | undefined,
    lyricsLoading: false
  },
  token: vi.fn<() => string | null>(),
  source: vi.fn<typeof import('../../../../api/user/userAccountApi.profile').fetchUpdateSourceUrl>()
}));
vi.mock('../../../../store/slices', () => ({
  default: Object.assign(() => model.store, {
    getState: () => model.store
  })
}));
vi.mock('../../../../utils/userAccount', () => ({
  readLocalToken: model.token
}));
vi.mock('../../../../api/user/userAccountApi', () => ({
  fetchUpdateSourceUrl: model.source
}));
const {
  NotificationContent
} = await import('../NotificationContent');
const {
  SvgIcon
} = await import('../../../../utils/SvgIcon');
let props: NotificationContentProps;
let storage: Record<string, unknown>;
let local: Map<string, string>;
let localStorageLeaf: ReturnType<typeof browserStorage>;
let api: ReturnType<typeof bridge>;
let progress: ((data: DownloadProgressData) => void) | undefined;
let surface: EventTarget & {
  api?: ReturnType<typeof bridge>;
  setTimeout: typeof setTimeout;
  location: {
    href: string;
  };
};
/** 建立本地存储叶。
 * @returns 浏览器存储叶实现
 */
function browserStorage() {
  return {
    getItem: vi.fn((key: string) => local.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      local.set(key, value);
    })
  };
}
/** 创建桥接叶。
 * @returns 更新、媒体及持久化接口
 */
function bridge() {
  return {
    storeRead: vi.fn((key: string): Promise<unknown> => Promise.resolve(storage[key])),
    storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>(() => Promise.resolve()),
    updaterDownload: vi.fn<(source: string, url?: string) => Promise<boolean>>(() => Promise.resolve(true)),
    updaterInstall: vi.fn<() => Promise<boolean>>(() => Promise.resolve(true)),
    updaterCheck: vi.fn<(source?: string, url?: string) => Promise<boolean>>(() => Promise.resolve(true)),
    restartApp: vi.fn<() => Promise<void>>(() => Promise.resolve()),
    mediaAcceptSourceSwitch: vi.fn(),
    mediaRejectSourceSwitch: vi.fn(),
    cliGlowHide: vi.fn(),
    clipboardOpenUrl: vi.fn(),
    clipboardUrlBlacklistAddDomain: vi.fn<(hostname: string) => Promise<void>>(() => Promise.resolve()),
    onUpdaterProgress: vi.fn((callback: (data: DownloadProgressData) => void) => {
      progress = callback;
      return vi.fn();
    })
  };
}
/** 读取真实组件状态。
 * @returns 返回树
 */
function run(): TreeElement {
  return renderHook(NotificationContent, props) as TreeElement;
}
/** 提交真实 Hook 效果与异步请求。
 * @returns 当前树
 */
async function mount(): Promise<TreeElement> {
  run();
  flushHookEffects();
  await settleHook();
  const tree = run();
  flushHookEffects();
  return tree;
}
/** 定位实际动作按钮。
 * @param key - 翻译动作键
 * @returns 元素
 */
function action(key: string): TreeElement {
  return find(run(), (node) => node.type === 'button' && text(node) === `notification.actions.${  key}`);
}
/** 用真实动作触发并等待异步处理。
 * @param key - 动作
 */
async function click(key: string): Promise<void> {
  invoke(action(key), 'onClick');
  await settleHook();
}
/** 创建远端收藏数据。
 * @param url - URL
 * @returns 真实有效收藏行
 */
function favorite(url = 'https://example.com'): UrlFavoriteItem {
  return {
    url,
    id: 1,
    title: 'Saved',
    note: '',
    createdAt: 1
  };
}
beforeEach(() => {
  resetHook();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  props = {
    title: 'Title',
    body: 'Body'
  };
  storage = {
    'update-source': 'github',
    'url-favorites': []
  };
  local = new Map();
  localStorageLeaf = browserStorage();
  api = bridge();
  progress = undefined;
  Object.assign(model.store, {
    isMusicPlaying: false,
    coverImage: '',
    syncedLyrics: [],
    lyricsLoading: false
  });
  model.token.mockReturnValue('token');
  model.source.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: {
      url: 'https://update.example/latest'
    }
  });
  surface = Object.assign(new EventTarget(), {
    api,
    setTimeout,
    location: {
      href: 'https://island.example/index.html'
    }
  });
  vi.stubGlobal('window', surface);
  vi.stubGlobal('localStorage', localStorageLeaf);
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('NotificationContent real hooks', () => {
  it.each([[false, 'cover', undefined, false, false], [true, '', [], false, false], [true, 'cover', undefined, false, false], [true, 'cover', [], true, true], [true, 'cover', ['lyric'], false, true]] as const)('dismiss music=%s cover=%s lyrics=%s loading=%s', async (playing, cover, lyrics, loading, expectLyrics) => {
    Object.assign(model.store, {
      isMusicPlaying: playing,
      coverImage: cover,
      syncedLyrics: lyrics ? [...lyrics] : undefined,
      lyricsLoading: loading
    });
    await mount();
    expect(elements(run()).some((node) => node.props.className === 'notification-icon-default')).toBe(true);
    await click('complete');
    expect(model.store.setLyrics).toHaveBeenCalledTimes(expectLyrics ? 1 : 0);
    expect(model.store.setIdle).toHaveBeenCalledTimes(expectLyrics ? 0 : 1);
    await click('ignore');
    expect(model.store.setLyrics).toHaveBeenCalledTimes(expectLyrics ? 2 : 0);
  });
  it.each([['snooze5m', 5], ['snooze15m', 15], ['snooze1h', 60]] as const)('snoozes %s with reminder event and original notification', async (key, minutes) => {
    props.breakReminderItemId = 'break';
    const snooze = vi.fn();
    surface.addEventListener('break-reminder-snooze', snooze);
    await mount();
    await click(key);
    expect((snooze.mock.calls[0][0] as CustomEvent<{
      itemId: string;
      snoozeMinutes: number;
    }>).detail).toEqual({
      itemId: 'break',
      snoozeMinutes: minutes
    });
    vi.advanceTimersByTime(minutes * 60000);
    expect(model.store.setNotification).toHaveBeenCalledWith({
      title: 'Title',
      body: 'Body',
      icon: undefined,
      breakReminderItemId: 'break'
    });
  });
  it('ordinary snooze without reminder id still reschedules and dismisses', async () => {
    await mount();
    await click('snooze5m');
    vi.advanceTimersByTime(300000);
    expect(model.store.setNotification).toHaveBeenCalledTimes(1);
  });
  it('source-switch actions accept/reject and optional bridge can disappear safely', async () => {
    props.type = 'source-switch';
    await mount();
    await click('switch');
    await click('ignore');
    expect(api.mediaAcceptSourceSwitch).toHaveBeenCalledTimes(1);
    expect(api.mediaRejectSourceSwitch).toHaveBeenCalledTimes(1);
    surface.api = undefined;
    await click('switch');
    await click('ignore');
    expect(model.store.setIdle).toHaveBeenCalledTimes(4);
  });
  it('ready update install rejection is contained and later dismisses', async () => {
    props.type = 'update-ready';
    props.updateVersion = '2.0';
    props.icon = './svg/update.svg';
    await mount();
    expect(text(run())).toContain('v2.0');
    expect(byClass(run(), 'notification-icon-img').props.className).toContain('--vector');
    invoke(byClass(run(), 'notification-icon-img'), 'onError');
    api.updaterInstall.mockRejectedValueOnce(new Error('install'));
    await click('installRestart');
    await click('later');
    expect(model.store.setIdle).toHaveBeenCalledTimes(2);
    surface.api = undefined;
    await click('installRestart');
  });
  it('restart now/later tolerate missing optional method and rejection', async () => {
    props.type = 'restart-required';
    await mount();
    api.restartApp.mockRejectedValueOnce(new Error('restart'));
    await click('restartNow');
    await click('later');
    surface.api = {
      ...api,
      restartApp: undefined
    } as unknown as ReturnType<typeof bridge>;
    await click('restartNow');
    surface.api = undefined;
    await click('restartNow');
    expect(model.store.setIdle).toHaveBeenCalledTimes(4);
  });
  it.each([undefined, '  ', 'not-a-date', '2026-10-06T12:34:00'] as const)('formats weather metadata %s and continues source check', async (time) => {
    props.type = 'weather-alert-startup';
    props.weatherAlertTime = time;
    props.startupUpdateSource = 'github';
    props.startupUpdateResolvedUrl = 'https://source.example';
    await mount();
    let expected = '10-06 12:34';
    if (time === undefined || time === '  ') expected = 'notification.weatherAlert.timeUnknown';
    else if (time === 'not-a-date') expected = time;
    expect(text(run())).toContain(expected);
    api.updaterCheck.mockRejectedValueOnce(new Error('offline'));
    await click('closeAndContinueUpdateCheck');
    expect(api.updaterCheck).toHaveBeenCalledWith('github', 'https://source.example');
    surface.api = undefined;
    await click('closeAndContinueUpdateCheck');
  });
  it.each(['external-agent-active', 'external-agent-stopped'] as const)('dismisses %s status', async (type) => {
    props.type = type;
    await mount();
    await click('gotIt');
    expect(model.store.setIdle).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, 'codex'] as const)('CLI provider %s controls both destinations and hide/ignore', async (provider) => {
    props.type = 'cli-session-detected';
    props.cliProvider = provider;
    await mount();
    await click('switch');
    await click('switchCliState');
    await click('ignore');
    expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('cli');
    expect(model.store.setCli).toHaveBeenCalledTimes(1);
    expect(model.store.setCliProvider).toHaveBeenCalledTimes(provider ? 2 : 0);
    surface.api = undefined;
    await click('switch');
    await click('switchCliState');
    await click('ignore');
  });
  it('download progress uses percent/fallback, speed/unknown and clamps values with real hook subscription', async () => {
    props.type = 'update-downloading';
    await mount();
    expect(text(run())).toContain('notification.update.downloadingPreparing');
    progress?.({
      total: 0,
      transferred: 0,
      percent: 0,
      bytesPerSecond: 0
    });
    expect(text(run())).toContain('notification.update.downloadingPreparing');
    progress?.({
      total: 100,
      transferred: 50,
      percent: 0,
      bytesPerSecond: 10
    });
    run();
    expect(translationProbe).toHaveBeenCalledWith('notification.update.downloadingBodyProgress', expect.objectContaining({
      percent: '50.0%',
      speed: '10 B/s',
      eta: '00:05'
    }));
    progress?.({
      total: 100,
      transferred: 200,
      percent: 200,
      bytesPerSecond: 0
    });
    run();
    expect(translationProbe).toHaveBeenCalledWith('notification.update.downloadingBodyProgress', expect.objectContaining({
      percent: '100.0%',
      speed: 'notification.update.downloadingSpeedUnknown',
      eta: 'notification.update.downloadingEtaUnknown'
    }));
    await click('hide');
    props.type = 'default';
    run();
    flushHookEffects();
    expect(api.onUpdaterProgress.mock.results[0].value).toHaveBeenCalledTimes(1);
    expect(text(run())).toContain('Body');
  });
  it('missing optional progress subscription/bridge is safe', async () => {
    props.type = 'update-downloading';
    surface.api = undefined;
    await mount();
    unmountHook();
    resetHook();
    surface.api = {} as ReturnType<typeof bridge>;
    await mount();
    unmountHook();
  });
  it.each(['success', 'false', 'reject'] as const)('normal update download %s handles source and failure notification', async (result) => {
    props.type = 'update-available';
    props.updateVersion = '2';
    props.updateSourceLabel = 'GitHub';
    await mount();
    if (result === 'false') api.updaterDownload.mockResolvedValueOnce(false);
    if (result === 'reject') api.updaterDownload.mockRejectedValueOnce(new Error('download'));
    await click('downloadNow');
    expect(api.updaterDownload).toHaveBeenCalledWith('github');
    expect(model.store.setNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'update-downloading',
      updateVersion: '2'
    }));
    expect(model.store.setNotification).toHaveBeenCalledTimes(result === 'success' ? 1 : 2);
  });
  it('store-read rejection and absent bridge use fallback updater source', async () => {
    props.type = 'update-available';
    await mount();
    api.storeRead.mockRejectedValueOnce(new Error('read'));
    await click('downloadNow');
    expect(api.updaterDownload).toHaveBeenCalledWith('cloudflare-r2');
    surface.api = undefined;
    await click('downloadNow');
    expect(model.store.setNotification).toHaveBeenLastCalledWith(expect.objectContaining({
      body: 'settings.update.downloadFailed'
    }));
  });
  it('pro source without login stops before resolve/download', async () => {
    props.type = 'update-available';
    storage['update-source'] = 'tencent-cos';
    model.token.mockReturnValue(null);
    await mount();
    await click('downloadNow');
    expect(model.source).not.toHaveBeenCalled();
    expect(api.updaterDownload).not.toHaveBeenCalled();
    expect(model.store.setNotification).toHaveBeenLastCalledWith(expect.objectContaining({
      body: 'settings.update.proOnlyNeedLogin'
    }));
  });
  it.each([{
    ok: false,
    code: 403,
    message: 'denied'
  }, {
    ok: true,
    code: 200,
    message: ''
  }, {
    ok: true,
    code: 200,
    message: '',
    data: {
      url: ''
    }
  }])('pro source resolve response %j never downloads without a URL', async (response) => {
    props.type = 'update-available';
    storage['update-source'] = 'aliyun-oss';
    model.source.mockResolvedValue(response);
    await mount();
    await click('downloadNow');
    expect(api.updaterDownload).not.toHaveBeenCalled();
    expect(model.store.setNotification).toHaveBeenLastCalledWith(expect.objectContaining({
      body: response.message || 'settings.update.sourceResolveFailed',
      type: 'update-available'
    }));
  });
  it.each(['success', 'false', 'reject', 'gone'] as const)('pro download %s preserves resolved URL and failure path', async (result) => {
    props.type = 'update-available';
    storage['update-source'] = 'aliyun-oss';
    await mount();
    if (result === 'false') api.updaterDownload.mockResolvedValueOnce(false);
    if (result === 'reject') api.updaterDownload.mockRejectedValueOnce(new Error('fail'));
    if (result === 'gone') {model.source.mockImplementationOnce(() => {
      surface.api = undefined;
      return Promise.resolve({
        ok: true,
        code: 200,
        message: '',
        data: {
          url: 'https://update.example/latest'
        }
      });
    });}
    await click('downloadNow');
    if (result !== 'gone') expect(api.updaterDownload).toHaveBeenCalledWith('aliyun-oss', 'https://update.example/latest');
    expect(model.store.setNotification).toHaveBeenCalledTimes(result === 'success' ? 1 : 2);
  });
  it('update settings handles write failure and missing bridge', async () => {
    props.type = 'update-available';
    await mount();
    api.storeWrite.mockRejectedValueOnce(new Error('write'));
    await click('configureUpdateSource');
    expect(api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'update');
    expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('settings');
    surface.api = undefined;
    await click('configureUpdateSource');
    await click('ignore');
  });
  it('clipboard navigation wraps, resets favicon for new URL, truncates long URLs and opens all', async () => {
    props.type = 'clipboard-url';
    props.urls = ['https://pyisland.com', `https://sub.pyisland.com/${  'x'.repeat(60)}`];
    await mount();
    expect(text(run())).toContain('notification.clipboard.officialBadge');
    invoke(find(run(), (node) => node.props['aria-label'] === 'notification.clipboard.prevUrl'), 'onClick');
    run();
    flushHookEffects();
    expect(text(run())).toContain('2/2');
    expect(text(run())).toContain('…');
    invoke(find(run(), (node) => node.props['aria-label'] === 'notification.clipboard.nextUrl'), 'onClick');
    run();
    flushHookEffects();
    expect(text(run())).toContain('1/2');
    await click('openAllLinks');
    expect(api.clipboardOpenUrl.mock.calls).toEqual(props.urls.map((url) => [url]));
    const target = {
      style: {
        display: ''
      }
    };
    invoke(byClass(run(), 'notification-url-favicon'), 'onError', {
      target
    });
    expect(target.style.display).toBe('none');
    invoke(byClass(run(), 'notification-action-url'), 'onClick');
    expect(api.clipboardOpenUrl).toHaveBeenLastCalledWith('https://pyisland.com');
  });
  it('clipboard favicon errors try candidates then real vector fallback and type reset clears it', async () => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    await mount();
    const candidates: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      candidates.push(String(byClass(run(), 'notification-icon-img').props.src));
      invoke(byClass(run(), 'notification-icon-img'), 'onError');
      run();
      flushHookEffects();
    }
    expect(new Set(candidates).size).toBe(3);
    expect(byClass(run(), 'notification-icon-img').props.src).toBe(new URL(SvgIcon.LINK, surface.location.href).toString());
    props.type = 'default';
    props.icon = './svg/agent/claude.svg';
    run();
    flushHookEffects();
    expect(byClass(run(), 'notification-icon-img').props.className).not.toContain('--vector');
  });
  it('missing clipboard URLs, invalid host and empty body keep safe fallback icons/body', async () => {
    props.type = 'clipboard-url';
    await mount();
    expect(text(run())).toContain('Body');
    props.urls = ['not a url'];
    props.body = '';
    run();
    flushHookEffects();
    await settleHook();
    expect(text(run())).toContain('not a url');
    expect(elements(run()).some((node) => node.props.className === 'notification-icon-default')).toBe(true);
    props.icon = './svg/link.svg';
    run();
    flushHookEffects();
    expect(byClass(run(), 'notification-icon-img').props.src).toContain('/svg/link.svg');
  });
  it('single clipboard opening/blacklist use real host and missing bridge remains safe', async () => {
    props.type = 'clipboard-url';
    props.urls = ['https://EXAMPLE.com/path'];
    await mount();
    await click('openLink');
    expect(api.clipboardOpenUrl).toHaveBeenCalledWith(props.urls[0]);
    await click('addBlacklist');
    expect(api.clipboardUrlBlacklistAddDomain).toHaveBeenCalledWith('example.com');
    surface.api = undefined;
    await click('openLink');
    await click('addBlacklist');
    await click('ignore');
  });
  it('external URL array shrink makes old rendered navigation and open-all callbacks safe', async () => {
    const urls = ['https://example.com', 'https://other.example'];
    props.type = 'clipboard-url';
    props.urls = urls;
    await mount();
    const previous = find(run(), (node) => node.props['aria-label'] === 'notification.clipboard.prevUrl');
    const next = find(run(), (node) => node.props['aria-label'] === 'notification.clipboard.nextUrl');
    const open = action('openAllLinks');
    urls.length = 0;
    invoke(previous, 'onClick');
    invoke(next, 'onClick');
    invoke(open, 'onClick');
    expect(api.clipboardOpenUrl).not.toHaveBeenCalled();
    expect(text(run())).toContain('Body');
  });
  it('empty or whitespace current URL cannot be favorited', async () => {
    props.type = 'clipboard-url';
    props.urls = [''];
    await mount();
    await click('favorite');
    expect(api.storeWrite).not.toHaveBeenCalled();
    props.urls = ['  '];
    run();
    flushHookEffects();
    await settleHook();
    await click('favorite');
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
  it('initial remote favorites override local fallback and render a jump badge', async () => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    storage['url-favorites'] = [favorite()];
    local.set('eIsland_url_favorites', '{');
    await mount();
    expect(elements(run()).some((node) => node.props.className === 'notification-favorited-badge')).toBe(true);
    expect(localStorageLeaf.getItem).not.toHaveBeenCalled();
  });
  it.each(['valid', 'corrupt'] as const)('initial empty remote falls back to %s local cache', async (mode) => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    local.set('eIsland_url_favorites', mode === 'valid' ? JSON.stringify([favorite()]) : '{');
    await mount();
    expect(elements(run()).some((node) => node.props.className === 'notification-favorited-badge')).toBe(mode === 'valid');
  });
  it.each(['valid', 'empty', 'corrupt'] as const)('initial remote rejection loads %s local cache', async (mode) => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    if (mode === 'valid') local.set('eIsland_url_favorites', JSON.stringify([favorite()]));
    if (mode === 'corrupt') local.set('eIsland_url_favorites', '{');
    api.storeRead.mockRejectedValueOnce(new Error('initial read'));
    await mount();
    expect(elements(run()).some((node) => node.props.className === 'notification-favorited-badge')).toBe(mode === 'valid');
  });
  it.each(['remote', 'local', 'corrupt'] as const)('cancelled initial favorites %s response does not alter later notification', async (mode) => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    const pending = deferred<unknown>();
    api.storeRead.mockReturnValueOnce(pending.promise);
    run();
    flushHookEffects();
    props.type = 'default';
    run();
    flushHookEffects();
    if (mode === 'remote') pending.resolve([favorite()]);else {
      local.set('eIsland_url_favorites', mode === 'corrupt' ? '{' : JSON.stringify([favorite()]));
      pending.reject(new Error('late'));
    }
    await settleHook();
    expect(text(run())).toContain('Body');
  });
  it('favorites persist normalized URL/title then jump with focus and tolerate localStorage failure', async () => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    await mount();
    await click('favorite');
    expect(api.storeWrite).toHaveBeenCalledWith('url-favorites', expect.arrayContaining([expect.objectContaining({
      url: 'https://example.com',
      title: 'Body'
    })]));
    invoke(byClass(run(), 'notification-favorited-badge'), 'onClick');
    expect(localStorageLeaf.setItem).toHaveBeenCalledWith('url-favorites-focus-url', 'https://example.com');
    expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('urlFavorites');
    localStorageLeaf.setItem.mockImplementationOnce(() => {
      throw new Error('local write');
    });
    invoke(byClass(run(), 'notification-favorited-badge'), 'onClick');
    expect(model.store.setMaxExpand).toHaveBeenCalledTimes(2);
  });
  it('favorite title falls back to URL when body is blank or the URL itself', async () => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    props.body = 'https://example.com';
    await mount();
    await click('favorite');
    expect(api.storeWrite).toHaveBeenCalledWith('url-favorites', expect.arrayContaining([expect.objectContaining({
      url: 'https://example.com',
      title: 'https://example.com'
    })]));
  });
  it('remote duplicate found after click updates badge without writing duplicate', async () => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    await mount();
    api.storeRead.mockResolvedValueOnce([favorite()]);
    await click('favorite');
    expect(api.storeWrite).not.toHaveBeenCalled();
    expect(elements(run()).some((node) => node.props.className === 'notification-favorited-badge')).toBe(true);
  });
  it.each(['empty', 'existing', 'duplicate', 'corrupt'] as const)('favorite read failure uses local fallback %s', async (mode) => {
    props.type = 'clipboard-url';
    props.urls = ['https://example.com'];
    await mount();
    if (mode === 'existing') local.set('eIsland_url_favorites', JSON.stringify([favorite('https://other.example')]));
    if (mode === 'duplicate') local.set('eIsland_url_favorites', JSON.stringify([favorite()]));
    if (mode === 'corrupt') local.set('eIsland_url_favorites', '{');
    api.storeRead.mockRejectedValueOnce(new Error('read'));
    await click('favorite');
    expect(elements(run()).some((node) => node.props.className === 'notification-favorited-badge')).toBe(true);
    expect(api.storeWrite).toHaveBeenCalledTimes(mode === 'duplicate' || mode === 'corrupt' ? 0 : 1);
  });
});
