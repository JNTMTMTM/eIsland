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
 * @file useIslandNowPlayingSyncRuntime.test.ts
 * @description 音乐同步逐字歌词回退、播放时钟校准、状态版本和原生监听清理边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIslandNowPlayingSync } from '../useIslandNowPlayingSync';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './startupHookHarness';
import type { NowPlayingInfo, SyncedLyricLine } from '../../../store/types';
import type { LyricsFetchResult, TranslationLyricsResult } from '../../../api/lyrics/lrcApi';
import type * as LyricsApi from '../../../api/lyrics/lrcApi';
import type * as KaraokeApi from '../../../api/lyrics/lrcs/karaoke';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('./startupHookHarness');
  return createHookReactMock(actual);
});
const leaves = vi.hoisted(() => ({
  normal: vi.fn<typeof LyricsApi.fetchLyricsWithTranslation>(),
  karaoke: vi.fn<typeof KaraokeApi.fetchKaraokeLyrics>()
}));
vi.mock('../../../api/lyrics/lrcApi', () => ({
  fetchLyricsWithTranslation: leaves.normal
}));
vi.mock('../../../api/lyrics/lrcs/karaoke', () => ({
  fetchKaraokeLyrics: leaves.karaoke
}));
const enabled = vi.fn<() => Promise<boolean>>();
const translation = vi.fn<() => Promise<boolean>>();
const karaokeEnabled = vi.fn<() => Promise<boolean>>();
const calibrate = vi.fn<() => Promise<boolean>>();
const delay = vi.fn<() => Promise<number>>();
const timestamp = vi.fn<() => Promise<{
  isAvailable: boolean;
  playbackStatus?: string;
  playbackRate?: number;
  sourceAppUserModelId?: string;
  timeline?: {
    position: number;
    sampledAtMs?: number;
  };
}>>();
const unsubscribe = vi.fn();
const unsubscribeSettings = vi.fn();
let nowPlaying: ((info: NowPlayingInfo | null) => void) | undefined;
let settingsChanged: ((channel: string, value: unknown) => void) | undefined;
const options = {
  handleNowPlayingUpdate: vi.fn<(info: NowPlayingInfo | null) => void>(),
  updateProgress: vi.fn<(position: number) => void>(),
  setSyncedLyrics: vi.fn<(lyrics: SyncedLyricLine[] | null) => void>(),
  setTranslationLyrics: vi.fn<(result: TranslationLyricsResult | null) => void>(),
  setLyricsLoading: vi.fn<(loading: boolean) => void>()
};
/** 创建原生播放器事件。
 * @param overrides - 播放信息差异
 * @returns 原生形状的播放信息
 */
function song(overrides: Partial<NowPlayingInfo> = {}): NowPlayingInfo {
  return {
    title: 'Song',
    artist: 'Singer',
    album: '',
    position_ms: 1000,
    duration_ms: 100000,
    isPlaying: true,
    deviceId: 'player',
    canFastForward: false,
    canSkip: false,
    canLike: false,
    canChangeVolume: false,
    canSetOutput: false,
    ...overrides
  };
}
/** 返回真实歌词数据形状。
 * @returns 普通歌词结果
 */
function lyrics(): LyricsFetchResult {
  return {
    lyrics: [{
      time_ms: 1000,
      text: 'one'
    }, {
      time_ms: 2000,
      text: 'two'
    }, {
      time_ms: 5000,
      text: 'three'
    }],
    translation: {
      status: 'available',
      lines: [{
        time_ms: 1000,
        text: 'translated'
      }]
    }
  };
}
/** 提交实际 Hook 和 native effect。
 */
function mount(): void {
  renderHook(useIslandNowPlayingSync, options);
  flushHookEffects();
}
/** 发送实际监听回调并完成歌词请求。
 * @param info - 原生事件
 */
