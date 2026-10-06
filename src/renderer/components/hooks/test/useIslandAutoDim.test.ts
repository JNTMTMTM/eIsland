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
 * @file useIslandAutoDim.test.ts
 * @description 自动透明度 Hook 的真实鼠标工具、CSS 叶边界、运行时设置与卸载恢复测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { browser, renderWithHooks, resetBrowser, runEffects, settle, unmountHooks } from '../../states/register/hooks/test/authHookHarness';
import { useIslandAutoDim } from '../useIslandAutoDim';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
const values = new Map<string, string>();
const style = {
  getPropertyValue: vi.fn((key: string) => values.get(key) ?? ''),
  setProperty: vi.fn((key: string, value: string) => { values.set(key, value); }),
};
const mouse = vi.fn(() => Promise.resolve({ mousePosition: { x: -1, y: 10 }, bounds: { x: 0, y: 0, width: 100, height: 100 } }));
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(0); resetBrowser(); values.clear(); values.set('--island-opacity', '80');
  style.setProperty.mockImplementation((key, value) => { values.set(key, value); });
  mouse.mockImplementation(() => Promise.resolve({ mousePosition: { x: -1, y: 10 }, bounds: { x: 0, y: 0, width: 100, height: 100 } }));
  vi.stubGlobal('document', { documentElement: { style } });
  vi.stubGlobal('window', Object.assign(browser, { api: { ...browser.api, getMouseWindowState: mouse } }));
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 用当前可变配置引用提交真实 Hook。
 * @param enabled - 是否开启自动降透明度。
 * @param delay - 闲置等待秒数。
 * @returns 调用方配置引用。
 */
function mount(enabled = true, delay = 2) {
  const input = { autoDimEnabledRef: { current: enabled }, autoDimDelayRef: { current: delay } };
  renderWithHooks(() => useIslandAutoDim(input)); runEffects(); return input;
}
describe('useIslandAutoDim 实际 CSS 和原生鼠标边界', () => {
  it('关闭时不定位鼠标且不改变 CSS', async () => {
    mount(false); await vi.advanceTimersByTimeAsync(3000);
    expect(mouse).not.toHaveBeenCalled(); expect(style.setProperty).not.toHaveBeenCalled();
  });
  it('达到延迟才降到10，已降低时不重复写入；进入恢复原始值', async () => {
    mount(); await vi.advanceTimersByTimeAsync(1000); expect(values.get('--island-opacity')).toBe('80');
    await vi.advanceTimersByTimeAsync(1000); expect(values.get('--island-opacity')).toBe('10');
    await vi.advanceTimersByTimeAsync(1000); expect(style.setProperty).toHaveBeenCalledOnce();
    mouse.mockResolvedValue({ mousePosition: { x: 10, y: 10 }, bounds: { x: 0, y: 0, width: 100, height: 100 } });
    await vi.advanceTimersByTimeAsync(1000); expect(values.get('--island-opacity')).toBe('80');
    await vi.advanceTimersByTimeAsync(1000); expect(style.setProperty).toHaveBeenCalledTimes(2);
  });
  it('鼠标在窗口内重置闲置时间，离开后重新等待延迟', async () => {
    mount(); mouse.mockResolvedValue({ mousePosition: { x: 10, y: 10 }, bounds: { x: 0, y: 0, width: 100, height: 100 } });
    await vi.advanceTimersByTimeAsync(4000); expect(style.setProperty).not.toHaveBeenCalled();
    mouse.mockResolvedValue({ mousePosition: { x: -1, y: 10 }, bounds: { x: 0, y: 0, width: 100, height: 100 } });
    await vi.advanceTimersByTimeAsync(1000); expect(style.setProperty).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000); expect(values.get('--island-opacity')).toBe('10');
  });
  it('运行时关闭设置立即在下一轮恢复，重新开启使用最新延迟', async () => {
    const input = mount(); await vi.advanceTimersByTimeAsync(2000);
    input.autoDimEnabledRef.current = false; await vi.advanceTimersByTimeAsync(1000); expect(values.get('--island-opacity')).toBe('80');
    input.autoDimDelayRef.current = 20; input.autoDimEnabledRef.current = true; await vi.advanceTimersByTimeAsync(1000);
    expect(values.get('--island-opacity')).toBe('80');
  });
  it.each(['', 'invalid', '9', 'Infinity', '10'])('原始透明度合法性边界：%s', async (original) => {
    values.set('--island-opacity', original); mount(); await vi.advanceTimersByTimeAsync(2000);
    expect(values.get('--island-opacity')).toBe('10'); unmountHooks();
    expect(values.get('--island-opacity')).toBe(original === '10' ? '10' : '100'); expect(vi.getTimerCount()).toBe(0);
  });
  it('达到降低时重新读取用户的最新透明度，卸载恢复并清理轮询', async () => {
    mount(); values.set('--island-opacity', '60'); await vi.advanceTimersByTimeAsync(2000);
    unmountHooks(); expect(values.get('--island-opacity')).toBe('60'); expect(vi.getTimerCount()).toBe(0);
  });
  it('CSS叶边界抛错被当前tick处理，下一轮仍可降低与恢复', async () => {
    mount(); style.setProperty.mockImplementationOnce(() => { throw new Error('style-unavailable'); });
    await vi.advanceTimersByTimeAsync(2000); expect(values.get('--island-opacity')).toBe('80');
    await vi.advanceTimersByTimeAsync(1000); expect(values.get('--island-opacity')).toBe('10');
    unmountHooks(); expect(values.get('--island-opacity')).toBe('80');
  });
  it('配置引用替换清理旧定时器，并保持只有一个新轮询', async () => {
    mount(); renderWithHooks(() => useIslandAutoDim({ autoDimEnabledRef: { current: false }, autoDimDelayRef: { current: 5 } })); runEffects();
    await vi.advanceTimersByTimeAsync(3000); expect(mouse).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(1);
  });
  it('卸载后未完成的鼠标定位返回窗口外，仍保持原透明度', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof mouse>>) => void;
    mouse.mockImplementationOnce(() => new Promise((accept) => { resolve = accept; }));
    mount(); await vi.advanceTimersByTimeAsync(1000); vi.setSystemTime(2000); unmountHooks();
    resolve({ mousePosition: { x: -1, y: 10 }, bounds: { x: 0, y: 0, width: 100, height: 100 } }); await settle();
    expect(values.get('--island-opacity')).toBe('80'); expect(style.setProperty).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
});
