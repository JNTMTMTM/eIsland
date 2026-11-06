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
 * @file appleMusic.ts
 * @description Apple Music 逐字歌词拉取 — 搜索 iTunes → 匹配歌曲 → 取 TTML 歌词 → 逐字解析
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import { cleanArtist, cleanTitle } from '../../normal/helpers';
import { requestJsonWithLog } from '../../normal/request';
import { logger } from '../../../../../utils/logger';
import { parseTTML } from '../parsers/ttml';
import type { KaraokeLine } from '../types';

const LOG_TAG = '[KaraokeAppleMusic]';

const SEARCH_URL = 'https://itunes.apple.com/search';

// 从 Lyrix 移植的 Bearer JWT（需定期更新）
const BEARER_TOKEN = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IldlYlBsYXlLaWQifQ.eyJpc3MiOiJBTVBXZWJQbGF5IiwiaWF0IjoxNzc3MjQwMjk4LCJleHAiOjE3ODQ0OTc4OTgsInJvb3RfaHR0cHNfb3JpZ2luIjpbImFwcGxlLmNvbSJdfQ.VYQzXEvKE1lE7AUim5cnBwge3aOWDOi1Y5E0gf6cUQeF3qLOS8clnzOkmiHySfr0wgGcDKM49l4YQe-K5GiuZg';

interface AppleMusicTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  trackTimeMillis?: number;
}

interface SearchResult {
  resultCount: number;
  results: AppleMusicTrack[];
}

async function searchTracks(query: string): Promise<AppleMusicTrack[]> {
  const url = `${SEARCH_URL}?term=${encodeURIComponent(query)}&entity=song&limit=20&country=CN`;
  try {
    const json = await requestJsonWithLog<SearchResult>(url);
    if (!json?.results) return [];
    return json.results;
  } catch {
    return [];
  }
}

function matchTrack(tracks: AppleMusicTrack[], title: string, artist: string): AppleMusicTrack | null {
  const lowTitle = title.toLowerCase();
  const lowArtist = artist.toLowerCase();

  const exact = tracks.find(
    (t) => t.trackName.toLowerCase() === lowTitle && t.artistName.toLowerCase().includes(lowArtist),
  );
  if (exact) return exact;

  const fuzzy = tracks.find(
    (t) =>
      (t.trackName.toLowerCase().includes(lowTitle) || lowTitle.includes(t.trackName.toLowerCase())) &&
      (t.artistName.toLowerCase().includes(lowArtist) || lowArtist.includes(t.artistName.toLowerCase())),
  );
  if (fuzzy) return fuzzy;

  const titleOnly = tracks.find(
    (t) => t.trackName.toLowerCase().includes(lowTitle) || lowTitle.includes(t.trackName.toLowerCase()),
  );
  return titleOnly ?? tracks[0] ?? null;
}

async function fetchTTML(trackId: number): Promise<string | null> {
  const url = `https://amp-api.music.apple.com/v1/catalog/cn/songs/${trackId}/syllable-lyrics?${encodeURIComponent('l[lyrics]')}=${encodeURIComponent('zh-hans-cn')}&${encodeURIComponent('l[script]')}=${encodeURIComponent('zh-Hans')}&extend=ttmlLocalizations`;

  try {
    const json = await requestJsonWithLog<Record<string, unknown>>(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Origin: 'https://music.apple.com',
      },
    });
    if (!json) return null;

    const data = json.data as unknown[] | undefined;
    if (!data || data.length === 0) return null;

    const item = data[0] as Record<string, unknown>;
    const attrs = item.attributes as Record<string, unknown> | undefined;
    const ttml = attrs?.ttmlLocalizations as string | undefined;
    return ttml || null;
  } catch {
    return null;
  }
}

async function searchKaraokeAppleMusic(queryTitle: string, queryArtist: string): Promise<KaraokeLine[] | null> {
  const query = `${queryTitle} ${queryArtist}`.trim();
  logger.info(`${LOG_TAG} 开始获取, query="${query}"`);
  try {
    const tracks = await searchTracks(query);
    if (tracks.length === 0) {
      logger.warn(`${LOG_TAG} 搜索无结果, query="${query}"`);
      return null;
    }

    const matched = matchTrack(tracks, queryTitle, queryArtist);
    if (!matched) {
      logger.warn(`${LOG_TAG} 无匹配歌曲, query="${query}"`);
      return null;
    }

    logger.info(`${LOG_TAG} 匹配到: "${matched.trackName}" - "${matched.artistName}" (id=${matched.trackId})`);

    const ttml = await fetchTTML(matched.trackId);
    if (!ttml) {
      logger.warn(`${LOG_TAG} 无 TTML 歌词, trackId=${matched.trackId}`);
      return null;
    }

    const lines = parseTTML(ttml);
    // 只用音节判断来源是否可用，混合内容中的普通行与纯符号行仍需显示。
    if (!lines.some((line) => line.syllables.length > 0)) {
      logger.warn(`${LOG_TAG} TTML 解析出 0 行逐字, trackId=${matched.trackId}`);
      return null;
    }
    logger.info(`${LOG_TAG} 获取成功, trackId=${matched.trackId}, 行数=${lines.length}`);
    return lines;
  } catch (err) {
    logger.error(`${LOG_TAG} 未预期异常, query="${query}":`, err);
    return null;
  }
}

/**
 * Apple Music 逐字歌词对外入口 — 原词失败则用 cleanTitle/cleanArtist 重试
 */
export async function fetchKaraokeFromAppleMusic(title: string, artist: string): Promise<KaraokeLine[] | null> {
  const raw = await searchKaraokeAppleMusic(title, artist);
  if (raw) return raw;

  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    return searchKaraokeAppleMusic(cleanedTitle, cleanedArtist);
  }
  return null;
}
