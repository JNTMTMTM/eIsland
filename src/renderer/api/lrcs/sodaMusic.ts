import type { LyricLine } from './types';
import { cleanArtist, cleanTitle, parseKrc } from './helpers';
import { requestJsonWithLog } from './request';

export async function fetchLyricsFromSodaMusic(title: string, artist: string): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const query = `${cleanedTitle} ${cleanedArtist}`;

  try {
    const searchUrl =
      `https://api.qishui.com/luna/pc/search/track?aid=386088&app_name=&region=&geo_region=&os_region=&sim_region=&device_id=&cdid=&iid=&version_name=&version_code=&channel=&build_mode=&network_carrier=&ac=&tz_name=&resolution=&device_platform=&device_type=&os_version=&fp=&q=${encodeURIComponent(query)}&cursor=&search_id=&search_method=input&debug_params=&from_search_id=&search_scene=`;

    const searchJson = await requestJsonWithLog<Record<string, unknown>>(searchUrl);
    if (!searchJson) return null;

    const resultGroups = searchJson.result_groups as unknown[] | undefined;
    if (!resultGroups || resultGroups.length === 0) return null;

    let trackId: string | null = null;
    for (const group of resultGroups) {
      const g = group as Record<string, unknown>;
      const items = g.data as unknown[] | undefined;
      if (!items) continue;
      for (const item of items) {
        const it = item as Record<string, unknown>;
        const entity = it.entity as Record<string, unknown> | undefined;
        const track = entity?.track as Record<string, unknown> | undefined;
        if (track?.id) {
          trackId = typeof track.id === 'number' ? String(track.id) : String(track.id);
          break;
        }
      }
      if (trackId) break;
    }

    if (!trackId) return null;

    const detailUrl =
      `https://api.qishui.com/luna/pc/track_v2?track_id=${encodeURIComponent(trackId)}&media_type=track&queue_type=`;

    const detailJson = await requestJsonWithLog<Record<string, unknown>>(detailUrl);
    if (!detailJson) return null;

    const lyricInfo = detailJson.lyric as Record<string, unknown> | undefined;
    const content = typeof lyricInfo?.content === 'string' ? lyricInfo.content : null;
    if (!content) return null;

    const lines = parseKrc(content);
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}
