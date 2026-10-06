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
 * @file useIslandEscapeNavigationRuntime.test.ts
 * @description Escape 导航 Hook 真实监听、层级返回、编辑目标与局部弹层边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIslandEscapeNavigation } from '../useIslandEscapeNavigation';
import { flushHookEffects, renderHook, resetHook, unmountHook } from './startupHookHarness';
import type { IslandState } from '../useDynamicIslandShell';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('./startupHookHarness');
  return createHookReactMock(actual);
});
/** 模拟原生目标边界，保留实际 instanceof/标签判定。 */
class NativeElement extends EventTarget {
  tagName: string;

  isContentEditable: boolean; /** 创建原生目标。
                               * @param tagName - 标签名
                               * @param editable - 原生可编辑标记
                               */

  constructor(tagName: string, editable = false) {
    super();
    this.tagName = tagName;
    this.isContentEditable = editable;
  }
}
let callback: ((event: KeyboardEvent) => void) | undefined;
const add = vi.fn<(type: string, listener: (event: KeyboardEvent) => void) => void>();
const remove = vi.fn<(type: string, listener: (event: KeyboardEvent) => void) => void>();
const query = vi.fn<(selector: string) => EventTarget | null>();
const idle = vi.fn();
const hover = vi.fn();
const expanded = vi.fn();
/** 提交真实键盘监听。
 * @param state - 当前状态
 */
function mount(state: IslandState = 'maxExpand'): void {
  renderHook(useIslandEscapeNavigation, {
    state,
    setIdle: idle,
    setHover: hover,
    setExpanded: expanded
  });
  flushHookEffects();
}
/** 提交原生键盘叶事件。
 * @param overrides - 键盘边界属性
 * @param overrides.key - 键名
 * @param overrides.repeat - 重复输入标记
 * @param overrides.target - 原生目标
 * @param overrides.prevented - 已取消标记
 * @returns 实际可取消事件
 */
function emit(overrides: {
  key?: string;
  repeat?: boolean;
  target?: EventTarget | null;
  prevented?: boolean;
} = {}): Event {
  const event = new Event('keydown', {
    cancelable: true
  });
  Object.defineProperties(event, {
    key: {
      value: overrides.key ?? 'Escape'
    },
    repeat: {
      value: overrides.repeat ?? false
    },
    target: {
      value: overrides.target ?? null
    }
  });
  if (overrides.prevented) event.preventDefault();
  callback?.(event as KeyboardEvent);
  return event;
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  callback = undefined;
  query.mockReturnValue(null);
  add.mockImplementation((...[, listener]) => {
    callback = listener;
  });
  vi.stubGlobal('HTMLElement', NativeElement);
  vi.stubGlobal('window', {
    addEventListener: add,
    removeEventListener: remove
  });
  vi.stubGlobal('document', {
    querySelector: query
  });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('useIslandEscapeNavigation runtime', () => {
  it.each(['maxExpand', 'expanded', 'questionnaire', 'hover'] as const)('navigates actual %s hierarchy and prevents default', (state) => {
    mount(state);
    expect(emit().defaultPrevented).toBe(true);
    expect(expanded).toHaveBeenCalledTimes(state === 'maxExpand' ? 1 : 0);
    expect(hover).toHaveBeenCalledTimes(state === 'expanded' || state === 'questionnaire' ? 1 : 0);
    expect(idle).toHaveBeenCalledTimes(state === 'hover' ? 1 : 0);
  });
  it('idle has no parent and leaves native event untouched', () => {
    mount('idle');
    expect(emit().defaultPrevented).toBe(false);
    expect(idle).not.toHaveBeenCalled();
    expect(hover).not.toHaveBeenCalled();
    expect(expanded).not.toHaveBeenCalled();
  });
  it.each([{
    key: 'Enter'
  }, {
    repeat: true
  }, {
    prevented: true
  }])('ignores already owned or repeated keyboard event %j', (overrides) => {
    mount();
    emit(overrides);
    expect(expanded).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
  it.each([['INPUT', false], ['textarea', false], ['SELECT', false], ['DIV', true]] as const)('editable native %s/%s owns Escape', (tag, editable) => {
    mount();
    expect(emit({
      target: new NativeElement(tag, editable)
    }).defaultPrevented).toBe(false);
    expect(expanded).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
  it('noneditable element follows island navigation and local overlay blocks global Escape', () => {
    mount();
    const target = new NativeElement('DIV');
    expect(emit({
      target
    }).defaultPrevented).toBe(true);
    query.mockReturnValue(target);
    expect(emit({
      target
    }).defaultPrevented).toBe(false);
    expect(expanded).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('.album-viewer, .slider-captcha-overlay');
  });
  it('state changes remove exact old listener then install new state; unmount removes current listener', () => {
    mount('maxExpand');
    const original = callback;
    mount('hover');
    expect(remove).toHaveBeenCalledWith('keydown', original);
    emit();
    expect(idle).toHaveBeenCalledTimes(1);
    const latest = callback;
    unmountHook();
    expect(remove).toHaveBeenLastCalledWith('keydown', latest);
    expect(add).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
