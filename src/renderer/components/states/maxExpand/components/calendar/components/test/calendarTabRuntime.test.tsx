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
 * @file calendarTabRuntime.test.tsx
 * @description 日历真实日期、假日、待办与倒数日 Hook 组合及原生布局动画交互测试
 * @author 鸡哥
 */

import { Children, isValidElement, type ReactElement, type ReactNode, type RefObject } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../hooks/test/calendarHookHarness';
import type { StateCreator } from 'zustand/vanilla';

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api: {}, location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
});
vi.doMock('react-i18next', async () => ({ ...await vi.importActual<typeof import('react-i18next')>('react-i18next'), useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }) }));

// 使用真实 Zustand vanilla 存储，只桥接依赖浏览器 React 渲染器的订阅接口。
vi.mock('zustand', async () => {
  const { createStore } = await import('zustand/vanilla');
  return { create<T>(initializer?: StateCreator<T>) {
    const bind = (init: StateCreator<T>) => {
      const store = createStore(init);
      return Object.assign((selector?: (state: T) => unknown) => selector ? selector(store.getState()) : store.getState(), store);
    };
    return initializer ? bind(initializer) : bind;
  } };
});
const { useIslandStore } = await import('../../../../../../../store/index/index');
const { CalendarTab } = await import('../CalendarTab');
const { CalendarGrid } = await import('../CalendarGrid');
const { CalendarYearOverview } = await import('../CalendarYearOverview');
const snapshot = useIslandStore.getState();
const focusToggle = vi.fn();
const focusDate = vi.fn();
const toggle = { focus: focusToggle };
let bounds: { left: number; right: number; top: number; bottom: number; width: number; height: number };
let target: { left: number; right: number; top: number; bottom: number } | null;
let activeElement: unknown;
let tree: ReactElement;
const nativeStage = {
  querySelector: vi.fn((selector: string) => {
    if (selector === '.calendar-view-toggle') return toggle;
    return target ? { getBoundingClientRect: () => target } : null;
  }),
  getBoundingClientRect: () => bounds,
};

/** 收集真实 JSX 树的元素，保留业务子组件标识及公开属性。
 * @param node - React 返回树
 * @returns 实际 React 元素
 */
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...Children.toArray(node.props.children as ReactNode).flatMap(elements)];
}
/** 找到需要操作的公开组件或宿主元素。
 * @param type - 组件标识或宿主 className
 * @returns 真实公开属性
 */
function props(type: unknown): Record<string, unknown> {
  const found = elements(tree).find((node) => typeof type === 'string' ? node.props.className === type : node.type === type);
  if (!found) throw new Error('Missing public element'); return found.props;
}
/** 提交实际 Hook 组合生命周期。
 * @returns 真实 JSX 元素树
 */
function render(): ReactElement { tree = renderHook(CalendarTab); flushHookEffects(); return tree; }
/** 派发真实视图动画完成回调。
 * @param sameTarget - 是否来自视图根元素
 */
function animate(sameTarget = true): void {
  const firstElementChild = {}; (props('calendar-view-stage').onAnimationEnd as (event: unknown) => void)({ target: sameTarget ? firstElementChild : {}, currentTarget: { firstElementChild } });
}
/** 驱动真实退出、准备、进场及焦点恢复生命周期。
 */
async function finish(): Promise<void> {
  render(); animate(); render(); await vi.advanceTimersByTimeAsync(16); render(); animate(); render();
}
/** 注入原生布局测量叶。
 */
function attachStage(): void {
  (props('calendar-view-stage').ref as RefObject<HTMLDivElement | null>).current = nativeStage as unknown as HTMLDivElement;
}

