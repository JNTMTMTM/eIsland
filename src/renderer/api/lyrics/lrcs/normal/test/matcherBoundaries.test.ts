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
 * @file matcherBoundaries.test.ts
 * @description 歌词真实匹配算法的评分阈值、候选顺序与多查询失败回退测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { bestMatch, makeSearchQueries, scoreTrack, searchWithScoring } from '../matcher';
import type { ScoreInput, SearchCandidate } from '../searchTypes';

const candidate = (title = 'Song', artists: string[] = [], album = ''): SearchCandidate => ({ title, artists, album, id: title });

afterEach(() => vi.restoreAllMocks());

describe('real lyrics matching score boundaries', () => {
  it.each<[string, string, number]>([
    ['', 'Song', 0], ['Song', '', 0], ['Song', 'song', 4],
    ['Song', 'Song Live', 2], ['Song Live', 'Song', 2],
    ['Song (Live)', 'Song [Studio]', 3], ['Song（Live）', 'Song【Studio】', 3],
    ['Song - Live', 'Song!', 3], ['《Song》', 'Song！', 3],
    ['SongA (Live)', 'Song [Studio]', 1], ['Song (Live)', 'SongA [Studio]', 1],
    ['Alpha (Live)', 'Beta [Studio]', 0],
    ['Song(feat. Guest)', 'Song', 4], ['Song - feat. Guest', 'Song', 4],
  ])('scores title %s against %s as %s', (title, resultTitle, expected) => {
    expect(scoreTrack({ title, artist: '' }, candidate(resultTitle))).toBe(expected);
  });

  it.each<[string, string[], string, number]>([
    ['Artist', ['artist'], ' ', 1], ['Artist Long', ['Artist'], ' ', 1],
    ['Artist', ['ArtistLong'], ' ', 1], ['Different', ['Other'], ' ', 0],
    ['A||B', ['A', 'B'], '||', 2], ['A、B，C/D＆E&F;G；H', ['A B C D E F G H'], '/', 8],
    ['', [], ' ', 0],
  ])('scores normalized artist %s', (artist, artists, separator, expected) => {
    expect(scoreTrack({ artist, title: '' }, candidate('', artists), separator)).toBe(expected);
  });

  it.each<[string | undefined, string, number]>([
    [undefined, 'Album', 0], ['', 'Album', 0], ['Album', '', 0],
    ['Album', 'album', 2], ['Album', 'Album Edition', 1],
    ['Album Edition', 'Album', 1], ['Alpha', 'Beta', 0],
  ])('scores album %s against %s', (album, resultAlbum, expected) => {
    expect(scoreTrack({ album, title: '', artist: '' }, candidate('', [], resultAlbum))).toBe(expected);
  });

  it.each<[number | undefined, number | undefined, number]>([
    [undefined, 1000, 0], [1000, undefined, 0], [1000, 1000, 3],
    [1000, 1500, 2], [1000, 1501, 1], [1000, 2000, 1], [1000, 2001, 0],
  ])('scores duration %s against %s', (durationMs, resultDuration, expected) => {
    expect(scoreTrack({ durationMs, title: '', artist: '' }, { ...candidate(''), durationMs: resultDuration })).toBe(expected);
  });

  it('keeps unique nonempty queries in raw then cleaned order', () => {
    const queries = makeSearchQueries(' Song (Live) ', ' Artist ', ' Album ');
    expect(queries[0]).toBe('Song (Live) Artist');
    expect(queries).toContain('Song Artist');
    expect(queries).toContain('Song (Live) Artist Album');
    expect(queries).toContain('Song Album');
    expect(new Set(queries).size).toBe(queries.length);
    expect(makeSearchQueries(' ', ' ', ' ')).toEqual([]);
    expect(makeSearchQueries('Song', '')).toEqual(['Song']);
  });

  it('selects the highest qualifying score and retains the first tie', () => {
    const input = { title: 'Song', artist: 'Artist' };
    const weak = candidate('Other');
    const first = { ...candidate('Song', ['Artist']), id: 'first' };
    const higher = { ...first, id: 'higher', album: 'Album' };
    const withAlbum = { ...input, album: 'Album' };
    expect(bestMatch(withAlbum, [weak, first, higher])).toEqual({ candidate: higher, score: 7 });
    expect(bestMatch(input, [first, { ...first, id: 'tie' }])?.candidate.id).toBe('first');
    expect(bestMatch(input, [weak])).toBeNull();
    expect(bestMatch(input, [])).toBeNull();
    expect(bestMatch({ title: '', artist: 'A||B' }, [candidate('', ['A', 'B'])], 2, '||')?.score).toBe(2);
  });
});

describe('real multi-query search', () => {
  it('returns immediately for a wow match and leaves later queries unrequested', async () => {
    const input: ScoreInput = { title: 'Song (Live)', artist: 'Artist', album: 'Album', durationMs: 1000 };
    const wow = { ...candidate(input.title, ['Artist'], 'Album'), durationMs: 1000 };
    const search = vi.fn().mockResolvedValue([candidate('Other'), wow]);
    expect(await searchWithScoring(input, search)).toBe(wow);
    expect(search).toHaveBeenCalledExactlyOnceWith(makeSearchQueries(input.title, input.artist, input.album)[0]);
  });

  it('skips rejected, empty and low scoring groups then returns the best qualifying group', async () => {
    const input = { title: 'Song (Live)', artist: 'Artist', album: 'Album' };
    const first = candidate(input.title, ['Artist']);
    const highest = candidate(input.title, ['Artist'], 'Album');
    const search = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([candidate('Other')])
      .mockResolvedValueOnce([candidate('Other'), first, highest, { ...highest, id: 'tie' }]);
    expect(await searchWithScoring(input, search, 5, 20)).toBe(highest);
    expect(search).toHaveBeenCalledTimes(4);
  });

  it('returns null when no candidate qualifies or the input produces no query', async () => {
    const search = vi.fn().mockResolvedValue([candidate('Other')]);
    expect(await searchWithScoring({ title: 'Song', artist: '' }, search)).toBeNull();
    expect(search).toHaveBeenCalledExactlyOnceWith('Song');
    search.mockClear();
    expect(await searchWithScoring({ title: '', artist: '' }, search)).toBeNull();
    expect(search).not.toHaveBeenCalled();
  });
});
