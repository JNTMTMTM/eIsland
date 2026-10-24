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
 * @file trayNowPlaying.test.ts
 * @description 托盘音乐卡片播放信息转换、加载态、广播订阅、打开时刷新、播放控制，以及进度跳转的乐观显示、失败回退与确认测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { toTrayNowPlaying, useTrayNowPlaying } from '../useTrayNowPlaying';
import type { MediaCommandResult, NowPlayingInfo } from '../../../../../../preload/types/media';
import type { TrayNowPlaying } from '../../types';

vi.mock('react', async (load) => ({
  ...(await load<typeof import('react')>()),
  ...hookMocks,
  ...lifecycleHooks,
}));

/**
 * 构造主进程媒体信息。
 * @param overrides - 覆盖字段。
 * @returns 媒体信息。
 */
function info(overrides: Partial<NowPlayingInfo> = {}): NowPlayingInfo {
  return {
    title: 'Song', artist: 'Singer', album: 'Album', duration_ms: 1000, position_ms: 0, positionTimestampMs: 5000, playbackRate: 1, isPlaying: true,
    thumbnail: 'data:image/png;base64,AAA', canFastForward: false, canSkip: false, canLike: false, canChangeVolume: false, canSetOutput: false,
    ...overrides,
  };
}

const PLAYING: TrayNowPlaying = {
  title: 'Song', artist: 'Singer', isPlaying: true, thumbnail: 'data:image/png;base64,AAA',
  durationMs: 1000, positionMs: 0, positionTimestampMs: 5000, playbackRate: 1,
};

/** 当前订阅媒体广播的回调，包括播放信息与跳转确认。 */
const listeners = new Set<(value: NowPlayingInfo | null) => void>();
const unsubscribe = vi.fn();
const api = {
  onNowPlayingInfo: vi.fn((callback: (value: NowPlayingInfo | null) => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
      unsubscribe();
    };
  }),
  mediaCurrentInfoGet: vi.fn<() => Promise<NowPlayingInfo | null>>(),
  mediaPlayPause: vi.fn<() => Promise<void>>(async () => undefined),
  mediaPrev: vi.fn<() => Promise<void>>(async () => undefined),
  mediaNext: vi.fn<() => Promise<void>>(async () => undefined),
  mediaSeek: vi.fn<(positionMs: number) => Promise<MediaCommandResult | undefined>>(),
};

/**
 * 向所有订阅者派发主进程媒体广播。
 * @param value - 媒体信息，无播放时为 null。
 */
