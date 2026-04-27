export type Priority = 'P0' | 'P1' | 'P2';
export type Size = 'S' | 'M' | 'L' | 'XL';

export interface TodoSubItem {
  id: number;
  text: string;
  done: boolean;
  priority?: Priority;
  size?: Size;
}

export interface TodoItem {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
  priority?: Priority;
  size?: Size;
  description?: string;
  subTodos?: TodoSubItem[];
}

export interface AppShortcut {
  id: number;
  name: string;
  path: string;
  iconBase64: string | null;
}

export interface CountdownDateItem {
  id: number;
  name: string;
  date: string;
  color: string;
  type: string;
  description?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
}

export interface UrlFavoriteItem {
  id: number;
  url: string;
  title: string;
  note: string;
  createdAt: number;
}

export interface OverviewAlbumItem {
  id: number;
  path: string;
  name: string;
  ext: string;
  mediaType: 'image' | 'video';
  addedAt: number;
}

export type AlbumOrderMode = 'sequential' | 'random';
export type AlbumMediaFilter = 'all' | 'image' | 'video';
export type AlbumCardClickBehavior = 'open-album' | 'none';

export interface OverviewAlbumCardConfig {
  intervalMs: number;
  autoRotate: boolean;
  orderMode: AlbumOrderMode;
  mediaFilter: AlbumMediaFilter;
  clickBehavior: AlbumCardClickBehavior;
  videoAutoPlay: boolean;
  videoMuted: boolean;
}

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroData {
  phase: PomodoroPhase;
  remaining: number;
  running: boolean;
  completedCount: number;
}

export const PRIORITIES: { value: Priority; color: string }[] = [
  { value: 'P0', color: '#ff5252' },
  { value: 'P1', color: '#ffab40' },
  { value: 'P2', color: '#69c0ff' },
];

export const SIZES: { value: Size; color: string }[] = [
  { value: 'S', color: '#81c784' },
  { value: 'M', color: '#64b5f6' },
  { value: 'L', color: '#ffb74d' },
  { value: 'XL', color: '#e57373' },
];

export const STORE_KEY = 'todos';
export const APPS_STORE_KEY = 'app-shortcuts';
export const URL_FAVORITES_STORE_KEY = 'url-favorites';
export const PHOTO_ALBUM_STORE_KEY = 'photo-album-items';
export const OVERVIEW_ALBUM_CONFIG_STORE_KEY = 'overview-album-config';
export const STANDALONE_WINDOW_MODE_STORE_KEY = 'standalone-window-mode';
export const LEGACY_COUNTDOWN_WINDOW_MODE_STORE_KEY = 'countdown-window-mode';
export const STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY = 'standalone-window-active-tab';

export const MOKUGYO_AUDIO_SRC = './audio/Mokugyo.wav';
export const MOKUGYO_HIT_ANIMATION_MS = 220;
export const MOKUGYO_FLOAT_DURATION_MS = 900;
export const OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS = 680;
export const POMODORO_STORE_KEY = 'pomodoro-state';

export const CD_TYPE_LABELS: Record<string, string> = {
  countdown: '倒数日',
  anniversary: '纪念日',
  birthday: '生日',
  holiday: '节日',
  exam: '考试',
};

export const POMODORO_DURATIONS: Record<PomodoroPhase, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const POMODORO_LABELS: Record<PomodoroPhase, string> = {
  work: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
};

export function normalizeOverviewAlbumItems(data: unknown): OverviewAlbumItem[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: OverviewAlbumItem[] = [];
  data.forEach((entry) => {
    const row = entry as Partial<OverviewAlbumItem> | null;
    if (!row || typeof row.path !== 'string') return;
    const path = row.path.trim();
    if (!path) return;
    const lowerPath = path.toLowerCase();
    if (seen.has(lowerPath)) return;
    seen.add(lowerPath);
    const mediaType = row.mediaType === 'video' ? 'video' : 'image';
    const ext = typeof row.ext === 'string' ? row.ext.toLowerCase() : '';
    const sepIdx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
    const fallbackName = sepIdx >= 0 ? path.slice(sepIdx + 1) : path;
    const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : fallbackName;
    const addedAt = typeof row.addedAt === 'number' && Number.isFinite(row.addedAt) ? row.addedAt : Date.now();
    const id = typeof row.id === 'number' && Number.isFinite(row.id) ? row.id : addedAt;
    result.push({ id, path, name, ext, mediaType, addedAt });
  });
  return result;
}

export function normalizeOverviewAlbumCardConfig(data: unknown): OverviewAlbumCardConfig {
  const row = (data ?? {}) as Partial<OverviewAlbumCardConfig>;
  const intervalMs = row.intervalMs === 3000 || row.intervalMs === 5000 || row.intervalMs === 8000
    ? row.intervalMs
    : 5000;
  const orderMode = row.orderMode === 'random' ? 'random' : 'sequential';
  const mediaFilter = row.mediaFilter === 'image' || row.mediaFilter === 'video' ? row.mediaFilter : 'all';
  const clickBehavior = row.clickBehavior === 'none' ? 'none' : 'open-album';

  return {
    intervalMs,
    autoRotate: row.autoRotate !== false,
    orderMode,
    mediaFilter,
    clickBehavior,
    videoAutoPlay: row.videoAutoPlay !== false,
    videoMuted: row.videoMuted !== false,
  };
}

export function getOverviewVideoMimeByExt(ext: string): string {
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'avi') return 'video/x-msvideo';
  if (ext === 'mkv') return 'video/x-matroska';
  return 'video/mp4';
}

export function cdDiffDays(targetStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${targetStr}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function advancePomodoroPhase(
  phase: PomodoroPhase,
  count: number,
): { nextPhase: PomodoroPhase; nextCount: number } {
  if (phase === 'work') {
    const nextCount = count + 1;
    const nextPhase: PomodoroPhase = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    return { nextPhase, nextCount };
  }
  return { nextPhase: 'work', nextCount: count };
}

export function getPomodoroTimeline(
  phase: PomodoroPhase,
  count: number,
): { prev: PomodoroPhase | null; next: PomodoroPhase } {
  if (phase === 'work') {
    const prev: PomodoroPhase | null = count === 0 ? null : count % 4 === 0 ? 'longBreak' : 'shortBreak';
    const nextCount = count + 1;
    const next: PomodoroPhase = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    return { prev, next };
  }
  return { prev: 'work', next: 'work' };
}

export function fmtPomodoroTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
