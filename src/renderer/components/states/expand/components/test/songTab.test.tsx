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
 * @file songTab.test.tsx
 * @description 歌曲页媒体控制、歌词加载与前奏、逐字进度及天气倒计时边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, value } from '../../../maxExpand/test/componentHarness';
import { fire } from '../../../maxExpand/components/tools/components/test/toolTestEvents';
import { SongTab } from '../SongTab';
import type { ReactElement } from 'react';
import type { IIslandStore } from '../../../../../store/types';

type SongState = Pick<IIslandStore, 'isMusicPlaying' | 'isPlaying' | 'mediaInfo' | 'syncedLyrics' | 'lyricsLoading' | 'coverImage' | 'dominantColor' | 'countdown' | 'timerData' | 'currentPositionMs'> & { weather: { temperature: number; description: string } | null };
const mocks = vi.hoisted(() => ({
  state: {} as SongState, karaoke: vi.fn<() => Promise<boolean>>(), prev: vi.fn(), next: vi.fn(), play: vi.fn(),
}));
vi.mock('../../../../../store/slices', () => ({ default: (selector: (state: SongState) => unknown) => selector(mocks.state) }));

describe('SongTab', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    mocks.state = { isMusicPlaying: false, isPlaying: false, mediaInfo: { title: '', artist: '', album: '', duration_ms: 0 },
      syncedLyrics: null, lyricsLoading: false, coverImage: null, dominantColor: [20, 30, 40], weather: null,
      countdown: { enabled: false, label: '', targetDate: '' }, timerData: { state: 'idle', remainingSeconds: 0, inputHours: '', inputMinutes: '', inputSeconds: '' }, currentPositionMs: 0 };
    mocks.karaoke.mockResolvedValue(false);
    vi.stubGlobal('window', { api: { mediaPrev: mocks.prev, mediaNext: mocks.next, mediaPlayPause: mocks.play, musicLyricsKaraokeGet: mocks.karaoke } });
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('未播放时显示引导、禁用控制并省略天气、计时器和专辑', () => {
    const tree = render(SongTab);
    expect(text(tree)).toContain('songTab.onboarding.title');
    expect(nodes(tree, '.ov-ctrl-btn').every((node) => node.props.disabled === true)).toBe(true);
    ['.ov-weather', '.ov-countdown', '.ov-timer', '.ov-meta-album'].forEach((selector) => { expect(nodes(tree, selector)).toHaveLength(0); });
  });

  it('播放时展示封面和元数据，控制执行IPC且阻止冒泡', () => {
    Object.assign(mocks.state, { isMusicPlaying: true, isPlaying: true, coverImage: 'cover.png', mediaInfo: { title: 'Song', artist: 'Singer', album: 'Album', duration_ms: 60000 } });
    const tree = render(SongTab);
    expect(text(tree)).toContain('SongSingerAlbum');
    expect(value(tree, '.ov-disc', 'className')).toContain('spinning');
    expect(value(tree, '.ov-disc-cover', 'style')).toEqual({ backgroundImage: 'url(cover.png)' });
    const event = { stopPropagation: vi.fn() };
    [0, 1, 2].forEach((index) => { fire(tree, '.ov-ctrl-btn', 'onClick', index, event); });
    [mocks.prev, mocks.play, mocks.next].forEach((fn) => { expect(fn).toHaveBeenCalledOnce(); });
    expect(event.stopPropagation).toHaveBeenCalledTimes(3);
    mocks.state.isPlaying = false;
    expect(value(render(SongTab), '.ov-ctrl-play', 'title')).toContain('controls.play');
  });

  it('加载中、无歌词和前奏分别显示对应内容，正常歌词最多五行', () => {
    mocks.state.isMusicPlaying = true; mocks.state.lyricsLoading = true;
    expect(nodes(render(SongTab), '.ov-lrc-loading-dot')).toHaveLength(3);
    mocks.state.lyricsLoading = false;
    expect(text(render(SongTab))).toContain('songTab.lyrics.empty');
    mocks.state.syncedLyrics = [...Array.from({ length: 7 }).keys()].map((index) => ({ time_ms: (index + 1) * 1000, text: `line${  index}` }));
    expect(nodes(render(SongTab), '.ov-lrc-intro-icon')).toHaveLength(1);
    expect(nodes(render(SongTab), '.ov-lrc-line')).toHaveLength(2);
    mocks.state.currentPositionMs = 4000;
    const tree = render(SongTab);
    expect(nodes(tree, '.ov-lrc-line')).toHaveLength(5);
    expect(text(nodes(tree, '.current'))).toBe('line3');
  });

  it('逐字模式传递真实音节进度，零时长和已完成音节正确限制到边界', async () => {
    mocks.state.isMusicPlaying = true; mocks.state.currentPositionMs = 1500;
    mocks.state.syncedLyrics = [{ time_ms: 1000, text: 'ABC', syllables: [
      { text: 'A', start_offset_ms: 0, duration_ms: 1000 }, { text: 'B', start_offset_ms: 1000, duration_ms: 0 },
      { text: 'C', start_offset_ms: 0, duration_ms: 100 },
    ] }];
    mocks.karaoke.mockResolvedValue(true);
    const initial = render(SongTab); expect(initial).toBeDefined();
    const cleanup = flushEffects(); await Promise.resolve();
    const [{ props }] = nodes(render(SongTab), '.current');
    const marquee = props.children as ReactElement<{ children: ReactElement<object> }>;
    const line = marquee.props.children;
    const tree = render(line.type, line.props);
    expect(nodes(tree, '.ov-lrc-syllable').map((node) => node.props.style)).toEqual([
      { '--syl-prog': '50.00%' }, { '--syl-prog': '0.00%' }, { '--syl-prog': '100.00%' },
    ]);
    cleanup.forEach((fn) => fn());
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { ms: -1, key: 'expired' }, { ms: 2 * 86400000, key: 'dayHour' },
    { ms: 2 * 3600000, key: 'hourMinute' }, { ms: 5 * 60000, key: 'minute' },
  ])('倒计时差 $ms显示 $key，暂停计时器仍展示剩余时间', ({ ms, key }) => {
    mocks.state.countdown = { enabled: true, label: 'Event', targetDate: new Date(Date.now() + ms).toISOString() };
    mocks.state.timerData.state = 'paused'; mocks.state.timerData.remainingSeconds = 125;
    mocks.state.weather = { temperature: 25.6, description: '晴' };
    const tree = render(SongTab);
    expect(text(nodes(tree, '.ov-countdown'))).toContain(`songTab.countdown.${  key}`);
    expect(text(nodes(tree, '.ov-timer'))).toBe('02:05');
    expect(text(nodes(tree, '.ov-weather-temp'))).toBe('26°');
  });
});
