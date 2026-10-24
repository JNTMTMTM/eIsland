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
 * @file usePendingSeek.test.ts
 * @description 进度跳转确认规则，以及待确认跳转的提交、广播确认、失败回退、超时、换歌作废与清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { confirmsSeek, usePendingSeek } from '../usePendingSeek';
import type { MediaCommandResult, NowPlayingInfo } from '../../../../preload/types/media';
import type { PendingSeek } from '../usePendingSeek';

vi.mock('react', async (load) => ({
  ...(await load<typeof import('react')>()),
  ...hookMocks,
  ...lifecycleHooks,
}));

const SEEK: PendingSeek = { targetMs: 120000, committedAt: 10000, trackKey: 'Song\nSinger' };

/**
 * 构造主进程媒体广播。
 * @param overrides - 覆盖字段。
 * @returns 媒体信息。
 */
function info(overrides: Partial<NowPlayingInfo> = {}): NowPlayingInfo {
  return {
    title: 'Song', artist: 'Singer', album: '', duration_ms: 180000, position_ms: 120000, positionTimestampMs: 10000, playbackRate: 1, isPlaying: true,
    canFastForward: false, canSkip: false, canLike: false, canChangeVolume: false, canSetOutput: false,
    ...overrides,
  };
}

/** 当前订阅媒体广播的回调。 */
const listeners = new Set<(value: NowPlayingInfo | null) => void>();
const mediaSeek = vi.fn<(positionMs: number) => Promise<MediaCommandResult | undefined>>();

/**
 * 向所有订阅者派发媒体广播。
 * @param value - 媒体信息，无播放时为 null。
 */
function broadcast(value: NowPlayingInfo | null): void {
  [...listeners].forEach((listener) => listener(value));
}

/**
 * 渲染 Hook 并执行待处理 effect。
 * @param trackKey - 当前歌曲标识。
 * @returns Hook 返回值。
 */
function render(trackKey = SEEK.trackKey): ReturnType<typeof usePendingSeek> {
  const result = renderWithHooks(() => usePendingSeek(trackKey));
  runEffects();
  return result;
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers({ now: SEEK.committedAt });
  listeners.clear();
  mediaSeek.mockResolvedValue({ success: true, error: null });
  vi.stubGlobal('window', {
    api: {
      mediaSeek,
      onNowPlayingInfo: (callback: (value: NowPlayingInfo | null) => void) => {
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
    },
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
});

afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('confirmsSeek', () => {
  it('rejects samples taken before the seek, even when a short seek leaves them close to the target', () => {
    expect(confirmsSeek(info({ positionTimestampMs: 9999 }), SEEK)).toBe(false);
    expect(confirmsSeek(info({ positionTimestampMs: undefined }), SEEK)).toBe(false);
    expect(confirmsSeek(info({ positionTimestampMs: Number.NaN }), SEEK)).toBe(false);
  });

  it('accepts a later sample whose position matches the target advanced to the sample time', () => {
    expect(confirmsSeek(info({ position_ms: 122000, positionTimestampMs: 12000 }), SEEK)).toBe(true);
    expect(confirmsSeek(info({ position_ms: 124000, positionTimestampMs: 12000, playbackRate: 2 }), SEEK)).toBe(true);
    expect(confirmsSeek(info({ position_ms: 123500, positionTimestampMs: 12000 }), SEEK)).toBe(true);
    expect(confirmsSeek(info({ position_ms: 123501, positionTimestampMs: 12000 }), SEEK)).toBe(false);
    expect(confirmsSeek(info({ position_ms: 62000, positionTimestampMs: 12000 }), SEEK)).toBe(false);
  });

  it('does not advance the target while paused and treats a missing rate as normal speed', () => {
    expect(confirmsSeek(info({ position_ms: 120000, positionTimestampMs: 15000, isPlaying: false }), SEEK)).toBe(true);
    expect(confirmsSeek(info({ position_ms: 125000, positionTimestampMs: 15000, isPlaying: false }), SEEK)).toBe(false);
    expect(confirmsSeek(info({ position_ms: 125000, positionTimestampMs: 15000, playbackRate: undefined }), SEEK)).toBe(true);
  });
});

describe('usePendingSeek', () => {
  it('records the seek for the current track and forwards it to the player', () => {
    expect(render().pendingSeek).toBeNull();
    render().commitSeek(120000);
    expect(mediaSeek).toHaveBeenCalledExactlyOnceWith(120000);
    expect(render().pendingSeek).toEqual(SEEK);
  });

  it('keeps an accepted seek until a broadcast confirms it, ignoring broadcasts that still carry the old position', async () => {
    render().commitSeek(120000);
    await vi.advanceTimersByTimeAsync(0);
    render();
    broadcast(info({ position_ms: 60000, positionTimestampMs: 9900 }));
    broadcast(info({ position_ms: 60100, positionTimestampMs: 10100 }));
    expect(render().pendingSeek).toEqual(SEEK);
    broadcast(info({ position_ms: 120150, positionTimestampMs: 10200 }));
    expect(render().pendingSeek).toBeNull();
    expect(listeners.size).toBe(0);
  });

  it.each([
    { name: 'a failure result', respond: () => mediaSeek.mockResolvedValueOnce({ success: false, error: 'seek rejected' }) },
    { name: 'no result because the main process skipped the seek', respond: () => mediaSeek.mockResolvedValueOnce(undefined) },
    { name: 'a rejected request', respond: () => mediaSeek.mockRejectedValueOnce(new Error('ipc failed')) },
  ])('drops the seek at once after $name', async ({ respond }) => {
    respond();
    render().commitSeek(120000);
    expect(render().pendingSeek).toEqual(SEEK);
    await vi.advanceTimersByTimeAsync(0);
    expect(render().pendingSeek).toBeNull();
  });

  it('lets a failed earlier seek leave a newer seek alone', async () => {
    let failFirst: (value: MediaCommandResult) => void = () => undefined;
    mediaSeek.mockReturnValueOnce(new Promise((resolve) => { failFirst = resolve; }));
    render().commitSeek(30000);
    vi.setSystemTime(10500);
    render().commitSeek(120000);
    failFirst({ success: false, error: 'seek rejected' });
    await vi.advanceTimersByTimeAsync(0);
    expect(render().pendingSeek).toEqual({ ...SEEK, committedAt: 10500 });
  });

  it('gives up when the player never confirms or playback ends', () => {
    render().commitSeek(120000);
    render();
    vi.advanceTimersByTime(999);
    expect(render().pendingSeek).toEqual(SEEK);
    vi.advanceTimersByTime(1);
    expect(render().pendingSeek).toBeNull();
    render().commitSeek(90000);
    render();
    broadcast(null);
    expect(render().pendingSeek).toBeNull();
  });

  it('ignores the seek once the track changes', () => {
    render().commitSeek(120000);
    expect(render('Next\nSinger').pendingSeek).toBeNull();
  });

  it('releases the timeout and the broadcast listener on unmount', () => {
    render().commitSeek(120000);
    render();
    expect(vi.getTimerCount()).toBe(1);
    expect(listeners.size).toBe(1);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    expect(listeners.size).toBe(0);
  });
});
