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
 * @file index.ts
 * @description 逐字歌词拉取统一入口 — 按 SMTC 进程/设置源优先,多源回退
 *              与非逐字 `fetchLyrics` 的选源逻辑对齐(去除 LRCLIB 兜底,因为 LRCLIB 无逐字数据)
 * @author 鸡哥
 * @docs https://github.com/cXp1r/lyricify-lyrics-provider-rs
 */

import type { KaraokeLine } from './types';
import { fetchKaraokeFromNetease } from './providers/netease';
import { fetchKaraokeFromQQMusic } from './providers/qqmusic';
import { fetchKaraokeFromKugou } from './providers/kugou';
import { fetchKaraokeFromSodaMusic } from './providers/sodaMusic';

export type { KaraokeLine, KaraokeSyllable } from './types';
export { fetchKaraokeFromNetease } from './providers/netease';
export { fetchKaraokeFromQQMusic } from './providers/qqmusic';
export { fetchKaraokeFromKugou } from './providers/kugou';
export { fetchKaraokeFromSodaMusic } from './providers/sodaMusic';

type Provider = 'netease' | 'qqmusic' | 'kugou' | 'sodamusic';

type FetchFn = (title: string, artist: string) => Promise<KaraokeLine[] | null>;

const PROVIDER_MAP: Record<Provider, FetchFn> = {
  netease: fetchKaraokeFromNetease,
  qqmusic: fetchKaraokeFromQQMusic,
  kugou: fetchKaraokeFromKugou,
  sodamusic: fetchKaraokeFromSodaMusic,
};

const ALL_PROVIDERS: Provider[] = ['netease', 'qqmusic', 'kugou', 'sodamusic'];

const PROCESS_TO_PROVIDER: Array<{ pattern: RegExp; provider: Provider }> = [
  { pattern: /cloudmusic/i, provider: 'netease' },
  { pattern: /QQMusic/i, provider: 'qqmusic' },
  { pattern: /kugou/i, provider: 'kugou' },
  { pattern: /汽水音乐/i, provider: 'sodamusic' },
  { pattern: /qishui/i, provider: 'sodamusic' },
  { pattern: /soda.?music/i, provider: 'sodamusic' },
];

const SOURCE_SETTING_TO_PROVIDER: Record<string, Provider> = {
  'netease-only': 'netease',
  'qqmusic-only': 'qqmusic',
  'kugou-only': 'kugou',
  'sodamusic-only': 'sodamusic',
};

/**
 * 依据 SMTC 进程名推断首选源
 * @param sourceAppId - SMTC 会话的 sourceAppId
 * @returns 推断到的首选源, 未命中返回 null
 */
function detectProviderFromProcess(sourceAppId: string): Provider | null {
  if (!sourceAppId) return null;
  const lower = sourceAppId.toLowerCase();
  const matched = PROCESS_TO_PROVIDER.find(({ pattern }) => pattern.test(lower));
  return matched?.provider ?? null;
}

/**
 * 按顺序尝试多个源, 第一个返回非空结果者胜出
 * @param providers - 源列表
 * @param title - 歌名
 * @param artist - 艺术家
 * @returns 首个成功源的逐字歌词, 全失败返回 null
 */
async function tryProviders(
  providers: Provider[],
  title: string,
  artist: string,
): Promise<KaraokeLine[] | null> {
  for (const p of providers) {
    try {
      const result = await PROVIDER_MAP[p](title, artist);
      if (result && result.length > 0) return result;
    } catch {
      // 单源失败继续下一个
    }
  }
  return null;
}

/** 读取歌词源设置, 失败退回 'auto' */
async function readLyricsSourceSetting(): Promise<string> {
  try {
    return await window.api.musicLyricsSourceGet();
  } catch {
    return 'auto';
  }
}

/** 解析当前 SMTC 活跃会话的 sourceAppId: 优先返回正在播放的,其次返回第一个 */
async function resolveSourceAppId(): Promise<string> {
  try {
    const resp = await window.api.musicDetectSourceAppId();
    if (!resp?.ok || !resp.sources || resp.sources.length === 0) return '';
    const playing = resp.sources.find((s) => s.isPlaying && s.hasTitle);
    return (playing ?? resp.sources[0]).sourceAppId ?? '';
  } catch {
    return '';
  }
}

/**
 * 拉取逐字歌词 — 选源规则与 `fetchLyrics` 对齐:
 *   1. 设置为 `lrclib-only`: 直接返回 null(LRCLIB 不提供逐字,留给非逐字链路)
 *   2. 设置为 `*-only`: 仅尝试该源
 *   3. 设置为 `auto`: 按 SMTC 进程识别首选源 → 失败回退其它源
 * @param title - 歌名
 * @param artist - 艺术家
 * @param sourceAppId - 可选的 SMTC sourceAppId, 未传入时主动查询
 * @returns 逐字歌词行; 任何源均无逐字内容时返回 null, 交由调用方回退到非逐字歌词
 */
export async function fetchKaraokeLyrics(
  title: string,
  artist: string,
  sourceAppId?: string,
): Promise<KaraokeLine[] | null> {
  const setting = await readLyricsSourceSetting();

  if (setting === 'lrclib-only') {
    return null;
  }

  const forced = SOURCE_SETTING_TO_PROVIDER[setting];
  if (forced) {
    return tryProviders([forced], title, artist);
  }

  const appId = sourceAppId ?? await resolveSourceAppId();
  const primary = detectProviderFromProcess(appId);

  if (primary) {
    const fallback = ALL_PROVIDERS.filter((p) => p !== primary);
    return tryProviders([primary, ...fallback], title, artist);
  }
  return tryProviders(ALL_PROVIDERS, title, artist);
}
