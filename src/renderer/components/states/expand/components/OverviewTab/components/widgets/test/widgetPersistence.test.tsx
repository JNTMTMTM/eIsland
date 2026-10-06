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
 * @file widgetPersistence.test.tsx
 * @description 总览闹钟、休息提醒、收藏和世界时钟真实存储、订阅、异步失败及卸载集成测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlarmWidget } from '../AlarmWidget';
import { BreakReminderWidget } from '../BreakReminderWidget';
import { UrlFavoritesWidget } from '../UrlFavoritesWidget';
import { WorldClockWidget } from '../WorldClockWidget';
import { byClass, elements, invoke, text } from '../../../../../../test/tree';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness';
import type { ReactElement } from 'react';
const translate = vi.hoisted(() => vi.fn<(key: string) => string>((key) => key));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate, i18n: { resolvedLanguage: '', language: 'en-US' } }) }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const values = new Map<string, unknown>();
const listeners: Array<(channel: string, value: unknown) => void> = [];
const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>(),
  setAlarmEnabled: vi.fn<Window['api']['setAlarmEnabled']>(),
  clipboardOpenUrl: vi.fn<Window['api']['clipboardOpenUrl']>()
};
const unsubscribe = vi.fn<() => void>();
const open = vi.fn<() => void>();
const getItem = vi.fn<Storage['getItem']>();
/**
 * 执行组件真实 Hook 和依赖变更 effect。
 * @param component - 当前被测真实组件。
 * @returns 完成存储异步更新的元素树。
 */
