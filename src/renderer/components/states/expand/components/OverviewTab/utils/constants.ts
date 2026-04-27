import type { PomodoroPhase, Priority, Size } from './types';

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