async function emit(info: NowPlayingInfo | null): Promise<void> {
  nowPlaying?.(info);
  await settleHook();
  await settleHook();
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  nowPlaying = undefined;
  settingsChanged = undefined;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  enabled.mockResolvedValue(true);
  translation.mockResolvedValue(true);
  karaokeEnabled.mockResolvedValue(false);
  calibrate.mockResolvedValue(true);
  delay.mockResolvedValue(1);
  timestamp.mockResolvedValue({
    isAvailable: false
  });
  leaves.normal.mockResolvedValue(lyrics());
  leaves.karaoke.mockResolvedValue(null);
  vi.stubGlobal('window', {
    api: {
      onNowPlayingInfo: (listener: typeof nowPlaying) => {
        nowPlaying = listener;
        return unsubscribe;
      },
      onSettingsChanged: (listener: typeof settingsChanged) => {
        settingsChanged = listener;
        return unsubscribeSettings;
      },
      musicLyricsEnabledGet: enabled,
      musicLyricsTranslationEnabledGet: translation,
      musicLyricsKaraokeGet: karaokeEnabled,
      musicLyricsCalibrateEnabledGet: calibrate,
      musicLyricsCalibrateDelayGet: delay,
      smtcGetTimestamp: timestamp
    }
  });
});
afterEach(() => {
  unmountHook();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useIslandNowPlayingSync runtime', () => {
  it.each([0, 1.05, 2.5, 6])('calibration at %s seconds updates the playback clock without shifting lyric or translation timings', async (position) => {
    timestamp.mockResolvedValue({
      isAvailable: true,
      timeline: {
        position
      }
    });
    mount();
    await emit(song());
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.setSyncedLyrics.mock.calls).toEqual([[null], [lyrics().lyrics]]);
    expect(options.setTranslationLyrics).toHaveBeenLastCalledWith(lyrics().translation);
    expect(options.updateProgress).toHaveBeenLastCalledWith(position * 1000);
    expect(timestamp).toHaveBeenCalledTimes(1);
  });
  it.each(['missing-timeline', 'timestamp-reject'] as const)('calibration %s preserves original lyrics', async (stage) => {
    if (stage === 'missing-timeline') {
      timestamp.mockResolvedValue({
        isAvailable: true
      });
    } else timestamp.mockRejectedValue(new Error('timestamp'));
    mount();
    await emit(song());
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.setSyncedLyrics).toHaveBeenLastCalledWith(lyrics().lyrics);
  });
  it.each(['disposed', 'new-song', 'new-player', 'pause', 'seek', 'disabled'] as const)('in-flight calibration %s cannot overwrite the current playback clock', async (stage) => {
    const pending = deferred<Awaited<ReturnType<typeof timestamp>>>();
    timestamp.mockReturnValueOnce(pending.promise);
    mount();
    await emit(song());
    vi.advanceTimersByTime(1000);
    expect(timestamp).toHaveBeenCalledTimes(1);
    if (stage === 'disposed') unmountHook();
    else if (stage === 'pause') await emit(song({ isPlaying: false }));
    else if (stage === 'seek') await emit(song({ position_ms: 30000 }));
    else if (stage === 'new-player') await emit(song({ deviceId: 'other-player' }));
    else if (stage === 'disabled') settingsChanged?.('music:lyrics-calibrate-enabled', false);
    else {
      await emit(song({
        title: 'New'
      }));
    }
    options.setSyncedLyrics.mockClear();
    options.updateProgress.mockClear();
    pending.resolve({
      isAvailable: true,
      timeline: {
        position: 2.5
      }
    });
    await settleHook();
    expect(options.setSyncedLyrics).not.toHaveBeenCalled();
    expect(options.updateProgress).not.toHaveBeenCalled();
  });
  it('settings read failures retain defaults and rejected normal request publishes not-fetched translation/null lyrics', async () => {
    [enabled, translation, karaokeEnabled, calibrate, delay].forEach((fn) => fn.mockRejectedValue(new Error('setting')));
    leaves.normal.mockRejectedValue(new Error('lyrics'));
    mount();
    await emit(song());
    expect(options.setSyncedLyrics).toHaveBeenLastCalledWith(null);
    expect(options.setTranslationLyrics).toHaveBeenLastCalledWith({
      status: 'not-fetched',
      lines: null
    });
    expect(leaves.karaoke).not.toHaveBeenCalled();
  });
  it('late settings completion after stop returns before either lyric request', async () => {
    const pending = deferred<boolean>();
    karaokeEnabled.mockReturnValue(pending.promise);
    mount();
    nowPlaying?.(song());
    await settleHook();
    await emit(null);
    pending.resolve(true);
    await settleHook();
    expect(leaves.normal).not.toHaveBeenCalled();
    expect(leaves.karaoke).not.toHaveBeenCalled();
  });
  it.each(['normal', 'karaoke'] as const)('translation/calibration disabled for %s keeps publication and zero calibration timers', async (source) => {
    calibrate.mockResolvedValue(false);
    translation.mockResolvedValue(false);
    if (source === 'karaoke') {
      karaokeEnabled.mockResolvedValue(true);
      leaves.karaoke.mockResolvedValue([{
        time_ms: 1000,
        text: 'word',
        duration_ms: 1000,
        syllables: [{
          text: 'word',
          start_offset_ms: 0,
          duration_ms: 1000
        }]
      }]);
    }
    mount();
    await emit(song({
      isPlaying: false
    }));
    expect(options.setSyncedLyrics).toHaveBeenLastCalledWith(source === 'normal' ? lyrics().lyrics : [{
      time_ms: 1000,
      text: 'word',
      duration_ms: 1000,
      syllables: [{
        text: 'word',
        start_offset_ms: 0,
        duration_ms: 1000
      }]
    }]);
    expect(options.setTranslationLyrics.mock.calls).toEqual([[null]]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('karaoke publication has mapped syllables, calibration timer and missing normal translation fallback', async () => {
    karaokeEnabled.mockResolvedValue(true);
    leaves.karaoke.mockResolvedValue([{
      time_ms: 1000,
      text: 'word',
      duration_ms: 1000,
      syllables: [{
        text: 'word',
        start_offset_ms: 0,
        duration_ms: 1000
      }]
    }]);
    leaves.normal.mockResolvedValue(null);
    mount();
    await emit(song());
    expect(options.setSyncedLyrics).toHaveBeenLastCalledWith([{
      time_ms: 1000,
      text: 'word',
      duration_ms: 1000,
      syllables: [{
        text: 'word',
        start_offset_ms: 0,
        duration_ms: 1000
      }]
    }]);
    expect(options.setTranslationLyrics).toHaveBeenLastCalledWith({
      status: 'not-fetched',
      lines: null
    });
    expect(vi.getTimerCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(timestamp).toHaveBeenCalledTimes(1);
  });
  it.each(['empty', 'absent', 'reject'] as const)('karaoke %s falls back to real normal lyric publication', async (stage) => {
    karaokeEnabled.mockResolvedValue(true);
    if (stage === 'empty') leaves.karaoke.mockResolvedValue([]);else if (stage === 'absent') leaves.karaoke.mockResolvedValue(null);else leaves.karaoke.mockRejectedValue(new Error('karaoke'));
    mount();
    await emit(song({
      isPlaying: false
    }));
    expect(options.setSyncedLyrics).toHaveBeenLastCalledWith(lyrics().lyrics);
    expect(options.setTranslationLyrics).toHaveBeenLastCalledWith(lyrics().translation);
  });
  it.each(['resolve', 'reject'] as const)('old karaoke %s after stop is discarded', async (stage) => {
    const pending = deferred<Awaited<ReturnType<typeof KaraokeApi.fetchKaraokeLyrics>>>();
    karaokeEnabled.mockResolvedValue(true);
    leaves.karaoke.mockReturnValueOnce(pending.promise);
    mount();
    nowPlaying?.(song());
    await settleHook();
    await emit(null);
    options.setSyncedLyrics.mockClear();
    if (stage === 'resolve') {
      pending.resolve([{
        time_ms: 0,
        text: 'late',
        duration_ms: 1000,
        syllables: []
      }]);
    } else pending.reject(new Error('late'));
    await settleHook();
    expect(options.setSyncedLyrics).not.toHaveBeenCalled();
  });
  it('normal translation resolving after published karaoke and stop does not publish stale translation', async () => {
    const pending = deferred<Awaited<ReturnType<typeof LyricsApi.fetchLyricsWithTranslation>>>();
    karaokeEnabled.mockResolvedValue(true);
    leaves.karaoke.mockResolvedValue([{
      time_ms: 0,
      text: 'word',
      duration_ms: 1000,
      syllables: []
    }]);
    leaves.normal.mockReturnValueOnce(pending.promise);
    mount();
    nowPlaying?.(song());
    await settleHook();
    expect(options.setSyncedLyrics).toHaveBeenLastCalledWith([{
      time_ms: 0,
      text: 'word',
      duration_ms: 1000,
      syllables: []
    }]);
    await emit(null);
    options.setTranslationLyrics.mockClear();
    pending.resolve(lyrics());
    await settleHook();
    expect(options.setTranslationLyrics).not.toHaveBeenCalled();
  });
  it('native callback retained by IPC after cleanup cannot restart state or timers', async () => {
    mount();
    const listener = nowPlaying;
    unmountHook();
    listener?.(song());
    await settleHook();
    expect(options.handleNowPlayingUpdate).not.toHaveBeenCalled();
    expect(leaves.normal).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('missing position does not start progress, unknown duration is unbounded and latest callbacks are used', async () => {
    enabled.mockResolvedValue(false);
    mount();
    await emit(song({
      position_ms: undefined
    }));
    expect(vi.getTimerCount()).toBe(0);
    const updated = {
      ...options,
      updateProgress: vi.fn<(position: number) => void>(),
      handleNowPlayingUpdate: vi.fn<(info: NowPlayingInfo | null) => void>()
    };
    renderHook(useIslandNowPlayingSync, updated);
    flushHookEffects();
    await emit(song({
      duration_ms: 0,
      position_ms: -5
    }));
    vi.advanceTimersByTime(66);
    expect(updated.updateProgress).toHaveBeenLastCalledWith(61);
    expect(options.updateProgress).not.toHaveBeenCalled();
    expect(updated.handleNowPlayingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      duration_ms: 0
    }));
    await emit(song({
      isPlaying: false,
      position_ms: 20
    }));
    expect(updated.updateProgress).toHaveBeenLastCalledWith(20);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('inactive consumers stop interpolation and resume from elapsed wall time without resubscribing', async () => {
    enabled.mockResolvedValue(false);
    renderHook(useIslandNowPlayingSync, { ...options, progressEnabled: false }); flushHookEffects();
    await emit(song());
    expect(vi.getTimerCount()).toBe(0);
    options.updateProgress.mockClear();
    vi.advanceTimersByTime(10_000);
    expect(options.updateProgress).not.toHaveBeenCalled();
    renderHook(useIslandNowPlayingSync, { ...options, progressEnabled: true }); flushHookEffects();
    expect(options.updateProgress).toHaveBeenLastCalledWith(11_000);
    expect(vi.getTimerCount()).toBe(1);
    renderHook(useIslandNowPlayingSync, { ...options, progressEnabled: false }); flushHookEffects();
    expect(vi.getTimerCount()).toBe(0);
    expect(unsubscribe).not.toHaveBeenCalled();
  });
  it.each([0, 2])('compensates event delivery latency at playback rate %s and immediately publishes seeks', async (playbackRate) => {
    enabled.mockResolvedValue(false);
    mount();
    await emit(song({ playbackRate, positionTimestampMs: 8500 }));
    expect(options.updateProgress).toHaveBeenLastCalledWith(1000 + 1500 * playbackRate);
    await vi.advanceTimersByTimeAsync(66);
    expect(options.updateProgress).toHaveBeenLastCalledWith(1000 + 1566 * playbackRate);
    expect(vi.getTimerCount()).toBe(playbackRate === 0 ? 0 : 1);
    await emit(song({ playbackRate, position_ms: 30000, positionTimestampMs: Date.now() }));
    expect(options.updateProgress).toHaveBeenLastCalledWith(30000);
  });
  it('freezes and resumes progress when playback state arrives without a position', async () => {
    enabled.mockResolvedValue(false);
    mount();
    await emit(song({ playbackRate: 2 }));
    await vi.advanceTimersByTimeAsync(1000);
    await emit(song({ isPlaying: false, position_ms: undefined }));
    expect(options.updateProgress).toHaveBeenLastCalledWith(3000);
    await vi.advanceTimersByTimeAsync(60000);
    expect(options.updateProgress).toHaveBeenLastCalledWith(3000);
    expect(vi.getTimerCount()).toBe(0);
    await emit(song({ position_ms: undefined }));
    expect(options.updateProgress).toHaveBeenLastCalledWith(3000);
    await vi.advanceTimersByTimeAsync(66);
    expect(options.updateProgress).toHaveBeenLastCalledWith(3132);
  });
  it('preserves the clock when a malformed position arrives and clears it for a new song without position', async () => {
    enabled.mockResolvedValue(false);
    mount();
    await emit(song());
    await vi.advanceTimersByTimeAsync(100);
    await emit(song({ position_ms: Number.NaN }));
    expect(options.updateProgress).toHaveBeenLastCalledWith(1100);
    await emit(song({ title: 'Other', position_ms: undefined }));
    options.updateProgress.mockClear();
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.updateProgress).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([0, 2])('calibration compensates timestamp delivery latency at playback rate %s', async (playbackRate) => {
    timestamp.mockResolvedValue({
      playbackRate,
      isAvailable: true,
      playbackStatus: 'playing',
      sourceAppUserModelId: 'player',
      timeline: { position: 3, sampledAtMs: 10500 },
    });
    mount();
    await emit(song());
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.updateProgress).toHaveBeenLastCalledWith(3000 + 500 * playbackRate);
    await vi.advanceTimersByTimeAsync(66);
    expect(options.updateProgress).toHaveBeenLastCalledWith(3000 + 556 * playbackRate);
    expect(options.setSyncedLyrics.mock.calls).toEqual([[null], [lyrics().lyrics]]);
  });
  it.each(['other-player', 'paused', 'invalid-position'] as const)('rejects a calibration snapshot for %s', async (stage) => {
    timestamp.mockResolvedValue({
      isAvailable: true,
      playbackStatus: stage === 'paused' ? 'paused' : 'playing',
      sourceAppUserModelId: stage === 'other-player' ? 'other-player' : 'player',
      timeline: { position: stage === 'invalid-position' ? Number.NaN : 50 },
    });
    mount();
    await emit(song());
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.updateProgress).toHaveBeenLastCalledWith(1990);
    expect(options.setSyncedLyrics.mock.calls).toEqual([[null], [lyrics().lyrics]]);
  });
  it('re-fetches the same track for a different player and rejects the original player lyrics', async () => {
    const pending = deferred<LyricsFetchResult | null>();
    leaves.normal.mockReturnValueOnce(pending.promise);
    mount();
    await emit(song());
    await emit(song({ deviceId: 'other-player' }));
    expect(leaves.normal.mock.calls).toEqual([
      ['Song', 'Singer', 'player'], ['Song', 'Singer', 'other-player'],
    ]);
    options.setSyncedLyrics.mockClear();
    pending.resolve({ ...lyrics(), lyrics: [{ time_ms: 50000, text: 'old-player' }] });
    await settleHook();
    expect(options.setSyncedLyrics).not.toHaveBeenCalled();
  });
  it('applies calibration switch and delay changes immediately to the current song', async () => {
    mount();
    await emit(song());
    await vi.advanceTimersByTimeAsync(500);
    settingsChanged?.('music:lyrics-calibrate-enabled', false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(timestamp).not.toHaveBeenCalled();
    settingsChanged?.('music:lyrics-calibrate-enabled', true);
    await vi.advanceTimersByTimeAsync(500);
    settingsChanged?.('music:lyrics-calibrate-delay', 2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(timestamp).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(timestamp).toHaveBeenCalledOnce();
  });
  it('ignores unrelated settings and waits for playback after enabling calibration while paused', async () => {
    calibrate.mockResolvedValue(false);
    mount();
    await emit(song({ isPlaying: false }));
    settingsChanged?.('music:lyrics-calibrate-enabled', true);
    settingsChanged?.('music:lyrics-calibrate-delay', 2);
    settingsChanged?.('unrelated-setting', 100);
    settingsChanged?.('music:lyrics-calibrate-delay', Number.NaN);
    await vi.advanceTimersByTimeAsync(60000);
    expect(timestamp).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    await emit(song());
    await vi.advanceTimersByTimeAsync(1999);
    expect(timestamp).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(timestamp).toHaveBeenCalledOnce();
  });
  it('does not let an older settings read overwrite a live calibration change', async () => {
    const pending = deferred<boolean>();
    calibrate.mockReturnValueOnce(pending.promise);
    mount();
    nowPlaying?.(song());
    await settleHook();
    settingsChanged?.('music:lyrics-calibrate-enabled', false);
    pending.resolve(true);
    await settleHook();
    await settleHook();
    await vi.advanceTimersByTimeAsync(2000);
    expect(timestamp).not.toHaveBeenCalled();
    expect(options.setLyricsLoading).toHaveBeenLastCalledWith(false);
  });
  it('releases settings listeners and ignores callbacks retained after unmount', async () => {
    mount();
    await emit(song());
    const listener = settingsChanged;
    unmountHook();
    listener?.('music:lyrics-calibrate-enabled', true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(timestamp).not.toHaveBeenCalled();
    expect(unsubscribeSettings).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('missing optional bridge registers nothing and cleans up safely', () => {
    vi.stubGlobal('window', {});
    mount();
    unmountHook();
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
