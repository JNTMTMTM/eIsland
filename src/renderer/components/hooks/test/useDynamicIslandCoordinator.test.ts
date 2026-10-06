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
 * @file useDynamicIslandCoordinator.test.ts
 * @description 灵动岛协调器真实公共状态、全部子Hook、原生设置与媒体/计时/CLI操作集成测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import useIslandStore from '../../../store/isLandStore';
import selectDynamicIslandState from '../../utils/selectDynamicIslandState';
import { LOCAL_ISLAND_BG_SYNC_EVENT } from '../../config/dynamicIslandConfig';
import { useDynamicIslandCoordinator } from '../useDynamicIslandCoordinator';
import { createVideo, videoEvent } from './backgroundVideoHarness';
import { broadcast, ipc, settleBackground, surface } from './standaloneIpcHarness';
import { claude, cliIpc, resetCliBoundary, snapshot } from './cliHookHarness';
vi.hoisted(() => { vi.stubGlobal('localStorage', { getItem: () => null }); vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks, useLayoutEffect: lifecycleHooks.useEffect }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../store/isLandStore', async (load) => {
  const actual = await load<typeof import('../../../store/isLandStore')>();
  const bound = Object.assign(<T>(selector?: (state: ReturnType<typeof actual.default.getState>) => T) => selector ? selector(actual.default.getState()) : actual.default.getState(), actual.default);
  return { ...actual, default: bound };
});
interface ImageBoundary { crossOrigin: string; src: string; onload: (() => Promise<void>) | null }
const color = vi.hoisted(() => ({ getColor: vi.fn(() => Promise.resolve({ rgb: () => ({ r: 20, g: 30, b: 40 }) })) }));
vi.mock('colorthief', () => color);
const images: ImageBoundary[] = [];
const listeners = new Map<string, (data: unknown) => void>();
const unsubscriptions = new Map<string, ReturnType<typeof vi.fn>>();
const subscriptions = ['onNowPlayingInfo', 'onSourceSwitchRequest', 'onUpdaterAvailable', 'onUpdaterDownloaded',
  'onExternalAgentStarted', 'onExternalAgentStopped', 'onClipboardUrlsDetected', 'onUpdaterStartupAutoCheckRequest',
  'onUpdaterNotAvailable', 'onAgentVoiceInputState', 'onShapeModeChanged'] as const;
const native = {
  expandWindow: vi.fn(), expandWindowFull: vi.fn(), expandWindowLyrics: vi.fn(), expandWindowLyricsTranslation: vi.fn(),
  expandWindowSettings: vi.fn(), collapseWindow: vi.fn(), enableMousePassthrough: vi.fn(),
  expandMouseleaveIdleGet: vi.fn(() => Promise.resolve(false)), maxexpandMouseleaveIdleGet: vi.fn(() => Promise.resolve(false)),
  idleClickExpandGet: vi.fn(() => Promise.resolve(false)), springAnimationGet: vi.fn(() => Promise.resolve(true)),
  animationSpeedGet: vi.fn(() => Promise.resolve('medium')), shapeModeGet: vi.fn(() => Promise.resolve('notch')),
  musicLyricsEnabledGet: vi.fn(() => Promise.resolve(false)), musicLyricsTranslationEnabledGet: vi.fn(() => Promise.resolve(false)),
  getMouseWindowState: vi.fn(() => Promise.resolve({ mousePosition: { x: -1, y: -1 }, bounds: { x: 0, y: 0, width: 100, height: 50 } })),
  getMousePosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })), moveWindowDelta: vi.fn(),
};
const css = new Map<string, string>();
const layer = { style: { backgroundImage: '', opacity: '', filter: '' } };
const t = (key: string): string => key;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); resetCliBoundary();
  listeners.clear(); unsubscriptions.clear(); images.length = 0; css.clear(); css.set('--island-opacity', '100');
  const subscriptionApi = Object.fromEntries(subscriptions.map((name) => [name, vi.fn((listener: (data: unknown) => void) => {
    listeners.set(name, listener); const cleanup = vi.fn(() => { listeners.delete(name); }); unsubscriptions.set(name, cleanup); return cleanup;
  })]));
  Object.assign(surface, { setTimeout, clearTimeout, api: { ...ipc, ...cliIpc, ...native, ...subscriptionApi } });
  Object.assign(layer.style, { backgroundImage: '', opacity: '', filter: '' });
  const documentBoundary = Object.assign(new EventTarget(), {
    getElementById: () => layer, querySelector: () => null,
    documentElement: { style: { getPropertyValue: (key: string) => css.get(key) ?? '', setProperty: (key: string, value: string) => { css.set(key, value); } } },
  });
  vi.stubGlobal('document', documentBoundary);
  // eslint-disable-next-line prefer-arrow-callback -- 真实封面 Hook 使用 new Image，叶构造器必须可构造。
  vi.stubGlobal('Image', function ImageLeaf() { const image: ImageBoundary = { crossOrigin: '', src: '', onload: null }; images.push(image); return image; });
  native.shapeModeGet.mockResolvedValue('notch'); native.idleClickExpandGet.mockResolvedValue(false);
  useIslandStore.setState({ state: 'idle', uiStateLocked: false, shapeMode: 'notch', animationSpeed: 'medium', springAnimation: true,
    isMusicPlaying: false, isPlaying: false, coverImage: null, dominantColor: [0, 0, 0], syncedLyrics: null, lyricsLoading: false,
    translationLyrics: null, currentPositionMs: 0, notification: { title: '', body: '' },
    timerData: { state: 'idle', remainingSeconds: 0, inputHours: '00', inputMinutes: '00', inputSeconds: '00' },
    maxExpandAppModeEnabled: false, maxExpandLauncherVisible: false, maxExpandTab: 'todo', hoverTab: 'time' });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 使用真实主窗口选择器和全部真实子 Hook 提交协调器。
 * @returns 当前窗口渲染输入。
 */
