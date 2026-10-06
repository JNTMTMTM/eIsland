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
 * @file useSendCooldown.test.ts
 * @description 验证码冷却真实状态递减、状态提交边界与 effect 清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { useSendCooldown } from '../useSendCooldown';
import { renderWithHooks, resetBrowser, runEffects, unmountHooks } from './authHookHarness';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(() => { vi.useFakeTimers(); resetBrowser(); });
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('useSendCooldown 真实状态与 effect', () => {
  it('从两秒递减到零后停止注册定时器', () => {
    let result = renderWithHooks(useSendCooldown);
    runEffects();
    expect(result.cooldownSeconds).toBe(0);
    result.setCooldown(2);
    result = renderWithHooks(useSendCooldown); runEffects();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1000);
    result = renderWithHooks(useSendCooldown); runEffects();
    expect(result.cooldownSeconds).toBe(1);
    vi.advanceTimersByTime(1000);
    result = renderWithHooks(useSendCooldown); runEffects();
    expect(result.cooldownSeconds).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('新状态尚未提交 effect 时旧回调不会把零减成负数', () => {
    let result = renderWithHooks(useSendCooldown);
    result.setCooldown(1);
    result = renderWithHooks(useSendCooldown); runEffects();
    result.setCooldown(0);
    vi.advanceTimersByTime(1000);
    result = renderWithHooks(useSendCooldown); runEffects();
    expect(result.cooldownSeconds).toBe(0);
  });
  it('负数不启动倒计时，依赖替换与卸载清除旧定时器', () => {
    let result = renderWithHooks(useSendCooldown);
    result.setCooldown(-1);
    result = renderWithHooks(useSendCooldown); runEffects();
    expect(vi.getTimerCount()).toBe(0);
    result.setCooldown(3);
    result = renderWithHooks(useSendCooldown); runEffects();
    result.setCooldown(9);
    renderWithHooks(useSendCooldown); runEffects();
    expect(vi.getTimerCount()).toBe(1);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });
});
