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
 * @file songWidgetLifecycle.test.tsx
 * @description 歌曲组件真实 Zustand、歌词与倒数日共享 Hook 的原生异步、渲染分支和卸载集成测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SongWidget } from '../SongWidget';
import { CountdownWidget } from '../CountdownWidget';
import { CountdownCard } from '../../../../../../maxExpand/components/countdown/components/CountdownCard';
import useIslandStore from '../../../../../../../../store/slices';
import { byClass, elements, find, invoke, text } from '../../../../../../test/tree';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness';
import type { SyncedLyricLine } from '../../../../../../../../store/types';
const translate = vi.hoisted(() => {
  const localStorage = { getItem: () => null, setItem: () => undefined };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage, api: {}, location: { hostname: 'app' } }));
  return vi.fn<(key: string) => string>((key) => key);
});
vi.mock('react-i18next', async (original) => ({
  ...(await original<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: translate, i18n: { language: 'en-US' } })
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const api = {
  mediaGetMuted: vi.fn<Window['api']['mediaGetMuted']>(),
  mediaToggleMuted: vi.fn<Window['api']['mediaToggleMuted']>(),
  mediaPrev: vi.fn<Window['api']['mediaPrev']>(),
  mediaPlayPause: vi.fn<Window['api']['mediaPlayPause']>(),
  mediaNext: vi.fn<Window['api']['mediaNext']>(),
  musicLyricsEnabledGet: vi.fn<Window['api']['musicLyricsEnabledGet']>(),
  musicLyricsKaraokeGet: vi.fn<Window['api']['musicLyricsKaraokeGet']>(),
  musicLyricsClockGet: vi.fn<Window['api']['musicLyricsClockGet']>(),
  musicLyricsCalibrateEnabledGet: vi.fn<Window['api']['musicLyricsCalibrateEnabledGet']>(),
  musicLyricsCalibrateDelayGet: vi.fn<Window['api']['musicLyricsCalibrateDelayGet']>(),
  storeRead: vi.fn<Window['api']['storeRead']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>()
};
let surface: EventTarget;
const listeners: Array<(channel: string, value: unknown) => void> = [];
const unsubscribe = vi.fn<() => void>();
/**
 * 读取实际外部 Zustand store 的公开快照。
 * @param subscribe - 外部订阅入口。
 * @param getSnapshot - 真实状态快照。
 * @returns 公开快照。
 */
function snapshot<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
  void subscribe;
  return getSnapshot();
}
/**
 * 求值真实歌曲组件并保留状态。
 * @returns 组件树。
 */
function view() {
  return renderWithHooks(SongWidget);
}
/**
 * 提交真实歌词和静音读取 effect。
 * @returns 当前元素树。
 */
async function commit() {
  view();
  runEffects();
  await Array.from({ length: 12 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
  return view();
}
/**
 * 派发已注册的真实设置事件。
 * @param channel - 原生设置键。
 * @param value - 设置值。
 */
function setting(channel: string, value: boolean): void {
  surface.dispatchEvent(Object.assign(new Event('island:setting-changed'), { detail: { channel, value } }));
}
/**
 * 创建可控原生异步请求。
 * @returns 请求及完成入口。
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
beforeEach(async () => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
  const react = await vi.importActual<typeof import('react') & { default: typeof import('react') }>('react');
  vi.spyOn(react.default, 'useCallback').mockImplementation((callback, dependencies) => lifecycleHooks.useCallback(callback, dependencies));
  vi.spyOn(react.default, 'useSyncExternalStore').mockImplementation(snapshot);
  vi.spyOn(react.default, 'useDebugValue').mockImplementation(() => undefined);
  api.mediaGetMuted.mockResolvedValue(false);
  api.mediaToggleMuted.mockResolvedValue(true);
  api.musicLyricsEnabledGet.mockResolvedValue(true);
  api.musicLyricsKaraokeGet.mockResolvedValue(false);
  api.musicLyricsClockGet.mockResolvedValue(true);
  api.musicLyricsCalibrateEnabledGet.mockResolvedValue(true);
  api.musicLyricsCalibrateDelayGet.mockResolvedValue(20);
  api.storeRead.mockResolvedValue(null);
  listeners.length = 0;
  api.onSettingsChanged.mockImplementation((listener) => { listeners.push(listener); return unsubscribe; });
  surface = new EventTarget();
  vi.stubGlobal('window', Object.assign(surface, { api, setInterval, clearInterval }));
  vi.stubGlobal('document', new EventTarget());
  useIslandStore.setState({ isMusicPlaying: true, isPlaying: false, coverImage: null, mediaInfo: { title: '', artist: '', album: '', duration_ms: 0 }, syncedLyrics: null, lyricsLoading: false, currentPositionMs: 0, dominantColor: [1, 2, 3], expandTab: 'overview' });
});
afterEach(() => {
  unmountHooks();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('SongWidget real store and lyric hooks', () => {
  it('renders actual metadata fallback, navigates and accepts known mute state', async () => {
    const root = await commit();
    expect(text(root)).toContain('overview.song.unknownTitle');
    expect(text(root)).toContain('overview.song.unknownArtist');
    invoke(byClass(root, 'ov-dash-widget-title'), 'onClick');
    expect(useIslandStore.getState().expandTab).toBe('song');
    invoke(find(root, (node) => node.props.title === 'overview.song.play'), 'onClick');
    expect(api.mediaPlayPause).toHaveBeenCalledOnce();
    await invoke(find(root, (node) => node.props.title === 'overview.song.mute'), 'onClick');
    expect(find(view(), (node) => node.props.title === 'overview.song.unmute').props['aria-pressed']).toBe(true);
  });
  it.each(['null', 'reject'])('contains mute update %s and prevents concurrent updates', async (mode) => {
    let root = await commit();
    const pending = deferred<boolean | null>();
    api.mediaToggleMuted.mockReturnValueOnce(pending.promise);
    const mute = find(root, (node) => node.props.title === 'overview.song.mute');
    const first = invoke(mute, 'onClick');
    root = view();
    await invoke(find(root, (node) => node.props.title === 'overview.song.mute'), 'onClick');
    expect(api.mediaToggleMuted).toHaveBeenCalledOnce();
    expect(find(root, (node) => node.props.title === 'overview.song.mute').props.disabled).toBe(true);
    if (mode === 'null') pending.resolve(null);
    else pending.reject(new Error('offline'));
    await first;
    expect(find(view(), (node) => node.props.title === 'overview.song.mute').props.disabled).toBe(false);
    expect(find(view(), (node) => node.props.title === 'overview.song.mute').props['aria-pressed']).toBe(false);
  });
  it.each(['reject', 'late-success', 'late-reject'])('contains initial mute %s feedback', async (mode) => {
    const pending = deferred<boolean | null>();
    api.mediaGetMuted.mockReturnValueOnce(pending.promise);
    await commit();
    if (mode !== 'reject') unmountHooks();
    if (mode === 'late-success') pending.resolve(true);
    else pending.reject(new Error('offline'));
    const root = await commit();
    expect(find(root, (node) => node.props.title === 'overview.song.mute').props.disabled).toBe(true);
    await invoke(find(root, (node) => node.props.title === 'overview.song.mute'), 'onClick');
    expect(api.mediaToggleMuted).not.toHaveBeenCalled();
  });
  it('derives intro/current/karaoke/empty/loading and settings-disabled lyrics from real store and hooks', async () => {
    let root = await commit();
    invoke(find(root, (node) => node.props.title === 'overview.song.lyric'), 'onClick');
    expect(text(view())).toContain('songTab.lyrics.empty');
    useIslandStore.setState({ lyricsLoading: true });
    expect(text(view())).toContain('songTab.lyrics.loading');
    useIslandStore.setState({ lyricsLoading: false, syncedLyrics: [{ time_ms: 1000, text: 'First' }, { time_ms: 2000, text: 'Second' }], currentPositionMs: 0 });
    expect(text(view())).toContain('FirstSecond');
    useIslandStore.setState({ currentPositionMs: 1500 });
    expect(text(view())).toContain('FirstSecond');
    setting('music:lyrics-karaoke', true);
    useIslandStore.setState({ syncedLyrics: [{ time_ms: 1000, text: 'First', syllables: [{ text: 'First', start_offset_ms: 0, duration_ms: 1000 }] }] });
    expect(byClass(view(), 'ov-dash-song-lyric-current').props.className).toContain('karaoke');
    expect(elements(view()).some((node) => typeof node.type === 'function' && node.type.name === 'KaraokeSyllableLine')).toBe(true);
    setting('music:lyrics-karaoke', false);
    expect(byClass(view(), 'ov-dash-song-lyric-current').props.className).not.toContain('karaoke');
    useIslandStore.setState({ syncedLyrics: [{ time_ms: 1000, text: '' }] });
    expect(text(view())).toContain('songTab.lyrics.empty');
    useIslandStore.setState({ syncedLyrics: [{ time_ms: 1000 } as unknown as SyncedLyricLine], currentPositionMs: 0 });
    expect(text(view())).toContain('songTab.lyrics.empty');
    setting('music:lyrics-enabled', false);
    root = view();
    expect(text(root)).toContain('overview.song.unknownTitle');
    expect(find(root, (node) => node.props.title === 'overview.song.lyric').props.disabled).toBe(true);
  });
});
describe('CountdownWidget real shared hook', () => {
  it('shows one real loaded card and consumes native broadcasts to clear the overview', async () => {
    api.storeRead.mockResolvedValueOnce([{ id: 1, name: 'Event', date: '2026-12-01', color: '#fff', type: 'countdown' }]);
    const openTargetPage = vi.fn();
    const component = () => CountdownWidget({ openTargetPage });
    renderWithHooks(component);
    runEffects();
    await Promise.resolve();
    await Promise.resolve();
    let root = renderWithHooks(component);
    expect(byClass(root, 'ov-dash-countdown-cards').props.className).toContain('single');
    const cards = elements(root).filter((node) => node.type === CountdownCard);
    expect(cards).toHaveLength(1);
    invoke(cards[0], 'onClick');
    expect(openTargetPage).toHaveBeenCalledWith('countdown');
    listeners.forEach((listener) => listener('store:countdown-dates', []));
    root = renderWithHooks(component);
    expect(text(root)).toContain('countdown.manage.new');
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
