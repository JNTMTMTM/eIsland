/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file useIslandNowPlayingSync.test.ts
 * @description 音乐进度与歌词异步任务生命周期回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LyricsFetchResult } from '../../../api/lyrics/lrcApi';
import type { NowPlayingInfo } from '../../../store/types';

const { useEffectMock, fetchLyricsMock } = vi.hoisted(() => ({
  useEffectMock: vi.fn(),
  fetchLyricsMock: vi.fn(),
}));

vi.mock('react', () => ({
  useEffect: useEffectMock,
  useLayoutEffect: (effect: () => void) => effect(),
  useRef: (value: unknown) => ({ current: value }),
}));
vi.mock('../../../api/lyrics/lrcApi', () => ({ fetchLyricsWithTranslation: fetchLyricsMock }));
vi.mock('../../../api/lyrics/lrcs/karaoke', () => ({ fetchKaraokeLyrics: vi.fn() }));

let onNowPlaying: (info: NowPlayingInfo | null) => void;
let cleanup: (() => void) | undefined;
const unsubscribe = vi.fn();
const timestamp = vi.fn();
const lyricsEnabled = vi.fn();
const options = {
  handleNowPlayingUpdate: vi.fn(),
  updateProgress: vi.fn<(position: number) => void>(),
  setSyncedLyrics: vi.fn(),
  setTranslationLyrics: vi.fn(),
  setLyricsLoading: vi.fn(),
};
const song: NowPlayingInfo = {
  title: 'Song', artist: 'Singer', album: '', position_ms: 1000,
  duration_ms: 100000, isPlaying: true, deviceId: 'player',
  canFastForward: false, canSkip: false, canLike: false, canChangeVolume: false, canSetOutput: false,
};
const result: LyricsFetchResult = {
  lyrics: [{ time_ms: 0, text: 'line' }],
  translation: { status: 'not-fetched', lines: null },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  vi.clearAllMocks();
  lyricsEnabled.mockResolvedValue(false);
  fetchLyricsMock.mockResolvedValue(result);
  timestamp.mockResolvedValue({ isAvailable: false });
  cleanup = undefined;
  useEffectMock.mockImplementation((effect: () => (() => void)) => { cleanup = effect(); });
  vi.stubGlobal('window', { api: {
    onNowPlayingInfo: (listener: typeof onNowPlaying) => { onNowPlaying = listener; return unsubscribe; },
    musicLyricsEnabledGet: lyricsEnabled,
    musicLyricsTranslationEnabledGet: vi.fn().mockResolvedValue(true),
    musicLyricsKaraokeGet: vi.fn().mockResolvedValue(false),
    musicLyricsCalibrateEnabledGet: vi.fn().mockResolvedValue(true),
    musicLyricsCalibrateDelayGet: vi.fn().mockResolvedValue(20),
    smtcGetTimestamp: timestamp,
  } });
});

afterEach(() => {
  cleanup?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mount(): Promise<void> {
  const { useIslandNowPlayingSync } = await import('../useIslandNowPlayingSync');
  useIslandNowPlayingSync(options);
}

describe('useIslandNowPlayingSync lifecycle', () => {
  it.each([null, { ...song, title: '' }])('stops progress and releases timers for empty media %j', async (empty) => {
    lyricsEnabled.mockResolvedValue(true);
    await mount();
    onNowPlaying(song);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(2);

    onNowPlaying(empty);
    options.updateProgress.mockClear();
    await vi.advanceTimersByTimeAsync(30000);

    expect(vi.getTimerCount()).toBe(0);
    expect(options.updateProgress).not.toHaveBeenCalled();
    expect(timestamp).not.toHaveBeenCalled();
    expect(options.setLyricsLoading).toHaveBeenLastCalledWith(false);
  });

  it('writes progress at the target cadence and stops at the track duration', async () => {
    await mount();
    onNowPlaying({ ...song, duration_ms: 1200 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(options.updateProgress.mock.calls.map(([position]) => position)).toEqual([1066, 1132, 1198, 1200]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not publish lyrics or restart calibration after unmount', async () => {
    lyricsEnabled.mockResolvedValue(true);
    let resolveLyrics!: (value: LyricsFetchResult) => void;
    fetchLyricsMock.mockReturnValue(new Promise<LyricsFetchResult>((resolve) => { resolveLyrics = resolve; }));
    await mount();
    onNowPlaying(song);
    await vi.advanceTimersByTimeAsync(0);
    cleanup?.();
    options.setSyncedLyrics.mockClear();
    options.setTranslationLyrics.mockClear();
    resolveLyrics(result);
    await vi.advanceTimersByTimeAsync(0);

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(options.setSyncedLyrics).not.toHaveBeenCalled();
    expect(options.setTranslationLyrics).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not fetch lyrics when a settings response belongs to a stopped session', async () => {
    let resolveEnabled!: (value: boolean) => void;
    lyricsEnabled.mockReturnValue(new Promise<boolean>((resolve) => { resolveEnabled = resolve; }));
    await mount();
    onNowPlaying(song);
    onNowPlaying(null);
    resolveEnabled(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchLyricsMock).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects an old request when the same song is selected again', async () => {
    lyricsEnabled.mockResolvedValue(true);
    let resolveOld!: (value: LyricsFetchResult) => void;
    fetchLyricsMock.mockReturnValueOnce(new Promise<LyricsFetchResult>((resolve) => { resolveOld = resolve; }));
    await mount();
    onNowPlaying(song);
    await vi.advanceTimersByTimeAsync(0);
    onNowPlaying({ ...song, title: 'Other' });
    await vi.advanceTimersByTimeAsync(0);
    onNowPlaying(song);
    await vi.advanceTimersByTimeAsync(0);
    options.setSyncedLyrics.mockClear();
    resolveOld({ ...result, lyrics: [{ time_ms: 0, text: 'stale' }] });
    await vi.advanceTimersByTimeAsync(0);

    expect(options.setSyncedLyrics).not.toHaveBeenCalled();
  });

  it('freezes calibration for the full pause and resumes only its remaining playback time', async () => {
    lyricsEnabled.mockResolvedValue(true);
    await mount();
    onNowPlaying(song);
    await vi.advanceTimersByTimeAsync(5000);
    onNowPlaying({ ...song, isPlaying: false });
    await vi.advanceTimersByTimeAsync(60000);
    expect(timestamp).not.toHaveBeenCalled();
    onNowPlaying(song);
    await vi.advanceTimersByTimeAsync(14999);
    expect(timestamp).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(timestamp).toHaveBeenCalledOnce();
  });

  it('does not start calibration when lyrics arrive while playback is paused', async () => {
    lyricsEnabled.mockResolvedValue(true);
    await mount();
    onNowPlaying({ ...song, isPlaying: false });
    await vi.advanceTimersByTimeAsync(30000);
    expect(timestamp).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    onNowPlaying(song);
    await vi.advanceTimersByTimeAsync(20000);
    expect(timestamp).toHaveBeenCalledOnce();
  });
});
