import type { LyricLine } from './types';
import { fetchLyricsFromLrclib } from './lrclib';
import { fetchLyricsFromNetease } from './netease';
import { fetchLyricsFromQQMusic } from './qqmusic';
import { fetchLyricsFromKugou } from './kugou';
import { fetchLyricsFromSodaMusic } from './sodaMusic';

export type { LyricLine } from './types';
export { fetchLyricsFromLrclib } from './lrclib';
export { fetchLyricsFromNetease } from './netease';
export { fetchLyricsFromQQMusic } from './qqmusic';
export { fetchLyricsFromKugou } from './kugou';
export { fetchLyricsFromSodaMusic } from './sodaMusic';

type Provider = 'netease' | 'qqmusic' | 'kugou' | 'sodamusic';

type FetchFn = (title: string, artist: string) => Promise<LyricLine[] | null>;

const PROVIDER_MAP: Record<Provider, FetchFn> = {
  netease: fetchLyricsFromNetease,
  qqmusic: fetchLyricsFromQQMusic,
  kugou: fetchLyricsFromKugou,
  sodamusic: fetchLyricsFromSodaMusic,
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

function detectProviderFromProcess(sourceAppId: string): Provider | null {
  if (!sourceAppId) return null;
  const lower = sourceAppId.toLowerCase();
  for (const { pattern, provider } of PROCESS_TO_PROVIDER) {
    if (pattern.test(lower)) return provider;
  }
  return null;
}

async function tryProviders(
  providers: Provider[],
  title: string,
  artist: string,
): Promise<LyricLine[] | null> {
  for (const p of providers) {
    try {
      const result = await PROVIDER_MAP[p](title, artist);
      if (result && result.length > 0) return result;
    } catch {
      // continue to next provider
    }
  }
  return null;
}

export async function fetchLyrics(
  title: string,
  artist: string,
  sourceAppId?: string,
): Promise<LyricLine[] | null> {
  const appId = sourceAppId ?? await resolveSourceAppId();
  const primary = detectProviderFromProcess(appId);

  if (primary) {
    const fallback = ALL_PROVIDERS.filter((p) => p !== primary);
    const result = await tryProviders([primary, ...fallback], title, artist);
    if (result) return result;
  } else {
    const result = await tryProviders(ALL_PROVIDERS, title, artist);
    if (result) return result;
  }

  return fetchLyricsFromLrclib(title, artist);
}

async function resolveSourceAppId(): Promise<string> {
  try {
    const resp = await window.api.musicDetectSourceAppId();
    return resp?.ok && resp.sourceAppId ? resp.sourceAppId : '';
  } catch {
    return '';
  }
}

export function getCurrentLyric(lyrics: LyricLine[], positionMs: number): LyricLine | null {
  if (lyrics.length === 0) return null;
  return lyrics.reduce<LyricLine | null>((acc, line) => (line.time_ms <= positionMs ? line : acc), null);
}

export function getNearbyLyrics(
  lyrics: LyricLine[],
  positionMs: number,
): Array<{ text: string; isCurrent: boolean }> {
  if (lyrics.length === 0) return [];

  const currentIdx = lyrics.reduce<number | null>((acc, line, index) => (line.time_ms <= positionMs ? index : acc), null);
  if (currentIdx === null) return [];

  const start = Math.max(0, currentIdx - 2);
  const end = Math.min(lyrics.length, currentIdx + 3);

  return lyrics.slice(start, end).map((line, i) => ({
    text: line.text,
    isCurrent: start + i === currentIdx,
  }));
}
