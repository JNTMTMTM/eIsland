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
 * @file songUtils.ts
 * @description Expanded 歌曲 Tab 的歌词定位、歌词窗口切片、音节进度与倒计时格式化。
 * @author 鸡哥
 */

import { VISIBLE_LINES } from '../config/songConfig';
import type { SyncedLyricLine, SyncedLyricSyllable } from '../../../../../../store/types';
import type { LyricSliceLine, Translate } from '../types/songTypes';

/**
 * 二分查找当前播放位置所在的歌词行。
 * @param lyrics - 按时间升序的歌词
 * @param posMs - 当前播放位置（毫秒）
 * @returns 歌词行索引，前奏阶段为 -1
 */
export function findCurrentIndex(lyrics: SyncedLyricLine[], posMs: number): number {
  if (lyrics.length === 0 || posMs < lyrics[0].time_ms) return -1;
  let lo = 0;
  let hi = lyrics.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lyrics[mid].time_ms <= posMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * 截取以当前行为中心的歌词窗口，越界位置补空行以保持高度。
 * @param lyrics - 歌词
 * @param idx - 当前行索引
 * @returns 固定行数的歌词窗口
 */
export function sliceNearby(
  lyrics: SyncedLyricLine[],
  idx: number,
): LyricSliceLine[] {
  const half = Math.floor(VISIBLE_LINES / 2);
  const result: LyricSliceLine[] = [];
  for (let offset = -half; offset <= half; offset++) {
    const i = idx + offset;
    if (i >= 0 && i < lyrics.length) {
      result.push({ text: lyrics[i].text, isCurrent: offset === 0, key: `${i}` });
    } else {
      result.push({ text: '', isCurrent: false, key: `pad_${offset}` });
    }
  }
  return result;
}

/**
 * 按音节真实起止时间计算扫光进度。
 * @param syllable - 音节（相对行首偏移 + 持续时长）
 * @param lineStartMs - 行起始绝对毫秒
 * @param posMs - 当前播放位置（绝对毫秒）
 * @returns 0 到 1 的进度
 */
export function getSyllableProgress(syllable: SyncedLyricSyllable, lineStartMs: number, posMs: number): number {
  const sylStart = lineStartMs + syllable.start_offset_ms;
  const sylEnd = sylStart + syllable.duration_ms;
  if (posMs >= sylEnd) return 1;
  if (posMs > sylStart && syllable.duration_ms > 0) return (posMs - sylStart) / syllable.duration_ms;
  return 0;
}

/**
 * 格式化倒计时剩余
 * @param targetDate - 目标日期
 * @param t - 翻译函数
 * @returns 剩余时间文案
 */
export function formatCountdownRemaining(targetDate: string, t: Translate): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return t('songTab.countdown.expired', { defaultValue: '已到期' });
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return t('songTab.countdown.dayHour', { defaultValue: '{{days}}天{{hours}}时', days: d, hours: h });
  if (h > 0) return t('songTab.countdown.hourMinute', { defaultValue: '{{hours}}时{{minutes}}分', hours: h, minutes: m });
  return t('songTab.countdown.minute', { defaultValue: '{{minutes}}分', minutes: m });
}
