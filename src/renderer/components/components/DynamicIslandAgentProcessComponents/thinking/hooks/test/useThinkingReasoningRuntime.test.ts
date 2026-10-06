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
 * @file useThinkingReasoningRuntime.test.ts
 * @description 思考过程 Hook 真实计时、最新结束回调、持久时长、内容滚动和折叠边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../states/maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { useThinkingReasoning } from '../useThinkingReasoning';
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  vi.stubGlobal('window', {
    setInterval,
    clearInterval
  });
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useThinkingReasoning runtime', () => {
  it.each([undefined, 0, 8])('idle persisted duration %s retains value without timer or callback', (persistedDuration) => {
    const result = renderHook(useThinkingReasoning, false, 'content', {
      persistedDuration
    });
    flushHookEffects();
    expect(result.expanded).toBe(false);
    expect(result.elapsedSeconds).toBe(persistedDuration ?? null);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('absent options remain null and opening/closing with missing viewport works', () => {
    let result = renderHook(useThinkingReasoning, false, '');
    flushHookEffects();
    expect(result.elapsedSeconds).toBeNull();
    result.toggle();
    result = renderHook(useThinkingReasoning, false, '');
    expect(result).toMatchObject({
      expanded: true,
      open: true
    });
    result.toggle();
    expect(renderHook(useThinkingReasoning, false, '')).toMatchObject({
      expanded: false,
      open: false
    });
  });
  it('thinking updates elapsed seconds and ending computes duration using latest callback and clears interval', () => {
    const original = vi.fn<(seconds: number) => void>();
    const latest = vi.fn<(seconds: number) => void>();
    renderHook(useThinkingReasoning, true, 'first', {
      onDurationComputed: original
    });
    flushHookEffects();
    expect(renderHook(useThinkingReasoning, true, 'first').elapsedSeconds).toBe(1);
    vi.advanceTimersByTime(2500);
    expect(renderHook(useThinkingReasoning, true, 'more', {
      onDurationComputed: latest
    }).elapsedSeconds).toBe(2);
    renderHook(useThinkingReasoning, false, 'done', {
      onDurationComputed: latest
    });
    flushHookEffects();
    expect(latest).toHaveBeenCalledWith(3);
    expect(original).not.toHaveBeenCalled();
    expect(renderHook(useThinkingReasoning, false, 'done')).toMatchObject({
      elapsedSeconds: 3,
      open: false,
      expanded: false
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('initial idle becomes thinking, viewport follows new content then reopening starts at top', () => {
    let result = renderHook(useThinkingReasoning, false, '');
    flushHookEffects();
    const viewport = {
      scrollTop: 3,
      scrollHeight: 120
    };
    result.viewportRef.current = viewport as HTMLDivElement;
    renderHook(useThinkingReasoning, true, 'first');
    flushHookEffects();
    expect(viewport.scrollTop).toBe(120);
    viewport.scrollHeight = 240;
    renderHook(useThinkingReasoning, true, 'second');
    flushHookEffects();
    expect(viewport.scrollTop).toBe(240);
    result = renderHook(useThinkingReasoning, true, 'second');
    result.toggle();
    expect(viewport.scrollTop).toBe(0);
    result = renderHook(useThinkingReasoning, true, 'second');
    result.toggle();
    viewport.scrollTop = 9;
    expect(renderHook(useThinkingReasoning, true, 'second').expanded).toBe(true);
    renderHook(useThinkingReasoning, false, 'done');
    flushHookEffects();
    expect(viewport.scrollTop).toBe(9);
    result = renderHook(useThinkingReasoning, false, 'done');
    result.toggle();
    expect(viewport.scrollTop).toBe(0);
    expect(renderHook(useThinkingReasoning, false, 'done').expanded).toBe(true);
  });
  it('unmount active timer stops future updates', () => {
    renderHook(useThinkingReasoning, true, 'content');
    flushHookEffects();
    expect(vi.getTimerCount()).toBe(1);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(3000);
    expect(renderHook(useThinkingReasoning, true, 'content').elapsedSeconds).toBe(1);
  });
});
