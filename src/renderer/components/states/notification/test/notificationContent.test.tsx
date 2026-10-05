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
 * @file notificationContent.test.tsx
 * @description NotificationContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, find, invoke, text } from '../../test/tree';

import { NotificationContent } from '../NotificationContent';
import type { TreeElement } from '../../test/tree';
const api = { mediaAcceptSourceSwitch: vi.fn(), mediaRejectSourceSwitch: vi.fn(), updaterInstall: vi.fn().mockResolvedValue(true), updaterDownload: vi.fn().mockResolvedValue(true), updaterCheck: vi.fn().mockResolvedValue(true), restartApp: vi.fn().mockResolvedValue(true), storeRead: vi.fn().mockResolvedValue('github'), storeWrite: vi.fn().mockResolvedValue(true), clipboardOpenUrl: vi.fn().mockResolvedValue(true), clipboardUrlBlacklistAddDomain: vi.fn().mockResolvedValue(true), cliGlowHide: vi.fn() };

const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ store: { setIdle: vi.fn(), setLyrics: vi.fn(), setNotification: vi.fn(), setMaxExpand: vi.fn(), setMaxExpandTab: vi.fn(), setCli: vi.fn(), setCliProvider: vi.fn(), isMusicPlaying: false, coverImage: '', syncedLyrics: [] as unknown[], lyricsLoading: false }, favorites: { favoriteUrlSet: new Set<string>(), setFavoriteUrlSet: vi.fn() }, progress: null as null | { percent: number; transferred: number; total: number; bytesPerSecond: number }, token: 'token', resolveSource: vi.fn().mockResolvedValue({ ok: true, data: { url: 'https://update.example.com' } }) }));
vi.mock('../../../../store/slices', () => ({ default: Object.assign(() => model.store, { getState: () => model.store }) }));
vi.mock('../hooks/useNotificationFavorites', () => ({ useNotificationFavorites: () => model.favorites }));
vi.mock('../hooks/useUpdateDownloadProgress', () => ({ useUpdateDownloadProgress: () => model.progress }));
vi.mock('../hooks/useResetOnTypeChange', () => ({ useResetOnTypeChange: vi.fn() }));
vi.mock('../../../../utils/userAccount', () => ({ readLocalToken: () => model.token }));
vi.mock('../../../../api/user/userAccountApi', () => ({ fetchUpdateSourceUrl: model.resolveSource }));
function render(props: Partial<Parameters<typeof NotificationContent>[0]> = {}) { slots.cursor = 0; return ((NotificationContent({ title: 'Title', body: 'Body', ...props }) as TreeElement)); }
function action(root: ReturnType<typeof render>, key: string) { return find(root, (node) => node.type === 'button' && text(node) === `notification.actions.${key}`); }
beforeEach(() => {
  model.progress = null; model.token = 'token'; model.store.isMusicPlaying = false; model.store.coverImage = ''; model.store.syncedLyrics = []; model.favorites.favoriteUrlSet = new Set();
  vi.useFakeTimers();
  const surface = Object.assign(new EventTarget(), { setTimeout, api });
  vi.stubGlobal('window', surface);
});
describe('NotificationContent', () => {
  it('renders ordinary notification and completes or snoozes it', () => { const root = render({ breakReminderItemId: 'break' }); expect(text(root)).toContain('TitleBody'); invoke(action(root, 'snooze5m'), 'onClick'); expect(model.store.setIdle).toHaveBeenCalledOnce(); vi.advanceTimersByTime(5 * 60 * 1000); expect(model.store.setNotification).toHaveBeenCalledWith({ title: 'Title', body: 'Body', icon: undefined, breakReminderItemId: 'break' }); });
  it('dismisses into lyrics when music and synchronized lyrics are available', () => { model.store.isMusicPlaying = true; model.store.coverImage = 'cover'; model.store.syncedLyrics = ['line']; invoke(action(render(), 'complete'), 'onClick'); expect(model.store.setLyrics).toHaveBeenCalledOnce(); expect(model.store.setIdle).not.toHaveBeenCalled(); });
  it('accepts and rejects media source switch', () => { const root = render({ type: 'source-switch' }); invoke(action(root, 'switch'), 'onClick'); invoke(action(root, 'ignore'), 'onClick'); expect(api.mediaAcceptSourceSwitch).toHaveBeenCalledOnce(); expect(api.mediaRejectSourceSwitch).toHaveBeenCalledOnce(); });
  it('installs ready update and displays its version', () => { const root = render({ type: 'update-ready', updateVersion: '2.0' }); expect(text(root)).toContain('v2.0'); invoke(action(root, 'installRestart'), 'onClick'); expect(api.updaterInstall).toHaveBeenCalledOnce(); });
  it('renders preparing and active download status while allowing hiding', () => { let root = render({ type: 'update-downloading' }); expect(text(root)).toContain('notification.update.downloadingPreparing'); model.progress = { percent: 50, transferred: 50, total: 100, bytesPerSecond: 10 }; root = render({ type: 'update-downloading' }); expect(text(root)).toContain('notification.update.downloadingBodyProgress'); invoke(action(root, 'hide'), 'onClick'); expect(model.store.setIdle).toHaveBeenCalledOnce(); });
  it('starts available update download and opens update source settings', async () => { const root = render({ type: 'update-available', updateVersion: '2.0', updateSourceLabel: 'GitHub' }); invoke(action(root, 'downloadNow'), 'onClick'); await Promise.resolve(); await Promise.resolve(); expect(api.updaterDownload).toHaveBeenCalledWith('github'); expect(model.store.setNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'update-downloading', updateVersion: '2.0' })); invoke(action(root, 'configureUpdateSource'), 'onClick'); expect(api.storeWrite).toHaveBeenCalledWith('settings-open-tab', 'update'); expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('settings'); });
  it('requires login for PRO-only update sources', async () => { model.token = ''; vi.mocked(api.storeRead).mockResolvedValue('tencent-cos'); invoke(action(render({ type: 'update-available' }), 'downloadNow'), 'onClick'); await Promise.resolve(); await Promise.resolve(); expect(api.updaterDownload).not.toHaveBeenCalled(); expect(model.store.setNotification).toHaveBeenCalledWith(expect.objectContaining({ body: 'settings.update.proOnlyNeedLogin' })); });
  it('renders weather alert metadata and continues startup update check', () => { const root = render({ type: 'weather-alert-startup', weatherAlertTime: 'bad-date', startupUpdateSource: 'github', startupUpdateResolvedUrl: 'https://update.example.com' }); expect(text(root)).toContain('bad-date'); invoke(action(root, 'closeAndContinueUpdateCheck'), 'onClick'); expect(api.updaterCheck).toHaveBeenCalledWith('github', 'https://update.example.com'); expect(text(render({ type: 'weather-alert-startup' }))).toContain('notification.weatherAlert.timeUnknown'); });
  it('offers restart and later actions for restart-required state', () => { const root = render({ type: 'restart-required' }); invoke(action(root, 'restartNow'), 'onClick'); expect(api.restartApp).toHaveBeenCalledOnce(); invoke(action(root, 'later'), 'onClick'); expect(model.store.setIdle).toHaveBeenCalledTimes(2); });
  it.each(['external-agent-active', 'external-agent-stopped'] as const)('dismisses %s informational status', (type) => { const root = render({ type }); expect(elements(root).filter((node) => node.type === 'button')).toHaveLength(1); invoke(action(root, 'gotIt'), 'onClick'); expect(model.store.setIdle).toHaveBeenCalledOnce(); });
  it('switches detected CLI sessions to full panel and compact CLI state', () => { const root = render({ type: 'cli-session-detected', cliProvider: 'codex' }); invoke(action(root, 'switch'), 'onClick'); expect(model.store.setCliProvider).toHaveBeenCalledWith('codex'); expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('cli'); invoke(action(root, 'switchCliState'), 'onClick'); expect(model.store.setCli).toHaveBeenCalledOnce(); expect(api.cliGlowHide).toHaveBeenCalledTimes(2); });
  it('navigates multiple clipboard URLs with wraparound and opens every URL', () => { const urls = ['https://pyisland.com', 'https://example.com']; let root = render({ urls, type: 'clipboard-url' }); expect(text(root)).toContain('notification.clipboard.officialBadge'); invoke(find(root, (node) => node.props['aria-label'] === 'notification.clipboard.prevUrl'), 'onClick'); root = render({ urls, type: 'clipboard-url' }); expect(text(root)).toContain('2/2'); invoke(action(root, 'openAllLinks'), 'onClick'); expect(vi.mocked(api.clipboardOpenUrl).mock.calls).toEqual(urls.map((url) => [url])); });
  it('opens a single URL and adds its domain to blacklist', async () => { const root = render({ type: 'clipboard-url', urls: ['https://example.com/path'] }); invoke(action(root, 'openLink'), 'onClick'); expect(api.clipboardOpenUrl).toHaveBeenCalledWith('https://example.com/path'); invoke(action(root, 'addBlacklist'), 'onClick'); await Promise.resolve(); expect(api.clipboardUrlBlacklistAddDomain).toHaveBeenCalledWith('example.com'); });
  it('shows existing-favorite badge and navigates to favorites', () => { model.favorites.favoriteUrlSet.add('https://example.com'); vi.stubGlobal('localStorage', { setItem: vi.fn() }); const root = render({ type: 'clipboard-url', urls: ['https://example.com'] }); invoke(byClass(root, 'notification-favorited-badge'), 'onClick'); expect(model.store.setMaxExpandTab).toHaveBeenCalledWith('urlFavorites'); });
});
