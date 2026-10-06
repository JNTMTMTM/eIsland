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
 * @file todoIconsRuntime.test.tsx
 * @description 真实任务图标、数字双帧滚动与计时器清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../states/maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { elements, find, text } from '../../../../../states/test/tree';
import { ArrowIcon, CheckIcon, DashedIcon, FilledCheckIcon, RollingCount, RollDigit, classNames } from '../todoIcons';
beforeEach(() => {
  resetHook();
  vi.useFakeTimers();
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('todoIcons runtime', () => {
  it.each([ArrowIcon, CheckIcon, DashedIcon])('real SVG active class and shape for %s', (icon) => {
    const active = icon({
      active: true
    });
    const idle = icon({});
    expect(find(active, (n) => n.type === 'svg').props.className).not.toBe(find(idle, (n) => n.type === 'svg').props.className);
    expect(elements(active).length).toBeGreaterThan(1);
    expect(classNames('base')).toBe('base');
    expect(classNames('base', false)).toBe('base');
    expect(FilledCheckIcon().type).toBe('svg');
  });
  it('counter splits real digits and changed character rolls over two native frames then clears', async () => {
    const counter = RollingCount({
      value: '2/3'
    });
    expect(find(counter, (n) => n.type === 'span').props['aria-label']).toBe('2/3');
    expect(elements(counter).filter((n) => n.type === RollDigit)).toHaveLength(3);
    expect(text(renderHook(() => RollDigit({
      character: '1'
    })))).toBe('1');
    flushHookEffects();
    renderHook(() => RollDigit({
      character: '2'
    }));
    flushHookEffects();
    expect(text(renderHook(() => RollDigit({
      character: '2'
    })))).toBe('12');
    await vi.advanceTimersByTimeAsync(32);
    const rolled = renderHook(() => RollDigit({
      character: '2'
    }));
    expect(elements(rolled).some((n) => String(n.props.className).includes('rolled'))).toBe(true);
    await vi.advanceTimersByTimeAsync(348);
    expect(text(renderHook(() => RollDigit({
      character: '2'
    })))).toBe('2');
  });
  it('character change replaces pending frame/timer and unmount clears both native resources', async () => {
    renderHook(() => RollDigit({
      character: '1'
    }));
    flushHookEffects();
    renderHook(() => RollDigit({
      character: '2'
    }));
    flushHookEffects();
    expect(vi.getTimerCount()).toBe(2);
    renderHook(() => RollDigit({
      character: '3'
    }));
    flushHookEffects();
    expect(vi.getTimerCount()).toBe(2);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(400);
  });
});
