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
 * @file useDynamicIslandShell.test.ts
 * @description 灵动岛壳层 Hook 的真实状态点击、外光设置、动画限时保护和监听清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import useIslandStore from '../../../store/isLandStore';
import { useDynamicIslandShell } from '../useDynamicIslandShell';
import { deferredBackground, ipc, resetStandalone, settleBackground, surface, values } from './standaloneIpcHarness';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
type Options = Parameters<typeof useDynamicIslandShell>[0];
const native = {
  expandWindow: vi.fn(), expandWindowFull: vi.fn(), expandWindowNotification: vi.fn(), disableMousePassthrough: vi.fn(),
};
beforeEach(() => {
  vi.useFakeTimers(); resetStandalone();
  vi.stubGlobal('window', Object.assign(surface, { api: { ...ipc, ...native } }));
  useIslandStore.setState({ state: 'idle', uiStateLocked: false, maxExpandAppModeEnabled: false, maxExpandLauncherVisible: false, maxExpandTab: 'todo', hoverTab: 'time' });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 将真实 Zustand 状态动作传入壳层，只由父组件参数指定当前渲染状态。
 * @param patch - 父组件配置覆盖。
 * @returns 保留真实状态动作的壳层配置。
 */
function options(patch: Partial<Options> = {}): Options {
  const state = useIslandStore.getState();
  return {
    state: 'idle', animationSpeed: 'medium', springAnimation: true, isMusicPlaying: false, coverImage: null, isPlaying: false,
    setHover: state.setHover, setExpanded: state.setExpanded, setCli: state.setCli, setHoverTab: state.setHoverTab,
    hasActiveCliSessionRef: { current: false }, idleClickExpandRef: { current: false }, isHoveringRef: { current: false }, ...patch,
  };
}
/**
 * 提交壳层真实 effect，并读取其当前公开状态。
 * @param input - 当前父组件参数。
 * @returns 当前壳层展示结果。
 */
function commit(input: Options): ReturnType<typeof useDynamicIslandShell> {
  const state = renderWithHooks(() => useDynamicIslandShell(input)); runEffects(); return state;
}
/**
 * 完成初始效果设置读取，保留当前生命周期。
 * @param input - 当前父组件参数。
 * @returns 初始化后的壳层结果。
 */
async function mount(input: Options): Promise<ReturnType<typeof useDynamicIslandShell>> {
  commit(input); await settleBackground(); return commit(input);
}
describe('壳层真实状态动作和形变时序', () => {
  it('初始状态不形变，状态变化显示前态，完成后清空并停止保护', async () => {
    const input = options(); expect(await mount(input)).toMatchObject({ morphing: false, fromState: '' });
    expect(vi.getTimerCount()).toBe(0);
    input.state = 'hover'; commit(input); expect(commit(input)).toMatchObject({ morphing: true, fromState: 'idle' });
    await vi.advanceTimersByTimeAsync(699); expect(commit(input).morphing).toBe(true);
    await vi.advanceTimersByTimeAsync(1); expect(commit(input)).toMatchObject({ morphing: false, fromState: '' });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('形变中速度/弹性配置变更重启当前保护，重复求值不增加定时器，卸载清理', async () => {
    const input = options(); await mount(input); input.state = 'expanded'; commit(input);
    await vi.advanceTimersByTimeAsync(100); input.animationSpeed = 'fast'; input.springAnimation = false; commit(input);
    expect(commit(input)).toMatchObject({ morphing: true, fromState: 'idle' }); expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(219); expect(commit(input).morphing).toBe(true);
    await vi.advanceTimersByTimeAsync(1); expect(commit(input)).toMatchObject({ morphing: false, fromState: '' });
    input.state = 'hover'; commit(input); expect(commit(input).fromState).toBe('expanded');
    unmountHooks(); expect(vi.getTimerCount()).toBe(0);
  });
  it('非形变时仅改变动画配置不启动保护', async () => {
    const input = options(); await mount(input); input.animationSpeed = 'slow'; commit(input);
    expect(commit(input).morphing).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([
    { isMusicPlaying: false, coverImage: 'cover.png', isPlaying: true, expected: null },
    { isMusicPlaying: true, coverImage: null, isPlaying: true, expected: null },
    { isMusicPlaying: true, coverImage: 'cover.png', isPlaying: true, expected: 'playing' },
    { isMusicPlaying: true, coverImage: 'cover.png', isPlaying: false, expected: 'paused' },
  ])('音乐外光效果受实际播放和封面条件约束：$isMusicPlaying/$isPlaying/$coverImage', async ({ expected, ...patch }) => {
    expect((await mount(options(patch))).showGlow).toBe(expected);
  });
  it.each([false, true, 'invalid'])('读取外光设置%s只接受boolean，本地更新验证合法值且注销监听', async (value) => {
    values.set('music-outer-glow-effect-enabled', value); const input = options({ isMusicPlaying: true, coverImage: 'cover.png', isPlaying: true });
    expect((await mount(input)).showGlow).toBe(value === false ? null : 'playing');
    surface.dispatchEvent(new CustomEvent('music-outer-glow-effect-changed', { detail: false })); expect(commit(input).showGlow).toBeNull();
    surface.dispatchEvent(new CustomEvent('music-outer-glow-effect-changed', { detail: 'yes' })); expect(commit(input).showGlow).toBeNull();
    surface.dispatchEvent(new CustomEvent('music-outer-glow-effect-changed', { detail: true })); expect(commit(input).showGlow).toBe('playing');
    unmountHooks(); surface.dispatchEvent(new CustomEvent('music-outer-glow-effect-changed', { detail: false }));
    expect(renderWithHooks(() => useDynamicIslandShell(input)).showGlow).toBe('playing');
  });
  it('初始外光读取失败保持默认值，卸载晚返回不更新状态', async () => {
    ipc.storeRead.mockRejectedValueOnce(new Error('read-failed'));
    const input = options({ isMusicPlaying: true, coverImage: 'cover.png', isPlaying: true });
    expect((await mount(input)).showGlow).toBe('playing');
    unmountHooks(); resetStandalone(); const pending = deferredBackground<unknown>(); ipc.storeRead.mockReturnValue(pending.promise);
    commit(input); unmountHooks(); pending.resolve(false); await settleBackground();
    expect(renderWithHooks(() => useDynamicIslandShell(input)).showGlow).toBe('playing');
  });
  it.each(['idle', 'lyrics', 'lyricsTranslation', 'agentVoiceInput'] as const)('pill点击%s进入真实hover，歌词状态选择歌词页', async (state) => {
    useIslandStore.setState({ state }); const input = options({ state, forceClickToHover: true });
    const shell = await mount(input); shell.handleIslandClick();
    expect(useIslandStore.getState().state).toBe('hover'); expect(input.isHoveringRef.current).toBe(true);
    expect(useIslandStore.getState().hoverTab).toBe(state === 'lyrics' || state === 'lyricsTranslation' ? 'lyrics' : 'time');
    expect(native.expandWindow).toHaveBeenCalledOnce();
  });
  it.each(['idle', 'lyrics', 'lyricsTranslation', 'agentVoiceInput', 'login'] as const)('未启用click-to-hover的%s点击保持状态', async (state) => {
    useIslandStore.setState({ state }); (await mount(options({ state }))).handleIslandClick();
    expect(useIslandStore.getState().state).toBe(state); expect(native.expandWindow).not.toHaveBeenCalled();
  });
  it('notch开启点击展开使用最新引用，hover点击进入真实expanded', async () => {
    const input = options(); const shell = await mount(input); input.idleClickExpandRef.current = true; shell.handleIslandClick();
    expect(useIslandStore.getState().state).toBe('hover');
    input.state = 'hover'; commit(input).handleIslandClick();
    expect(useIslandStore.getState().state).toBe('expanded'); expect(native.expandWindowFull).toHaveBeenCalledOnce();
  });
  it.each(['expanded', 'maxExpand', 'announcement'] as const)('%s退出进入hover，调用真实窗口动作', async (state) => {
    useIslandStore.setState({ state }); (await mount(options({ state }))).handleIslandClick();
    expect(useIslandStore.getState().state).toBe('hover'); expect(native.expandWindow).toHaveBeenCalledOnce();
  });
  it.each([
    { app: false, launcher: false, active: true, tab: 'cli' as const, expected: 'cli' },
    { app: true, launcher: false, active: true, tab: 'cli' as const, expected: 'cli' },
    { app: true, launcher: true, active: true, tab: 'cli' as const, expected: 'hover' },
    { app: false, launcher: true, active: false, tab: 'cli' as const, expected: 'hover' },
    { app: false, launcher: false, active: true, tab: 'todo' as const, expected: 'hover' },
  ])('maxExpand退出核对真实启动器、CLI页与活动引用：$app/$launcher/$active/$tab', async ({ app, launcher, active, tab, expected }) => {
    useIslandStore.setState({ state: 'maxExpand', maxExpandAppModeEnabled: app, maxExpandLauncherVisible: launcher, maxExpandTab: tab });
    const input = options({ state: 'maxExpand', hasActiveCliSessionRef: { current: active } });
    (await mount(input)).handleIslandClick(); expect(useIslandStore.getState().state).toBe(expected);
    expect(native.expandWindowNotification).toHaveBeenCalledTimes(expected === 'cli' ? 1 : 0);
  });
  it('本地外光事件同轮前置监听器卸载时，EventTarget不再执行已移除监听器', async () => {
    const input = options({ isMusicPlaying: true, coverImage: 'cover.png', isPlaying: true });
    surface.addEventListener('music-outer-glow-effect-changed', () => { unmountHooks(); });
    await mount(input); surface.dispatchEvent(new CustomEvent('music-outer-glow-effect-changed', { detail: false }));
    expect(renderWithHooks(() => useDynamicIslandShell(input)).showGlow).toBe('playing');
  });
});