function commit(): ReturnType<typeof useDynamicIslandCoordinator> {
  const state = renderWithHooks(() => useDynamicIslandCoordinator({ t, store: selectDynamicIslandState(useIslandStore.getState()), language: 'zh-CN' }));
  runEffects(); return state;
}
/**
 * 完成初始 IPC 读取和真实设置解析后重新读取渲染输入。
 * @returns 初始化后的协调器状态。
 */
async function mount(): Promise<ReturnType<typeof useDynamicIslandCoordinator>> {
  commit(); await settleBackground(); return commit();
}
describe('协调器真实子 Hook 和公共状态贯通', () => {
  it('初始化聚合壳层、时间和背景默认值，并注册实际运行时订阅且卸载清理', async () => {
    const result = await mount();
    expect(result.shellClassName).toContain('shape-notch'); expect(useIslandStore.getState().state).toBe('idle');
    expect(result.shellStyle).toBeUndefined(); expect(result.bgMedia).toBeNull(); expect(result.bgVideoVolume).toBe(0.6);
    expect(result.timeStr).toMatch(/^\d{2}:\d{2}$/); expect(result.fullTimeStr).toMatch(/^\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(result.dayStr).not.toBe(''); expect(result.lunarStr).not.toBe('');
    expect(listeners.has('onNowPlayingInfo')).toBe(true); expect(listeners.has('onSourceSwitchRequest')).toBe(true);
    expect(ipc.onSettingsChanged).toHaveBeenCalled(); expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmountHooks(); expect(listeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    expect([...unsubscriptions.values()].every((unsubscribe) => unsubscribe.mock.calls.length > 0)).toBe(true);
  });
  it('真实本地背景设置更新媒体、音量和视频事件，原生settings广播清空媒体', async () => {
    const initial = await mount(); const video = createVideo(); initial.bgVideoElementRef.current = video.element;
    surface.dispatchEvent(new CustomEvent(LOCAL_ISLAND_BG_SYNC_EVENT, { detail: {
      media: { type: 'video', source: 'movie.mp4' }, previewUrl: 'file:///movie.mp4', videoVolume: 0.8, videoRate: 2, videoMuted: false, videoFit: 'contain', videoHwDecode: false,
    } }));
    const updated = commit();
    expect(updated).toMatchObject({ bgMedia: { type: 'video', previewUrl: 'file:///movie.mp4' }, bgVideoVolume: 0.8, bgVideoMuted: false, bgVideoFit: 'contain', bgVideoHwDecode: false });
    updated.handleVideoLoadedMetadata(videoEvent(video.element)); updated.handleVideoCanPlay(videoEvent(video.element)); await settleBackground();
    expect(video.target.volume).toBe(0.8); expect(video.target.playbackRate).toBe(2); expect(video.play).toHaveBeenCalledOnce();
    video.target.dispatchEvent(new Event('ended')); expect(video.play).toHaveBeenCalledTimes(2);
    broadcast('store:island-bg-media', null); expect(commit().bgMedia).toBeNull();
  });
  it('pill点击贯通真实壳层和状态动作，从歌词进入hover歌词页', async () => {
    native.shapeModeGet.mockResolvedValue('pill'); useIslandStore.setState({ state: 'lyrics', shapeMode: 'pill' });
    const result = await mount(); expect(result.shellClassName).toContain('shape-pill');
    result.handleIslandClick(); expect(useIslandStore.getState()).toMatchObject({ state: 'hover', hoverTab: 'lyrics' });
    expect(native.expandWindow).toHaveBeenCalled();
    commit(); expect(commit().shellClassName).toContain('morphing');
  });
  it('CLI活动引用更新后maxExpand点击进入真实CLI态而不是hover', async () => {
    useIslandStore.setState({ state: 'maxExpand', maxExpandTab: 'cli' });
    const result = await mount(); claude?.(snapshot()); await settleBackground();
    useIslandStore.setState({ state: 'maxExpand', maxExpandTab: 'cli' }); result.handleIslandClick();
    expect(useIslandStore.getState().state).toBe('cli'); expect(cliIpc.disableMousePassthrough).toHaveBeenCalled();
  });
  it('真实封面颜色和音乐外光计算聚合到壳层style', async () => {
    useIslandStore.setState({ coverImage: 'https://example.test/cover.png', isMusicPlaying: true, isPlaying: true });
    await mount(); await images.at(-1)?.onload?.();
    expect(useIslandStore.getState().dominantColor).toEqual([20, 30, 40]);
    const result = commit(); expect(result.shellClassName).toContain('music-glow');
    expect(result.shellStyle).toEqual({ '--glow-r': 20, '--glow-g': 30, '--glow-b': 40 });
  });
  it('真实源切换通知与公共计时器更新在协调器中共同执行', async () => {
    useIslandStore.getState().setTimerData({ state: 'running', remainingSeconds: 2 });
    await mount(); await vi.advanceTimersByTimeAsync(1000); expect(useIslandStore.getState().timerData.remainingSeconds).toBe(1);
    commit(); listeners.get('onSourceSwitchRequest')?.({ title: 'Track', artist: 'Artist', sourceAppId: 'player.exe' }); await settleBackground();
    expect(useIslandStore.getState().notification).toMatchObject({ title: 'notification.sourceSwitch.title', body: 'Track - Artist（player.exe）', type: 'source-switch' });
    expect(cliIpc.expandWindowNotification).toHaveBeenCalled();
  });
});
