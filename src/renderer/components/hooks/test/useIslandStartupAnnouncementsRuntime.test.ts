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
 * @file useIslandStartupAnnouncementsRuntime.test.ts
 * @description 启动更新与天气预警真实异步流程、公告去重、引导延后与订阅清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './startupHookHarness';
import type { AnnouncementData, AnnouncementShowMode } from '../../../api/announcement/announcementApi';
import type { StartupWeatherAlertPayload } from '../../../api/weather/types/WeatherAlert';
type Options = Parameters<typeof import('../useIslandStartupAnnouncements').useIslandStartupAnnouncements>[0];
const leaves = vi.hoisted(() => ({
  state: 'expand',
  token: vi.fn<() => string | null>(),
  weather: vi.fn<(token: string) => Promise<StartupWeatherAlertPayload>>(),
  source: vi.fn<typeof import('../../../api/user/userAccountApi.profile').fetchUpdateSourceUrl>(),
  announcements: vi.fn<() => Promise<AnnouncementData[]>>(),
  mode: vi.fn<() => Promise<AnnouncementShowMode>>(),
  last: vi.fn<() => Promise<string>>(),
  write: vi.fn<(value: string) => Promise<void>>()
}));
vi.mock('../../../store/isLandStore', () => ({
  default: {
    getState: () => ({
      state: leaves.state
    })
  }
}));
vi.mock('../../../utils/SvgIcon', () => ({
  SvgIcon: {
    WEATHER: 'weather.svg'
  }
}));
vi.mock('../../../utils/userAccount', () => ({
  readLocalToken: leaves.token
}));
vi.mock('../../../api/weather/weatherApi', () => ({
  fetchStartupWeatherAlerts: leaves.weather
}));
vi.mock('../../../api/user/userAccountApi', () => ({
  fetchUpdateSourceUrl: leaves.source
}));
vi.mock('../../../api/announcement/announcementApi', () => ({
  fetchAnnouncements: leaves.announcements,
  readAnnouncementShowMode: leaves.mode,
  readAnnouncementLastShownAppVersion: leaves.last,
  writeAnnouncementLastShownAppVersion: leaves.write
}));
vi.mock('../../config/dynamicIslandConfig', async () => ({
  ...(await import('../../config/dynamicIslandUpdateSource')),
  ...(await import('../../config/dynamicIslandStorageKeys'))
}));
const {
  useIslandStartupAnnouncements,
  createAnnouncementShownMarker
} = await import('../useIslandStartupAnnouncements');
let startup: (() => void) | undefined;
let unavailable: (() => void) | undefined;
let options: Options;
let store: Record<string, unknown>;
let notification: ReturnType<typeof vi.fn<Options['setNotificationRef']['current']>>;
let api: ReturnType<typeof bridge>;
const bulletin: AnnouncementData = {
  id: 5,
  title: 'Notice',
  content: 'Content',
  updatedAt: 'now'
};
/** 生成真实归一化函数可解析的角色 JWT。
 * @param role - 角色
 * @returns JWT
 */
function token(role: string): string {
  return `header.${Buffer.from(JSON.stringify({
    role
  })).toString('base64url')}.signature`;
}
/** 创建 Electron 桥接叶实现。
 * @returns 注册回调、存储及更新接口
 */
function bridge() {
  return {
    onUpdaterStartupAutoCheckRequest: vi.fn((callback: () => void) => {
      startup = callback;
      return vi.fn();
    }),
    onUpdaterNotAvailable: vi.fn((callback: () => void) => {
      unavailable = callback;
      return vi.fn();
    }),
    storeRead: vi.fn((key: string): Promise<unknown> => Promise.resolve(store[key])),
    updaterCheck: vi.fn<(source: string, url?: string) => Promise<void>>(() => Promise.resolve()),
    updaterVersion: vi.fn<() => Promise<string | undefined>>(() => Promise.resolve('1.0'))
  };
}
/** 提交真实 Hook 生命周期。
 * @returns 完成后处理函数
 */
