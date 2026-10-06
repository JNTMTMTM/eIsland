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
 * @file mediaSliceRuntime.test.ts
 * @description 媒体真实 Zustand 省略字段、歌词生命周期、幂等引用与 SMTC 更新边界测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createMediaSlice } from '../mediaSlice';
import type { NowPlayingInfo } from '../../types';

/** 创建符合原生 SMTC 公开契约的消息。
 * @param patch - 本场景变化的字段。
 * @returns 完整消息。
 */
function playing(patch: Partial<NowPlayingInfo> = {}): NowPlayingInfo {
  return {
    title: 'Song', artist: 'Singer', album: 'Album', duration_ms: 100,
    position_ms: 10, isPlaying: true, canFastForward: false, canSkip: false,
    canLike: false, canChangeVolume: false, canSetOutput: false, ...patch,
  };
}

describe('真实媒体 Zustand 更新边界', () => {
  it('歌词字段省略时保留当前进度和元数据，显式零值仍更新', () => {
    const store = createStore(createMediaSlice);
    store.getState().handleNowPlayingUpdate(playing());
    store.getState().updateLrcData({ title: '', artist: '', text: 'line' });
    expect(store.getState()).toMatchObject({ currentPositionMs: 10, currentDurationMs: 100, currentLyricText: 'line', nearbyLyrics: [], mediaInfo: { title: 'Song', artist: 'Singer', album: 'Album', duration_ms: 100 } });
    store.getState().updateLrcData({ title: 'New', artist: 'New singer', text: null, position_ms: 0, duration_ms: 0, nearby_lyrics: [] });
    expect(store.getState()).toMatchObject({ currentPositionMs: 0, currentDurationMs: 0, mediaInfo: { title: 'New', artist: 'New singer', duration_ms: 0 } });
  });
  it('媒体变化省略时长归零且缺失封面保留，显式空封面清理', () => {
    const store = createStore(createMediaSlice);
    store.getState().setCoverImage('cover');
    store.getState().onMediaChanged({ title: 'New', artist: 'Singer' });
    expect(store.getState()).toMatchObject({ currentDurationMs: 0, currentPositionMs: 0, coverImage: 'cover', mediaInfo: { duration_ms: 0 } });
    store.getState().onMediaChanged({ title: 'New', artist: 'Singer', thumbnail: null });
    expect(store.getState().coverImage).toBeNull();
  });
  it('公开歌词模式和同步歌词 setters 更新状态并结束加载', () => {
    const store = createStore(createMediaSlice);
    store.getState().setLrcMode('off');
    store.getState().setDominantColor([10, 20, 30]);
    expect(store.getState().dominantColor).toEqual([10, 20, 30]);
    store.getState().setLyricsLoading(true);
    expect(store.getState()).toMatchObject({ lrcMode: 'off', lyricsLoading: true });
    const lyrics = [{ time_ms: 0, text: 'line' }];
    store.getState().setSyncedLyrics(lyrics);
    expect(store.getState().syncedLyrics).toBe(lyrics);
    expect(store.getState().lyricsLoading).toBe(false);
    store.getState().setSyncedLyrics(null);
    store.getState().setPlaybackState(true);
    expect(store.getState()).toMatchObject({ syncedLyrics: null, isPlaying: true });
  });
  it('空标题原生消息清理先前播放状态与封面', () => {
    const store = createStore(createMediaSlice);
    store.getState().handleNowPlayingUpdate(playing({ thumbnail: 'cover' }));
    store.getState().handleNowPlayingUpdate(playing({ title: '' }));
    expect(store.getState()).toMatchObject({ isMusicPlaying: false, isPlaying: false, currentPositionMs: 0, coverImage: null });
  });
  it('完全重复的正在播放快照保留状态引用且不通知订阅', () => {
    const store = createStore(createMediaSlice);
    const info = playing();
    store.getState().handleNowPlayingUpdate(info);
    const before = store.getState();
    const listener = vi.fn<() => void>();
    store.subscribe(listener);
    store.getState().handleNowPlayingUpdate(info);
    expect(store.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });
  it.each([
    { title: 'Other' }, { artist: 'Other' }, { album: '' }, { duration_ms: 200 },
    { isPlaying: false }, { position_ms: 20 }, { thumbnail: null },
  ])('真实元数据或播放字段 %j 变化通知订阅并更新状态', (patch) => {
    const store = createStore(createMediaSlice);
    store.getState().setCoverImage('cover');
    store.getState().handleNowPlayingUpdate(playing());
    const before = store.getState();
    const listener = vi.fn<() => void>();
    store.subscribe(listener);
    const info = playing(patch);
    store.getState().handleNowPlayingUpdate(info);
    expect(listener).toHaveBeenCalledOnce();
    expect(store.getState()).toMatchObject({ isPlaying: info.isPlaying, currentPositionMs: info.position_ms, currentDurationMs: info.duration_ms });
    expect(store.getState().mediaInfo).toEqual({ title: info.title, artist: info.artist, album: info.album, duration_ms: info.duration_ms });
    if ('position_ms' in patch || 'isPlaying' in patch || 'thumbnail' in patch) expect(store.getState().mediaInfo).toBe(before.mediaInfo);
  });
  it.each(['duration', 'cover', 'lyric', 'nearby'])('公开状态 %s 与快照不一致时清理而非误判重复', (kind) => {
    const store = createStore(createMediaSlice);
    const info = playing({ thumbnail: 'cover' });
    store.getState().handleNowPlayingUpdate(info);
    if (kind === 'duration') store.setState({ currentDurationMs: 999 });
    if (kind === 'cover') store.getState().setCoverImage('other');
    if (kind === 'lyric') store.getState().updateLrcData({ title: '', artist: '', text: 'old line' });
    if (kind === 'nearby') store.getState().updateLrcData({ title: '', artist: '', text: null, nearby_lyrics: [{ text: 'old', is_current: true }] });
    const before = store.getState();
    store.getState().handleNowPlayingUpdate(info);
    expect(store.getState()).not.toBe(before);
    expect(store.getState()).toMatchObject({ currentDurationMs: 100, coverImage: 'cover', currentLyricText: null, nearbyLyrics: [] });
  });
});
