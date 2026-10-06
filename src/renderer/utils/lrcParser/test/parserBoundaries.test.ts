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
 * @file parserBoundaries.test.ts
 * @description 真实 LRC/YRC/KRC 解析的坏标签、元信息过滤、排序、清洗与同步歌词提取边界。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { cleanArtist, cleanTitle, extractSyncedFromArray, extractSyncedFromObject, parseKrc, parseLrcTime, parseSyncedLrc, parseYrc } from '../index';

describe('LRC time and line boundaries', () => {
  it.each([
    { tag: '01:02', time: 62000 }, { tag: '01:02.1', time: 62100 }, { tag: '01:02.12', time: 62120 }, { tag: '01:02.1234', time: 62123 },
    { tag: 'bad', time: null }, { tag: '1:2:3', time: null }, { tag: 'bad:02', time: null }, { tag: '01:bad', time: null }, { tag: '01:02.bad', time: null },
  ])('parses $tag as $time', ({ tag, time }) => {
    expect(parseLrcTime(tag)).toBe(time);
  });
  it('ignores unclosed, nonsynchronized, empty and metadata lines then sorts content', () => {
    const input = 'plain\n[00:03 no bracket\n[ar:Artist]metadata\n[00:01]\n[00:01]作词 Someone\n[00:03.0] Late \n[00:02.0] Early';
    expect(parseSyncedLrc(input)).toEqual([{ time_ms: 2000, text: 'Early' }, { time_ms: 3000, text: 'Late' }]);
  });
});

describe('YRC and KRC boundaries', () => {
  it('filters malformed YRC rows and removes word timing while sorting lyrics', () => {
    const input = ['plain', '[unclosed', '[100]no comma', '[bad,200]invalid start', '[0,200](0,100,0)作曲 Someone', '[2000,200](0,100,0)', '[3000,200](3000,100,0)Late', '[1000,200](1000,100,0)Early'];
    expect(parseYrc(input.join('\n'))).toEqual([{ time_ms: 1000, text: 'Early' }, { time_ms: 3000, text: 'Late' }]);
  });
  it.each([{ content: 'plain' }, { content: '[100]no comma' }, { content: '[100,200 no close' }, { content: '[1],2 bad delimiter' }, { content: '[/,2]below digit' }, { content: '[:,2]above digit' }, { content: '[1,/]below digit' }, { content: '[1,:]above digit' }])('uses standard LRC fallback for non-KRC $content', ({ content }) => {
    expect(parseKrc(content)).toEqual([]);
  });
  it('filters malformed KRC rows after format detection and sorts valid text', () => {
    const input = ['', 'plain', '[unclosed', '[100]no comma', '[/,2]bad start low', '[:,2]bad start high', '[1,/]bad duration low', '[1,:]bad duration high', '[,2]empty start', '[2000,200]<0,100,0>', '[0,200]<0,100,0>制作 Someone', '[3000,200]<0,100,0>Late', '[1000,200]<0,100,0>Early'];
    expect(parseKrc(input.join('\n'))).toEqual([{ time_ms: 1000, text: 'Early' }, { time_ms: 3000, text: 'Late' }]);
  });
});

describe('title and artist normalization', () => {
  it.each([
    { input: 'Ｔｅｓｔ　 Song (Live)', output: 'Test Song' },
    { input: 'Song feat. Artist', output: 'Song' },
    { input: 'Song - Album', output: 'Song' },
    { input: 'Song Remastered', output: 'Song' },
    { input: 'Song.~_', output: 'Song' },
    { input: '(Live)', output: '(Live)' },
    { input: '', output: '' },
  ])('cleans title $input', ({ input, output }) => {
    expect(cleanTitle(input)).toBe(output);
  });
  it.each([
    { input: 'Ａｒｔｉｓｔ　 (Live) / Other', output: 'Artist' },
    { input: 'Artist feat Other', output: 'Artist' },
    { input: 'Artist x Other', output: 'Artist' },
    { input: '"Artist"', output: 'Artist' },
    { input: '/Other', output: '/Other' },
    { input: '', output: '' },
  ])('cleans artist $input', ({ input, output }) => {
    expect(cleanArtist(input)).toBe(output);
  });
});

describe('public JSON lyric extraction', () => {
  it('finds the first actually parseable array lyric after damaged values', () => {
    const json = [null, false, 3, {}, { syncedLyrics: 3 }, { syncedLyrics: '' }, { syncedLyrics: 'plain' }, { syncedLyrics: '[00:01]Valid' }, { syncedLyrics: '[00:02]Later' }];
    expect(extractSyncedFromArray(json)).toEqual([{ time_ms: 1000, text: 'Valid' }]);
    expect(extractSyncedFromArray([])).toBeNull();
    expect(extractSyncedFromArray([{ syncedLyrics: 'plain' }])).toBeNull();
  });
  it.each([{ json: {} }, { json: { syncedLyrics: 3 } }, { json: { syncedLyrics: '' } }, { json: { syncedLyrics: 'plain' } }])('returns no object lyric for $json', ({ json }) => {
    expect(extractSyncedFromObject(json)).toBeNull();
  });
  it('returns actual parsed lines from an object', () => {
    expect(extractSyncedFromObject({ syncedLyrics: '[00:01]Valid' })).toEqual([{ time_ms: 1000, text: 'Valid' }]);
  });
});
