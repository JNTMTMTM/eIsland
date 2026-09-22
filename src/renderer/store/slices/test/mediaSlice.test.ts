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
 * @file mediaSlice.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import type { StateCreator } from 'zustand';
import { describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { shallow } from 'zustand/shallow';
import type { IIslandStore, NowPlayingInfo } from '../../types';
import selectDynamicIslandState from '../../../components/utils/selectDynamicIslandState';
import { emptyMediaInfo } from '../../constants/defaults';
import { createMediaSlice } from '../mediaSlice';

type MediaState = ReturnType<typeof createMediaSlice>;

function createSliceState(creator: StateCreator<MediaState, [], [], MediaState>): { getState: () => MediaState } {
  let state = {} as MediaState;
  const setState = (updater: Partial<MediaState> | ((prev: MediaState) => Partial<MediaState>)) => {
    const patch = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...patch };
  };
  state = creator(setState as never, (() => state) as never, {} as never);
  return { getState: () => state };
}

describe('createMediaSlice', () => {
  it('isolates the island shell and metadata subscribers from playback progress updates', () => {
    const store = createStore(createMediaSlice);
    const info: NowPlayingInfo = {
      title: 'Song', artist: 'Singer', album: 'Album', duration_ms: 120000,
      position_ms: 0, isPlaying: true, canFastForward: false, canSkip: false,
      canLike: false, canChangeVolume: false, canSetOutput: false,
    };
    store.getState().handleNowPlayingUpdate(info);
    const metadata = store.getState().mediaInfo;
    const shell = selectDynamicIslandState(store.getState() as IIslandStore);

    for (let position = 1; position <= 1000; position += 1) {
      store.getState().handleNowPlayingUpdate({ ...info, position_ms: position });
      store.getState().updateProgress(position + 0.5);
      expect(store.getState().mediaInfo).toBe(metadata);
      expect(shallow(selectDynamicIslandState(store.getState() as IIslandStore), shell)).toBe(true);
    }

    store.getState().setCoverImage('new-cover');
    expect(shallow(selectDynamicIslandState(store.getState() as IIslandStore), shell)).toBe(false);
  });

  it('does not notify subscribers when the progress and playback state are unchanged', () => {
    const store = createStore(createMediaSlice);
    const listener = vi.fn();
    store.subscribe(listener);
    for (let i = 0; i < 100; i += 1) {
      store.getState().updateProgress(0);
      store.getState().setPlaybackState(false);
    }
    expect(listener).not.toHaveBeenCalled();
  });

  it('resets media state when lrc update is null', () => {
    const store = createSliceState(createMediaSlice);
    store.getState().updateLrcData({
      title: 't',
      artist: 'a',
      text: 'lyric',
      position_ms: 10,
      duration_ms: 20,
      nearby_lyrics: [{ text: 'line', is_current: false }],
    });

    store.getState().updateLrcData(null);

    const after = store.getState();
    expect(after.isMusicPlaying).toBe(false);
    expect(after.isPlaying).toBe(false);
    expect(after.currentLyricText).toBeNull();
    expect(after.nearbyLyrics).toEqual([]);
    expect(after.translationLyrics).toBeNull();
  });

  it('stores translation lyrics independently from display lyrics', () => {
    const store = createSliceState(createMediaSlice);
    const translation = {
      status: 'available' as const,
      lines: [{ time_ms: 0, text: 'translated' }],
    };

    expect(store.getState().translationLyrics).toBeNull();
    store.getState().setTranslationLyrics(translation);

    expect(store.getState().translationLyrics).toEqual(translation);
    expect(store.getState().syncedLyrics).toBeNull();
  });

  it('updates core fields on media changed', () => {
    const store = createSliceState(createMediaSlice);

    store.getState().onMediaChanged({
      title: 'Song',
      artist: 'Singer',
      duration_ms: 200000,
      thumbnail: 'cover-url',
    });

    const after = store.getState();
    expect(after.isMusicPlaying).toBe(true);
    expect(after.mediaInfo.title).toBe('Song');
    expect(after.mediaInfo.artist).toBe('Singer');
    expect(after.currentDurationMs).toBe(200000);
    expect(after.currentPositionMs).toBe(0);
    expect(after.coverImage).toBe('cover-url');
  });

  it('clears now-playing when payload is empty', () => {
    const store = createSliceState(createMediaSlice);

    store.getState().handleNowPlayingUpdate({
      title: 'Song',
      artist: 'Singer',
      album: 'Album',
      duration_ms: 120000,
      position_ms: 1000,
      isPlaying: true,
      thumbnail: 'thumb',
    } as never);

    store.getState().handleNowPlayingUpdate(null);

    const after = store.getState();
    expect(after.isMusicPlaying).toBe(false);
    expect(after.isPlaying).toBe(false);
    expect(after.mediaInfo).toEqual(emptyMediaInfo);
    expect(after.currentDurationMs).toBe(0);
    expect(after.currentPositionMs).toBe(0);
    expect(after.coverImage).toBeNull();
    expect(after.translationLyrics).toBeNull();
  });
});
