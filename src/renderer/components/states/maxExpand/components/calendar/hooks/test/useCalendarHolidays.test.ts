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
 * @file useCalendarHolidays.test.ts
 * @description 日历假日真实共享定位、网络解析、区域筛选、缓存与生命周期测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HOLIDAY_SUBDIVISION_KEY } from '../../config/calendarConfig';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './calendarHookHarness';

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api: {}, location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
});
vi.doMock('react-i18next', async () => ({ ...await vi.importActual<typeof import('react-i18next')>('react-i18next'), useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }));

// 仅桥接 Zustand 的 React 订阅，所有状态、天气定位及假日解析仍执行真实实现。
vi.mock('../../../../../../../store/slices', async (original) => {
  const actual = await original<typeof import('../../../../../../../store/slices')>(); const store = actual.default;
  return { ...actual, default: Object.assign(<T>(selector: (state: ReturnType<typeof store.getState>) => T) => selector(store.getState()), store) };
});
const { useIslandStore } = await import('../../../../../../../store/index/index');
const { useCalendarHolidays } = await import('../useCalendarHolidays');
const snapshot = useIslandStore.getState();
const netFetch = vi.fn();
const getItem = vi.fn<(key: string) => string | null>();
const setItem = vi.fn<(key: string, value: string) => void>();
let storage: Map<string, string>;
let clock = Date.UTC(2026, 9, 1);
let selectedYear: number;

/** 执行实际生命周期。
 * @returns 公开假日加载状态
 */
function render(): ReturnType<typeof useCalendarHolidays> {
  const value = renderHook(useCalendarHolidays, selectedYear); flushHookEffects(); return value;
}
/** 等待网络叶 Promise 并提交真实效果。
 * @returns 最终公开假日加载状态
 */
async function mount(): Promise<ReturnType<typeof useCalendarHolidays>> {
  render(); await settleHook(); render(); await settleHook(); return render();
}
/** 创建接口返回的有效年度假日。
 * @param year - 公历年份
 * @param countryCode - 国家代码
 * @returns 全国及区域公共假日响应
 */
function holidays(year: number, countryCode = 'US'): unknown[] {
  return [
    { countryCode, date: `${String(year).padStart(4, '0')  }-01-01`, name: 'National', nationalHoliday: true, holidayTypes: ['Public'], subdivisionCodes: null },
    { countryCode, date: `${String(year).padStart(4, '0')  }-02-01`, name: 'Regional', nationalHoliday: false, holidayTypes: ['Public'], subdivisionCodes: [`${countryCode  }-CA`] },
    { countryCode, date: `${String(year).padStart(4, '0')  }-03-01`, name: 'Observance', nationalHoliday: true, holidayTypes: ['Observance'], subdivisionCodes: [] },
  ];
}
/** 设置真实共享定位状态。
 * @param countryCode - 外部定位国家代码
 * @param regionCode - 外部定位区域代码
 */
function location(countryCode = 'US', regionCode = 'CA'): void {
  useIslandStore.setState({ location: { countryCode, regionCode, latitude: 1, longitude: 2, city: 'City', country: 'Country', regionName: 'Region' } });
}

