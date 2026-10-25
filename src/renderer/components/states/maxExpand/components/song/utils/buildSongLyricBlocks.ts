/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */

/**
 * @file buildSongLyricBlocks.ts
 * @description 按原文时间段组合完整歌词与译文，避免缺失译文时沿用上一句翻译。
 * @author 鸡哥
 */

import type { SyncedLyricLine } from '../../../../../../store/types';
import type { TranslationLyricsResult } from '../../../../../../api/lyrics/lrcApi';

import type { SongLyricBlock } from '../types/songTypes';

/**
 * 以原文时间区间匹配译文，忽略空行与重复原文的译文。
 * @param lyrics - 按时间排序的同步原文歌词。
 * @param translation - 独立获取的翻译歌词结果。
 * @returns 每个时间戳对应一个原文与译文块。
 */
export default function buildSongLyricBlocks(lyrics: SyncedLyricLine[] | null, translation: TranslationLyricsResult | null): SongLyricBlock[] {
  const blocks: SongLyricBlock[] = [];
  (lyrics ?? []).forEach((line) => {
    if (!line.text.trim()) return;
    const previous = blocks.at(-1);
    if (previous?.time_ms === line.time_ms) {
      previous.text += `\n${line.text}`;
      // 合并的多行原文不能用其中一行的音节替代，否则会漏掉另一行文字。
      delete previous.syllables;
    } else blocks.push({ ...line, translation: '' });
  });
  const translated = translation?.status === 'available' ? translation.lines : null;
  if (!translated?.length) return blocks;
  let cursor = 0;
  return blocks.map((block, index) => {
    const end = blocks[index + 1]?.time_ms ?? Infinity;
    const texts: string[] = [];
    while (cursor < translated.length && translated[cursor].time_ms < end) {
      const line = translated[cursor++];
      const text = line.text.trim();
      if (line.time_ms >= block.time_ms && text && !block.text.split('\n').includes(text)) texts.push(text);
    }
    return { ...block, translation: texts.join('\n') };
  });
}
