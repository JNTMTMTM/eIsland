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
 * @file musicBeatSource.test.ts
 * @description SMTC 播放源与活动音频进程匹配测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { normalizeMusicSourceId, resolveMusicAudioProcess } from '../musicBeatSource';

const process = (processId: number, processName: string, displayName = '') => ({
  processId,
  processName,
  displayName,
});

describe('musicBeatSource', () => {
  it('normalizes executable and AUMID separators', () => {
    expect(normalizeMusicSourceId('Spotify.exe')).toBe('spotify');
    expect(normalizeMusicSourceId('SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify')).toBe('spotifyabspotifymusiczpdnekdrzrea0spotify');
  });

  it('matches a process directly from the SMTC source', () => {
    const target = resolveMusicAudioProcess('SodaMusic.exe', [
      process(10, 'chrome'),
      process(20, 'SodaMusic'),
    ]);

    expect(target?.processId).toBe(20);
  });

  it('matches known aliases when SMTC and process names differ', () => {
    const spotify = resolveMusicAudioProcess('SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify', [
      process(10, 'chrome'),
      process(20, 'Spotify'),
    ]);
    const netease = resolveMusicAudioProcess('NetEase.CloudMusic', [
      process(30, 'orpheus'),
      process(40, 'msedge'),
    ]);

    expect(spotify?.processId).toBe(20);
    expect(netease?.processId).toBe(30);
  });

  it('falls back only when one active audio process exists', () => {
    expect(resolveMusicAudioProcess('Unknown.Player', [process(10, 'actual-player')])?.processId).toBe(10);
    expect(resolveMusicAudioProcess('Unknown.Player', [
      process(10, 'actual-player'),
      process(20, 'other-audio'),
    ])).toBeUndefined();
  });
});