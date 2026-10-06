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
 * @file notificationSound.test.ts
 * @description 通知提示音启用开关、有效音量、音频复用、重置及双次播放失败边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let seekFails = false;
let playFailures = 0;
class AudioFixture {
  static instances: AudioFixture[] = [];

  src: string;

  preload = '';

  loop = true;

  volume = 0;

  positions: number[] = [];

  play = vi.fn(() => {
    if (playFailures > 0) {
      playFailures -= 1;
      return Promise.reject(new Error('play failed'));
    }
    return Promise.resolve();
  });

  /**
   * 记录真实通知模块请求的音频资源。
   * @param src - Audio 构造器收到的资源路径。
   */
  constructor(src: string) {
    this.src = src;
    AudioFixture.instances.push(this);
  }

  set currentTime(value: number) {
    this.positions.push(value);
    if (seekFails) {
      throw new Error('seek unavailable');
    }
  }
}

const read = vi.fn<(key: string) => Promise<unknown>>();
let sound: typeof import('../notificationSound');

/** 等待真实音量读取链和音频播放 Promise 队列完成。 */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

beforeEach(async () => {
  vi.resetModules();
  AudioFixture.instances = [];
  seekFails = false;
  playFailures = 0;
  read.mockReset().mockImplementation((key) => Promise.resolve(key === 'notification-sound-enabled' ? true : 0.5));
  vi.stubGlobal('window', { api: { storeRead: read } });
  vi.stubGlobal('Audio', AudioFixture);
  sound = await import('../notificationSound');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('notification audio playback', () => {
  it('plays once with multiplied effective volume and reuses the audio object', async () => {
    sound.playNotificationSoundOnce();
    await flush();
    sound.playNotificationSoundOnce();
    await flush();
    expect(AudioFixture.instances).toHaveLength(1);
    const [audio] = AudioFixture.instances;
    expect(audio).toMatchObject({ src: '../audio/NOTIFICATION.wav', preload: 'auto', loop: false, volume: 0.25 });
    expect(audio.positions).toEqual([0, 0]);
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledWith('sound-volume-effect');
  });
  it('does not allocate audio when notifications are explicitly disabled', async () => {
    read.mockResolvedValue(false);
    sound.playNotificationSoundOnce();
    await flush();
    expect(AudioFixture.instances).toEqual([]);
    expect(read).toHaveBeenCalledExactlyOnceWith('notification-sound-enabled');
  });
  it('does not allocate audio when effective volume is zero', async () => {
    read.mockImplementation((key) => Promise.resolve(key === 'notification-sound-enabled' ? true : 0));
    sound.playNotificationSoundOnce();
    await flush();
    expect(AudioFixture.instances).toEqual([]);
  });
  it('defaults enabled and volume when storage requests reject', async () => {
    read.mockRejectedValue(new Error('offline'));
    sound.playNotificationSoundOnce();
    await flush();
    expect(AudioFixture.instances[0].volume).toBe(1);
  });
  it('defaults volume when the volume API throws synchronously', async () => {
    read.mockImplementation((key) => {
      if (key === 'notification-sound-enabled') {
        return Promise.resolve(true);
      }
      throw new Error('bridge unavailable');
    });
    sound.playNotificationSoundOnce();
    await flush();
    expect(AudioFixture.instances[0].volume).toBe(1);
  });
  it('defaults enabled/volume if the bridge is absent', async () => {
    vi.stubGlobal('window', {});
    sound.playNotificationSoundOnce();
    await flush();
    expect(AudioFixture.instances[0].volume).toBe(1);
  });
  it.each([false, true])('retries once and absorbs reset/fallback failures seek=%s', async (fails) => {
    seekFails = fails;
    playFailures = 2;
    sound.playNotificationSoundOnce();
    await flush();
    const [audio] = AudioFixture.instances;
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.positions).toEqual([0, 0]);
    expect(audio.src).toBe('../audio/NOTIFICATION.wav');
    expect(audio.volume).toBe(0.25);
  });
});
