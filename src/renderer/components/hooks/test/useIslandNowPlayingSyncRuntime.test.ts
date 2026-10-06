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
 * @description 音乐同步真实逐字歌词回退、校准偏移、状态版本和原生监听清理边界测试。
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
  timeline?: {
    position: number;
  };
}>>();
const unsubscribe = vi.fn();
let nowPlaying: ((info: NowPlayingInfo | null) => void) | undefined;
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
  it.each([['before-first', 0], ['near-line', 1.05], ['middle-line', 2.5], ['after-last', 6]] as const)('calibration %s uses real matching and offset algorithm', async (stage, position) => {
    timestamp.mockResolvedValue({
      isAvailable: true,
      timeline: {
        position
      }
    });
    mount();
    await emit(song());
    await vi.advanceTimersByTimeAsync(1000);
    const expected = lyrics().lyrics;
    if (stage === 'middle-line') {
      expect(options.setSyncedLyrics).toHaveBeenLastCalledWith(expected.map((line) => ({
        ...line,
        time_ms: line.time_ms + 500
      })));
    } else if (stage === 'after-last') {
      expect(options.setSyncedLyrics).toHaveBeenLastCalledWith(expected.map((line) => ({
        ...line,
        time_ms: line.time_ms + 1000
      })));
    } else expect(options.setSyncedLyrics).toHaveBeenLastCalledWith(expected);
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
  it.each(['disposed', 'new-song'] as const)('in-flight calibration %s cannot publish stale lyrics', async (stage) => {
    const pending = deferred<Awaited<ReturnType<typeof timestamp>>>();
    timestamp.mockReturnValueOnce(pending.promise);
    mount();
    await emit(song());
    vi.advanceTimersByTime(1000);
    expect(timestamp).toHaveBeenCalledTimes(1);
    if (stage === 'disposed') unmountHook();else {
      await emit(song({
        title: 'New'
      }));
    }
    options.setSyncedLyrics.mockClear();
    pending.resolve({
      isAvailable: true,
      timeline: {
        position: 2.5
      }
    });
    await settleHook();
    expect(options.setSyncedLyrics).not.toHaveBeenCalled();
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
  it('missing optional bridge registers nothing and cleans up safely', () => {
    vi.stubGlobal('window', {});
    mount();
    unmountHook();
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
