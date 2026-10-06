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
 * @file useBeijingClock.test.ts
 * @description 北京时间Hook 的真实分钟边界、最短调度延迟、启用切换与定时器清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { useBeijingClock } from '../useBeijingClock';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(() => { resetLifecycle(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:30Z')); });
afterEach(() => { unmountHooks(); vi.useRealTimers(); });
/**
 * 提交真实定时器effect后读取北京时间。
 * @param enabled - 是否启用时钟。
 * @returns 当前格式化的北京时间。
 */
function commit(enabled: boolean): string {
  renderWithHooks(() => useBeijingClock(enabled)); runEffects(); return renderWithHooks(() => useBeijingClock(enabled));
}
describe('北京时间分钟边界', () => {
  it('禁用时返回空文本且无定时器，启用后才显示北京时间', () => {
    expect(commit(false)).toBe(''); expect(vi.getTimerCount()).toBe(0);
    expect(commit(true)).toBe('08:00'); expect(vi.getTimerCount()).toBe(1);
  });
  it('按下一分钟边界更新，而非每秒更新，卸载清理下一分钟请求', async () => {
    expect(commit(true)).toBe('08:00'); await vi.advanceTimersByTimeAsync(29999);
    expect(commit(true)).toBe('08:00'); await vi.advanceTimersByTimeAsync(1);
    expect(commit(true)).toBe('08:01'); expect(vi.getTimerCount()).toBe(1);
    unmountHooks(); expect(vi.getTimerCount()).toBe(0);
  });
  it('午夜边界的10ms距离使用50ms最短延迟，跨日后显示00:00', async () => {
    vi.setSystemTime(new Date('2026-01-01T15:59:59.990Z')); expect(commit(true)).toBe('23:59');
    await vi.advanceTimersByTimeAsync(49); expect(commit(true)).toBe('23:59');
    await vi.advanceTimersByTimeAsync(1); expect(commit(true)).toBe('00:00');
  });
  it('关闭清理定时器但保留最后文本，同一分钟重新启用复用文本且只有一个定时器', () => {
    expect(commit(true)).toBe('08:00'); expect(commit(false)).toBe('08:00'); expect(vi.getTimerCount()).toBe(0);
    expect(commit(true)).toBe('08:00'); expect(vi.getTimerCount()).toBe(1);
  });
});
