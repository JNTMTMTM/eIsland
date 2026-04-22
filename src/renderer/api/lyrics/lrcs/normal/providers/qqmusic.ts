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
 * @description QQ 音乐歌词拉取 — 搜索歌曲 → JSONP 歌词接口 → Base64 UTF-8 解码
 * @author 鸡哥
 */

import type { LyricLine } from '../types';
import { cleanArtist, cleanTitle, parseSyncedLrc } from '../helpers';
import { requestJsonWithLog, requestTextWithLog } from '../request';
import { logger } from '../../../../../utils/logger';

const LOG_TAG = '[QQMusic]';

function resolveJsonpResponse(callback: string, raw: string): string {
  const prefix = `${callback}(`;
  if (!raw.startsWith(prefix)) return '';
  return raw.slice(prefix.length, raw.endsWith(')') ? raw.length - 1 : raw.length);
}

function base64DecodeUtf8(encoded: string): string {
  try {
    const raw = atob(encoded);
    const bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    logger.error(`${LOG_TAG} Base64/UTF-8 解码失败:`, err);
    return '';
  }
}

async function searchQQMusic(queryTitle: string, queryArtist: string): Promise<LyricLine[] | null> {
  const query = `${queryTitle} ${queryArtist}`;
  logger.info(`${LOG_TAG} 开始获取 LRC, query="${query}"`);
  try {
    const searchPayload = {
      req_1: {
        method: 'DoSearchForQQMusicDesktop',
        module: 'music.search.SearchCgiService',
        param: {
          num_per_page: '20',
          page_num: '1',
          query,
          search_type: 0,
        },
      },
    };

    const searchJson = await requestJsonWithLog<Record<string, unknown>>(
      'https://u.y.qq.com/cgi-bin/musicu.fcg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload),
      },
    );
    if (!searchJson) {
      logger.warn(`${LOG_TAG} 搜索接口返回空, query="${query}"`);
      return null;
    }

    const req1 = searchJson.req_1 as Record<string, unknown> | undefined;
    const data = req1?.data as Record<string, unknown> | undefined;
    const body = data?.body as Record<string, unknown> | undefined;
    const songList = body?.song as Record<string, unknown> | undefined;
    const songs = songList?.list as unknown[] | undefined;
    if (!songs || songs.length === 0) {
      logger.warn(`${LOG_TAG} 搜索无结果, query="${query}"`);
      return null;
    }

    const firstSong = songs[0] as Record<string, unknown>;
    const mid = typeof firstSong.mid === 'string' ? firstSong.mid : null;
    if (!mid) {
      logger.warn(`${LOG_TAG} 首条结果缺少 songmid, query="${query}"`);
      return null;
    }

    const callback = 'MusicJsonCallback_lrc';
    const pcachetime = Date.now().toString();
    const params = new URLSearchParams({
      callback,
      pcachetime,
      songmid: mid,
      g_tk: '5381',
      jsonpCallback: callback,
      loginUin: '0',
      hostUin: '0',
      format: 'jsonp',
      inCharset: 'utf8',
      outCharset: 'utf8',
      notice: '0',
      platform: 'yqq',
      needNewCode: '0',
    });

    const rawText = await requestTextWithLog(
      `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?${params.toString()}`,
      {
        headers: {
          Referer: 'https://y.qq.com/',
          'User-Agent': 'Mozilla/5.0',
        },
      },
    );
    if (!rawText) {
      logger.warn(`${LOG_TAG} JSONP 歌词接口返回空, mid=${mid}`);
      return null;
    }

    const jsonStr = resolveJsonpResponse(callback, rawText);
    if (!jsonStr) {
      logger.warn(`${LOG_TAG} JSONP 外壳解析失败, mid=${mid}, 前 120 字=`, rawText.slice(0, 120));
      return null;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      logger.error(`${LOG_TAG} JSONP 内 JSON 解析失败, mid=${mid}:`, err);
      return null;
    }

    const lyricB64 = typeof parsed.lyric === 'string' ? parsed.lyric : null;
    if (!lyricB64) {
      logger.warn(`${LOG_TAG} 响应中缺少 lyric 字段, mid=${mid}, payload keys=`, Object.keys(parsed).join(','));
      return null;
    }

    const decoded = base64DecodeUtf8(lyricB64);
    if (!decoded) {
      logger.warn(`${LOG_TAG} lyric Base64 解码后为空, mid=${mid}, b64 长度=${lyricB64.length}`);
      return null;
    }

    const lines = parseSyncedLrc(decoded);
    if (lines.length === 0) {
      logger.warn(`${LOG_TAG} LRC 解析后 0 行, mid=${mid}, 明文前 200 字=`, decoded.slice(0, 200));
      return null;
    }
    logger.info(`${LOG_TAG} 获取成功, mid=${mid}, 行数=${lines.length}`);
    return lines;
  } catch (err) {
    logger.error(`${LOG_TAG} 未预期异常, query="${query}":`, err);
    return null;
  }
}

export async function fetchLyricsFromQQMusic(title: string, artist: string): Promise<LyricLine[] | null> {
  const raw = await searchQQMusic(title, artist);
  if (raw) return raw;

  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    logger.info(`${LOG_TAG} 原词失败, 使用清洗后重试: "${cleanedTitle}" / "${cleanedArtist}"`);
    return searchQQMusic(cleanedTitle, cleanedArtist);
  }
  return null;
}
