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
 * @file useExpandWheelRuntime.test.ts
 * @description 真实展开滚轮导航、活动上下文、区域排除与监听清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHookReactMock, flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import type { useExpandWheelNav } from '../useExpandWheelNav';
import type { ExpandTab } from '../../../../../store/types';
import type { NavDotId } from '../../config/types';
const context = vi.hoisted(() => ({
  active: true
}));
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return {
    ...createHookReactMock(actual),
    useContext: () => context.active
  };
});
let hook: typeof import('../useExpandWheelNav');
let element: EventTarget;
let options: Parameters<typeof useExpandWheelNav>[0];
/** 通过原生滚轮事件驱动真实处理器。
 * @param deltaY - 原生滚动距离
 * @param excluded - 目标最近的滚动区域
 * @returns 是否阻止原生默认事件
 */
function wheel(deltaY: number, excluded = ''): boolean {
  const event = new Event('wheel', {
    cancelable: true
  });
  Object.defineProperties(event, {
    deltaY: {
      value: deltaY
    },
    target: {
      value: {
        closest: (selector: string) => selector === excluded
      }
    }
  });
  element.dispatchEvent(event);
  return event.defaultPrevented;
}
/** 提交真实导航监听效果。
 */
function mount(): void {
  renderHook(hook.useExpandWheelNav, options);
  flushHookEffects();
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  context.active = true;
  vi.resetModules();
  vi.doMock('react', async (original) => ({
    ...createHookReactMock(await original<typeof import('react')>()),
    useContext: () => context.active
  }));
  hook = await import('../useExpandWheelNav');
  element = new EventTarget();
  options = {
    contentRef: {
      current: element as unknown as HTMLDivElement
    },
    expandTabRef: {
      current: 'overview'
    },
    navDotsRef: {
      current: ['overview', 'song', 'tools']
    },
    setExpandTab: vi.fn<(tab: ExpandTab) => void>(),
    setHover: vi.fn<() => void>(),
    handleSetMaxExpand: vi.fn<() => void>(),
    setSlideDir: vi.fn<(dir: 'left' | 'right') => void>()
  };
});
afterEach(() => unmountHook());
describe('useExpandWheelNav real context and native events', () => {
  it.each([false, true])('inactive or missing container does not register wheel active=%s', (active) => {
    context.active = active;
    if (active) options.contentRef.current = null;
    mount();
    expect(wheel(1)).toBe(false);
    expect(options.setExpandTab).not.toHaveBeenCalled();
  });
  it.each(['.ov-dash-todo-list', '.ov-dash-apps', '.ov-dash-url-favorites-list', '.ov-dash-break-reminder-list', '.tools-app-list-body', '.translation-editor-textarea'])('nested scrolling in %s retains native behavior', (selector) => {
    mount();
    expect(wheel(1, selector)).toBe(false);
    expect(options.setExpandTab).not.toHaveBeenCalled();
  });
  it('forward backward zero and wrap navigation derive real direction then unsubscribe', () => {
    mount();
    expect(wheel(1)).toBe(true);
    expect(options.setExpandTab).toHaveBeenLastCalledWith('song');
    expect(options.setSlideDir).toHaveBeenLastCalledWith('right');
    options.expandTabRef.current = 'song';
    wheel(-1);
    expect(options.setExpandTab).toHaveBeenLastCalledWith('overview');
    expect(options.setSlideDir).toHaveBeenLastCalledWith('left');
    options.expandTabRef.current = 'overview';
    wheel(0);
    expect(options.setExpandTab).toHaveBeenLastCalledWith('tools');
    expect(options.setSlideDir).toHaveBeenLastCalledWith('right');
    options.expandTabRef.current = 'tools';
    wheel(1);
    expect(options.setSlideDir).toHaveBeenLastCalledWith('left');
    unmountHook();
    expect(wheel(1)).toBe(false);
  });
  it('public nav list missing current tab prevents update after canceling default', () => {
    options.navDotsRef.current = ['song'];
    mount();
    expect(wheel(1)).toBe(true);
    expect(options.setExpandTab).not.toHaveBeenCalled();
  });
  it.each(['hover', 'maxExpand'] as const)('special %s destination executes action without changing ordinary tab', (destination) => {
    options.navDotsRef.current = ['overview', destination] as NavDotId[];
    mount();
    wheel(1);
    expect(destination === 'hover' ? options.setHover : options.handleSetMaxExpand).toHaveBeenCalledOnce();
    expect(options.setExpandTab).not.toHaveBeenCalled();
  });
  it('updated maxExpand action is read from public latest render without duplicate listeners', () => {
    options.navDotsRef.current = ['overview', 'maxExpand'];
    mount();
    const latest = vi.fn<() => void>();
    options = {
      ...options,
      handleSetMaxExpand: latest
    };
    mount();
    wheel(1);
    expect(latest).toHaveBeenCalledOnce();
  });
  it('activity transition removes then restores native listener', () => {
    mount();
    context.active = false;
    mount();
    expect(wheel(1)).toBe(false);
    context.active = true;
    mount();
    expect(wheel(1)).toBe(true);
  });
});
