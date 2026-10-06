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
 * @file calendarYearOverviewLifecycle.test.tsx
 * @description 全年日历真实观察器、可视年份、滚动补偿、选中日期聚焦与范围边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../hooks/test/calendarHookHarness';
import { byClass, elements, invoke, text, type TreeElement } from '../../../../../test/tree';
import type { ReactElement, RefObject } from 'react';
import type { CalendarGridProps } from '../../types/calendarTypes';
const {
  CalendarYearOverview
} = await import('../CalendarYearOverview');
const {
  CalendarOverviewMonths
} = await import('../CalendarOverviewMonths');
let props: CalendarGridProps;
let raf: Map<number, FrameRequestCallback>;
let frameId: number;
let cancel: ReturnType<typeof vi.fn>;
interface ObserverRecord {
  callback: (entries: IntersectionObserverEntry[]) => void;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}
let observers: ObserverRecord[];
/** 读取真实组件树。
 * @returns 实际组件返回节点
 */
function run(): ReactElement {
  return renderHook(CalendarYearOverview, props);
}
/** 定位真实的年份节点。
 * @param tree - 返回树
 * @returns 年份 section
 */
function years(tree: ReactElement): TreeElement[] {
  return elements(tree).filter((node) => node.props.className === 'calendar-overview-year');
}
/** 返回真实月份组件节点。
 * @param tree - 返回树
 * @returns 月份入口
 */
function months(tree: ReactElement): TreeElement[] {
  return elements(tree).filter((node) => node.type === CalendarOverviewMonths);
}
/** 挂载原生叶节点并保留真实 ref 回调。
 * @param initial - 是否挂载起始年份
 * @returns 滚动容器、提交与滚动触发函数
 */
function mount(initial = true) {
  const element = {
    scrollTop: 0,
    clientHeight: 300,
    scrollHeight: 3000,
    getBoundingClientRect: () => ({
      top: 100,
      bottom: 400
    })
  };
  const attached = new Map<number, TreeElement>();
  let tree = run();
  const scrollRef = byClass(tree, 'calendar-scroll').props.ref as RefObject<HTMLDivElement | null>;
  scrollRef.current = element as unknown as HTMLDivElement;
  /** 提交 React 真实 callback ref，再触发布局。
   * @returns 实际组件树
   */
  function commit(): ReactElement {
    tree = run();
    const sections = years(tree);
    const existing = new Set(sections.map((node) => Number(node.props['data-year'])));
    attached.forEach((node, year) => {
      if (!existing.has(year)) {
        invoke(node, 'ref', null);
        attached.delete(year);
      }
    });
    element.scrollHeight = sections.length * 1000;
    sections.forEach((node, index) => {
      const year = Number(node.props['data-year']);
      if (!initial && year === (props.overviewYear ?? props.selectedDate.getFullYear())) return;
      const leaf = {
        dataset: {
          year: String(year)
        },
        getBoundingClientRect: () => ({
          top: 100 + index * 1000 - element.scrollTop,
          bottom: 1100 + index * 1000 - element.scrollTop
        })
      };
      invoke(node, 'ref', leaf);
      attached.set(year, node);
    });
    flushHookEffects();
    tree = run();
    return tree;
  }
  commit();
  return {
    element,
    commit,
    getTree: () => tree,
    scroll: (top: number) => {
      element.scrollTop = top;
      invoke(byClass(tree, 'calendar-scroll'), 'onScroll', {
        currentTarget: element
      });
    },
    detachAll: () => attached.forEach((node) => invoke(node, 'ref', null))
  };
}
/** 执行一次原生动画帧。
 */
function tick(): void {
  const entry = raf.entries().next().value;
  if (!entry) return;
  const [id, callback] = entry;
  raf.delete(id);
  callback(16);
}
/** 投递原生 observer 叶记录。
 * @param changes - 可视年份变更
 */
