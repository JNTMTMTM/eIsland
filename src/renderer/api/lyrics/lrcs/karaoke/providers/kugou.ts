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
 * @file kugou.ts
 * @description 酷狗音乐逐字歌词(KRC)拉取 — 搜歌 → 搜歌词 → 下载 KRC 密文 → XOR+inflate → 后缀式音节 + 相对偏移解析
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import { cleanArtist, cleanTitle } from '../../normal/helpers';
import { requestJsonWithLog } from '../../normal/request';
import { decryptKRC } from '../decrypt/krc';
import { parseSyncedLines } from '../parsers';
import type { KaraokeLine } from '../types';

/**
 * 根据关键字在酷狗搜索并下载 KRC 密文,解密为明文逐字歌词
 * @param queryTitle - 搜索标题
 * @param queryArtist - 搜索艺术家
 * @returns 逐字歌词行; 无 KRC 或解析失败时返回 null
 */
async function searchKaraokeKugou(queryTitle: string, queryArtist: string): Promise<KaraokeLine[] | null> {
  const keyword = `${queryTitle} ${queryArtist}`.trim();
  try {
    const searchJson = await requestJsonWithLog<Record<string, unknown>>(
      `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(keyword)}&page=1&pagesize=20&showtype=1`,
    );
    if (!searchJson) return null;

    const data = searchJson.data as Record<string, unknown> | undefined;
    const infoList = data?.info as unknown[] | undefined;
    if (!infoList || infoList.length === 0) return null;

    const first = infoList[0] as Record<string, unknown>;
    const hash = typeof first.hash === 'string' ? first.hash : '';
    const duration = typeof first.duration === 'number' ? first.duration : undefined;
    if (!hash) return null;

    const durationParam = duration !== undefined ? `&duration=${duration * 1000}` : '';
    const lyricSearchJson = await requestJsonWithLog<Record<string, unknown>>(
      `https://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(keyword)}${durationParam}&hash=${hash}`,
    );
    if (!lyricSearchJson) return null;

    const candidates = lyricSearchJson.candidates as unknown[] | undefined;
    if (!candidates || candidates.length === 0) return null;

    const cand = candidates[0] as Record<string, unknown>;
    const candId = typeof cand.id === 'string' ? cand.id : String(cand.id ?? '');
    const accessKey = typeof cand.accesskey === 'string' ? cand.accesskey : '';
    if (!candId || !accessKey) return null;

    const dlJson = await requestJsonWithLog<Record<string, unknown>>(
      `https://lyrics.kugou.com/download?ver=1&client=pc&id=${candId}&accesskey=${accessKey}&fmt=krc&charset=utf8`,
    );
    if (!dlJson) return null;

    const content = typeof dlJson.content === 'string' ? dlJson.content : null;
    if (!content) return null;

    const plaintext = await decryptKRC(content);
    // 酷狗返回的 KRC 在不同歌曲里既可能是 `text<s,d>`(后缀式) 也可能是 `<s,d>text`(前缀式),
    // 用 suffix 解析前缀式会导致每行末字被挤到尾段而丢失; 这里用 auto 让解析器按文本长度挑选
    const lines = parseSyncedLines(plaintext, 'auto', 'relative');
    const withSyllables = lines.filter((l) => l.syllables.length > 0);
    return withSyllables.length > 0 ? withSyllables : null;
  } catch {
    return null;
  }
}

/**
 * 酷狗逐字歌词对外入口 — 原词失败则用 cleanTitle/cleanArtist 重试
 * @param title - 原始歌名
 * @param artist - 原始艺术家
 * @returns 逐字歌词行, 无 KRC 时返回 null
 */
export async function fetchKaraokeFromKugou(title: string, artist: string): Promise<KaraokeLine[] | null> {
  const raw = await searchKaraokeKugou(title, artist);
  if (raw) return raw;

  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    return searchKaraokeKugou(cleanedTitle, cleanedArtist);
  }
  return null;
}
