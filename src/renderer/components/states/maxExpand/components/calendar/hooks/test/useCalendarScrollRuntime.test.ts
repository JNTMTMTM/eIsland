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
 * @file useCalendarScrollRuntime.test.ts
 * @description 连续月历真实月份布局、日期导航、范围扩展、行高补偿与原生监听清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from './calendarHookHarness';
import type { UIEvent } from 'react';
import type { CalendarTimelineEvent } from '../../types/calendarTimelineTypes';
const {
  useCalendarScroll
} = await import('../useCalendarScroll');
type Result = ReturnType<typeof useCalendarScroll>;
let selected: Date;
let events: CalendarTimelineEvent[];
let resize: (() => void) | undefined;
let observe: ReturnType<typeof vi.fn>;
let disconnect: ReturnType<typeof vi.fn>;
/** 读取同一实例的真实状态。
 * @returns 月历 Hook 结果
 */
function run(): Result {
  return renderHook(useCalendarScroll, selected, events);
}
/** 挂载浏览器滚动叶节点并完成布局。
 * @returns 原生节点及滚轮叶监听器
 */
function mount() {
  let wheel: ((event: WheelEvent) => void) | undefined;
  const element = {
    scrollTop: 0,
    clientHeight: 336,
    addEventListener: vi.fn((name: string, handler: (event: WheelEvent) => void) => {
      if (name === 'wheel') wheel = handler;
    }),
    removeEventListener: vi.fn()
  };
  const {
    scrollRef
  } = run();
  scrollRef.current = element as unknown as HTMLDivElement;
  flushHookEffects();
  run();
  flushHookEffects();
  return {
    element,
    wheel: (event: WheelEvent) => wheel?.(event)
  };
}
/** 调用真实滚动事件，并保留原生 scrollTop。
 * @param target - Hook 结果
 * @param element - 原生容器
 * @param element.scrollTop - 原生滚动位置
 * @param top - 滚动位置
 */
