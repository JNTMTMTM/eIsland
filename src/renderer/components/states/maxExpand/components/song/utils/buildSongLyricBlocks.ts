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

/** 可点击跳转的双语歌词块，同一时间戳的原文合并展示。 */
interface SongLyricBlock extends SyncedLyricLine {
  translation: string;
}

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
    if (previous?.time_ms === line.time_ms) previous.text += `\n${line.text}`;
    else blocks.push({ time_ms: line.time_ms, text: line.text, translation: '' });
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
    return { time_ms: block.time_ms, text: block.text, translation: texts.join('\n') };
  });
}
