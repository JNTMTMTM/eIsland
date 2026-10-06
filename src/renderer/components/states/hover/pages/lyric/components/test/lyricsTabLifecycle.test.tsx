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
 * @file lyricsTabLifecycle.test.tsx
 * @description 歌词页使用真实Zustand、设置effect、文本截断及背景子组件的异步状态、媒体事件和Canvas集成测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../../../../test/elementHarness';
import useIslandStore from '../../../../../../../store/slices';
import { deferredBackground, settleBackground } from '../../../../../../hooks/test/standaloneIpcHarness';
import { HOVER_MUSIC_BG_STYLE_STORE_KEY } from '../../../../../maxExpand/components/setting/config/settingsTabConfig';
import { MusicBgWavePreview } from '../../../../../maxExpand/components/setting/components/app/preview/MusicBgWavePreview';
import { SilkyWave } from '../SilkyWave';
import { LyricsTab } from '../LyricsTab';
import type { ReactElement, RefObject } from 'react';

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null });
});
// Zustand 外部包的 React 订阅适配不参与局部调度；保留真实 selector 和原始 store。
vi.mock('zustand/react/shallow', () => ({ useShallow: <T,>(selector: T): T => selector }));
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({
  ...(await load<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }),
}));
vi.mock('../../../../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../../../../store/slices')>();
  const bound = Object.assign(<T,>(selector: (state: ReturnType<typeof actual.default.getState>) => T): T => selector(actual.default.getState()), actual.default);
  return { ...actual, default: bound };
});
const api = {
  storeRead: vi.fn(() => Promise.resolve<unknown>('silky')),
  mediaPlayPause: vi.fn(), mediaPrev: vi.fn(), mediaNext: vi.fn(),
};
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const cancelFrame = vi.fn((id: number) => { frames.delete(id); });
beforeEach(() => {
  resetLifecycle(); vi.clearAllMocks(); frames.clear(); frameId = 0;
  api.storeRead.mockReset().mockResolvedValue('silky');
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api, devicePixelRatio: 1, location: { hostname: 'localhost' } }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++frameId; frames.set(id, callback); return id;
  });
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);
  useIslandStore.setState({ isMusicPlaying: true, isPlaying: true, coverImage: 'cover://track',
    dominantColor: [10, 20, 30], mediaInfo: { title: 'Track', artist: 'Artist', album: '', duration_ms: 1000 } });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });

interface BackgroundProps { color: [number, number, number]; playing: boolean }
/**
 * 从真实页面的元素树取得将传给实际动画组件的完整属性。
 * @param root - 歌词页面渲染结果。
 * @returns 真实背景组件元素。
 */
function background(root: ReactElement): ReactElement<BackgroundProps> {
  return findElement(root, (element) => element.type === SilkyWave || element.type === MusicBgWavePreview) as unknown as ReactElement<BackgroundProps>;
}
/**
 * 执行排队的浏览器动画帧；目标绘制算法负责后续帧与清理。
 */
function frame(): void {
  const entry = frames.entries().next().value; if (!entry) return;
  const [id, callback] = entry; frames.delete(id); callback(16);
}
/**
 * 对页面实际选中的背景另建局部组件生命周期，执行真实子组件及Canvas绘制。
 * @param element - 页面实际选择的背景元素。
 * @returns Canvas上下文叶边界。
 */
