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
 * @file appleFixture.ts
 * @description Apple Music 测试的原生网络桥接夹具，保留 Provider、匹配器和歌词解析器真实执行。
 * @author 鸡哥
 */

import { vi } from 'vitest';

/**
 * 建立可配置搜索及 TTML 响应的叶子桥接夹具。
 * @returns 响应配置与网络调用记录
 */
export default function createAppleFixture() {
  const state: { search: unknown; lyrics: unknown; rejectSearch: boolean; rejectLyrics: boolean } = {
    search: { results: [{ trackId: 1, trackName: 'Song', artistName: 'Artist' }] },
    lyrics: { data: [{ attributes: { ttmlLocalizations: '<tt><p in="00:01.00" nd="00:02.00"><span in="00:01.00" nd="00:02.00">Hello</span></p></tt>' } }] },
    rejectSearch: false,
    rejectLyrics: false,
  };
  const netFetch = vi.fn((url: string) => {
    const search = url.includes('itunes.apple.com/search');
    if (search ? state.rejectSearch : state.rejectLyrics) return Promise.reject(new Error('network unavailable'));
    const body = search ? state.search : state.lyrics;
    if (body === null) return Promise.resolve({ ok: false, status: 503, body: '' });
    return Promise.resolve({ ok: true, status: 200, body: JSON.stringify(body) });
  });
  vi.stubGlobal('window', { api: { netFetch } });
  vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null) });
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  return { state, netFetch };
}
