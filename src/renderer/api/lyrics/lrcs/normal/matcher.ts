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
 * @file matcher.ts
 * @description 歌词搜索匹配器 — 移植自 Lyrix searchers/mod.rs::compare_track()
 *              评分算法 + 多查询策略 + 最佳匹配选择
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import { cleanTitle, cleanArtist } from './helpers';
import type { SearchCandidate, ScoreInput } from './searchTypes';
import { logger } from '../../../../utils/logger';

/** 默认最低匹配分数线 */
export const DEFAULT_MIN_SCORE = 5;

/** 惊喜分数线（超过此分直接采纳，跳过后续查询） */
export const DEFAULT_WOW_SCORE = 7;

/**
 * 生成多条搜索关键词（移植自 Lyrix make_search_string）
 * 组合 title / artist / album 的原始和清洗版本，去重后返回
 * @param title - 歌名
 * @param artist - 艺术家
 * @param album - 专辑（可选）
 * @returns 去重后的搜索关键词数组
 */
export function makeSearchQueries(title: string, artist: string, album?: string): string[] {
  const t = title.trim();
  const a = artist.trim();
  const al = (album ?? '').trim();

  const ct = cleanTitle(t);
  const ca = cleanArtist(a);
  const cal = cleanTitle(al);

  const join = (...parts: string[]): string => parts.filter((s) => s.length > 0).join(' ');

  const candidates: string[] = [
    join(t, a),
    join(ct, ca),
    join(t, a, al),
    join(ct, ca, cal),
    t,
    ct,
    join(t, al),
    join(ct, cal),
  ];

  // 去重（保持顺序）
  const seen = new Set<string>();
  return candidates.filter((s) => {
    if (s.length === 0 || seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

/**
 * 清理标题用于评分比较（移植自 Lyrix clean_title）
 * 截断于 ( / [ /  -  ，移除特殊标点
 */
function cleanForScore(title: string): string {
  const truncated = ['(', '（', '[', '【', ' - '].reduce((acc, pattern) => {
    const idx = acc.indexOf(pattern);
    return idx !== -1 ? acc.substring(0, idx).trim() : acc;
  }, title);
  // 移除特殊标点
  return truncated.replace(/[《》「」『』！!?。、·•…]/g, '').trim();
}

function splitArtists(value: string, splitChar: string): string[] {
  const separators = splitChar.trim()
    ? new RegExp(`[\\s、，,/＆&;；]+|${splitChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
    : /[\s、，,/＆&;；]+/;
  return value
    .split(separators)
    .map((artist) => artist.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * 移除 feat 后缀（移植自 Lyrix remove_feat）
 */
function removeFeat(title: string): string {
  let s = title;
  const featIdx = s.indexOf('(feat.');
  if (featIdx !== -1) s = s.substring(0, featIdx).trim();
  const dashFeatIdx = s.indexOf(' - feat.');
  if (dashFeatIdx !== -1) s = s.substring(0, dashFeatIdx).trim();
  return s;
}

/**
 * 计算单个候选歌曲的匹配分数（移植自 Lyrix compare_track）
 * @param input - 当前播放歌曲的元数据
 * @param candidate - 搜索候选
 * @param splitChar - 艺术家分隔符（QQ Music 用 '/'，其他默认 ' '）
 * @returns 匹配分数
 */
export function scoreTrack(input: ScoreInput, candidate: SearchCandidate, splitChar: string = ' '): number {
  let score = 0;

  // ── 标题匹配 ──
  const trackTitle = removeFeat(input.title).toLowerCase();
  const resultTitle = candidate.title.toLowerCase();

  if (trackTitle && resultTitle) {
    if (trackTitle === resultTitle) {
      score += 4;
    } else if (resultTitle.includes(trackTitle) || trackTitle.includes(resultTitle)) {
      score += 2;
    } else {
      const cleanTrack = cleanForScore(trackTitle);
      const cleanResult = cleanForScore(resultTitle);
      if (cleanTrack === cleanResult) {
        score += 3;
      } else if (cleanResult.includes(cleanTrack) || cleanTrack.includes(cleanResult)) {
        score += 1;
      }
    }
  }

  // ── 艺术家匹配 ──
  const artists = splitArtists(input.artist, splitChar);
  const candidateArtists = candidate.artists.flatMap((artist) => splitArtists(artist, splitChar));

  score += artists.filter((artist) =>
    candidateArtists.some((candidateArtist) =>
      artist === candidateArtist || artist.includes(candidateArtist) || candidateArtist.includes(artist),
    ),
  ).length;

  // ── 专辑匹配 ──
  const trackAlbum = (input.album ?? '').toLowerCase();
  const resultAlbum = candidate.album.toLowerCase();
  if (trackAlbum && resultAlbum) {
    if (trackAlbum === resultAlbum) {
      score += 2;
    } else if (resultAlbum.includes(trackAlbum) || trackAlbum.includes(resultAlbum)) {
      score += 1;
    }
  }

  // ── 时长匹配 ──
  if (input.durationMs !== undefined && candidate.durationMs !== undefined) {
    const diff = Math.abs(input.durationMs - candidate.durationMs);
    if (diff === 0) {
      score += 3;
    } else if (diff <= 500) {
      score += 2;
    } else if (diff <= 1000) {
      score += 1;
    }
  }

  return score;
}

/**
 * 从候选列表中选出最佳匹配
 * @param input - 当前播放歌曲元数据
 * @param candidates - 候选列表
 * @param minScore - 最低分数线（默认 5）
 * @param splitChar - 艺术家分隔符
 * @returns 最佳匹配及其分数，无合格候选返回 null
 */
export function bestMatch(
  input: ScoreInput,
  candidates: SearchCandidate[],
  minScore: number = DEFAULT_MIN_SCORE,
  splitChar: string = ' ',
): { candidate: SearchCandidate; score: number } | null {
  const best = candidates.reduce<{ candidate: SearchCandidate; score: number } | null>((acc, c) => {
    const s = scoreTrack(input, c, splitChar);
    return s >= minScore && (!acc || s > acc.score) ? { candidate: c, score: s } : acc;
  }, null);

  if (best) {
    logger.info('[Matcher]', `best match: "${best.candidate.title}" score=${best.score} min=${minScore}`);
  }
  return best;
}

/**
 * 完整搜索流程：多查询 + 评分匹配
 * 对每个查询词调用搜索函数，对结果评分，返回首个合格匹配
 * @param input - 当前播放歌曲元数据
 * @param searchFn - 搜索函数（接受 query，返回候选列表）
 * @param minScore - 最低分数线
 * @param wowScore - 惊喜分数线（超过直接返回）
 * @param splitChar - 艺术家分隔符
 * @returns 最佳匹配的候选（含 id/mid），无合格返回 null
 */
export async function searchWithScoring(
  input: ScoreInput,
  searchFn: (query: string) => Promise<SearchCandidate[]>,
  minScore: number = DEFAULT_MIN_SCORE,
  wowScore: number = DEFAULT_WOW_SCORE,
  splitChar: string = ' ',
): Promise<SearchCandidate | null> {
  const queries = makeSearchQueries(input.title, input.artist, input.album);
  const seen = new Set<string>();

  const processQuery = async (query: string): Promise<SearchCandidate | null> => {
    logger.info('[Matcher]', `query: "${query}"`);
    let candidates: SearchCandidate[];
    try {
      candidates = await searchFn(query);
    } catch {
      return null;
    }
    if (candidates.length === 0) return null;

    const wowMatch = candidates.find((c) => scoreTrack(input, c, splitChar) > wowScore);
    if (wowMatch) {
      const s = scoreTrack(input, wowMatch, splitChar);
      logger.info('[Matcher]', `wow match: "${wowMatch.title}" score=${s} wow=${wowScore}`);
      return wowMatch;
    }

    const groupBest = candidates.reduce<{ candidate: SearchCandidate; score: number } | null>((acc, c) => {
      const s = scoreTrack(input, c, splitChar);
      return s >= minScore && (!acc || s > acc.score) ? { candidate: c, score: s } : acc;
    }, null);

    if (groupBest) {
      logger.info('[Matcher]', `group best: "${groupBest.candidate.title}" score=${groupBest.score}`);
      return groupBest.candidate;
    }
    return null;
  };

  const result = await queries.reduce(async (prevPromise, query) => {
    const prev = await prevPromise;
    if (prev) return prev;
    if (seen.has(query)) return null;
    seen.add(query);
    return processQuery(query);
  }, Promise.resolve<SearchCandidate | null>(null));

  if (!result) {
    logger.warn('[Matcher]', `no acceptable result for "${input.title}" / "${input.artist}"`);
  }
  return result;
}
