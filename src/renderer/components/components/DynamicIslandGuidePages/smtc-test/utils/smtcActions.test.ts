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
 * @file smtcActions.test.ts
 * @description SMTC 引导页面封面缓存与异步销毁回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dominantColorCache, runtime } from './smtcStore';
import { dispose, ensureInitialized, handleNowPlaying } from './smtcActions';
import type { NowPlayingInfo } from '../../../../../../preload/types/media';

const { extractColor } = vi.hoisted(() => ({ extractColor: vi.fn() }));
vi.mock('./smtcUtils', () => ({ extractDominantColor: extractColor }));

const song: NowPlayingInfo = {
  title: 'Song', artist: 'Singer', album: '', position_ms: 0, duration_ms: 120000,
  isPlaying: true, canFastForward: false, canSkip: false, canLike: false,
  canChangeVolume: false, canSetOutput: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  runtime.initialized = true;
  runtime.sourceAppId = 'player';
  extractColor.mockResolvedValue([1, 2, 3]);
});

afterEach(() => {
  dispose();
  vi.unstubAllGlobals();
});

describe('SMTC guide memory lifecycle', () => {
  it('retains only the current cover across hundreds of song changes and releases it on disposal', async () => {
    await Array.from({ length: 300 }).reduce<Promise<number>>(async (previous) => {
      const i = await previous;
      await handleNowPlaying({ ...song, thumbnail: `data:image/png;base64,${i}` });
      expect(dominantColorCache.size).toBe(1);
      return i + 1;
    }, Promise.resolve(0));
    expect([...dominantColorCache.keys()]).toEqual(['data:image/png;base64,299']);
    dispose();
    expect(dominantColorCache.size).toBe(0);
    expect(runtime.coverImage).toBeNull();
  });

  it('coalesces concurrent extraction of the same cover', async () => {
    let resolveColor!: (value: [number, number, number]) => void;
    extractColor.mockReturnValue(new Promise<[number, number, number]>((resolve) => { resolveColor = resolve; }));
    const first = handleNowPlaying({ ...song, thumbnail: 'cover' });
    const second = handleNowPlaying({ ...song, position_ms: 100 });
    expect(extractColor).toHaveBeenCalledOnce();
    resolveColor([10, 20, 30]);
    await Promise.all([first, second]);
    expect(runtime.meta?.dominantColor).toEqual([10, 20, 30]);
  });

  it('ignores a cover extraction result after the final subscriber leaves', async () => {
    let resolveColor!: (value: [number, number, number]) => void;
    extractColor.mockReturnValue(new Promise<[number, number, number]>((resolve) => { resolveColor = resolve; }));
    const pending = handleNowPlaying({ ...song, thumbnail: 'cover' });
    dispose();
    resolveColor([10, 20, 30]);
    await pending;
    expect(runtime.meta).toBeNull();
    expect(runtime.dominantColor).toEqual([0, 0, 0]);
    expect(dominantColorCache.size).toBe(0);
  });

  it('ignores a delayed initial snapshot after a newer playback notification', async () => {
    dispose();
    let resolveInitial!: (value: NowPlayingInfo | null) => void;
    vi.stubGlobal('window', { api: {
      mediaCurrentInfoGet: () => new Promise<NowPlayingInfo | null>((resolve) => { resolveInitial = resolve; }),
      onNowPlayingInfo: () => vi.fn(),
      musicDetectSourceAppId: () => Promise.resolve({ sources: [] }),
    } });
    ensureInitialized();
    await handleNowPlaying({ ...song, title: 'New song', thumbnail: 'new-cover' });
    resolveInitial({ ...song, title: 'Stale song', thumbnail: 'old-cover' });
    await Promise.resolve();
    expect(runtime.meta?.title).toBe('New song');
    expect([...dominantColorCache.keys()]).toEqual(['new-cover']);
  });
});