async function commit(component: () => ReactElement): Promise<ReactElement> {
  renderWithHooks(component);
  runEffects();
  await Array.from({ length: 12 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
  renderWithHooks(component);
  runEffects();
  return renderWithHooks(component);
}
/**
 * 广播真实已注册 IPC 通道。
 * @param key - 存储键。
 * @param value - 原生存储数据。
 */
function notify(key: string, value: unknown): void {
  listeners.forEach((listener) => listener(`store:${key}`, value));
}
/**
 * 创建可控的真实原生 Promise。
 * @returns 原生请求及完成入口。
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
  values.clear();
  listeners.length = 0;
  api.storeRead.mockImplementation((key) => Promise.resolve(values.get(key)));
  api.onSettingsChanged.mockImplementation((listener) => { listeners.push(listener); return unsubscribe; });
  api.setAlarmEnabled.mockResolvedValue(true);
  api.clipboardOpenUrl.mockResolvedValue(true);
  getItem.mockReturnValue(null);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api }));
  vi.stubGlobal('localStorage', { getItem });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Overview real storage widgets', () => {
  it('loads alarm selection and actual normalized alarms, rejects concurrent toggles and contains toggle errors', async () => {
    values.set('overview-alarm-selection', { alarmIds: [1, 999] });
    values.set('alarms', [{ id: 1, label: '', hour: 7, minute: 5, enabled: false }]);
    const component = () => AlarmWidget({ onOpenAlarmPage: open });
    let root = await commit(component);
    expect(text(root)).toContain('07:05:00');
    invoke(byClass(root, 'ov-dash-alarm-title'), 'onClick');
    expect(open).toHaveBeenCalledOnce();
    const pending = deferred<boolean>();
    api.setAlarmEnabled.mockReturnValueOnce(pending.promise);
    const button = byClass(root, 'ov-dash-alarm-toggle');
    invoke(button, 'onClick');
    invoke(button, 'onClick');
    expect(api.setAlarmEnabled).toHaveBeenCalledOnce();
    expect(byClass(renderWithHooks(component), 'ov-dash-alarm-toggle').props['aria-busy']).toBe(true);
    pending.reject(new Error('offline'));
    root = await commit(component);
    expect(text(root)).toContain('overview.alarm.syncError');
    api.setAlarmEnabled.mockResolvedValueOnce(false);
    invoke(byClass(root, 'ov-dash-alarm-toggle'), 'onClick');
    expect(text(await commit(component))).toContain('overview.alarm.syncError');
    api.setAlarmEnabled.mockResolvedValueOnce(true);
    invoke(byClass(renderWithHooks(component), 'ov-dash-alarm-toggle'), 'onClick');
    expect(elements(await commit(component)).some((node) => node.props.role === 'alert')).toBe(false);
    notify('unrelated', []);
    notify('alarms', null);
    expect(text(await commit(component))).toContain('overview.alarm.empty');
  });
  it('keeps newer alarm broadcasts when the initial snapshot arrives late and ignores events after unmount', async () => {
    const pending = deferred<unknown>();
    values.set('overview-alarm-selection', { alarmIds: [1] });
    api.storeRead.mockImplementation((key) => key === 'alarms' ? pending.promise : Promise.resolve(values.get(key)));
    const component = () => AlarmWidget({ onOpenAlarmPage: open });
    await commit(component);
    notify('alarms', [{ id: 1, hour: 8, label: 'New', enabled: true }]);
    pending.resolve([]);
    expect(text(await commit(component))).toContain('New');
    unmountHooks();
    notify('alarms', []);
    expect(text(renderWithHooks(component))).toContain('New');
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });
  it.each(['reject', 'late'])('contains alarm initial %s reads after cleanup', async (mode) => {
    const pending = deferred<unknown>();
    api.storeRead.mockImplementation((key) => key === 'alarms' ? pending.promise : Promise.resolve({ alarmIds: [] }));
    const component = () => AlarmWidget({ onOpenAlarmPage: open });
    await commit(component);
    if (mode === 'late') unmountHooks();
    if (mode === 'reject') pending.reject(new Error('offline'));
    else pending.resolve([]);
    expect(text(await commit(component))).toContain('overview.alarm.empty');
  });
  it('loads reminder rows and fired times, updates countdowns and consumes valid broadcasts only', async () => {
    const now = Date.now();
    values.set('break-reminder-items', [null, { id: 'off', name: 'Off', enabled: false, intervalMinutes: 1 }, { id: 'zero', name: 'Zero', enabled: true, intervalMinutes: 0 }, { id: 'blank', name: ' ', enabled: true, intervalMinutes: 1 }, { id: 'missing', enabled: true, intervalMinutes: 1 }, { id: 'a', name: 'A', enabled: true, intervalMinutes: 1 }, { id: 'b', name: 'B', enabled: true, intervalMinutes: 1, icon: 'data:icon' }]);
    values.set('break-reminder-last-fired', { a: now - 60000 });
    const component = () => BreakReminderWidget({ openBreakReminderPage: open });
    const root = await commit(component);
    expect(text(root)).toContain('overview.breakReminder.due');
    expect(text(root)).toContain('overview.breakReminder.remain');
    invoke(byClass(root, 'ov-dash-widget-title'), 'onClick');
    expect(open).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60000);
    expect(elements(await commit(component)).filter((node) => node.props.className === 'ov-dash-break-reminder-remain').map(text)).toEqual(['overview.breakReminder.due', 'overview.breakReminder.remain']);
    notify('unrelated', []);
    notify('break-reminder-items', null);
    notify('break-reminder-last-fired', []);
    notify('break-reminder-last-fired', null);
    notify('break-reminder-last-fired', 2);
    notify('break-reminder-last-fired', { b: Date.now() - 60000 });
    expect(text(await commit(component))).toContain('overview.breakReminder.due');
    notify('break-reminder-items', []);
    expect(text(await commit(component))).toContain('overview.breakReminder.empty');
    unmountHooks();
    notify('break-reminder-items', [{ id: 'late', name: 'Late', enabled: true, intervalMinutes: 1 }]);
    expect(text(renderWithHooks(component))).toContain('overview.breakReminder.empty');
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['late', 'reject'])('contains reminder initial %s updates and clears the interval', async (mode) => {
    const pending = deferred<unknown>();
    api.storeRead.mockReturnValue(pending.promise);
    const component = () => BreakReminderWidget({ openBreakReminderPage: open });
    await commit(component);
    unmountHooks();
    if (mode === 'reject') pending.reject(new Error('offline'));
    else pending.resolve([]);
    expect(text(await commit(component))).toContain('overview.breakReminder.empty');
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([null, []])('ignores nonarray URL snapshots %j', async (value) => {
    values.set('url-favorites', value);
    expect(text(await commit(() => UrlFavoritesWidget({ openUrlFavoritesPage: open })))).toContain('overview.urlFavorites.empty');
  });
  it('loads legacy favorites only after native failure, contains open failure and supports favicon fallback', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    getItem.mockReturnValue(JSON.stringify([{ id: 1, url: 'https://example.com', title: 'https://example.com', note: '' }]));
    const component = () => UrlFavoritesWidget({ openUrlFavoritesPage: open });
    const root = await commit(component);
    expect(text(root)).toContain('https://example.com');
    api.clipboardOpenUrl.mockRejectedValueOnce(new Error('denied'));
    invoke(byClass(root, 'ov-dash-url-favorites-item'), 'onClick');
    await commit(component);
    const target = { src: '' };
    invoke(byClass(root, 'ov-dash-url-favorites-favicon'), 'onError', { target });
    expect(target.src).toContain('LINK.svg');
  });
  it.each(['none', 'malformed', 'denied', 'cancelled'])('contains legacy URL boundary %s', async (mode) => {
    const pending = deferred<unknown>();
    api.storeRead.mockReturnValue(pending.promise);
    if (mode === 'malformed') getItem.mockReturnValue('{');
    if (mode === 'denied') getItem.mockImplementation(() => { throw new Error('denied'); });
    if (mode === 'cancelled') getItem.mockReturnValue('[]');
    const component = () => UrlFavoritesWidget({ openUrlFavoritesPage: open });
    await commit(component);
    if (mode === 'cancelled') unmountHooks();
    pending.reject(new Error('offline'));
    expect(text(await commit(component))).toContain('overview.urlFavorites.empty');
  });
  it('ignores a late successful URL snapshot after cleanup', async () => {
    const pending = deferred<unknown>();
    api.storeRead.mockReturnValue(pending.promise);
    const component = () => UrlFavoritesWidget({ openUrlFavoritesPage: open });
    await commit(component);
    unmountHooks();
    pending.resolve([{ id: 1, url: 'https://example.com' }]);
    expect(text(await commit(component))).toContain('overview.urlFavorites.empty');
  });
  it('builds actual world clocks from a valid timezone missing in the catalog and updates with the interval', async () => {
    values.set('worldClockOverviewTimezones', { timezones: ['Etc/GMT+3'] });
    const component = () => WorldClockWidget({ onOpenWorldClockPage: open });
    const root = await commit(component);
    expect(text(root)).toContain('Etc/GMT+3');
    const first = text(root);
    vi.advanceTimersByTime(1000);
    expect(text(await commit(component))).not.toBe(first);
    const preventDefault = vi.fn<() => void>();
    const title = byClass(root, 'ov-dash-widget-title');
    ['Enter', ' ', 'Escape'].forEach((key) => invoke(title, 'onKeyDown', { key, preventDefault }));
    expect(open).toHaveBeenCalledTimes(2);
    invoke(title, 'onClick');
    expect(open).toHaveBeenCalledTimes(3);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('UrlFavoritesWidget legacy cache shape regression', () => {
  it.each(['{}', 'null', '1', 'true', '"value"'])('ignores a valid nonarray legacy cache %s', async (raw) => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    getItem.mockReturnValue(raw);
    const root = await commit(() => UrlFavoritesWidget({ openUrlFavoritesPage: open }));
    expect(text(root)).toContain('overview.urlFavorites.empty');
    expect(elements(root).some((node) => node.props.className === 'ov-dash-url-favorites-item')).toBe(false);
  });
  it('continues loading a valid legacy array after native read failure', async () => {
    api.storeRead.mockRejectedValue(new Error('offline'));
    getItem.mockReturnValue('[{"id":1,"url":"https://example.com","title":"Saved"}]');
    const root = await commit(() => UrlFavoritesWidget({ openUrlFavoritesPage: open }));
    expect(text(root)).toContain('Saved');
  });
});
