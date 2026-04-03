/**
 * @file lrcApi.ts
 * @description 歌词获取接口模块
 * @reference Python-island/dynamic-island/src-tauri/src/lrc.rs
 */

export interface LyricLine {
  time_ms: number;
  text: string;
}

const META_PREFIXES = [
  '作词', '作曲', '编曲', '制作', '混音', '母带', '录音',
  'Lyrics by', 'Composed by', 'Produced by', 'Arranged by'
];

/**
 * 解析同步歌词时间戳 [mm:ss.xx] 或 [mm:ss.xxx]
 */
function parseLrcTime(tag: string): number | null {
  const parts = tag.split(':');
  if (parts.length !== 2) return null;

  const min = parseInt(parts[0], 10);
  if (isNaN(min)) return null;

  const secParts = parts[1].split('.');
  if (!secParts.length) return null;

  const sec = parseInt(secParts[0], 10);
  if (isNaN(sec)) return null;

  let ms = 0;
  if (secParts.length > 1) {
    const frac = secParts[1];
    const val = parseInt(frac, 10);
    if (isNaN(val)) return null;
    ms = frac.length === 2 ? val * 10 : val;
  }

  return min * 60000 + sec * 1000 + ms;
}

/**
 * 解析同步歌词字符串
 */
function parseSyncedLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const line of lrc.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('[')) continue;

    const endIndex = trimmed.indexOf(']');
    if (endIndex === -1) continue;

    const tag = trimmed.slice(1, endIndex);
    const text = trimmed.slice(endIndex + 1).trim();

    const timeMs = parseLrcTime(tag);
    if (timeMs !== null && text && !META_PREFIXES.some(p => text.startsWith(p))) {
      lines.push({ time_ms: timeMs, text });
    }
  }

  lines.sort((a, b) => a.time_ms - b.time_ms);
  return lines;
}

/**
 * 清理歌曲标题，去除括号内容、feat 信息等干扰搜索的部分
 */
function cleanTitle(title: string): string {
  let result = title;

  // 去除各种括号内容: (feat. X), [Remix], （翻唱）等
  for (const [open, close] of [['\\(', '\\)'], ['\\[', '\\]']]) {
    const openRegex = new RegExp(open, 'g');
    const closeRegex = new RegExp(close, 'g');

    result = result.replace(openRegex, '\0').replace(closeRegex, '\0');
    result = result.split('\0').join('');
  }

  // 去除 " - " 后面的副标题
  const dashIndex = result.indexOf(' - ');
  if (dashIndex !== -1) {
    result = result.slice(0, dashIndex);
  }

  return result.trim();
}

/**
 * 清理艺术家名称，取第一个
 */
function cleanArtist(artist: string): string {
  return artist.split(/[/,]/)[0].trim() || artist.trim();
}

/**
 * 从 LRCLIB API 搜索结果数组中提取第一个有 syncedLyrics 的结果
 */
function extractSyncedFromArray(json: unknown[]): LyricLine[] | null {
  for (const item of json) {
    const obj = item as Record<string, unknown>;
    const synced = typeof obj.syncedLyrics === 'string' ? obj.syncedLyrics : null;
    if (synced && synced.length > 0) {
      const lines = parseSyncedLrc(synced);
      if (lines.length > 0) return lines;
    }
  }
  return null;
}

/**
 * 从单个对象中提取 syncedLyrics
 */
function extractSyncedFromObject(json: Record<string, unknown>): LyricLine[] | null {
  const synced = typeof json.syncedLyrics === 'string' ? json.syncedLyrics : null;
  if (!synced || synced.length === 0) return null;
  const lines = parseSyncedLrc(synced);
  return lines.length > 0 ? lines : null;
}

/**
 * 从 LRCLIB 获取歌词
 * @param title 歌曲标题
 * @param artist 艺术家名称
 * @returns 解析后的歌词数组，失败返回 null
 */
