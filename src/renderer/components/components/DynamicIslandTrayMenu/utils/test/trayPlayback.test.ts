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
 * @file trayPlayback.test.ts
 * @description 托盘音乐时间线判断、进度推算与播放时间格式化测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { estimatePlaybackPosition, formatPlaybackTime, hasPlaybackTimeline } from '../trayPlayback';
import type { TrayNowPlaying } from '../../types';

const SONG: TrayNowPlaying = {
  title: 'Song', artist: 'Singer', isPlaying: true, thumbnail: null,
  durationMs: 180000, positionMs: 60000, positionTimestampMs: 10000, playbackRate: 1,
};

describe('hasPlaybackTimeline', () => {
  it('requires media with a positive duration', () => {
    expect(hasPlaybackTimeline(SONG)).toBe(true);
    expect(hasPlaybackTimeline({ ...SONG, durationMs: 1 })).toBe(true);
    expect(hasPlaybackTimeline({ ...SONG, durationMs: 0 })).toBe(false);
    expect(hasPlaybackTimeline(null)).toBe(false);
  });
});

describe('estimatePlaybackPosition', () => {
  it('advances from the sample by the elapsed time and playback rate while playing', () => {
    expect(estimatePlaybackPosition(SONG, 12500)).toBe(62500);
    expect(estimatePlaybackPosition({ ...SONG, playbackRate: 2 }, 12500)).toBe(65000);
    expect(estimatePlaybackPosition({ ...SONG, playbackRate: 0 }, 12500)).toBe(60000);
  });

  it('holds the sampled position when paused or when the clock is behind the sample', () => {
    expect(estimatePlaybackPosition({ ...SONG, isPlaying: false }, 99000)).toBe(60000);
    expect(estimatePlaybackPosition(SONG, 9000)).toBe(60000);
  });

  it('stops at the duration and is unbounded when the duration is unknown', () => {
    expect(estimatePlaybackPosition(SONG, 500000)).toBe(180000);
    expect(estimatePlaybackPosition({ ...SONG, durationMs: 0 }, 500000)).toBe(550000);
  });
});

describe('formatPlaybackTime', () => {
  it.each([
    [0, '0:00'],
    [999, '0:00'],
    [9000, '0:09'],
    [65000, '1:05'],
    [600000, '10:00'],
    [3599999, '59:59'],
    [3600000, '1:00:00'],
    [3725000, '1:02:05'],
    [-5000, '0:00'],
  ])('formats %d ms as %s', (ms, text) => {
    expect(formatPlaybackTime(ms)).toBe(text);
  });
});