function mount(): void {
  renderHook(useIslandStartupAnnouncements, options);
  flushHookEffects();
}
/** 调用捕获的原生启动订阅并等待真实 async 回调。
 */
async function triggerStartup(): Promise<void> {
  mount();
  startup?.();
  await settleHook();
}
/** 创建外部天气请求数据。
 * @param title - 标题
 * @param typeName - 类型
 * @param city - 城市
 * @param count - 预警数量
 * @returns API 叶响应
 */
function payload(title = 'Storm', typeName = 'Rain', city = 'Beijing', count = 1): StartupWeatherAlertPayload {
  return {
    location: {
      city,
      latitude: 40,
      longitude: 116
    },
    alerts: Array.from({
      length: count
    }, (...[, index]) => ({
      title,
      typeName,
      id: String(index),
      text: '',
      level: '',
      severity: '',
      severityColor: '',
      sender: '',
      pubTime: '2026-10-06'
    }))
  };
}
beforeEach(() => {
  resetHook();
  vi.resetAllMocks();
  leaves.state = 'expand';
  startup = undefined;
  unavailable = undefined;
  store = {};
  leaves.token.mockReturnValue(null);
  leaves.weather.mockResolvedValue(payload('', '', '', 0));
  leaves.source.mockResolvedValue({
    ok: true,
    code: 200,
    message: '',
    data: {
      url: 'https://source.example/latest'
    }
  });
  leaves.announcements.mockResolvedValue([bulletin]);
  leaves.mode.mockResolvedValue('version-update-only');
  leaves.last.mockResolvedValue('');
  leaves.write.mockResolvedValue();
  notification = vi.fn();
  options = {
    language: 'zh-CN',
    state: 'expand',
    setAnnouncement: vi.fn(),
    t: vi.fn((key: string) => key),
    startupAutoCheckHandledRef: {
      current: false
    },
    pendingAnnouncementAfterGuideRef: {
      current: false
    },
    pendingAnnouncementAppVersionRef: {
      current: ''
    },
    setNotificationRef: {
      current: notification
    }
  };
  api = bridge();
  vi.stubGlobal('window', {
    api
  });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('useIslandStartupAnnouncements runtime', () => {
  it('handles startup once and unregisters both subscriptions', async () => {
    await triggerStartup();
    startup?.();
    await settleHook();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
    const [unsubscribeStartup] = api.onUpdaterStartupAutoCheckRequest.mock.results;
    const [unsubscribeUnavailable] = api.onUpdaterNotAvailable.mock.results;
    unmountHook();
    expect(unsubscribeStartup.value).toHaveBeenCalledTimes(1);
    expect(unsubscribeUnavailable.value).toHaveBeenCalledTimes(1);
  });
  it('disabled auto prompt exits before token/source/weather or update reads', async () => {
    store['update-auto-prompt-enabled'] = false;
    await triggerStartup();
    expect(api.storeRead).toHaveBeenCalledTimes(1);
    expect(leaves.token).not.toHaveBeenCalled();
    expect(api.updaterCheck).not.toHaveBeenCalled();
  });
  it('read failures use defaults and update rejection is swallowed', async () => {
    api.storeRead.mockRejectedValue(new Error('read'));
    api.updaterCheck.mockRejectedValue(new Error('offline'));
    await triggerStartup();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
    expect(api.storeRead).toHaveBeenCalledTimes(3);
  });
  it.each([null, 'basic'] as const)('falls back from pro source for token role %s', async (role) => {
    leaves.token.mockReturnValue(role ? token(role) : null);
    store['update-source'] = 'tencent-cos';
    await triggerStartup();
    expect(leaves.source).not.toHaveBeenCalled();
    expect(leaves.weather).not.toHaveBeenCalled();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
  });
  it('resolves a pro source and proceeds when there is no weather alert', async () => {
    const pro = token('pro');
    leaves.token.mockReturnValue(pro);
    store['update-source'] = 'aliyun-oss';
    await triggerStartup();
    expect(leaves.source).toHaveBeenCalledExactlyOnceWith(pro, 'aliyun-oss');
    expect(leaves.weather).toHaveBeenCalledExactlyOnceWith(pro);
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('aliyun-oss', 'https://source.example/latest');
    expect(notification).not.toHaveBeenCalled();
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
  }])('falls back when source response has no usable url: %j', async (response) => {
    leaves.token.mockReturnValue(token('pro'));
    store['update-source'] = 'tencent-cos';
    leaves.source.mockResolvedValue(response);
    await triggerStartup();
    expect(api.updaterCheck).toHaveBeenCalledExactlyOnceWith('cloudflare-r2', undefined);
  });
  it('disabled weather keeps a resolved pro updater URL and bypasses weather', async () => {
    leaves.token.mockReturnValue(token('pro'));
    store['update-source'] = 'tencent-cos';
    store['weather-alert-enabled'] = false;
    await triggerStartup();
    expect(leaves.weather).not.toHaveBeenCalled();
    expect(api.updaterCheck).toHaveBeenCalledWith('tencent-cos', 'https://source.example/latest');
  });
  it('weather failure warns and continues the startup update check', async () => {
    leaves.token.mockReturnValue(token('pro'));
    leaves.weather.mockRejectedValue(new Error('weather unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await triggerStartup();
    expect(warn).toHaveBeenCalledWith('[Updater] startup weather alert pre-check failed:', expect.any(Error));
    expect(api.updaterCheck).toHaveBeenCalledTimes(1);
  });
  it.each([['Storm', 'Rain', 'Beijing', 1, 'Storm', 'Beijing', 'notification.weatherAlert.bodySingle'], ['', 'Rain', 'Beijing', 2, 'Rain', 'Beijing', 'notification.weatherAlert.bodyWithMore'], ['', '', '', 1, 'notification.weatherAlert.defaultTitle', 'notification.weatherAlert.unknownCity', 'notification.weatherAlert.bodySingle']] as const)('shows weather notification with title %s and count %s', async (title, type, city, count, expectedTitle, expectedCity, body) => {
    leaves.token.mockReturnValue(token('pro'));
    leaves.weather.mockResolvedValue(payload(title, type, city, count));
    await triggerStartup();
    expect(notification).toHaveBeenCalledWith({
      body,
      title: 'notification.weatherAlert.title',
      icon: 'weather.svg',
      type: 'weather-alert-startup',
      weatherAlertTime: '2026-10-06',
      startupUpdateSource: 'cloudflare-r2',
      startupUpdateResolvedUrl: undefined
    });
    expect(options.t).toHaveBeenCalledWith(body, expect.objectContaining({
      city: expectedCity,
      title: expectedTitle
    }));
    expect(api.updaterCheck).not.toHaveBeenCalled();
  });
  it.each(['login', 'register', 'resetPassword', 'payment'])('avoids announcement over protected state %s', async (state) => {
    leaves.state = state;
    mount();
    unavailable?.();
    await settleHook();
    expect(leaves.mode).not.toHaveBeenCalled();
    expect(options.setAnnouncement).not.toHaveBeenCalled();
  });
  it('skips empty announcements and same version/content fingerprint', async () => {
    leaves.announcements.mockResolvedValueOnce([]);
    mount();
    unavailable?.();
    await settleHook();
    expect(options.setAnnouncement).not.toHaveBeenCalled();
    leaves.last.mockResolvedValue(createAnnouncementShownMarker('1.0', [bulletin]));
    unavailable?.();
    await settleHook();
    expect(options.setAnnouncement).not.toHaveBeenCalled();
    expect(leaves.write).not.toHaveBeenCalled();
  });
  it('shows changed announcement and persists the full marker', async () => {
    mount();
    unavailable?.();
    await settleHook();
    expect(options.setAnnouncement).toHaveBeenCalledTimes(1);
    expect(leaves.write).toHaveBeenCalledExactlyOnceWith(createAnnouncementShownMarker('1.0', [bulletin]));
  });
  it('always mode shows without reading last marker or writing one', async () => {
    leaves.mode.mockResolvedValue('always');
    mount();
    unavailable?.();
    await settleHook();
    expect(options.setAnnouncement).toHaveBeenCalledTimes(1);
    expect(leaves.last).not.toHaveBeenCalled();
    expect(leaves.write).not.toHaveBeenCalled();
  });
  it('missing version still shows announcement but does not persist an immediate marker', async () => {
    api.updaterVersion.mockResolvedValue(undefined);
    mount();
    unavailable?.();
    await settleHook();
    expect(options.setAnnouncement).toHaveBeenCalledTimes(1);
    expect(leaves.write).not.toHaveBeenCalled();
  });
  it.each(['guide', 'login', 'register', 'resetPassword', 'payment'])('defers pending guide announcement during %s and applies after exit', async (state) => {
    leaves.state = 'guide';
    options.state = 'guide';
    mount();
    unavailable?.();
    await settleHook();
    expect(options.pendingAnnouncementAfterGuideRef.current).toBe(true);
    expect(options.pendingAnnouncementAppVersionRef.current).toBe(createAnnouncementShownMarker('1.0', [bulletin]));
    options.state = state;
    mount();
    expect(options.setAnnouncement).not.toHaveBeenCalled();
    options.state = 'expand';
    mount();
    await settleHook();
    expect(options.setAnnouncement).toHaveBeenCalledTimes(1);
    expect(leaves.write).toHaveBeenCalledExactlyOnceWith(createAnnouncementShownMarker('1.0', [bulletin]));
    expect(options.pendingAnnouncementAfterGuideRef.current).toBe(false);
    expect(options.pendingAnnouncementAppVersionRef.current).toBe('');
  });
  it('guide in always mode resumes without a marker', async () => {
    leaves.state = 'guide';
    options.state = 'guide';
    leaves.mode.mockResolvedValue('always');
    mount();
    unavailable?.();
    await settleHook();
    expect(options.pendingAnnouncementAppVersionRef.current).toBe('');
    options.state = 'expand';
    mount();
    await settleHook();
    expect(options.setAnnouncement).toHaveBeenCalledTimes(1);
    expect(leaves.write).not.toHaveBeenCalled();
  });
  it('absent optional bridge/listener registration and teardown are safe', () => {
    vi.stubGlobal('window', {});
    mount();
    unmountHook();
    expect(api.onUpdaterNotAvailable).not.toHaveBeenCalled();
    resetHook();
    vi.stubGlobal('window', {
      api: {}
    });
    mount();
    unmountHook();
    expect(options.setAnnouncement).not.toHaveBeenCalled();
  });
  it('registered callbacks tolerate bridge disappearing before startup or version lookup', async () => {
    mount();
    vi.stubGlobal('window', {});
    startup?.();
    await settleHook();
    unavailable?.();
    await settleHook();
    expect(api.updaterCheck).not.toHaveBeenCalled();
    expect(options.setAnnouncement).toHaveBeenCalledTimes(1);
    expect(leaves.write).not.toHaveBeenCalled();
  });
  it('bridge without optional store/version methods uses default values', async () => {
    mount();
    vi.stubGlobal('window', {
      api: {
        updaterCheck: api.updaterCheck
      }
    });
    startup?.();
    unavailable?.();
    await settleHook();
    expect(api.updaterCheck).toHaveBeenCalledWith('cloudflare-r2', undefined);
    expect(options.setAnnouncement).toHaveBeenCalledTimes(1);
    expect(leaves.write).not.toHaveBeenCalled();
  });
  it('language change cleans the startup subscription and creates a new one', () => {
    mount();
    const [first] = api.onUpdaterStartupAutoCheckRequest.mock.results;
    options.language = 'en-US';
    mount();
    expect(first.value).toHaveBeenCalledTimes(1);
    expect(api.onUpdaterStartupAutoCheckRequest).toHaveBeenCalledTimes(2);
    expect(api.onUpdaterNotAvailable).toHaveBeenCalledTimes(1);
  });
  it('creates stable markers when API optional id/date metadata are absent', () => {
    expect(createAnnouncementShownMarker('', [{
      title: 'No metadata',
      content: ''
    }])).toBe(JSON.stringify({
      appVersion: '',
      fingerprints: ['@']
    }));
  });
});
