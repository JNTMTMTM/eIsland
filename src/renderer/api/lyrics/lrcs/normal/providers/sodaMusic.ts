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
 * @description 汽水音乐歌词拉取 — 多策略搜索 + 评分匹配 → 详情接口 → KRC 格式解析
 *              移植自 Lyrix fetchers/soda_music.rs + searchers/soda_music.rs
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import type { LyricsFetchResult, LyricLine } from '../types';
import { parseKrc } from '../helpers';
import { parseTranslationLyrics } from '../translation';
import { logger } from '../../../../../utils/logger';
import { searchWithScoring } from '../matcher';
import type { SearchCandidate } from '../searchTypes';

const LOG_TAG = '[SodaMusic]';

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
  const auth = result.loggedIn ? 'login' : result.publicCatalog ? 'public' : 'unknown';
  logger.info(`${LOG_TAG} 搜索 auth=${auth}, query="${query}", 结果数=${Array.isArray(result.songs) ? result.songs.length : 0}`);
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

/* ── 详情 + 歌词获取 ───────────────────────────────────────────────── */

async function fetchLyricsByTrackId(trackId: string): Promise<LyricsFetchResult | null> {
  const detailJson = await window.api.qishuiLyrics(trackId);
  const auth = detailJson && typeof detailJson.auth === 'string' ? detailJson.auth : 'unknown';
  const content = detailJson && typeof detailJson.lyric === 'string' ? detailJson.lyric : null;
  if (!content) {
    logger.warn(`${LOG_TAG} 歌词内容为空, trackId=${trackId}, auth=${auth}`);
    return null;
  }

  const lines = parseKrc(content);
  if (lines.length === 0) {
    logger.warn(`${LOG_TAG} KRC 解析后 0 行, trackId=${trackId}, auth=${auth}`);
    return null;
  }
  const translationText = detailJson && typeof detailJson.tlyric === 'string' ? detailJson.tlyric : null;
  const translation = parseTranslationLyrics(translationText);

  logger.info(`${LOG_TAG} 获取成功, trackId=${trackId}, auth=${auth}, 行数=${lines.length}, 翻译歌词状态=${translation.status}`);
  return { lyrics: lines, translation };
}

/* ── 对外入口 ──────────────────────────────────────────────────────── */

export async function fetchLyricsWithTranslationFromSodaMusic(
  title: string,
  artist: string,
): Promise<LyricsFetchResult | null> {
  logger.info(`${LOG_TAG} 开始获取, title="${title}", artist="${artist}"`);

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
  return fetchLyricsByTrackId(matched.id);
}

export async function fetchLyricsFromSodaMusic(title: string, artist: string): Promise<LyricLine[] | null> {
  const result = await fetchLyricsWithTranslationFromSodaMusic(title, artist);
  return result?.lyrics ?? null;
}