function commitBackground(element: ReactElement<BackgroundProps>) {
  // 页面与其子组件各有独立 Hook 状态；该私有工具逐个提交组件，不冒充完整DOM协调器。
  unmountHooks(); resetLifecycle();
  const context = { setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
    lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillStyle: '', strokeStyle: '', lineWidth: 0 };
  const canvas = { width: 0, height: 0, getContext: () => context, getBoundingClientRect: () => ({ width: 10, height: 20 }) };
  const output = renderWithHooks(() => element.type === SilkyWave ? SilkyWave(element.props) : MusicBgWavePreview(element.props));
  const { ref } = output.props as { ref: RefObject<HTMLCanvasElement | null> };
  Object.assign(ref, { current: canvas as unknown as HTMLCanvasElement });
  runEffects(); frame(); return context;
}
describe('歌词页真实状态与背景生命周期', () => {
  it('初次绘制采用丝滑背景，effect读真实设置键，仅挂载请求一次', async () => {
    const initial = renderWithHooks(LyricsTab); expect(background(initial).type).toBe(SilkyWave);
    expect(textContent(initial)).toContain('TrackArtist');
    expect(findElement(initial, (element) => element.props.className === 'lrc-vinyl-cover').props.style).toEqual({ backgroundImage: 'url(cover://track)' });
    runEffects(); await settleBackground(); renderWithHooks(LyricsTab); runEffects();
    expect(api.storeRead).toHaveBeenCalledExactlyOnceWith(HOVER_MUSIC_BG_STYLE_STORE_KEY);
  });
  it.each([{ stored: 'wave', expected: MusicBgWavePreview }, { stored: 'silky', expected: SilkyWave },
    { stored: '', expected: SilkyWave }, { stored: 'unknown', expected: SilkyWave },
    { stored: null, expected: SilkyWave }, { stored: undefined, expected: SilkyWave }])('设置读取$stored按真实异步结果选择背景', async ({ stored, expected }) => {
    api.storeRead.mockResolvedValueOnce(stored);
    renderWithHooks(LyricsTab); runEffects(); await settleBackground();
    const selected = background(renderWithHooks(LyricsTab));
    expect(selected.type).toBe(expected); expect(selected.props).toMatchObject({ color: [10, 20, 30], playing: true });
  });
  it('原生读取拒绝由effect捕获，页面保留可用默认背景', async () => {
    api.storeRead.mockRejectedValueOnce(new Error('settings unavailable'));
    renderWithHooks(LyricsTab); runEffects(); await settleBackground();
    expect(background(renderWithHooks(LyricsTab)).type).toBe(SilkyWave);
    expect(api.storeRead).toHaveBeenCalledOnce();
  });
  it('设置请求未完成仍显示默认背景，晚返回wave更新真实state', async () => {
    const pending = deferredBackground<unknown>(); api.storeRead.mockReturnValueOnce(pending.promise);
    renderWithHooks(LyricsTab); runEffects();
    expect(background(renderWithHooks(LyricsTab)).type).toBe(SilkyWave);
    pending.resolve('wave'); await settleBackground();
    expect(background(renderWithHooks(LyricsTab)).type).toBe(MusicBgWavePreview);
  });
  it('真实媒体状态更新切换暂停图标、禁用按钮、无封面及未知标题艺术家', () => {
    renderWithHooks(LyricsTab);
    useIslandStore.setState({ isMusicPlaying: false, isPlaying: false, coverImage: null,
      mediaInfo: { title: '', artist: '', album: '', duration_ms: 0 } });
    const root = renderWithHooks(LyricsTab);
    expect(root.props).toHaveProperty('className', 'lrc-tab-wrapper ');
    expect(textContent(root)).toContain('未知歌曲未知艺术家');
    expect(findElement(root, (element) => element.props.className === 'lrc-vinyl-cover').props.style).toBeUndefined();
    expect(findElement(root, (element) => element.props.className === 'lrc-title inactive')).toBeDefined();
    expect(elements(root).filter((element) => element.type === 'button').every((element) => element.props.disabled === true)).toBe(true);
    expect(findElement(root, (element) => element.props.className === 'lrc-media-btn lrc-play-btn').props.title).toBe('播放');
    expect(background(root).props.playing).toBe(false);
  });
  it('合法emoji媒体标题与艺术家在真实页面保留完整字符', () => {
    useIslandStore.setState({ mediaInfo: { title: '😀A', artist: 'A😀B', album: '', duration_ms: 1 } });
    const root = renderWithHooks(LyricsTab);
    expect(textContent(findElement(root, (element) => element.props.className === 'lrc-title '))).toBe('😀A');
    expect(textContent(findElement(root, (element) => element.props.className === 'lrc-artist'))).toBe('A😀B');
  });
  it('标题与艺术家调用真实视觉宽度算法，中日韩标题和ASCII艺术家按各自上限截断', () => {
    useIslandStore.setState({ mediaInfo: { title: '歌'.repeat(30), artist: 'A'.repeat(60), album: '', duration_ms: 1 } });
    const root = renderWithHooks(LyricsTab);
    expect(textContent(findElement(root, (element) => element.props.className === 'lrc-title '))).toBe(`${'歌'.repeat(22)  }…`);
    expect(textContent(findElement(root, (element) => element.props.className === 'lrc-artist'))).toBe(`${'A'.repeat(49)  }…`);
  });
  it.each([true, false])('播放状态%s的可用按钮阻止冒泡并分别发送原生媒体指令', (isPlaying) => {
    useIslandStore.setState({ isPlaying });
    const root = renderWithHooks(LyricsTab); const stopPropagation = vi.fn();
    const buttons = elements(root).filter((element) => element.type === 'button');
    buttons.forEach((button) => { expect(button.props.disabled).toBe(false); invoke(button, 'onClick', { stopPropagation }); });
    expect(stopPropagation).toHaveBeenCalledTimes(3);
    expect(api.mediaPrev).toHaveBeenCalledOnce(); expect(api.mediaPlayPause).toHaveBeenCalledOnce(); expect(api.mediaNext).toHaveBeenCalledOnce();
    expect(buttons[1].props.title).toBe(isPlaying ? '暂停' : '播放');
  });
  it.each([{ stored: 'silky', method: 'fill' }, { stored: 'wave', method: 'stroke' }] as const)('真实页面选择$stored后，实际子组件绘制传入颜色并卸载取消帧', async ({ stored, method }) => {
    api.storeRead.mockResolvedValueOnce(stored); renderWithHooks(LyricsTab); runEffects(); await settleBackground();
    const context = commitBackground(background(renderWithHooks(LyricsTab)));
    expect(context[method]).toHaveBeenCalled();
    expect(method === 'fill' ? context.fillStyle : context.strokeStyle).toContain('rgba(10, 20, 30,');
    expect(context.lineTo).toHaveBeenCalled(); expect(frames.size).toBe(1);
    const [id] = frames.keys(); unmountHooks(); expect(cancelFrame).toHaveBeenLastCalledWith(id); expect(frames.size).toBe(0);
  });
});
