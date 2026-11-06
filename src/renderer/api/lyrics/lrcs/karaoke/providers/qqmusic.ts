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
 * @file qqmusic.ts
 * @description QQ 音乐逐字歌词(QRC)拉取 — 多策略搜索 + 评分匹配 → QRC 密文 → TripleDES+inflate → 后缀式音节解析
 *              移植自 Lyrix fetchers/qqmusic.rs + searchers/qqmusic.rs + parsers/qqmusic.rs
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import { requestJsonWithLog, requestTextWithLog } from '../../normal/request';
import { logger } from '../../../../../utils/logger';
import { decryptQRC } from '../decrypt/qrc';
import { parseSyncedLines } from '../parsers';
import { searchWithScoring } from '../../normal/matcher';
import type { SearchCandidate } from '../../normal/searchTypes';
import type { KaraokeLine } from '../types';

const LOG_TAG = '[KaraokeQQMusic]';
const CDATA_RE = /CDATA\[([0-9A-F]+)\]/i;
const QQ_HEADERS = {
  Referer: 'https://c.y.qq.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

/* ── 主搜索接口（page 1 → page 2 回退）────────────────────────────── */

interface QQSong {
  id?: number;
  mid?: string;
  title?: string;
  name?: string;
  singer?: Array<{ title?: string; name?: string }>;
  album?: { title?: string; name?: string };
  interval?: number;
}

async function searchPrimary(query: string, page: string = '1'): Promise<SearchCandidate[]> {
  const searchPayload = {
    req_1: {
      method: 'DoSearchForQQMusicDesktop',
      module: 'music.search.SearchCgiService',
      param: {
        num_per_page: '20',
        page_num: page,
        query,
        search_type: 0,
      },
    },
  };

  const json = await requestJsonWithLog<Record<string, unknown>>(
    'https://u.y.qq.com/cgi-bin/musicu.fcg',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...QQ_HEADERS },
      body: JSON.stringify(searchPayload),
    },
  );
  if (!json) return [];

  const req1 = json.req_1 as Record<string, unknown> | undefined;
  const data = req1?.data as Record<string, unknown> | undefined;
  const body = data?.body as Record<string, unknown> | undefined;
  const songList = body?.song as Record<string, unknown> | undefined;
  const songs = songList?.list as QQSong[] | undefined;
  if (!songs || songs.length === 0) return [];

  return songs.map((song) => ({
    id: String(song.id ?? ''),
    mid: song.mid ?? '',
    title: song.title ?? song.name ?? '',
    artists: (song.singer ?? []).map((s) => s.title ?? s.name ?? ''),
    album: song.album?.title ?? song.album?.name ?? '',
    durationMs: song.interval !== undefined ? song.interval * 1000 : undefined,
  }));
}

/* ── 备用搜索接口 ─────────────────────────────────────────────────── */

interface QQSong2 {
  songname?: string;
  albumname?: string;
  songid?: number;
  songmid?: string;
  singer?: Array<{ name?: string }>;
  interval?: number;
}

async function searchFallback(query: string): Promise<SearchCandidate[]> {
  const url = `https://shc.y.qq.com/soso/fcgi-bin/search_for_qq_cp?_=1657641526460&g_tk=1037878909&uin=1804681355&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=h5&needNewCode=1&zhidaqu=1&catZhida=1&t=0&flag=1&ie=utf-8&sem=&aggr=0&perpage=20&n=20&p=1&remoteplace=txt.mqq.all&w=${encodeURIComponent(query)}`;

  const json = await requestJsonWithLog<Record<string, unknown>>(url, { headers: QQ_HEADERS });
  if (!json) return [];

  const data = json.data as Record<string, unknown> | undefined;
  const song = data?.song as Record<string, unknown> | undefined;
  const list = song?.list as QQSong2[] | undefined;
  if (!list || list.length === 0) return [];

  return list.map((song) => ({
    id: String(song.songid ?? ''),
    mid: song.songmid ?? '',
    title: song.songname ?? '',
    artists: (song.singer ?? []).map((s) => s.name ?? ''),
    album: song.albumname ?? '',
    durationMs: song.interval !== undefined ? song.interval * 1000 : undefined,
  }));
}

/* ── 统一搜索函数 ─────────────────────────────────────────────────── */

async function searchQQMusicAll(query: string): Promise<SearchCandidate[]> {
  let results = await searchPrimary(query, '1');
  if (results.length > 0) return results;

  results = await searchPrimary(query, '2');
  if (results.length > 0) return results;

  return searchFallback(query);
}

/* ── QRC 获取与解密 ────────────────────────────────────────────────── */

async function fetchQrc(id: string): Promise<KaraokeLine[] | null> {
  const form = `version=15&miniversion=82&lrctype=4&musicid=${encodeURIComponent(id)}`;
  const qrcXml = await requestTextWithLog('https://c.y.qq.com/qqmusic/fcgi-bin/lyric_download.fcg', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...QQ_HEADERS,
    },
    body: form,
  });
  if (!qrcXml) {
    logger.warn(`${LOG_TAG} QRC 下载接口返回空, id=${id}`);
    return null;
  }

  const m = CDATA_RE.exec(qrcXml);
  if (!m) {
    logger.warn(`${LOG_TAG} 未在返回 XML 中找到 CDATA 密文, id=${id}`);
    return null;
  }

  let plaintext: string;
  try {
    plaintext = await decryptQRC(m[1]);
  } catch (err) {
    logger.warn(`${LOG_TAG} QRC 解密/inflate 失败, id=${id}: ${(err as Error).message}`);
    return null;
  }

  const lines = parseSyncedLines(plaintext, 'suffix', 'absolute');
  // 只用音节判断来源是否可用，混合内容中的普通行与纯符号行仍需显示。
  if (!lines.some((line) => line.syllables.length > 0)) {
    logger.warn(`${LOG_TAG} 解密成功但解析出 0 行逐字, id=${id}`);
    return null;
  }
  logger.info(`${LOG_TAG} QRC 获取成功, id=${id}, 行数=${lines.length}`);
  return lines;
}

/* ── 对外入口 ──────────────────────────────────────────────────────── */

export async function fetchKaraokeFromQQMusic(title: string, artist: string): Promise<KaraokeLine[] | null> {
  logger.info(`${LOG_TAG} 开始获取 QRC, title="${title}", artist="${artist}"`);

  const matched = await searchWithScoring(
    { title, artist },
    searchQQMusicAll,
    5,   // minScore
    7,   // wowScore
    '/', // splitChar
  );

  if (!matched) {
    logger.warn(`${LOG_TAG} 无匹配歌曲`);
    return null;
  }

  logger.info(`${LOG_TAG} 匹配到: "${matched.title}" - "${matched.artists.join(', ')}" (id=${matched.id})`);

  // 用数字 id 获取 QRC
  if (matched.id) {
    const lines = await fetchQrc(matched.id);
    if (lines) return lines;
  }

  logger.warn(`${LOG_TAG} QRC 获取失败, id=${matched.id}`);
  return null;
}
