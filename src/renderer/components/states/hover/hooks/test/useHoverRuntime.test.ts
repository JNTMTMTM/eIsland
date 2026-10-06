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
 * @file useHoverRuntime.test.ts
 * @description 真实悬浮状态导航、滚轮区域排除与状态切片集成测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createIslandSlice } from '../../../../../store/slices/islandSlice';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import type { IslandSlice, HoverTab } from '../../../../../store/types';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
let hook: typeof import('../useHover');
let store: ReturnType<ReturnType<typeof createStore<IslandSlice>>>;
let element: EventTarget;
/** 执行真实悬浮 Hook。
 * @returns 当前状态和公开 ref
 */
function run() {
  return renderHook(hook.useHover, {
    fullTimeStr: '12:30',
    lunarStr: 'lunar'
  });
}
/** 通过真实原生 DOM ref 提交滚轮监听。
 */
function mount(): void {
  run().contentRef.current = element as unknown as HTMLDivElement;
  flushHookEffects();
}
/** 原生窗口滚轮事件。
 * @param deltaY - 滚动方向
 * @param timer - 是否来自计时输入
 * @returns 默认事件取消状态
 */
function wheel(deltaY: number, timer = false) {
  const e = new Event('wheel', {
    cancelable: true
  });
  Object.defineProperties(e, {
    deltaY: {
      value: deltaY
    },
    target: {
      value: {
        closest: (selector: string) => timer && selector === '.timer-inputs'
      }
    }
  });
  element.dispatchEvent(e);
  return e.defaultPrevented;
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  element = new EventTarget();
  const localStorage = {
    getItem: () => null
  };
  vi.stubGlobal('window', {
    localStorage,
    location: {
      pathname: '/DynamicIsland.html'
    },
    api: {
      expandWindowFull: vi.fn(),
      disableMousePassthrough: vi.fn()
    }
  });
  store = createStore<IslandSlice>()(createIslandSlice);
  store.setState({
    state: 'hover'
  });
  vi.doMock('../../../../../store/slices', () => ({
    default: <T,>(selector: (state: IslandSlice) => T) => selector(store.getState())
  }));
  hook = await import('../useHover');
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('useHover true store navigation', () => {
  it('missing native ref registers no listener and all nav labels use real translation callback', () => {
    run();
    flushHookEffects();
    expect(wheel(1)).toBe(false);
    (['time', 'lyrics', 'weather', 'expand'] as HoverTab[]).forEach((tab) => expect(run().getDotLabel(tab)).toBe(`hover.nav.${  tab}`));
    expect(run()).toMatchObject({
      fullTimeStr: '12:30',
      lunarStr: 'lunar'
    });
  });
  it('time inputs keep scroll then ordinary forward navigation updates real hover tab', () => {
    mount();
    expect(wheel(1, true)).toBe(false);
    expect(store.getState().hoverTab).toBe('time');
    expect(wheel(1)).toBe(true);
    expect(store.getState().hoverTab).toBe('lyrics');
    run();
    flushHookEffects();
    wheel(-1, true);
    expect(store.getState().hoverTab).toBe('time');
    unmountHook();
    expect(wheel(1)).toBe(false);
  });
  it.each([{
    tab: 'weather',
    delta: 1
  }, {
    tab: 'time',
    delta: 0
  }])('special expanded destination from $tab invokes real expansion action', ({
    tab,
    delta
  }) => {
    store.setState({
      hoverTab: tab as HoverTab
    });
    mount();
    wheel(delta);
    expect(store.getState().state).toBe('expanded');
  });
  it('negative navigation uses wrapping sequence outside timer inputs', () => {
    store.setState({
      hoverTab: 'weather'
    });
    mount();
    wheel(-1);
    expect(store.getState().hoverTab).toBe('lyrics');
  });
});
