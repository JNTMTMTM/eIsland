import type { LyricLine } from '../api/lrcs/types';

const META_PREFIXES = [
  '作词', '作曲', '编曲', '制作', '混音', '母带', '录音',
  'Lyrics by', 'Composed by', 'Produced by', 'Arranged by',
];

export function parseLrcTime(tag: string): number | null {
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

export function parseSyncedLrc(lrc: string): LyricLine[] {
  return lrc
    .split('\n')
    .reduce<LyricLine[]>((acc, raw) => {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('[')) return acc;
      const endIndex = trimmed.indexOf(']');
      if (endIndex === -1) return acc;
      const tag = trimmed.slice(1, endIndex);
      const text = trimmed.slice(endIndex + 1).trim();
      const timeMs = parseLrcTime(tag);
      if (timeMs !== null && text && !META_PREFIXES.some((prefix) => text.startsWith(prefix))) {
        acc.push({ time_ms: timeMs, text });
      }
      return acc;
    }, [])
    .sort((a, b) => a.time_ms - b.time_ms);
}

/**
 * 解析网易云 YRC 逐字歌词格式
 * 格式: [start_ms,duration_ms] 后跟 (word_start,word_dur,0)字 ...
 * 退化为逐行：取每行的起始时间 + 拼接所有字级文本
 */
export function parseYrc(yrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const wordTagRe = /\(\d+,\d+,\d+\)/g;

  for (const raw of yrc.split('\n')) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('[')) continue;
    const closeIdx = trimmed.indexOf(']');
    if (closeIdx === -1) continue;

    const inner = trimmed.slice(1, closeIdx);
    const commaIdx = inner.indexOf(',');
    if (commaIdx === -1) continue;

    const startMs = parseInt(inner.slice(0, commaIdx), 10);
    if (isNaN(startMs)) continue;

    const textRaw = trimmed.slice(closeIdx + 1);
    const text = textRaw.replace(wordTagRe, '').trim();
    if (text && !META_PREFIXES.some((prefix) => text.startsWith(prefix))) {
      lines.push({ time_ms: startMs, text });
    }
  }

  return lines.sort((a, b) => a.time_ms - b.time_ms);
}

/**
 * 解析汽水音乐 KRC 格式歌词
 * 格式: [start_ms,duration_ms]<word_offset,word_dur,0>字...
 * 同时兼容标准 LRC 格式，自动检测
 */
export function parseKrc(content: string): LyricLine[] {
  const isKrc = content.split('\n').some((l) => {
    const t = l.trim();
    if (!t.startsWith('[')) return false;
    const inner = t.slice(1);
    const comma = inner.indexOf(',');
    const close = inner.indexOf(']');
    if (comma === -1 || close === -1 || comma >= close) return false;
    return (
      inner.slice(0, comma).split('').every((ch) => ch >= '0' && ch <= '9') &&
      inner.slice(comma + 1, close).split('').every((ch) => ch >= '0' && ch <= '9')
    );
  });

  if (!isKrc) {
    return parseSyncedLrc(content);
  }

  const wordTagRe = /<\d+,\d+,\d+>/g;
  const lines: LyricLine[] = [];

  for (const raw of content.split('\n')) {
    const trimmed = raw.trim();
    if (!trimmed || !trimmed.startsWith('[')) continue;

    const closeIdx = trimmed.indexOf(']');
    if (closeIdx === -1) continue;

    const inner = trimmed.slice(1, closeIdx);
    const commaIdx = inner.indexOf(',');
    if (commaIdx === -1) continue;

    const startPart = inner.slice(0, commaIdx);
    const durPart = inner.slice(commaIdx + 1);

    if (
      !startPart.split('').every((ch) => ch >= '0' && ch <= '9') ||
      !durPart.split('').every((ch) => ch >= '0' && ch <= '9')
    ) {
      continue;
    }

    const startMs = parseInt(startPart, 10);
    if (isNaN(startMs)) continue;

    const textRaw = trimmed.slice(closeIdx + 1);
    const text = textRaw.replace(wordTagRe, '').trim();
    if (text) {
      lines.push({ time_ms: startMs, text });
    }
  }

  return lines.sort((a, b) => a.time_ms - b.time_ms);
}

function normalize(s: string): string {
  return s
    .replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripBrackets(s: string): string {
  return s
    .replace(/[\(（\[【〔{＜<《][^)）\]】〕}＞>》]*[)）\]】〕}＞>》]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTitle(title: string): string {
  let result = normalize(title);
  result = stripBrackets(result);
  result = result.replace(/\s*(?:feat\.?|ft\.?|prod\.?|with)\s+.*/i, '');
  result = result.replace(/\s*-\s+.*$/i, '');
  result = result.replace(/\s*(?:remix|remaster(?:ed)?|live|acoustic|instrumental|demo|radio\s*edit|explicit|clean|deluxe|bonus\s*track|original\s*mix)\s*$/i, '');
  result = result.replace(/[.\-_~·]+$/, '').trim();
  return result || normalize(title);
}

export function cleanArtist(artist: string): string {
  let result = normalize(artist);
  result = stripBrackets(result);
  result = result.replace(/\s*(?:feat\.?|ft\.?|prod\.?|with)\s+.*/i, '');
  const parts = result.split(/[/,;&×·、]|\s+x\s+/i);
  result = (parts[0] || '').trim();
  result = result.replace(/^["'""'']+|["'""'']+$/g, '');
  return result || normalize(artist);
}

export function extractSyncedFromArray(json: unknown[]): LyricLine[] | null {
  const match = json
    .map((item) => (item as Record<string, unknown>).syncedLyrics)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((synced) => parseSyncedLrc(synced))
    .find((lines) => lines.length > 0);
  return match ?? null;
}

export function extractSyncedFromObject(json: Record<string, unknown>): LyricLine[] | null {
  const synced = typeof json.syncedLyrics === 'string' ? json.syncedLyrics : null;
  if (!synced || synced.length === 0) return null;
  const lines = parseSyncedLrc(synced);
  return lines.length > 0 ? lines : null;
}
