import type { LyricLine } from './types';
import {
  cleanArtist,
  cleanTitle,
  extractSyncedFromArray,
  extractSyncedFromObject,
} from './helpers';
import { requestJsonWithLog } from './request';

export async function fetchLyricsFromLrclib(title: string, artist: string): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const headers = { 'User-Agent': 'DynamicIsland/1.0 (https://github.com/user/dynamic-island)' };

  const url1 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  try {
    const json = await requestJsonWithLog<unknown[]>(url1, { headers });
    if (json) {
      const lines = extractSyncedFromArray(json);
      if (lines) return lines;
    }
  } catch {
    // ignore
  }

  if (cleanedTitle !== title || cleanedArtist !== artist) {
    const url2 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`;
    try {
      const json = await requestJsonWithLog<unknown[]>(url2, { headers });
      if (json) {
        const lines = extractSyncedFromArray(json);
        if (lines) return lines;
      }
    } catch {
      // ignore
    }
  }

  const query = `${cleanedTitle} ${cleanedArtist}`;
  const url3 = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  try {
    const json = await requestJsonWithLog<unknown[]>(url3, { headers });
    if (json) {
      const lines = extractSyncedFromArray(json);
      if (lines) return lines;
    }
  } catch {
    // ignore
  }

  const url4 = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`;
  try {
    const json = await requestJsonWithLog<Record<string, unknown>>(url4, { headers });
    if (json) {
      const lines = extractSyncedFromObject(json);
      if (lines) return lines;
    }
  } catch {
    // ignore
  }

  return null;
}