function scroll(target: Result, element: {
  scrollTop: number;
}, top: number): void {
  Object.assign(element, {
    scrollTop: top
  });
  target.onScroll({
    currentTarget: element
  } as UIEvent<HTMLDivElement>);
}
beforeEach(() => {
  resetHook();
  vi.clearAllMocks();
  selected = new Date(2026, 0, 15, 12);
  events = [];
  observe = vi.fn();
  disconnect = vi.fn();
  resize = undefined;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) {
      resize = callback;
    }

    observe = observe;

    disconnect = disconnect;
  });
  vi.stubGlobal('window', {
    matchMedia: () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('useCalendarScroll real layout lifecycle', () => {
  it('initializes January viewport, constants and real observer/damping cleanup', () => {
    const {
      element
    } = mount();
    const current = run();
    expect(current.visibleDate.getFullYear()).toBe(2026);
    expect(current.visibleDate.getMonth()).toBe(0);
    expect(current.weekHeight).toBe(56);
    expect(current.headerHeight).toBe(48);
    expect(current.monthGap).toBe(40);
    expect(current.monthLabelHeight).toBe(24);
    expect(element.scrollTop).toBeGreaterThan(3000);
    expect(current.paddingTop).toBeGreaterThan(0);
    expect(current.paddingBottom).toBeGreaterThan(0);
    expect(observe).toHaveBeenCalledWith(element);
    expect(element.addEventListener.mock.calls.map(([name]) => name)).toEqual(['wheel', 'pointerdown', 'keydown']);
    unmountHook();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(element.removeEventListener).toHaveBeenCalledTimes(3);
  });
  it('works before refs attach and skips observer/damping when no element exists', () => {
    const initial = run();
    flushHookEffects();
    expect(run().visibleDate.getMonth()).toBe(0);
    expect(observe).not.toHaveBeenCalled();
    events = [{
      id: 'no-node',
      kind: 'todo',
      label: 'event',
      start: '2025-01-01',
      end: '2025-12-31'
    }];
    run();
    flushHookEffects();
    expect(run().months.length).toBeGreaterThan(0);
    expect(initial.scrollRef.current).toBeNull();
  });
  it('observer ignores the same height and adjusts viewport to changed height and top', () => {
    const {
      element
    } = mount();
    const before = run().months;
    resize?.();
    run();
    flushHookEffects();
    expect(run().months).toBe(before);
    element.clientHeight = 1000;
    element.scrollTop = 1500;
    resize?.();
    run();
    flushHookEffects();
    expect(run().months.length).toBeGreaterThan(3);
    expect(element.scrollTop).toBe(1500);
  });
  it('navigates far future dates, extends the end and keeps selected week in view', () => {
    const {
      element
    } = mount();
    const before = element.scrollTop;
    selected = new Date(2030, 11, 31, 12);
    run();
    flushHookEffects();
    run();
    flushHookEffects();
    expect(element.scrollTop).toBeGreaterThan(before);
    expect(run().visibleDate.getFullYear()).toBe(2030);
    expect(run().paddingBottom).toBeGreaterThan(0);
  });
  it('navigates into preceding years, compensates prepended months and returns upward', () => {
    const {
      element
    } = mount();
    selected = new Date(2022, 0, 1, 12);
    run();
    flushHookEffects();
    run();
    flushHookEffects();
    expect(run().visibleDate.getFullYear()).toBe(2022);
    expect(element.scrollTop).toBeGreaterThan(0);
    selected = new Date(2021, 11, 30, 12);
    run();
    flushHookEffects();
    run();
    flushHookEffects();
    expect(run().visibleDate.getFullYear()).toBe(2021);
  });
  it('same selected day and same rendered month window preserve memoized months', () => {
    const {
      element
    } = mount();
    const before = run().months;
    selected = new Date(selected);
    run();
    flushHookEffects();
    expect(run().months).toBe(before);
    scroll(run(), element, element.scrollTop + 1);
    expect(run().months).toBe(before);
  });
  it('scrolling above the range prepends months and compensates negative native overscroll', () => {
    const {
      element
    } = mount();
    scroll(run(), element, -10);
    run();
    flushHookEffects();
    expect(element.scrollTop).toBeGreaterThan(3000);
    expect(run().visibleDate.getFullYear()).toBe(2025);
  });
  it('scrolling near the bottom extends end and repeated interior events keep current state', () => {
    const {
      element
    } = mount();
    scroll(run(), element, 11200);
    run();
    flushHookEffects();
    expect(run().visibleDate.getFullYear()).toBeGreaterThan(2026);
    const current = run();
    scroll(current, element, 1000);
    scroll(current, element, 1000);
    run();
    flushHookEffects();
    expect(run().visibleDate.getFullYear()).toBe(2025);
    expect(element.scrollTop).toBe(1000);
  });
  it('changes event row heights while preserving the visible week and skips unchanged reflow', () => {
    const {
      element
    } = mount();
    const before = element.scrollTop;
    events = [{
      id: 'historic',
      kind: 'todo',
      label: 'history',
      start: '2025-01-01',
      end: '2025-12-31'
    }];
    run();
    flushHookEffects();
    run();
    flushHookEffects();
    expect(element.scrollTop).toBeGreaterThan(before);
    expect(run().visibleDate.getMonth()).toBe(0);
    const after = element.scrollTop;
    events = [...events, {
      id: 'outside',
      kind: 'todo',
      label: 'outside',
      start: '2040-01-01',
      end: '2040-01-01'
    }];
    run();
    flushHookEffects();
    expect(element.scrollTop).toBe(after);
  });
  it('damping reads current month starts after a range change through the native wheel listener', () => {
    const {
      element,
      wheel
    } = mount();
    scroll(run(), element, 0);
    run();
    flushHookEffects();
    const before = element.scrollTop;
    const preventDefault = vi.fn();
    wheel({
      preventDefault,
      ctrlKey: false,
      shiftKey: false,
      deltaX: 0,
      deltaY: 10,
      deltaMode: 0,
      cancelable: true
    } as unknown as WheelEvent);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(element.scrollTop).toBeGreaterThan(before);
  });
});