beforeEach(() => {
  resetHook(); vi.useFakeTimers(); clock += 2 * 86400000; vi.setSystemTime(clock); selectedYear = 2026;
  useIslandStore.setState(snapshot, true); location(); storage = new Map();
  getItem.mockReset().mockImplementation((key) => storage.get(key) ?? null);
  setItem.mockReset().mockImplementation((key, value) => { storage.set(key, value); });
  netFetch.mockReset().mockImplementation((url: string) => {
    const match = /Holidays\/([A-Z]{2})\/(\d+)/.exec(url);
    return Promise.resolve({ ok: true, status: 200, body: JSON.stringify(match ? holidays(Number(match[2]), match[1]) : {}) });
  });
  vi.stubGlobal('localStorage', { getItem, setItem });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api: { netFetch } }));
});
afterEach(() => { unmountHook(); useIslandStore.setState(snapshot, true); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('loads real parsed annual records and selects public holidays for the automatic region', async () => {
  expect(render().status).toBe('loading'); const hook = await mount(); expect(hook.status).toBe('ready');
  expect(hook.countryCode).toBe('US'); expect(hook.subdivisionCode).toBe('US-CA'); expect(hook.subdivisionCodes).toEqual(['US-CA']);
  expect(hook.holidays.get('2026-01-01')).toEqual(['National']); expect(hook.holidays.get('2026-02-01')).toEqual(['Regional']);
  expect(hook.holidays.has('2026-03-01')).toBe(false); expect(netFetch).toHaveBeenCalledTimes(3);
});

it.each(['US-NY', 'DE-BE', ''])('validates saved subdivision against the actual country: %s', async (saved) => {
  storage.set(`${HOLIDAY_SUBDIVISION_KEY  }US`, saved); const hook = await mount();
  expect(hook.subdivisionCode).toBe(saved.startsWith('US-') ? saved : '');
  if (saved === 'US-NY') expect(hook.subdivisionCodes).toEqual(['US-CA', 'US-NY']);
});

it('uses automatic region on blocked storage, rejects unknown selections, and preserves selection on write failure', async () => {
  getItem.mockImplementation(() => { throw new Error('storage blocked'); });
  let hook = await mount(); expect(hook.subdivisionCode).toBe('US-CA');
  hook.selectSubdivision('US-XX'); expect(render().subdivisionCode).toBe('US-CA');
  setItem.mockImplementation(() => { throw new Error('storage blocked'); });
  hook.selectSubdivision(''); hook = render(); expect(hook.subdivisionCode).toBe('');
  hook.selectSubdivision('US-CA'); expect(render().subdivisionCode).toBe('US-CA');
});

it('persists a public region selection and reloads nearby years while retaining current records', async () => {
  let hook = await mount(); hook.selectSubdivision(''); expect(setItem).toHaveBeenCalledWith(`${HOLIDAY_SUBDIVISION_KEY  }US`, '');
  hook.setVisibleYear(2030); render(); hook = render(); expect(hook.status).toBe('loading'); expect(hook.holidays.has('2026-01-01')).toBe(true);
  await settleHook(); hook = render(); expect(hook.status).toBe('ready'); expect(hook.holidays.has('2030-01-01')).toBe(true);
  expect(hook.holidays.has('2025-01-01')).toBe(false);
});

it.each([400, 404, 500])('classifies genuine network status %s and retries rejected cache entries', async (status) => {
  netFetch.mockResolvedValue({ status, ok: false, body: '' }); let hook = await mount();
  expect(hook.status).toBe(status === 500 ? 'error' : 'unsupported');
  netFetch.mockResolvedValue({ ok: true, status: 204, body: '' }); hook.retry(); render(); await settleHook(); hook = render();
  expect(hook.status).toBe('ready'); expect(hook.holidays.size).toBe(0);
});

it('keeps the selected year ready when only prefetch neighbors fail', async () => {
  netFetch.mockImplementation((url: string) => Promise.resolve({ ok: url.includes('/2026'), status: url.includes('/2026') ? 200 : 400, body: JSON.stringify(holidays(2026)) }));
  expect((await mount()).status).toBe('ready');
});

it.each([1, 9999])('bounds neighboring annual requests at year %s', async (year) => {
  selectedYear = year; const hook = await mount(); expect(hook.status).toBe('ready'); expect(netFetch).toHaveBeenCalledTimes(2);
});

it('drops old country results after the real location state changes', async () => {
  const old = deferred<{ ok: boolean; status: number; body: string }>(); netFetch.mockImplementation(() => old.promise); render();
  location('DE', 'BE'); netFetch.mockResolvedValue({ ok: true, status: 200, body: '[]' }); render(); await settleHook();
  expect(render().countryCode).toBe('DE'); old.resolve({ ok: true, status: 200, body: JSON.stringify(holidays(2026)) }); await settleHook();
  expect(render().holidays.size).toBe(0); expect(render().status).toBe('ready');
});

it('ignores holiday requests that finish after unmount', async () => {
  const pending = deferred<{ ok: boolean; status: number; body: string }>(); netFetch.mockReturnValue(pending.promise); render(); unmountHook();
  pending.resolve({ ok: true, status: 200, body: '[]' }); await settleHook(); expect(renderHook(useCalendarHolidays, selectedYear).status).toBe('loading');
});

it.each([null, '', 'us'])('falls back to real shared location refresh for missing country %s', async (country) => {
  if (country === null) useIslandStore.setState({ location: null }); else location(country);
  expect(render().status).toBe('loading'); expect((await mount()).status).toBe('locationUnavailable');
});

it('discards a location completion after unmount and contains a real refresh rejection', async () => {
  useIslandStore.setState({ location: null }); const pending = deferred<unknown>(); netFetch.mockReturnValue(pending.promise);
  render(); unmountHook(); pending.resolve({ ok: false, status: 500, body: '' }); await settleHook();
  expect(renderHook(useCalendarHolidays, selectedYear).status).toBe('loading');
  resetHook(); getItem.mockImplementation(() => { throw new Error('storage blocked'); });
  render(); await settleHook(); expect(render().status).toBe('locationUnavailable');
});

it('contains a native IPC invocation that throws before creating the network promise', async () => {
  netFetch.mockImplementation(() => { throw new Error('bridge disposed'); }); expect((await mount()).status).toBe('error');
});

it('contains a rejected real location refresh when a public store subscriber throws on its location update', async () => {
  useIslandStore.setState({ location: null });
  netFetch.mockResolvedValue({ ok: true, status: 200, body: JSON.stringify({ lat: 1, lon: 2, city: 'City', regionName: 'Region', country: 'Country', countryCode: 'US' }) });
  const unsubscribe = useIslandStore.subscribe(() => { throw new Error('subscriber failed'); });
  render(); await settleHook(); unsubscribe();
  expect(render().countryCode).toBe('US');
});