export async function fetchLyricsFromLrclib(
  title: string,
  artist: string
): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const ua = 'DynamicIsland/1.0 (https://github.com/user/dynamic-island)';

  const headers = { 'User-Agent': ua };

  // 策略1: 使用原始标题和艺术家搜索
  const url1 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
  try {
    const resp = await fetch(url1, { headers });
    if (resp.ok) {
      const json = await resp.json() as unknown[];
      const lines = extractSyncedFromArray(json);
      if (lines) return lines;
    }
  } catch {
    // 继续尝试下一个策略
  }

  // 策略2: 使用清理后的标题和艺术家
  if (cleanedTitle !== title || cleanedArtist !== artist) {
    const url2 = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}`;
    try {
      const resp = await fetch(url2, { headers });
      if (resp.ok) {
        const json = await resp.json() as unknown[];
        const lines = extractSyncedFromArray(json);
        if (lines) return lines;
      }
    } catch {
      // 继续尝试下一个策略
    }
  }

  // 策略3: 自由搜索
  const query = `${cleanedTitle} ${cleanedArtist}`;
  const url3 = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
  try {
    const resp = await fetch(url3, { headers });
    if (resp.ok) {
      const json = await resp.json() as unknown[];
      const lines = extractSyncedFromArray(json);
      if (lines) return lines;
    }
  } catch {
    // 继续尝试下一个策略
  }

  // 策略4: 精确匹配
  const url4 = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}&album_name=&duration=0`;
  try {
    const resp = await fetch(url4, { headers });
    if (resp.ok) {
      const json = await resp.json() as Record<string, unknown>;
      const lines = extractSyncedFromObject(json);
      if (lines) return lines;
    }
  } catch {
    // 精确匹配失败
  }

  return null;
}

/**
 * 从网易云音乐获取歌词（作为 LRCLIB 的备用源）
 * @param title 歌曲标题
 * @param artist 艺术家名称
 * @returns 解析后的歌词数组，失败返回 null
 */
export async function fetchLyricsFromNetease(
  title: string,
  artist: string
): Promise<LyricLine[] | null> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);
  const query = `${cleanedTitle} ${cleanedArtist}`;

  try {
    // 搜索歌曲
    const searchResp = await fetch('https://music.163.com/api/search/get', {
      method: 'POST',
      headers: {
        'Referer': 'https://music.163.com',
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `s=${encodeURIComponent(query)}&type=1&limit=5&offset=0`,
    });

    if (!searchResp.ok) return null;

    const searchJson = await searchResp.json() as Record<string, unknown>;
    const result = searchJson.result as Record<string, unknown> | undefined;
    const songs = result?.songs as unknown[] | undefined;

    if (!songs || songs.length === 0) return null;

    const firstSong = songs[0] as Record<string, unknown>;
    const songId = typeof firstSong.id === 'number' ? firstSong.id : parseInt(String(firstSong.id), 10);
    if (isNaN(songId)) return null;

    // 获取歌词
    const lrcResp = await fetch(`https://music.163.com/api/song/lyric?id=${songId}&lv=1`, {
      headers: {
        'Referer': 'https://music.163.com',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!lrcResp.ok) return null;

    const lrcJson = await lrcResp.json() as Record<string, unknown>;
    const lrcObj = lrcJson.lrc as Record<string, unknown> | undefined;
    const lrcStr = typeof lrcObj?.lyric === 'string' ? lrcObj.lyric : null;

    if (!lrcStr || lrcStr.length === 0) return null;

    const lines = parseSyncedLrc(lrcStr);
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  }
}

/**
 * 获取歌词（自动尝试多个源）
 * @param title 歌曲标题
 * @param artist 艺术家名称
 * @returns 解析后的歌词数组，失败返回 null
 */
export async function fetchLyrics(
  title: string,
  artist: string
): Promise<LyricLine[] | null> {
  // 优先尝试 LRCLIB
  const lrclibResult = await fetchLyricsFromLrclib(title, artist);
  if (lrclibResult) return lrclibResult;

  // 备用网易云音乐
  const neteaseResult = await fetchLyricsFromNetease(title, artist);
  if (neteaseResult) return neteaseResult;

  return null;
}

/**
 * 根据播放位置获取当前歌词行
 */
export function getCurrentLyric(
  lyrics: LyricLine[],
  positionMs: number
): LyricLine | null {
  if (lyrics.length === 0) return null;

  let result: LyricLine | null = null;
  for (const line of lyrics) {
    if (line.time_ms <= positionMs) {
      result = line;
    } else {
      break;
    }
  }
  return result;
}

/**
 * 获取当前播放位置周围的歌词行（前2行、当前行、后2行）
 * @returns 包含歌词文本和是否为当前行的元组数组
 */
export function getNearbyLyrics(
  lyrics: LyricLine[],
  positionMs: number
): Array<{ text: string; isCurrent: boolean }> {
  if (lyrics.length === 0) return [];

  let currentIdx: number | null = null;
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time_ms <= positionMs) {
      currentIdx = i;
    } else {
      break;
    }
  }

  if (currentIdx === null) return [];

  const start = Math.max(0, currentIdx - 2);
  const end = Math.min(lyrics.length, currentIdx + 3);

  const result: Array<{ text: string; isCurrent: boolean }> = [];
  for (let i = start; i < end; i++) {
    result.push({
      text: lyrics[i].text,
      isCurrent: i === currentIdx,
    });
  }
  return result;
}