function broadcast(value: NowPlayingInfo | null): void {
  [...listeners].forEach((listener) => listener(value));
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  listeners.clear();
  api.mediaCurrentInfoGet.mockResolvedValue(info());
  api.mediaSeek.mockResolvedValue({ success: true, error: null });
  vi.stubGlobal('window', {
    api,
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
});

afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** 等待打开时的异步刷新完成。 */
async function settle(): Promise<void> {
  await new Promise((resolve) => { setTimeout(resolve, 0); });
}

/**
 * 渲染 Hook 并执行待处理 effect。
 * @param openCount - 菜单打开次数。
 * @returns Hook 返回值。
 */
function render(openCount: number): ReturnType<typeof useTrayNowPlaying> {
  const result = renderWithHooks(() => useTrayNowPlaying(openCount));
  runEffects();
  return result;
}

describe('toTrayNowPlaying', () => {
  it('treats missing info or an empty title as nothing playing', () => {
    expect(toTrayNowPlaying(null, PLAYING)).toBeNull();
    expect(toTrayNowPlaying(info({ title: '' }), PLAYING)).toBeNull();
  });

  it('maps the display fields and normalizes empty values', () => {
    expect(toTrayNowPlaying(info(), null)).toEqual(PLAYING);
    expect(toTrayNowPlaying(info({ artist: undefined as unknown as string, isPlaying: false, thumbnail: '' }), null))
      .toEqual({ ...PLAYING, artist: '', isPlaying: false, thumbnail: null });
  });

  it('maps the playback timeline and falls back for missing or invalid values', () => {
    expect(toTrayNowPlaying(info({ duration_ms: 225500, position_ms: 42000, positionTimestampMs: 7000, playbackRate: 1.5 }), null))
      .toMatchObject({ durationMs: 225500, positionMs: 42000, positionTimestampMs: 7000, playbackRate: 1.5 });
    vi.useFakeTimers({ toFake: ['Date'], now: 9000 });
    expect(toTrayNowPlaying(info({ duration_ms: Number.NaN, position_ms: -1, positionTimestampMs: undefined, playbackRate: -2 }), null))
      .toMatchObject({ durationMs: 0, positionMs: 0, positionTimestampMs: 9000, playbackRate: 1 });
    expect(toTrayNowPlaying(info({ positionTimestampMs: Number.POSITIVE_INFINITY, playbackRate: undefined }), null))
      .toMatchObject({ positionTimestampMs: 9000, playbackRate: 1 });
    expect(toTrayNowPlaying(info({ playbackRate: 0 }), null)?.playbackRate).toBe(0);
  });

  it('keeps the cover for progress broadcasts of the same track and drops it after a track change', () => {
    expect(toTrayNowPlaying(info({ thumbnail: undefined, isPlaying: false }), PLAYING)).toEqual({ ...PLAYING, isPlaying: false });
    expect(toTrayNowPlaying(info({ thumbnail: undefined, title: 'Other' }), PLAYING)?.thumbnail).toBeNull();
    expect(toTrayNowPlaying(info({ thumbnail: undefined, artist: 'Another' }), PLAYING)?.thumbnail).toBeNull();
    expect(toTrayNowPlaying(info({ thumbnail: undefined }), null)?.thumbnail).toBeNull();
    expect(toTrayNowPlaying(info({ thumbnail: null }), PLAYING)?.thumbnail).toBeNull();
  });
});

describe('useTrayNowPlaying', () => {
  it('stays loading until the first read settles, then refreshes later opens silently', async () => {
    expect(render(0).loading).toBe(true);
    let resolveInfo: (value: NowPlayingInfo | null) => void = () => undefined;
    api.mediaCurrentInfoGet.mockReturnValueOnce(new Promise((resolve) => { resolveInfo = resolve; }));
    render(1);
    await settle();
    expect(render(1).loading).toBe(true);
    resolveInfo(info());
    await settle();
    expect(render(1)).toMatchObject({ loading: false, nowPlaying: PLAYING });
    api.mediaCurrentInfoGet.mockReturnValueOnce(new Promise(() => undefined));
    expect(render(2)).toMatchObject({ loading: false, nowPlaying: PLAYING });
  });

  it.each([
    { name: 'a failed read', start: () => { api.mediaCurrentInfoGet.mockRejectedValueOnce(new Error('ipc failed')); render(1); } },
    { name: 'a media broadcast', start: () => { api.mediaCurrentInfoGet.mockReturnValueOnce(new Promise(() => undefined)); render(1); broadcast(null); } },
  ])('also leaves the loading state after $name', async ({ start }) => {
    render(0);
    start();
    await settle();
    expect(render(1)).toMatchObject({ loading: false, nowPlaying: null });
  });

  it('keeps loading when the pending read belongs to an unmounted menu', async () => {
    let resolveInfo: (value: NowPlayingInfo | null) => void = () => undefined;
    api.mediaCurrentInfoGet.mockReturnValueOnce(new Promise((resolve) => { resolveInfo = resolve; }));
    render(1);
    unmountHooks();
    resolveInfo(info());
    await settle();
    expect(render(1)).toMatchObject({ loading: true, nowPlaying: null });
  });

  it('subscribes to broadcasts without fetching before the menu opens', () => {
    expect(render(0).nowPlaying).toBeNull();
    expect(api.onNowPlayingInfo).toHaveBeenCalledOnce();
    expect(api.mediaCurrentInfoGet).not.toHaveBeenCalled();
    broadcast(info({ isPlaying: false }));
    expect(render(0).nowPlaying).toEqual({ ...PLAYING, isPlaying: false });
    broadcast(null);
    expect(render(0).nowPlaying).toBeNull();
  });

  it('fetches the full info on every open', async () => {
    render(1);
    await settle();
    expect(render(1).nowPlaying).toEqual(PLAYING);
    api.mediaCurrentInfoGet.mockResolvedValueOnce(null);
    render(2);
    await settle();
    expect(api.mediaCurrentInfoGet).toHaveBeenCalledTimes(2);
    expect(render(2).nowPlaying).toBeNull();
  });

  it('ignores a stale or failed fetch', async () => {
    render(1);
    render(2);
    await settle();
    expect(render(2).nowPlaying).toEqual(PLAYING);
    api.mediaCurrentInfoGet.mockReset();
    let resolveStale: (value: NowPlayingInfo | null) => void = () => undefined;
    api.mediaCurrentInfoGet.mockReturnValueOnce(new Promise((resolve) => { resolveStale = resolve; }));
    render(3);
    unmountHooks();
    resolveStale(info({ title: 'Stale' }));
    await settle();
    expect(render(3).nowPlaying?.title).toBe('Song');
    resetLifecycle();
    api.mediaCurrentInfoGet.mockRejectedValueOnce(new Error('ipc failed'));
    render(1);
    await settle();
    expect(render(1).nowPlaying).toBeNull();
  });

  it('does nothing when there is no media to control', () => {
    const controls = render(0);
    controls.togglePlayback();
    controls.playPrevious();
    controls.playNext();
    controls.seekTo(1000);
    expect(api.mediaPlayPause).not.toHaveBeenCalled();
    expect(api.mediaPrev).not.toHaveBeenCalled();
    expect(api.mediaNext).not.toHaveBeenCalled();
    expect(api.mediaSeek).not.toHaveBeenCalled();
    expect(render(0).nowPlaying).toBeNull();
  });

  it('anchors the progress at the toggle moment so pausing does not rewind the bar', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: 5400 });
    render(0);
    broadcast(info());
    render(0).togglePlayback();
    expect(render(0).nowPlaying).toMatchObject({ isPlaying: false, positionMs: 400, positionTimestampMs: 5400 });
    vi.setSystemTime(9000);
    render(0).togglePlayback();
    expect(render(0).nowPlaying).toMatchObject({ isPlaying: true, positionMs: 400, positionTimestampMs: 9000 });
  });

  it('moves the progress to the seek target before forwarding the seek and keeps it once the player accepts', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: 8000 });
    render(0);
    broadcast(info({ duration_ms: 200000 }));
    render(0).seekTo(120000);
    expect(api.mediaSeek).toHaveBeenCalledExactlyOnceWith(120000);
    expect(render(0).nowPlaying).toMatchObject({ isPlaying: true, durationMs: 200000, positionMs: 120000, positionTimestampMs: 8000 });
    await settle();
    expect(render(0).nowPlaying).toMatchObject({ positionMs: 120000, positionTimestampMs: 8000 });
  });

  it.each([
    { name: 'reports a failure', respond: () => api.mediaSeek.mockResolvedValueOnce({ success: false, error: 'seek rejected' }) },
    { name: 'is not executed', respond: () => api.mediaSeek.mockResolvedValueOnce(undefined) },
    { name: 'rejects', respond: () => api.mediaSeek.mockRejectedValueOnce(new Error('ipc failed')) },
  ])('returns to the sampled position when the seek $name', async ({ respond }) => {
    vi.useFakeTimers({ toFake: ['Date'], now: 8000 });
    render(0);
    broadcast(info({ duration_ms: 200000, position_ms: 30000, positionTimestampMs: 7000 }));
    respond();
    render(0).seekTo(120000);
    expect(render(0).nowPlaying?.positionMs).toBe(120000);
    await settle();
    expect(render(0).nowPlaying).toMatchObject({ positionMs: 30000, positionTimestampMs: 7000 });
  });

  it('keeps the seek target when a refresh started before the seek returns the old position', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: 8000 });
    let resolveRefresh: (value: NowPlayingInfo | null) => void = () => undefined;
    api.mediaCurrentInfoGet.mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve; }));
    render(0);
    broadcast(info({ duration_ms: 200000, position_ms: 30000, positionTimestampMs: 7000 }));
    render(1).seekTo(120000);
    resolveRefresh(info({ duration_ms: 200000, position_ms: 30900, positionTimestampMs: 7900 }));
    await settle();
    expect(render(1).nowPlaying).toMatchObject({ positionMs: 120000, positionTimestampMs: 8000 });
  });

  it('holds the seek target over broadcasts that still carry the old position, until one confirms the seek', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: 8000 });
    render(0);
    broadcast(info({ duration_ms: 200000, position_ms: 30000, positionTimestampMs: 7000 }));
    render(0).seekTo(120000);
    render(0);
    broadcast(info({ duration_ms: 200000, position_ms: 30900, positionTimestampMs: 7900 }));
    broadcast(info({ duration_ms: 200000, position_ms: 31200, positionTimestampMs: 8200 }));
    expect(render(0).nowPlaying).toMatchObject({ positionMs: 120000, positionTimestampMs: 8000 });
    broadcast(info({ duration_ms: 200000, position_ms: 120250, positionTimestampMs: 8300 }));
    expect(render(0).nowPlaying).toMatchObject({ positionMs: 120250, positionTimestampMs: 8300 });
  });

  it('drops the pending seek when the track changes', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: 8000 });
    render(0);
    broadcast(info({ duration_ms: 200000 }));
    render(0).seekTo(120000);
    broadcast(info({ title: 'Next', duration_ms: 200000, position_ms: 2000, positionTimestampMs: 8100 }));
    expect(render(0).nowPlaying).toMatchObject({ title: 'Next', positionMs: 2000, positionTimestampMs: 8100 });
  });

  it('flips the play state optimistically and forwards the controls', () => {
    render(0);
    broadcast(info());
    render(0).togglePlayback();
    expect(api.mediaPlayPause).toHaveBeenCalledOnce();
    const paused = render(0);
    expect(paused.nowPlaying?.isPlaying).toBe(false);
    paused.togglePlayback();
    expect(render(0).nowPlaying?.isPlaying).toBe(true);
    const controls = render(0);
    controls.playPrevious();
    controls.playNext();
    expect(api.mediaPrev).toHaveBeenCalledOnce();
    expect(api.mediaNext).toHaveBeenCalledOnce();
  });

  it('swallows control failures and unsubscribes on unmount', async () => {
    api.mediaPlayPause.mockRejectedValueOnce(new Error('no session'));
    api.mediaPrev.mockRejectedValueOnce(new Error('not whitelisted'));
    api.mediaNext.mockRejectedValueOnce(new Error('not whitelisted'));
    api.mediaSeek.mockRejectedValueOnce(new Error('not whitelisted'));
    render(0);
    broadcast(info());
    const controls = render(0);
    controls.togglePlayback();
    controls.playPrevious();
    controls.playNext();
    controls.seekTo(500);
    await settle();
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
