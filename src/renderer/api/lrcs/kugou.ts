import type { LyricLine } from './types';
import { cleanArtist, cleanTitle, parseSyncedLrc } from './helpers';
import { requestJsonWithLog } from './request';

export async function fetchLyricsFromKugou(title: string, artist: string): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const keyword = `${cleanedTitle} ${cleanedArtist}`;

  try {
    const searchUrl =
      `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(keyword)}&page=1&pagesize=20&showtype=1`;

    const searchJson = await requestJsonWithLog<Record<string, unknown>>(searchUrl);
    if (!searchJson) return null;

    const data = searchJson.data as Record<string, unknown> | undefined;
    const infoList = data?.info as unknown[] | undefined;
    if (!infoList || infoList.length === 0) return null;

    const firstSong = infoList[0] as Record<string, unknown>;
    const hash = typeof firstSong.hash === 'string' ? firstSong.hash : '';
    const duration = typeof firstSong.duration === 'number' ? firstSong.duration : undefined;

    const durationParam = duration !== undefined ? `&duration=${duration * 1000}` : '';
    const lyricsSearchUrl =
      `https://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword=${encodeURIComponent(keyword)}${durationParam}&hash=${hash}`;

    const lyricsSearchJson = await requestJsonWithLog<Record<string, unknown>>(lyricsSearchUrl);
    if (!lyricsSearchJson) return null;

    const candidates = lyricsSearchJson.candidates as unknown[] | undefined;
    if (!candidates || candidates.length === 0) return null;

    const bestCandidate = candidates[0] as Record<string, unknown>;
    const candidateId = typeof bestCandidate.id === 'string' ? bestCandidate.id : String(bestCandidate.id ?? '');
    const accessKey = typeof bestCandidate.accesskey === 'string' ? bestCandidate.accesskey : '';
    if (!candidateId || !accessKey) return null;

    const downloadUrl =
      `https://lyrics.kugou.com/download?ver=1&client=pc&id=${candidateId}&accesskey=${accessKey}&fmt=lrc&charset=utf8`;

    const downloadJson = await requestJsonWithLog<Record<string, unknown>>(downloadUrl);
    if (!downloadJson) return null;

    const contentB64 = typeof downloadJson.content === 'string' ? downloadJson.content : null;
    if (!contentB64) return null;

    let lrcText: string;
    try {
      lrcText = atob(contentB64);
    } catch {
      return null;
    }

    if (!lrcText) return null;

    const lines = parseSyncedLrc(lrcText);
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}