function intersect(changes: [number, boolean][]): void {
  const record = observers[observers.length - 1];
  record.callback(changes.map(([year, isIntersecting]) => ({
    isIntersecting,
    target: {
      dataset: {
        year: String(year)
      }
    }
  })) as unknown as IntersectionObserverEntry[]);
}
beforeEach(() => {
  resetHook();
  observers = [];
  raf = new Map();
  frameId = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frameId += 1;
    raf.set(frameId, callback);
    return frameId;
  }));
  cancel = vi.fn((id: number) => raf.delete(id));
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn();

    disconnect = vi.fn();

    constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
      observers.push({
        callback,
        observe: this.observe,
        disconnect: this.disconnect
      });
    }
  });
  const full = new Intl.DateTimeFormat('en-US');
  props = {
    selectedDate: new Date(2026, 9, 6, 12),
    today: new Date(2026, 9, 6, 12),
    locale: 'en-US',
    events: [],
    holidays: new Map(),
    formats: {
      full,
      month: full,
      weekday: full,
      lunar: full,
      lunarDay: full
    },
    detailsExpanded: false,
    detailsId: 'details',
    selectedButtonRef: {
      current: null
    },
    focusDateRef: {
      current: false
    },
    onDateKeyDown: vi.fn(),
    onVisibleYearChange: vi.fn(),
    onToggleOverview: vi.fn(),
    onOpenMonth: vi.fn(),
    onToggleDetails: vi.fn(),
    onSelectDate: vi.fn()
  };
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('CalendarYearOverview real lifecycle', () => {
  it('skips observer/layout without refs and forwards only container keyboard events', () => {
    const tree = run();
    flushHookEffects();
    expect(observers).toHaveLength(0);
    expect(months(tree)).toHaveLength(1);
    expect(text(tree)).toContain('2026');
    const currentTarget = {};
    const event = {
      currentTarget,
      target: currentTarget,
      key: 'ArrowDown'
    };
    invoke(byClass(tree, 'calendar-scroll'), 'onKeyDown', event);
    invoke(byClass(tree, 'calendar-scroll'), 'onKeyDown', {
      currentTarget,
      target: {}
    });
    expect(props.onDateKeyDown).toHaveBeenCalledExactlyOnceWith(event, new Date(2026, 0, 1, 12));
  });
  it('explicit overview year starts there and observer activates real years with nullable selected/today keys', () => {
    props.overviewYear = 2030;
    const view = mount();
    expect(view.element.scrollTop).toBe(1000);
    expect(props.onVisibleYearChange).toHaveBeenCalledWith(2030);
    expect(observers[0].observe).toHaveBeenCalledTimes(3);
    intersect([[2029, true], [2030, true], [2031, true]]);
    const tree = view.commit();
    expect(months(tree)).toHaveLength(3);
    expect(months(tree).every((node) => node.props.selectedKey === null && node.props.todayKey === null)).toBe(true);
  });
  it('intersection updates add/remove years and preserve unchanged membership or exchange equal sizes', () => {
    const view = mount();
    intersect([[2026, true]]);
    let tree = view.commit();
    expect(months(tree)).toHaveLength(1);
    intersect([[2026, false], [2025, true]]);
    tree = view.commit();
    expect(months(tree).map((node) => node.props.year)).toEqual([2025]);
    intersect([[2027, true], [2026, true]]);
    tree = view.commit();
    expect(months(tree)).toHaveLength(3);
    const current = months(tree).find((node) => node.props.year === 2026);
    expect(current?.props.selectedKey).toBe('2026-10-06');
    expect(current?.props.todayKey).toBe('2026-10-06');
  });
  it('scroll batches one RAF, changes visible year and cancels pending frame on unmount', () => {
    const view = mount();
    view.scroll(2100);
    view.scroll(2150);
    expect(raf.size).toBe(1);
    tick();
    view.commit();
    expect(props.onVisibleYearChange).toHaveBeenLastCalledWith(2027);
    view.scroll(2151);
    tick();
    view.commit();
    expect(props.onVisibleYearChange).toHaveBeenCalledTimes(2);
    view.scroll(2152);
    unmountHook();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(raf.size).toBe(0);
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    observers[0].callback([{
      target: {
        dataset: {
          year: '2026'
        }
      },
      isIntersecting: false
    }] as unknown as IntersectionObserverEntry[]);
    expect(months(run()).map((node) => node.props.year)).toEqual([2026]);
  });
  it('expands before and after the viewport, caps live year range at five and compensates anchors', () => {
    const view = mount();
    for (let index = 0; index < 4; index += 1) {
      view.scroll(0);
      tick();
      view.commit();
    }
    expect(years(view.getTree())).toHaveLength(5);
    expect(Number(years(view.getTree())[0].props['data-year'])).toBe(2021);
    for (let index = 0; index < 5; index += 1) {
      view.scroll(view.element.scrollHeight - view.element.clientHeight - 1);
      tick();
      view.commit();
    }
    expect(years(view.getTree())).toHaveLength(5);
    expect(view.element.scrollTop).toBeGreaterThan(0);
  });
  it('pending initial anchor blocks range extension while missing its DOM ref', () => {
    const view = mount(false);
    view.scroll(0);
    tick();
    view.commit();
    expect(years(view.getTree())).toHaveLength(3);
  });
  it('missing year refs use fallback current and both absent prepend/append anchors safely', () => {
    const view = mount();
    view.detachAll();
    view.scroll(0);
    tick();
    expect(years(run())).toHaveLength(4);
    view.commit();
    view.detachAll();
    view.scroll(view.element.scrollHeight - 301);
    tick();
    expect(years(run())).toHaveLength(5);
  });
  it.each([1, 9999])('year %s does not extend beyond the corresponding browsing bound', (boundary) => {
    props.overviewYear = boundary === 1 ? 2 : 9998;
    const view = mount();
    const top = boundary === 1 ? 0 : view.element.scrollHeight - 301;
    view.scroll(top);
    tick();
    view.commit();
    expect(years(view.getTree())).toHaveLength(3);
  });
  it('selection outside current range relocates three-year window and forces selected year rendering', () => {
    const view = mount();
    props.selectedDate = new Date(2030, 5, 1, 12);
    const beforeCommit = run();
    expect(months(beforeCommit)).toHaveLength(1);
    view.commit();
    view.commit();
    const tree = view.getTree();
    expect(years(tree).map((node) => node.props['data-year'])).toEqual([2029, 2030, 2031]);
    expect(months(tree).map((node) => node.props.year)).toContain(2030);
  });
  it.each([['above', 50, 70, -50], ['below', 450, 470, 70], ['inside', 150, 170, 0]] as const)('scrolls %s selected button into view and focuses only requested navigation', (position, top, bottom, delta) => {
    const view = mount();
    const before = view.element.scrollTop;
    const focus = vi.fn();
    const {
      selectedButtonRef,
      focusDateRef
    } = props;
    selectedButtonRef.current = {
      focus,
      getBoundingClientRect: () => ({
        top,
        bottom
      })
    } as unknown as HTMLButtonElement;
    focusDateRef.current = position !== 'inside';
    props.selectedDate = new Date(2026, 10, 1, 12);
    view.commit();
    expect(view.element.scrollTop).toBe(before + delta);
    expect(focus).toHaveBeenCalledTimes(position === 'inside' ? 0 : 1);
    expect(focusDateRef.current).toBe(false);
  });
});
