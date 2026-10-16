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
 * @description 托盘音乐卡片播放信息转换、加载态、广播订阅、打开时刷新与播放控制测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { toTrayNowPlaying, useTrayNowPlaying } from '../useTrayNowPlaying';
import type { NowPlayingInfo } from '../../../../../../preload/types/media';
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
    title: 'Song', artist: 'Singer', album: 'Album', duration_ms: 1000, position_ms: 0, isPlaying: true,
    thumbnail: 'data:image/png;base64,AAA', canFastForward: false, canSkip: false, canLike: false, canChangeVolume: false, canSetOutput: false,
    ...overrides,
  };
}

const PLAYING: TrayNowPlaying = { title: 'Song', artist: 'Singer', isPlaying: true, thumbnail: 'data:image/png;base64,AAA' };

let broadcast: ((value: NowPlayingInfo | null) => void) | null = null;
const unsubscribe = vi.fn();
const api = {
  onNowPlayingInfo: vi.fn((callback: (value: NowPlayingInfo | null) => void) => {
    broadcast = callback;
    return unsubscribe;
  }),
  mediaCurrentInfoGet: vi.fn<() => Promise<NowPlayingInfo | null>>(),
  mediaPlayPause: vi.fn<() => Promise<void>>(async () => undefined),
  mediaPrev: vi.fn<() => Promise<void>>(async () => undefined),
  mediaNext: vi.fn<() => Promise<void>>(async () => undefined),
};

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  broadcast = null;
  api.mediaCurrentInfoGet.mockResolvedValue(info());
  vi.stubGlobal('window', { api });
});

afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
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
      .toEqual({ title: 'Song', artist: '', isPlaying: false, thumbnail: null });
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
    { name: 'a media broadcast', start: () => { api.mediaCurrentInfoGet.mockReturnValueOnce(new Promise(() => undefined)); render(1); broadcast?.(null); } },
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
    broadcast?.(info({ isPlaying: false }));
    expect(render(0).nowPlaying).toEqual({ ...PLAYING, isPlaying: false });
    broadcast?.(null);
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
    expect(api.mediaPlayPause).not.toHaveBeenCalled();
    expect(api.mediaPrev).not.toHaveBeenCalled();
    expect(api.mediaNext).not.toHaveBeenCalled();
  });

  it('flips the play state optimistically and forwards the controls', () => {
    render(0);
    broadcast?.(info());
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
    render(0);
    broadcast?.(info());
    const controls = render(0);
    controls.togglePlayback();
    controls.playPrevious();
    controls.playNext();
    await settle();
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
