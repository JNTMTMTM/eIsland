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
 * @file sodaMusic.ts
 * @description 汽水音乐逐字歌词拉取 — 多策略搜索 + 评分匹配 → 详情接口 → 明文 KRC 前缀式音节解析
 *              移植自 Lyrix fetchers/soda_music.rs + searchers/soda_music.rs
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import { logger } from '../../../../../utils/logger';
import { parseSyncedLines } from '../parsers';
import { searchWithScoring } from '../../normal/matcher';
import type { SearchCandidate } from '../../normal/searchTypes';
import type { KaraokeLine } from '../types';

const LOG_TAG = '[KaraokeSodaMusic]';
interface QishuiSong {
  id?: string;
  providerSongId?: string;
  name?: string;
  artist?: string;
  artists?: Array<{ name?: string }>;
  album?: string;
  duration?: number;
}

async function searchSodaMusicApi(query: string): Promise<SearchCandidate[]> {
  const result = await window.api.qishuiSearch(query, { limit: 18 });
  const songs = Array.isArray(result.songs) ? result.songs as QishuiSong[] : [];
  return songs.map((song) => ({
    id: String(song.providerSongId || song.id || ''),
    title: song.name || '',
    artists: song.artists?.map((artist) => artist.name || '').filter(Boolean)
      || (song.artist ? [song.artist] : []),
    album: song.album || '',
    durationMs: song.duration,
  })).filter((song) => song.id && song.title);
}

/* ── 详情 + 逐字歌词获取 ───────────────────────────────────────────── */

async function fetchKaraokeByTrackId(trackId: string): Promise<KaraokeLine[] | null> {
  const detailJson = await window.api.qishuiLyrics(trackId);
  const content = detailJson && typeof detailJson.lyric === 'string' ? detailJson.lyric : null;
  if (!content) {
    logger.warn(`${LOG_TAG} 歌词内容为空, trackId=${trackId}`);
    return null;
  }

  // 汽水音乐 KRC 为前缀式 `<s,d>text` 或 `(s,d)text`，偏移已是相对值
  const lines = parseSyncedLines(content, 'prefix', 'relative');
  const withSyllables = lines.filter((l) => l.syllables.length > 0);
  if (withSyllables.length === 0) {
    logger.warn(`${LOG_TAG} 解析出 0 行逐字, trackId=${trackId}`);
    return null;
  }
  logger.info(`${LOG_TAG} 获取成功, trackId=${trackId}, 行数=${withSyllables.length}`);
  return withSyllables;
}

/* ── 对外入口 ──────────────────────────────────────────────────────── */

export async function fetchKaraokeFromSodaMusic(title: string, artist: string): Promise<KaraokeLine[] | null> {
  logger.info(`${LOG_TAG} 开始获取逐字, title="${title}", artist="${artist}"`);

  const matched = await searchWithScoring(
    { title, artist },
    searchSodaMusicApi,
    5, // minScore
    7, // wowScore
  );

  if (!matched) {
    logger.warn(`${LOG_TAG} 无匹配歌曲`);
    return null;
  }

  logger.info(`${LOG_TAG} 匹配到: "${matched.title}" - "${matched.artists.join(', ')}" (id=${matched.id})`);
  return fetchKaraokeByTrackId(matched.id);
}
