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
 * @file notificationSound.ts
 * @description 通知提醒音播放工具。
 * @author 鸡哥
 */

import { readEffectiveAudioVolume } from './volume';

export const NOTIFICATION_SOUND_ENABLED_STORE_KEY = 'notification-sound-enabled';

const NOTIFICATION_SOUND_SRC = '../audio/NOTIFICATION.wav';
const NOTIFICATION_SOUND_FALLBACK_SRC = '../audio/NOTIFICATION.wav';

let notificationAudio: HTMLAudioElement | null = null;

function ensureNotificationAudio(): HTMLAudioElement {
  if (!notificationAudio) {
    notificationAudio = new Audio(NOTIFICATION_SOUND_SRC);
    notificationAudio.preload = 'auto';
    notificationAudio.loop = false;
  }
  return notificationAudio;
}

/**
 * 播放一次通知提示音。
 */
export function playNotificationSoundOnce(): void {
  void (async () => {
    const enabled = await window.api?.storeRead(NOTIFICATION_SOUND_ENABLED_STORE_KEY).catch(() => true);
    if (enabled === false) return;

    const targetVolume = await readEffectiveAudioVolume('effect').catch(() => 1);
    if (targetVolume <= 0) return;

    const audio = ensureNotificationAudio();
    audio.volume = targetVolume;
    audio.loop = false;

    try {
      audio.currentTime = 0;
    } catch {
      // noop
    }

    audio.play().catch(() => {
      audio.src = NOTIFICATION_SOUND_FALLBACK_SRC;
      audio.volume = targetVolume;
      try {
        audio.currentTime = 0;
      } catch {
        // noop
      }
      void audio.play().catch(() => {});
    });
  })();
}
