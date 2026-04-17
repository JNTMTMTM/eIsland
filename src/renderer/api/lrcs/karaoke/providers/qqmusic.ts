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
 * @description QQ 音乐逐字歌词(QRC)拉取 — 搜索 → `lyric_download.fcg` 取密文 → TripleDES+inflate → 后缀式音节 + 绝对偏移解析
 * @author 鸡哥
 */

import { cleanArtist, cleanTitle } from '../../helpers';
import { requestJsonWithLog, requestTextWithLog } from '../../request';
import { logger } from '../../../../utils/logger';
import { decryptQRC } from '../decrypt/qrc';
import { parseSyncedLines } from '../parsers';
import type { KaraokeLine } from '../types';

/** 从接口返回的 XML 中提取 `CDATA[...]` 内的 hex 密文 */
const CDATA_RE = /CDATA\[([0-9A-F]+)\]/i;

const LOG_TAG = '[KaraokeQQMusic]';

/**
 * 根据关键字在 QQ 音乐搜索并下载 QRC 密文,解密为明文逐字歌词
 * @param queryTitle - 搜索标题
 * @param queryArtist - 搜索艺术家
 * @returns 逐字歌词行; 无 QRC 或解析失败时返回 null
 */
async function searchKaraokeQQMusic(queryTitle: string, queryArtist: string): Promise<KaraokeLine[] | null> {
  const query = `${queryTitle} ${queryArtist}`.trim();
  logger.info(`${LOG_TAG} 开始获取 QRC, query="${query}"`);
  try {
    const searchJson = await requestJsonWithLog<Record<string, unknown>>(
      'https://u.y.qq.com/cgi-bin/musicu.fcg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          req_1: {
            method: 'DoSearchForQQMusicDesktop',
            module: 'music.search.SearchCgiService',
            param: { num_per_page: '20', page_num: '1', query, search_type: 0 },
          },
        }),
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

    const first = songs[0] as Record<string, unknown>;
    const id = typeof first.id === 'number' ? String(first.id) : String(first.id ?? '');
    if (!id) {
      logger.warn(`${LOG_TAG} 首条结果缺少歌曲 id, query="${query}"`);
      return null;
    }

    const form = `version=15&miniversion=82&lrctype=4&musicid=${encodeURIComponent(id)}`;
    const qrcXml = await requestTextWithLog('https://c.y.qq.com/qqmusic/fcgi-bin/lyric_download.fcg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://c.y.qq.com/',
      },
      body: form,
    });
    if (!qrcXml) {
      logger.warn(`${LOG_TAG} QRC 下载接口返回空, id=${id}`);
      return null;
    }

    const m = CDATA_RE.exec(qrcXml);
    if (!m) {
      logger.warn(`${LOG_TAG} 未在返回 XML 中找到 CDATA 密文, id=${id}, xml 前 300 字=`, qrcXml.slice(0, 300));
      return null;
    }

    let plaintext: string;
    try {
      plaintext = await decryptQRC(m[1]);
    } catch (err) {
      // 绝大多数情况为此歌曲在 QQ 侧没有 QRC(服务端返回占位密文),按"无逐字"处理
      logger.warn(`${LOG_TAG} 此曲无 QRC 逐字歌词, id=${id}: ${(err as Error).message}`);
      return null;
    }

    const lines = parseSyncedLines(plaintext, 'suffix', 'absolute');
    const withSyllables = lines.filter((l) => l.syllables.length > 0);
    if (withSyllables.length === 0) {
      logger.warn(`${LOG_TAG} 解密成功但解析出 0 行逐字, id=${id}, 明文长度=${plaintext.length}, 前 200 字=`, plaintext.slice(0, 200));
      return null;
    }
    logger.info(`${LOG_TAG} 获取成功, id=${id}, 行数=${withSyllables.length}`);
    return withSyllables;
  } catch (err) {
    logger.error(`${LOG_TAG} 未预期异常, query="${query}":`, err);
    return null;
  }
}

/**
 * QQ 音乐逐字歌词对外入口 — 原词失败则用 cleanTitle/cleanArtist 重试
 * @param title - 原始歌名
 * @param artist - 原始艺术家
 * @returns 逐字歌词行, 无 QRC 时返回 null
 */
export async function fetchKaraokeFromQQMusic(title: string, artist: string): Promise<KaraokeLine[] | null> {
  const raw = await searchKaraokeQQMusic(title, artist);
  if (raw) return raw;

  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    return searchKaraokeQQMusic(cleanedTitle, cleanedArtist);
  }
  return null;
}
