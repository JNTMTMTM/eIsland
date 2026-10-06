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
 * @file appleRuntime.test.ts
 * @description Apple Music 逐字歌词的真实匹配策略、网络异常与内容边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchKaraokeFromAppleMusic } from '../appleMusic';
import createAppleFixture from '../../../test/appleFixture';

let fixture: ReturnType<typeof createAppleFixture>;
beforeEach(() => { fixture = createAppleFixture(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const track = (trackName: string, artistName: string, trackId = 1) => ({ trackName, artistName, trackId });

describe('real Apple Music karaoke provider', () => {
  it.each([
    ['Song', 'Artist', track('Song', 'Artist')],
    ['Song', 'Artist', track('Song Live', 'Artist Extended')],
    ['Song Extended', 'Artist Extended', track('Song', 'Artist')],
    ['Song', 'Artist', track('Song Live', 'Different')],
    ['Song Extended', 'Artist', track('Song', 'Different')],
    ['Song', 'Artist', track('Other', 'Different')],
  ])('matches metadata %s / %s through the real ordered strategy', async (title, artist, candidate) => {
    fixture.state.search = { results: [track('Unmatched', 'Nobody', 99), candidate] };
    const result = await fetchKaraokeFromAppleMusic(title, artist);
    expect(result?.[0]).toMatchObject({ time_ms: 1000, text: 'Hello' });
    const request = fixture.netFetch.mock.calls.find(([url]) => url.includes('syllable-lyrics'));
    expect(request?.[0]).toContain(`/songs/${  (candidate as { trackName: string }).trackName === 'Other' ? 99 : 1  }/`);
  });

  it.each([null, {}, { results: null }, { results: [] }])('returns null for an empty search response %j', async (payload) => {
    fixture.state.search = payload;
    expect(await fetchKaraokeFromAppleMusic('Song', 'Artist')).toBeNull();
    expect(fixture.netFetch).toHaveBeenCalledTimes(1);
  });

  it('handles a rejected search request', async () => {
    fixture.state.rejectSearch = true;
    expect(await fetchKaraokeFromAppleMusic('Song', 'Artist')).toBeNull();
  });

  it('handles malformed candidate fields through the actual public catch boundary', async () => {
    fixture.state.search = { results: [{}] };
    expect(await fetchKaraokeFromAppleMusic('Song', 'Artist')).toBeNull();
  });

  it.each([null, {}, { data: [] }, { data: [{}] }, { data: [{ attributes: {} }] }, { data: [{ attributes: { ttmlLocalizations: '' } }] }])('returns null for missing TTML response %j', async (payload) => {
    fixture.state.lyrics = payload;
    expect(await fetchKaraokeFromAppleMusic('Song', 'Artist')).toBeNull();
  });

  it('handles a rejected lyric request', async () => {
    fixture.state.rejectLyrics = true;
    expect(await fetchKaraokeFromAppleMusic('Song', 'Artist')).toBeNull();
  });

  it('handles malformed TTML input through the public error boundary', async () => {
    fixture.state.lyrics = { data: [{ attributes: { ttmlLocalizations: 42 } }] };
    expect(await fetchKaraokeFromAppleMusic('Song', 'Artist')).toBeNull();
  });

  it('retries cleaned title after the original search misses', async () => {
    fixture.netFetch.mockResolvedValueOnce({ ok: true, status: 200, body: JSON.stringify({ results: [] }) });
    expect((await fetchKaraokeFromAppleMusic('Song (Live)', 'Artist'))?.[0].text).toBe('Hello');
    expect(fixture.netFetch.mock.calls[0][0]).toContain(encodeURIComponent('Song (Live) Artist'));
    expect(fixture.netFetch.mock.calls[1][0]).toContain(encodeURIComponent('Song Artist'));
  });

  it('retries when only artist metadata requires cleaning', async () => {
    fixture.netFetch.mockResolvedValueOnce({ ok: true, status: 200, body: JSON.stringify({ results: [] }) });
    expect((await fetchKaraokeFromAppleMusic('Song', 'Artist feat. Guest'))?.[0].text).toBe('Hello');
    expect(fixture.netFetch).toHaveBeenCalledTimes(3);
  });

  it('returns null when TTML has no usable syllable content', async () => {
    fixture.state.lyrics = { data: [{ attributes: { ttmlLocalizations: '<tt></tt>' } }] };
    expect(await fetchKaraokeFromAppleMusic('Song', 'Artist')).toBeNull();
  });
});

describe('real Apple Music TTML syllable selection', () => {
  it('omits parsed lines that contain no timed syllable', async () => {
    fixture.state.lyrics = { data: [{ attributes: { ttmlLocalizations:
      '<tt><p in="00:00.00" nd="00:01.00"><span></span></p><p in="00:01.00" nd="00:02.00"><span in="00:01.00" nd="00:02.00">Hello</span></p></tt>',
    } }] };
    expect((await fetchKaraokeFromAppleMusic('Song', 'Artist'))?.map((line) => line.text)).toEqual(['Hello']);
  });

  it('returns null for timed word-level content with no syllables', async () => {
    fixture.state.lyrics = { data: [{ attributes: { ttmlLocalizations: '<tt><div><p in="00:00:01.00" nd="00:00:02.00">Hello</p></div></tt>' } }] };
    expect(await fetchKaraokeFromAppleMusic('Song', 'Artist')).toBeNull();
  });
});
