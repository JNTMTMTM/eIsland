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
 * @file useIslandHoverInteraction.test.ts
 * @description 悬停交互 Hook 的真实鼠标工具、状态配置、歌词比对、轮询与资源清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { browser, renderWithHooks, resetBrowser, runEffects, settle, unmountHooks } from '../../states/register/hooks/test/authHookHarness';
import useIslandStore from '../../../store/isLandStore';
import { useIslandHoverInteraction } from '../useIslandHoverInteraction';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
type Options = Parameters<typeof useIslandHoverInteraction>[0];
const mouse = vi.fn(() => Promise.resolve({ mousePosition: { x: 20, y: 20 }, bounds: { x: 0, y: 0, width: 100, height: 100 } }));
const query = vi.fn(() => null as object | null);
beforeEach(() => {
  vi.useFakeTimers(); resetBrowser(); query.mockReturnValue(null); mouse.mockImplementation(() => Promise.resolve({ mousePosition: { x: 20, y: 20 }, bounds: { x: 0, y: 0, width: 100, height: 100 } }));
  vi.stubGlobal('document', { querySelector: query });
  vi.stubGlobal('window', Object.assign(browser, { api: { ...browser.api, getMouseWindowState: mouse } }));
  useIslandStore.setState({ uiStateLocked: false, isPlaying: false, syncedLyrics: null, translationLyrics: null, lyricsLoading: false, currentPositionMs: 0,
    timerData: { ...useIslandStore.getState().timerData, state: 'idle' } });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 创建来自调用方的真实参数边界与可观察回调。
 * @param state - 灵动岛状态。
 * @returns 交互 Hook 参数。
 */
function options(state: Options['state'] = 'idle') {
  return { state, setHover: vi.fn(), setIdle: vi.fn(), setLyrics: vi.fn(), setLyricsTranslation: vi.fn(), setHoverTab: vi.fn(),
    isHoveringRef: { current: false }, idleClickExpandRef: { current: false }, expandLeaveIdleRef: { current: false }, maxExpandLeaveIdleRef: { current: false },
    enterTimerRef: { current: null as ReturnType<typeof setTimeout> | null }, leaveTimerRef: { current: null as ReturnType<typeof setTimeout> | null } };
}
/**
 * 让鼠标定位叶边界返回窗口外的坐标。
 * @returns 无返回值。
 */
function outside(): void {
  mouse.mockResolvedValue({ mousePosition: { x: -1, y: 20 }, bounds: { x: 0, y: 0, width: 100, height: 100 } });
}
/**
 * 执行目标 effect 以及新注册的进入/离开回调。
 * @param input - 当前交互参数。
 * @returns 当前轮异步操作完成结果。
 */
async function mount(input: Options): Promise<void> {
  renderWithHooks(() => useIslandHoverInteraction(input)); runEffects(); await settle(); await vi.advanceTimersByTimeAsync(1);
}
describe('useIslandHoverInteraction 真实轮询和状态交互', () => {
  it.each(['idle', 'lyrics', 'lyricsTranslation', 'hover'] as const)('窗口内 %s 自动进入 hover 并选择歌词页', async (state) => {
    const input = options(state); await mount(input);
    expect(input.setHover).toHaveBeenCalledOnce(); expect(input.isHoveringRef.current).toBe(true);
    expect(input.setHoverTab.mock.calls).toEqual(state === 'lyrics' || state === 'lyricsTranslation' ? [['lyrics']] : []);
    expect(browser.api.disableMousePassthrough).toHaveBeenCalledTimes(state === 'hover' ? 0 : 1);
    await vi.advanceTimersByTimeAsync(50); expect(input.setHover).toHaveBeenCalledOnce();
  });
  it.each(['idle', 'lyrics', 'lyricsTranslation'] as const)('点击展开模式 %s 只禁用穿透，退出恢复且重复请求去重', async (state) => {
    const input = options(state); input.idleClickExpandRef.current = true; await mount(input);
    expect(input.setHover).not.toHaveBeenCalled(); expect(browser.api.disableMousePassthrough).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(50); expect(browser.api.disableMousePassthrough).toHaveBeenCalledOnce();
    outside(); await vi.advanceTimersByTimeAsync(50); expect(browser.api.enableMousePassthrough).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(50); expect(browser.api.enableMousePassthrough).toHaveBeenCalledOnce();
  });
  it('forceClickToHover 在 ref 关闭时仍保持点击展开', async () => {
    const input = { ...options(), forceClickToHover: true }; await mount(input);
    expect(input.setHover).not.toHaveBeenCalled(); outside(); await vi.advanceTimersByTimeAsync(50);
    expect(browser.api.enableMousePassthrough).toHaveBeenCalledOnce();
  });
  it.each(['notification', 'agent', 'stt', 'cli', 'agentVoiceInput', 'guide', 'login', 'register', 'resetPassword', 'payment', 'announcement', 'questionnaire', 'musicProvidersLogin'] as const)('专用面板 %s 在窗口内禁用穿透，窗口外不退出', async (state) => {
    const input = options(state); await mount(input); outside(); await vi.advanceTimersByTimeAsync(50);
    expect(browser.api.disableMousePassthrough).toHaveBeenCalledOnce(); expect(input.setHover).not.toHaveBeenCalled(); expect(input.setIdle).not.toHaveBeenCalled();
  });
  it.each(['setPassword', 'bindOAuth', 'bindEmail'] as const)('认证面板 %s 的离开保护保留状态', async (state) => {
    const input = options(state); input.isHoveringRef.current = true; outside(); await mount(input);
    expect(input.setIdle).not.toHaveBeenCalled(); expect(input.leaveTimerRef.current).toBeNull();
  });
  it.each(['expanded', 'maxExpand'] as const)('%s 离开开关控制退回 idle', async (state) => {
    const input = options(state); outside(); await mount(input);
    expect(input.isHoveringRef.current).toBe(true); expect(input.setIdle).not.toHaveBeenCalled();
    input.expandLeaveIdleRef.current = true; input.maxExpandLeaveIdleRef.current = true; await vi.advanceTimersByTimeAsync(50);
    expect(input.setIdle).toHaveBeenCalledWith(true); expect(input.isHoveringRef.current).toBe(false);
  });
  it('UI锁定清理进入和离开定时器，随后继续检查', async () => {
    const input = options(); input.enterTimerRef.current = setTimeout(vi.fn(), 10000) as unknown as ReturnType<typeof setTimeout>; input.leaveTimerRef.current = setTimeout(vi.fn(), 10000) as unknown as ReturnType<typeof setTimeout>;
    useIslandStore.setState({ uiStateLocked: true }); await mount(input);
    expect(input.enterTimerRef.current).toBeNull(); expect(input.leaveTimerRef.current).toBeNull(); expect(input.setHover).not.toHaveBeenCalled();
    useIslandStore.setState({ uiStateLocked: false }); await vi.advanceTimersByTimeAsync(50); expect(input.setHover).toHaveBeenCalledOnce();
  });
  it('滑块覆盖层取消离开，保持 hover 并禁用穿透', async () => {
    const input = options(); input.leaveTimerRef.current = setTimeout(vi.fn(), 10000) as unknown as ReturnType<typeof setTimeout>; query.mockReturnValue({}); outside(); await mount(input);
    expect(input.leaveTimerRef.current).toBeNull(); expect(input.isHoveringRef.current).toBe(true); expect(input.setIdle).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(50); expect(browser.api.disableMousePassthrough).toHaveBeenCalledOnce();
  });
  it('重新进入清理离开定时器；已排定进入定时器不会重复安排', async () => {
    const input = options(); input.leaveTimerRef.current = setTimeout(vi.fn(), 10000) as unknown as ReturnType<typeof setTimeout>; input.enterTimerRef.current = setTimeout(vi.fn(), 10000) as unknown as ReturnType<typeof setTimeout>;
    await mount(input); expect(input.leaveTimerRef.current).toBeNull(); expect(input.setHover).not.toHaveBeenCalled();
    outside(); await vi.advanceTimersByTimeAsync(50); expect(input.enterTimerRef.current).toBeNull();
  });
  it('进入回调触发前调用方已进入 hover，回调不重复切换', async () => {
    const input = options(); renderWithHooks(() => useIslandHoverInteraction(input)); runEffects(); await settle();
    input.isHoveringRef.current = true; await vi.advanceTimersByTimeAsync(1); expect(input.setHover).not.toHaveBeenCalled();
  });
  it('离开回调触发前 hover 已清除，回调不重复切换', async () => {
    const input = options('hover'); input.isHoveringRef.current = true; outside();
    renderWithHooks(() => useIslandHoverInteraction(input)); runEffects(); await settle(); input.isHoveringRef.current = false;
    await vi.advanceTimersByTimeAsync(1); expect(input.setIdle).not.toHaveBeenCalled();
  });
  it.each([
    ['paused', false, false, 'idle'], ['timer', true, false, 'running'], ['loading', true, true, 'idle'], ['lyrics', true, false, 'idle'],
  ] as const)('离开 hover 时根据 %s 选择歌词或 idle', async (scenario, isPlaying, lyricsLoading, timerState) => {
    const input = options('hover'); input.isHoveringRef.current = true; outside();
    useIslandStore.setState({ isPlaying, lyricsLoading, syncedLyrics: scenario === 'lyrics' ? [{ time_ms: 0, text: 'Original' }] : null,
      timerData: { ...useIslandStore.getState().timerData, state: timerState } });
    await mount(input);
    expect(input.setLyrics).toHaveBeenCalledTimes(scenario === 'loading' || scenario === 'lyrics' ? 1 : 0);
    expect(input.setIdle).toHaveBeenCalledTimes(scenario === 'loading' || scenario === 'lyrics' ? 0 : 1);
  });
  it.each(['same', 'different', 'empty', 'missing'] as const)('离开时翻译状态 %s 通过真实当前歌词比对决定目标', async (mode) => {
    const input = options('hover'); input.isHoveringRef.current = true; outside();
    const lines = mode === 'empty' ? [] : [{ time_ms: 0, text: mode === 'same' ? 'Original' : 'Translated' }];
    useIslandStore.setState({ isPlaying: true, syncedLyrics: [{ time_ms: 0, text: 'Original' }],
      translationLyrics: { status: 'available', lines: mode === 'missing' ? null : lines } });
    await mount(input);
    expect(input.setLyricsTranslation).toHaveBeenCalledTimes(mode === 'different' ? 1 : 0);
    expect(input.setLyrics).toHaveBeenCalledTimes(mode === 'different' ? 0 : 1);
  });
  it('卸载清理轮询和两类定时器；进行中的定位响应不能改变状态', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof mouse>>) => void;
    mouse.mockImplementationOnce(() => new Promise((accept) => { resolve = accept; }));
    const input = options(); renderWithHooks(() => useIslandHoverInteraction(input)); runEffects(); unmountHooks();
    resolve({ mousePosition: { x: 20, y: 20 }, bounds: { x: 0, y: 0, width: 100, height: 100 } }); await settle();
    expect(input.setHover).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('卸载已调度的检查、进入和离开定时器', async () => {
    const input = options(); renderWithHooks(() => useIslandHoverInteraction(input)); runEffects(); await settle();
    input.leaveTimerRef.current = setTimeout(vi.fn(), 10000) as unknown as ReturnType<typeof setTimeout>; unmountHooks();
    expect(input.enterTimerRef.current).toBeNull(); expect(input.leaveTimerRef.current).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });
  it('缺失原生 API 时实际鼠标工具返回窗口外且退出仍可处理', async () => {
    vi.stubGlobal('window', {}); const input = options(); await mount(input); expect(input.setHover).not.toHaveBeenCalled();
  });
});
