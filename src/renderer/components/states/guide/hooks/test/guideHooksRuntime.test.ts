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
 * @file guideHooksRuntime.test.ts
 * @description 真实引导分页缓存、公开状态变更和卡片滚轮冷却分支测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHookReactMock, flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import type { WheelEvent } from 'react';
import type { GuidePage } from '../../config/guideContentConfig';
let useGuidePage: typeof import('../useGuidePage').useGuidePage;
let useGuideCardScroll: typeof import('../useGuideCardScroll').useGuideCardScroll;
const finish = vi.fn();
/** 构造真实滚轮处理器所需的原生事件。
 * @param deltaY - 方向
 * @returns 浏览器事件
 */
function wheel(deltaY: number) {
  return {
    deltaY,
    stopPropagation: vi.fn()
  } as unknown as WheelEvent;
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  ({
    useGuidePage
  } = await import('../useGuidePage'));
  ({
    useGuideCardScroll
  } = await import('../useGuideCardScroll'));
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
});
describe('guide state hooks actual public contract', () => {
  it('next/previous clamp first page, finish last and both setter forms preserve page cache across remount', () => {
    const run = () => renderHook(useGuidePage, 3);
    run();
    flushHookEffects();
    run().handlePrev();
    expect(run().page).toBe(0);
    run().handleNext(finish);
    expect(run().page).toBe(1);
    run().setPage((prev) => prev + 1);
    expect(run().isLast).toBe(true);
    run().handleNext(finish);
    expect(finish).toHaveBeenCalledOnce();
    run().setPage(1);
    run();
    flushHookEffects();
    unmountHook();
    resetHook();
    expect(run().page).toBe(1);
    run().resetGuideState();
    unmountHook();
    resetHook();
    expect(run().page).toBe(0);
  });
  it('shrinking and empty page counts clamp an already cached high page to nonnegative bounds', () => {
    renderHook(useGuidePage, 4).setPage(3);
    renderHook(useGuidePage, 4);
    flushHookEffects();
    renderHook(useGuidePage, 1);
    flushHookEffects();
    expect(renderHook(useGuidePage, 1).page).toBe(0);
    renderHook(useGuidePage, 0);
    flushHookEffects();
    expect(renderHook(useGuidePage, 0).page).toBe(0);
  });
  it.each(['basic', 'music', 'tools', 'settings'] as const)('real %s page uses its corresponding card count and throttles repeated wheel', (kind) => {
    const guidePages: GuidePage[] = [{
      title: 'page',
      desc: 'details',
      interactive: kind
    }, {
      title: 'plain',
      desc: 'plain'
    }];
    const counts = {
      basic: 2,
      music: 3,
      tools: 4,
      settings: 5
    };
    const props = {
      guidePages,
      page: 0,
      interactionCardsLength: 2,
      musicCardsLength: 3,
      toolCardsLength: 4,
      settingCardsLength: 5
    };
    const run = () => renderHook(useGuideCardScroll, props);
    run();
    flushHookEffects();
    const stopPropagation = vi.fn();
    const down = {
      stopPropagation,
      deltaY: 1
    } as unknown as WheelEvent;
    run().handleCardWheel(down);
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(run().cardIndex).toBe(1);
    run().handleCardWheel(wheel(1));
    expect(run().cardIndex).toBe(1);
    for (let i = 0; i < 7; i++) {
      vi.advanceTimersByTime(400);
      run().handleCardWheel(wheel(1));
    }
    expect(run().cardIndex).toBe(counts[kind] - 1);
    vi.advanceTimersByTime(400);
    run().handleCardWheel(wheel(-1));
    expect(run().animDirRef.current).toBe('up');
    vi.advanceTimersByTime(400);
    run().handleCardWheel(wheel(0));
    expect(run().cardIndex).toBe(counts[kind] - 2);
    renderHook(useGuideCardScroll, {
      ...props,
      page: 1
    });
    flushHookEffects();
    expect(renderHook(useGuideCardScroll, {
      ...props,
      page: 1
    }).cardIndex).toBe(0);
    renderHook(useGuideCardScroll, {
      ...props,
      page: 5
    });
    flushHookEffects();
    expect(renderHook(useGuideCardScroll, {
      ...props,
      page: 5
    }).cardIndex).toBe(0);
  });
  it('upwards wheel cannot leave first card and page changes reset visible index', () => {
    const props = {
      page: 0,
      guidePages: [{
        title: 'basic',
        desc: 'details',
        interactive: 'basic' as const
      }],
      interactionCardsLength: 3,
      musicCardsLength: 3,
      toolCardsLength: 3,
      settingCardsLength: 3
    };
    const run = () => renderHook(useGuideCardScroll, props);
    run();
    flushHookEffects();
    run().handleCardWheel(wheel(-1));
    expect(run().cardIndex).toBe(0);
    expect(run().animDirRef.current).toBe('up');
  });
});
