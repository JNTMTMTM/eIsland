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
 * @file usePickerAutoFocus.test.ts
 * @description 城市选择器延迟聚焦、缺失元素、关闭与卸载取消计时器测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePickerAutoFocus } from '../usePickerAutoFocus';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const focus = vi.fn<(options?: FocusOptions) => void>();
/**
 * 提交真实聚焦 effect 并返回公开 ref。
 * @param visible - 当前面板可见性。
 * @returns 搜索输入框 ref。
 */
function view(visible: boolean) {
  const ref = renderWithHooks(() => usePickerAutoFocus(visible));
  runEffects();
  return ref;
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
});
describe('usePickerAutoFocus element lifecycle', () => {
  it('schedules focus only for an open panel and focuses the currently attached element', () => {
    view(false);
    expect(vi.getTimerCount()).toBe(0);
    view(true).current = { focus } as unknown as HTMLInputElement;
    vi.advanceTimersByTime(49);
    expect(focus).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
  it('accepts missing refs when the delayed callback runs', () => {
    view(true);
    vi.advanceTimersByTime(50);
    expect(focus).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['close', 'unmount'])('cancels pending focus on %s', (action) => {
    view(true).current = { focus } as unknown as HTMLInputElement;
    if (action === 'close') view(false);
    else unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(50);
    expect(focus).not.toHaveBeenCalled();
  });
});
