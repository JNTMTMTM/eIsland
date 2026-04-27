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