beforeEach(() => {
  resetHook(); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 6, 12)); useIslandStore.setState(snapshot, true);
  useIslandStore.setState({ location: { latitude: 1, longitude: 2, city: 'City', country: 'Country', regionName: 'Region', countryCode: 'US' } });
  focusToggle.mockClear(); focusDate.mockClear(); activeElement = null;
  bounds = { left: 0, right: 400, top: 0, bottom: 200, width: 400, height: 200 }; target = { left: 100, right: 300, top: 0, bottom: 100 };
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('document', { get activeElement() { return activeElement; } });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(16), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout, api: {
    netFetch: vi.fn().mockResolvedValue({ ok: true, status: 204, body: '' }),
    storeRead: vi.fn().mockResolvedValue([]), onSettingsChanged: () => () => undefined,
  } }));
});
afterEach(() => { unmountHook(); useIslandStore.setState(snapshot, true); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('combines the real date, holiday, todo and countdown hooks and toggles detail accessibility', async () => {
  render(); await settleHook(); render(); expect(props(CalendarGrid).selectedDate).toEqual(new Date(2026, 9, 6, 12));
  const stopPropagation = vi.fn(); (props('max-expand-tab-panel calendar-panel').onKeyDown as (event: unknown) => void)({ stopPropagation, key: 'Tab' });
  (props('max-expand-tab-panel calendar-panel').onKeyDown as (event: unknown) => void)({ stopPropagation, key: 'Enter' }); expect(stopPropagation).toHaveBeenCalledOnce();
  (props(CalendarGrid).onToggleDetails as () => void)(); render(); expect(props('calendar-details-shell')['aria-hidden']).toBe(true);
  (props(CalendarGrid).onToggleDetails as () => void)(); render(); expect(props('calendar-details-shell')['aria-hidden']).toBe(false);
});

it('ignores month opening outside overview and blocks new transitions while exiting', async () => {
  render(); (props(CalendarGrid).onOpenMonth as (date: Date) => void)(new Date(2026, 10, 1)); render(); expect(props('calendar-view-stage')['data-phase']).toBe('idle');
  const toggleOverview = props(CalendarGrid).onToggleOverview as (date: Date) => void; toggleOverview(new Date(2026, 9, 1)); render();
  (props(CalendarGrid).onToggleOverview as (date: Date) => void)(new Date(2030, 0, 1)); animate(false); render(); expect(props('calendar-view-stage')['data-phase']).toBe('exit');
  await finish(); expect(props(CalendarYearOverview).overviewYear).toBe(2026); expect(props('calendar-view-stage')['data-phase']).toBe('idle');
  animate(); render(); expect(props('calendar-view-stage')['data-phase']).toBe('idle');
});

it.each(['missing', 'width', 'height', 'above', 'below', 'visible'])('measures native month layout and uses centered fallback for %s', async (mode) => {
  render(); attachStage();
  if (mode === 'missing') target = null;
  if (mode === 'width') bounds.width = 0;
  if (mode === 'height') bounds.height = 0;
  if (mode === 'above' && target) target.bottom = 0;
  if (mode === 'below' && target) target.top = 200;
  (props(CalendarGrid).onToggleOverview as (date: Date) => void)(new Date(2026, 9, 1)); render();
  expect((props('calendar-view-stage').style as Record<string, string>)['--calendar-zoom-origin']).toBe(mode === 'visible' ? '50% 25%' : '50% 50%');
  await finish(); expect(props(CalendarYearOverview).overviewYear).toBe(2026);
});

it('restores toggle focus after overview transitions and selected-date focus after opening a month', async () => {
  render(); attachStage(); activeElement = toggle;
  (props(CalendarGrid).selectedButtonRef as RefObject<HTMLButtonElement | null>).current = { focus: focusDate } as unknown as HTMLButtonElement;
  (props(CalendarGrid).onToggleOverview as (date: Date) => void)(new Date(2026, 9, 1)); await finish(); expect(focusToggle).toHaveBeenCalledWith({ preventScroll: true });
  (props(CalendarYearOverview).onOpenMonth as (date: Date) => void)(new Date(2026, 11, 25)); render();
  (props(CalendarYearOverview).onOpenMonth as (date: Date) => void)(new Date(2030, 0, 1)); await finish();
  expect(props(CalendarGrid).selectedDate).toEqual(new Date(2026, 11, 25)); expect(focusDate).toHaveBeenCalledWith({ preventScroll: true });
});

it.each([2026, 2030])('returns from year overview using selected date only for matching year %s', async (year) => {
  render(); attachStage(); (props(CalendarGrid).onToggleOverview as (date: Date) => void)(new Date(2026, 9, 1)); await finish();
  (props(CalendarYearOverview).onToggleOverview as (date: Date) => void)(new Date(year, 0, 1)); await finish();
  expect(props('calendar-view-stage')['data-direction']).toBe('month'); expect(props(CalendarGrid).selectedDate).toEqual(new Date(2026, 9, 6, 12));
});

it('cancels the pending enter frame when unmounted during preparation', () => {
  render(); (props(CalendarGrid).onToggleOverview as (date: Date) => void)(new Date(2026, 9, 1)); render(); animate(); render();
  expect(props('calendar-view-stage')['data-phase']).toBe('prepare'); unmountHook(); expect(vi.getTimerCount()).toBe(0);
});
