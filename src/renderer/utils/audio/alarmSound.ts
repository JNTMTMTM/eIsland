/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file alarmSound.ts
 * @description 闹钟系统铃声枚举与播放控制工具。
 * @author 鸡哥
 */

import { readEffectiveAudioVolume } from './volume';

export enum SystemAlarmRingtone {
  ALARM_1 = 'alarm-1',
  ALARM_2 = 'alarm-2',
  ALARM_3 = 'alarm-3',
}

export interface SystemAlarmRingtoneOption {
  value: SystemAlarmRingtone;
  src: string;
  labelKey: string;
  defaultLabel: string;
}

export const DEFAULT_SYSTEM_ALARM_RINGTONE = SystemAlarmRingtone.ALARM_1;
export const ALARM_SOUND_STOP_EVENT = 'alarm-sound-stop';

export const SYSTEM_ALARM_RINGTONE_OPTIONS: SystemAlarmRingtoneOption[] = [
  {
    value: SystemAlarmRingtone.ALARM_1,
    src: '../audio/ALARM/ALARM_1.wav',
    labelKey: 'maxExpand.alarm.ringtones.alarm1',
    defaultLabel: '系统铃声 1',
  },
  {
    value: SystemAlarmRingtone.ALARM_2,
    src: '../audio/ALARM/ALARM_2.wav',
    labelKey: 'maxExpand.alarm.ringtones.alarm2',
    defaultLabel: '系统铃声 2',
  },
  {
    value: SystemAlarmRingtone.ALARM_3,
    src: '../audio/ALARM/ALARM_NAILONG_3.mp3',
    labelKey: 'maxExpand.alarm.ringtones.alarm3',
    defaultLabel: '奶蛙捧腹大笑',
  },
];

const RINGTONE_SRC_MAP = new Map<SystemAlarmRingtone, string>(
  SYSTEM_ALARM_RINGTONE_OPTIONS.map((item) => [item.value, item.src]),
);

const FADE_IN_DURATION_MS = 1800;
const FADE_OUT_DURATION_MS = 520;
const PREVIEW_FADE_IN_DURATION_MS = 240;

let activeAudio: HTMLAudioElement | null = null;
let activeRingtone: SystemAlarmRingtone | null = null;
let fadeAnimationFrameId: number | null = null;
let playbackMode: 'idle' | 'preview' | 'alarm' = 'idle';
const previewStateListeners = new Set<(state: { playing: boolean; ringtone: SystemAlarmRingtone | null }) => void>();

function notifyPreviewState(): void {
  const state = {
    playing: playbackMode === 'preview',
    ringtone: activeRingtone,
  };
  previewStateListeners.forEach((listener) => listener(state));
}

function setPlaybackMode(mode: 'idle' | 'preview' | 'alarm'): void {
  playbackMode = mode;
  notifyPreviewState();
}

function bindAudioEvents(audio: HTMLAudioElement): void {
  audio.onended = () => {
    if (playbackMode !== 'preview') return;
    setPlaybackMode('idle');
  };
}

function cancelFadeAnimation(): void {
  if (fadeAnimationFrameId === null) return;
  window.cancelAnimationFrame(fadeAnimationFrameId);
  fadeAnimationFrameId = null;
}

function getRingtoneSrc(ringtone: SystemAlarmRingtone): string {
  return RINGTONE_SRC_MAP.get(ringtone) || RINGTONE_SRC_MAP.get(DEFAULT_SYSTEM_ALARM_RINGTONE) || '../audio/ALARM/ALARM_1.wav';
}

function ensureAudio(ringtone: SystemAlarmRingtone): HTMLAudioElement {
  const src = getRingtoneSrc(ringtone);
  if (!activeAudio || activeRingtone !== ringtone) {
    if (activeAudio) {
      activeAudio.pause();
    }
    activeAudio = new Audio(src);
    activeAudio.preload = 'auto';
    bindAudioEvents(activeAudio);
    activeRingtone = ringtone;
  }
  return activeAudio;
}

function fadeVolume(from: number, to: number, durationMs: number, onDone?: () => void): void {
  cancelFadeAnimation();
  const audio = activeAudio;
  if (!audio || durationMs <= 0) {
    if (audio) audio.volume = to;
    onDone?.();
    return;
  }

  const startAt = performance.now();
  const step = (now: number): void => {
    const elapsed = now - startAt;
    const ratio = Math.max(0, Math.min(1, elapsed / durationMs));
    if (activeAudio) {
      activeAudio.volume = from + (to - from) * ratio;
    }
    if (ratio >= 1) {
      fadeAnimationFrameId = null;
      onDone?.();
      return;
    }
    fadeAnimationFrameId = window.requestAnimationFrame(step);
  };
  fadeAnimationFrameId = window.requestAnimationFrame(step);
}

