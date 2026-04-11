import type { LyricLine } from './types';
import { cleanArtist, cleanTitle, parseSyncedLrc, parseYrc } from './helpers';
import { requestJsonWithLog } from './request';

const NETEASE_HEADERS = {
  Referer: 'https://music.163.com',
  'User-Agent': 'Mozilla/5.0',
  'Content-Type': 'application/x-www-form-urlencoded',
};

export async function fetchLyricsFromNetease(title: string, artist: string): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const query = `${cleanedTitle} ${cleanedArtist}`;

  try {
    const searchJson = await requestJsonWithLog<Record<string, unknown>>(
      'https://music.163.com/api/search/get/web',
      {
        method: 'POST',
        headers: NETEASE_HEADERS,
        body: `s=${encodeURIComponent(query)}&type=1&limit=20&offset=0`,
      },
    );
    if (!searchJson) return null;

    const result = searchJson.result as Record<string, unknown> | undefined;
    const songs = result?.songs as unknown[] | undefined;
    if (!songs || songs.length === 0) return null;

    const firstSong = songs[0] as Record<string, unknown>;
    const songId = typeof firstSong.id === 'number' ? firstSong.id : parseInt(String(firstSong.id), 10);
    if (isNaN(songId)) return null;

    const lrcJson = await requestJsonWithLog<Record<string, unknown>>(
      'https://interface3.music.163.com/api/song/lyric/v1',
      {
        method: 'POST',
        headers: NETEASE_HEADERS,
        body: `id=${songId}&lv=-1&kv=-1&tv=-1&rv=-1&yv=-1&ytv=-1&yrv=-1`,
      },
    );
    if (!lrcJson) return null;

    const yrcObj = lrcJson.yrc as Record<string, unknown> | undefined;
    const yrcText = typeof yrcObj?.lyric === 'string' ? yrcObj.lyric : null;
    if (yrcText && yrcText.length > 0) {
      const yrcLines = parseYrc(yrcText);
      if (yrcLines.length > 0) return yrcLines;
    }

    const lrcObj = lrcJson.lrc as Record<string, unknown> | undefined;
    const lrcText = typeof lrcObj?.lyric === 'string' ? lrcObj.lyric : null;
    if (lrcText && lrcText.length > 0) {
      const lines = parseSyncedLrc(lrcText);
      if (lines.length > 0) return lines;
    }

    return null;
  } catch {
    return null;
  }
}
