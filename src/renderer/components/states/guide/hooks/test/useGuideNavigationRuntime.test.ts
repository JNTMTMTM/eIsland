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
 * @file useGuideNavigationRuntime.test.ts
 * @description 验证引导导航真实分页和卡片滚轮Hook的组合、冷却、边界及完成回调。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { useGuideNavigation } from '../useGuideNavigation';
import type { GuidePage } from '../../config/guideContentConfig';
import type { WheelEvent } from 'react';

vi.mock('react', async (load) => ({ ...await load<typeof import('react')>(), ...hookMocks, ...lifecycleHooks }));
const guidePages: GuidePage[] = [
  { title: 'Basic', desc: 'Interaction', interactive: 'basic' },
  { title: 'Music', desc: 'Music playback', interactive: 'music' },
  { title: 'Tools', desc: 'Useful tools', interactive: 'tools' },
  { title: 'Settings', desc: 'Settings', interactive: 'settings' },
  { title: 'Finish', desc: 'Ready' },
];
/** 执行真实分页与卡片滚轮组合。
 * @returns 导航公开状态与事件。
 */
function render() {
  const value = renderWithHooks(() => useGuideNavigation({
    guidePages, interactionCardsLength: 4, musicCardsLength: 3, toolCardsLength: 4, settingCardsLength: 3,
  }));
  runEffects();
  return value;
}
/** 发送公开卡片滚轮输入。
 * @param deltaY - 正数向后，负数向前。
 * @returns 合法 React 事件边界。
 */
function wheel(deltaY: number): WheelEvent {
  return { deltaY, stopPropagation: vi.fn() } as unknown as WheelEvent;
}

describe('引导导航真实分页和滚轮组合', () => {
  beforeEach(() => { resetLifecycle(); vi.useFakeTimers(); });
  afterEach(() => { render().resetGuideState(); unmountHooks(); vi.useRealTimers(); });

  it('卡片滚轮推进、冷却、倒退和页面切换使用真实子Hook', () => {
    let state = render();
    expect(state.page).toBe(0);
    expect(state.cardIndex).toBe(0);
    state.handleCardWheel(wheel(28));
    expect(render().cardIndex).toBe(1);
    render().handleCardWheel(wheel(28));
    expect(render().cardIndex).toBe(1);
    vi.advanceTimersByTime(400);
    render().handleCardWheel(wheel(-28));
    state = render();
    expect(state.cardIndex).toBe(0);
    expect(state.animDirRef.current).toBe('up');
    state.handleNext(vi.fn());
    state = render();
    expect(state.page).toBe(1);
    expect(render().cardIndex).toBe(0);
  });

  it('页面边界、函数式设置和完成回调保持公开导航语义', () => {
    const finish = vi.fn();
    render().handlePrev();
    expect(render().page).toBe(0);
    render().setPage((page) => page + 3);
    expect(render().page).toBe(3);
    render().handleNext(finish);
    expect(render().isLast).toBe(true);
    render().handleNext(finish);
    expect(finish).toHaveBeenCalledOnce();
    render().handlePrev();
    expect(render().page).toBe(3);
  });
});