/**
 * 标准化系统闹钟铃声值。
 * @param value - 任意来源的铃声值。
 * @returns 合法的系统闹钟铃声枚举。
 */
export function normalizeSystemAlarmRingtone(value: unknown): SystemAlarmRingtone {
  if (value === SystemAlarmRingtone.ALARM_1 || value === SystemAlarmRingtone.ALARM_2 || value === SystemAlarmRingtone.ALARM_3) {
    return value;
  }
  return DEFAULT_SYSTEM_ALARM_RINGTONE;
}

/**
 * 播放闹钟铃声。
 * @param options - 闹钟播放配置。
 */
export function playAlarmSound(options: { ringtone: SystemAlarmRingtone; loop: boolean }): void {
  const audio = ensureAudio(options.ringtone);
  setPlaybackMode('alarm');
  cancelFadeAnimation();
  audio.loop = options.loop;
  audio.volume = 0;
  try {
    audio.currentTime = 0;
  } catch {
    // noop
  }
  audio.play().then(async () => {
    const targetVolume = await readEffectiveAudioVolume('alarm').catch(() => 1);
    fadeVolume(0, targetVolume, FADE_IN_DURATION_MS);
  }).catch(() => {});
}

/**
 * 预览指定铃声，再次触发同一铃声可暂停预览。
 * @param ringtone - 需要预览的铃声。
 */
export function previewAlarmSound(ringtone: SystemAlarmRingtone): void {
  const normalizedRingtone = normalizeSystemAlarmRingtone(ringtone);
  const isSamePreviewPlaying = playbackMode === 'preview'
    && activeAudio
    && activeRingtone === normalizedRingtone
    && !activeAudio.paused;

  if (isSamePreviewPlaying && activeAudio) {
    cancelFadeAnimation();
    activeAudio.pause();
    setPlaybackMode('idle');
    return;
  }

  const audio = ensureAudio(normalizedRingtone);
  const canResume = playbackMode === 'idle'
    && activeRingtone === normalizedRingtone
    && Number.isFinite(audio.currentTime)
    && audio.currentTime > 0
    && audio.currentTime < audio.duration;

  setPlaybackMode('preview');
  cancelFadeAnimation();
  audio.loop = false;
  if (!canResume) {
    audio.volume = 0;
    try {
      audio.currentTime = 0;
    } catch {
      // noop
    }
  }

  audio.play().then(() => {
    const applyPreviewVolume = async (): Promise<void> => {
      const targetVolume = await readEffectiveAudioVolume('alarm').catch(() => 1);
      if (canResume) {
        audio.volume = targetVolume;
        notifyPreviewState();
        return;
      }
      fadeVolume(0, targetVolume, PREVIEW_FADE_IN_DURATION_MS);
    };

    void applyPreviewVolume();
  }).catch(() => {
    setPlaybackMode('idle');
  });
}

/**
 * 停止铃声预览播放。
 */
export function stopPreviewAlarmSound(): void {
  if (!activeAudio || playbackMode !== 'preview') return;
  cancelFadeAnimation();
  activeAudio.pause();
  try {
    activeAudio.currentTime = 0;
  } catch {
    // noop
  }
  setPlaybackMode('idle');
}

/**
 * 停止闹钟铃声播放。
 */
export function stopAlarmSound(): void {
  if (!activeAudio) return;
  const audio = activeAudio;
  const from = Number.isFinite(audio.volume) ? audio.volume : 1;
  fadeVolume(from, 0, FADE_OUT_DURATION_MS, () => {
    if (!activeAudio) return;
    activeAudio.pause();
    try {
      activeAudio.currentTime = 0;
    } catch {
      // noop
    }
    setPlaybackMode('idle');
  });
}

/**
 * 订阅铃声预览状态变化。
 * @param listener - 预览状态监听器。
 * @returns 取消订阅函数。
 */
export function subscribePreviewAlarmSoundState(
  listener: (state: { playing: boolean; ringtone: SystemAlarmRingtone | null }) => void,
): () => void {
  previewStateListeners.add(listener);
  listener({
    playing: playbackMode === 'preview',
    ringtone: activeRingtone,
  });
  return () => {
    previewStateListeners.delete(listener);
  };
}
