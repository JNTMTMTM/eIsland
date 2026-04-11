import type { LyricLine } from './types';
import { cleanArtist, cleanTitle, parseSyncedLrc } from './helpers';
import { requestJsonWithLog } from './request';

function resolveJsonpResponse(callback: string, raw: string): string {
  if (!raw.startsWith(callback)) return '';
  const json = raw.replace(`${callback}(`, '').replace(/\)$/, '');
  return json;
}

function base64DecodeUtf8(encoded: string): string {
  try {
    const raw = atob(encoded);
    const bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

export async function fetchLyricsFromQQMusic(title: string, artist: string): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const query = `${cleanedTitle} ${cleanedArtist}`;

  try {
    const searchPayload = {
      req_1: {
        method: 'DoSearchForQQMusicDesktop',
        module: 'music.search.SearchCgiService',
        param: {
          num_per_page: '20',
          page_num: '1',
          query,
          search_type: 0,
        },
      },
    };

    const searchJson = await requestJsonWithLog<Record<string, unknown>>(
      'https://u.y.qq.com/cgi-bin/musicu.fcg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload),
      },
    );
    if (!searchJson) return null;

    const req1 = searchJson.req_1 as Record<string, unknown> | undefined;
    const data = req1?.data as Record<string, unknown> | undefined;
    const body = data?.body as Record<string, unknown> | undefined;
    const songList = body?.song as Record<string, unknown> | undefined;
    const songs = songList?.list as unknown[] | undefined;
    if (!songs || songs.length === 0) return null;

    const firstSong = songs[0] as Record<string, unknown>;
    const mid = typeof firstSong.mid === 'string' ? firstSong.mid : null;
    if (!mid) return null;

    const callback = 'MusicJsonCallback_lrc';
    const pcachetime = Date.now().toString();
    const params = new URLSearchParams({
      callback,
      pcachetime,
      songmid: mid,
      g_tk: '5381',
      jsonpCallback: callback,
      loginUin: '0',
      hostUin: '0',
      format: 'jsonp',
      inCharset: 'utf8',
      outCharset: 'utf8',
      notice: '0',
      platform: 'yqq',
      needNewCode: '0',
    });

    const lrcResp = await requestJsonWithLog<string>(
      `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?${params.toString()}`,
      {
        headers: {
          Referer: 'https://y.qq.com/',
          'User-Agent': 'Mozilla/5.0',
        },
      },
    );

    if (!lrcResp) return null;

    const rawStr = typeof lrcResp === 'string' ? lrcResp : JSON.stringify(lrcResp);
    const jsonStr = resolveJsonpResponse(callback, rawStr);
    if (!jsonStr) {
      const parsed = typeof lrcResp === 'object' ? lrcResp as unknown as Record<string, unknown> : null;
      if (parsed) {
        const lyricB64 = typeof parsed.lyric === 'string' ? parsed.lyric : null;
        if (lyricB64) {
          const decoded = base64DecodeUtf8(lyricB64);
          if (decoded) {
            const lines = parseSyncedLrc(decoded);
            if (lines.length > 0) return lines;
          }
        }
      }
      return null;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return null;
    }

    const lyricB64 = typeof parsed.lyric === 'string' ? parsed.lyric : null;
    if (!lyricB64) return null;

    const decoded = base64DecodeUtf8(lyricB64);
    if (!decoded) return null;

    const lines = parseSyncedLrc(decoded);
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}
