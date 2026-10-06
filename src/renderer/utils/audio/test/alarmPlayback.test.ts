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
 * @file alarmPlayback.test.ts
 * @description 闹钟播放、预览切换、恢复、音量渐变、停止、拒绝和状态订阅行为测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class AudioFixture {
  static instances: AudioFixture[] = [];

  src: string;

  preload = '';

  loop = false;

  volume = 1;

  duration = 100;

  paused = true;

  onended: (() => void) | null = null;

  seekThrows = false;

  position = 0;

  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });

  pause = vi.fn(() => {
    this.paused = true;
  });

  /**
   * 记录浏览器创建的音频地址。
   * @param src - 真实播放模块交给 Audio 的资源 URL。
   */
  constructor(src: string) {
    this.src = src;
    AudioFixture.instances.push(this);
  }

  get currentTime(): number {
    return this.position;
  }

  set currentTime(value: number) {
    if (this.seekThrows) {
      throw new Error('seek unavailable');
    }
    this.position = value;
  }
}

let alarm: typeof import('../alarmSound');
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const read = vi.fn<(key: string) => Promise<unknown>>();
const request = vi.fn((callback: FrameRequestCallback) => {
  frameId += 1;
  frames.set(frameId, callback);
  return frameId;
});
const cancel = vi.fn((id: number) => {
  frames.delete(id);
});

/**
 * 执行一帧真实渐变回调。
 * @param now - 从播放开始累计的毫秒数。
 */
function frame(now: number): void {
  const next = frames.entries().next().value;
  expect(next).toBeDefined();
  const [id, callback] = next!;
  frames.delete(id);
  callback(now);
}

/** 等待音频 Promise 和并行音量读取完成。 */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(async () => {
  vi.resetModules();
  AudioFixture.instances = [];
  frames.clear();
  frameId = 0;
  read.mockReset().mockImplementation((key) => Promise.resolve(key === 'sound-volume-global' ? 0.8 : 0.5));
  vi.stubGlobal('Audio', AudioFixture);
  vi.stubGlobal('window', { requestAnimationFrame: request, cancelAnimationFrame: cancel, api: { storeRead: read } });
  vi.spyOn(performance, 'now').mockReturnValue(0);
  alarm = await import('../alarmSound');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('alarm playback and fades', () => {
  it('stopping an alarm while volume is loading still completes the stop', async () => {
    let resolveVolume!: (value: number) => void;
    const volume = new Promise<number>((resolve) => {
      resolveVolume = resolve;
    });
    read.mockReturnValue(volume);
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: false });
    await flush();
    const [audio] = AudioFixture.instances;
    alarm.stopAlarmSound();
    resolveVolume(1);
    await flush();
    frame(1800);
    expect(audio.paused).toBe(true);
  });
  it('stops safely before any audio exists', () => {
    alarm.stopAlarmSound();
    alarm.stopPreviewAlarmSound();
    expect(request).not.toHaveBeenCalled();
  });
  it('plays a looping alarm, multiplies effective volumes and fades out before pausing', async () => {
    const listener = vi.fn();
    const unsubscribe = alarm.subscribePreviewAlarmSoundState(listener);
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_2, loop: true });
    const [audio] = AudioFixture.instances;
    expect(audio).toMatchObject({ src: '../audio/ALARM/ALARM_2.wav', preload: 'auto', loop: true, currentTime: 0, volume: 0 });
    await flush();
    frame(900);
    expect(audio.volume).toBeCloseTo(0.2);
    frame(1800);
    expect(audio.volume).toBeCloseTo(0.4);
    audio.onended?.();
    alarm.stopPreviewAlarmSound();
    expect(audio.pause).not.toHaveBeenCalled();
    alarm.stopAlarmSound();
    frame(260);
    expect(audio.volume).toBeCloseTo(0.2);
    frame(520);
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0);
    expect(listener).toHaveBeenLastCalledWith({ playing: false, ringtone: alarm.SystemAlarmRingtone.ALARM_2 });
    unsubscribe();
  });
  it('reuses the same ringtone, pauses replaced audio and cancels a pending fade', async () => {
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: false });
    await flush();
    const [original] = AudioFixture.instances;
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: true });
    await flush();
    expect(AudioFixture.instances).toHaveLength(1);
    expect(cancel).toHaveBeenCalled();
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_3, loop: false });
    await flush();
    expect(original.pause).toHaveBeenCalledOnce();
    expect(AudioFixture.instances[1].src).toBe('../audio/ALARM/ALARM_NAILONG_3.mp3');
  });
  it('uses the default asset for a runtime unknown ringtone', async () => {
    alarm.playAlarmSound({ ringtone: 'unknown' as typeof alarm.SystemAlarmRingtone.ALARM_1, loop: false });
    await flush();
    expect(AudioFixture.instances[0].src).toBe('../audio/ALARM/ALARM_1.wav');
  });
  it('handles seek and volume storage failures during alarm playback/stop', async () => {
    read.mockRejectedValue(new Error('offline'));
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: false });
    await flush();
    const [audio] = AudioFixture.instances;
    audio.seekThrows = true;
    expect(() => alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: false })).not.toThrow();
    await flush();
    frame(1800);
    expect(audio.volume).toBe(1);
    alarm.stopAlarmSound();
    expect(() => frame(520)).not.toThrow();
    expect(audio.pause).toHaveBeenCalledOnce();
  });
  it('absorbs playback rejection without scheduling an alarm fade', async () => {
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: false });
    await flush();
    frame(1800);
    const [audio] = AudioFixture.instances;
    audio.play.mockRejectedValueOnce(new Error('autoplay blocked'));
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: false });
    await flush();
    expect(frames.size).toBe(0);
  });
});

describe('alarm previews and subscriptions', () => {
  it.each(['alarm', 'preview'])('does not let stale %s volume replace a newer ringtone fade', async (mode) => {
    let resolveVolume!: (value: number) => void;
    const volume = new Promise<number>((resolve) => { resolveVolume = resolve; });
    read.mockReturnValue(volume);
    if (mode === 'alarm') alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: false });
    else alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    read.mockImplementation((key) => Promise.resolve(key === 'sound-volume-global' ? 0.8 : 0.5));
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_2, loop: true });
    await flush();
    const currentFrame = frames.keys().next().value;
    resolveVolume(1); await flush();
    expect(frames.keys().next().value).toBe(currentFrame);
    frame(1800);
    expect(AudioFixture.instances[1].volume).toBeCloseTo(0.4);
    expect(AudioFixture.instances[0].paused).toBe(true);
  });
  it.each(['stop', 'toggle'])('does not restart a preview fade after %s while volume is loading', async (action) => {
    let resolveVolume!: (value: number) => void;
    read.mockReturnValue(new Promise<number>((resolve) => { resolveVolume = resolve; }));
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1); await flush();
    if (action === 'stop') alarm.stopPreviewAlarmSound();
    else alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    resolveVolume(1); await flush();
    expect(frames.size).toBe(0);
    expect(AudioFixture.instances[0].paused).toBe(true);
  });
  it('does not let rejected old preview playback mark a newer preview idle', async () => {
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1); await flush(); frame(240);
    alarm.stopPreviewAlarmSound();
    let rejectPlay!: (error: Error) => void;
    AudioFixture.instances[0].play.mockReturnValueOnce(new Promise<void>((resolve, reject) => { rejectPlay = reject; void resolve; }));
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_2); await flush();
    const listener = vi.fn(); alarm.subscribePreviewAlarmSoundState(listener);
    rejectPlay(new Error('old playback aborted')); await flush();
    expect(listener).toHaveBeenLastCalledWith({ playing: true, ringtone: alarm.SystemAlarmRingtone.ALARM_2 });
  });
  it('defaults volume when the bridge throws synchronously for alarms and previews', async () => {
    read.mockImplementation(() => {
      throw new Error('bridge unavailable');
    });
    alarm.playAlarmSound({ ringtone: alarm.SystemAlarmRingtone.ALARM_1, loop: false });
    await flush();
    frame(1800);
    expect(AudioFixture.instances[0].volume).toBe(1);
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_2);
    await flush();
    frame(240);
    expect(AudioFixture.instances[1].volume).toBe(1);
  });
  it('previews once, toggles pause and resumes at the saved position without fading', async () => {
    const listener = vi.fn();
    const unsubscribe = alarm.subscribePreviewAlarmSoundState(listener);
    expect(listener).toHaveBeenCalledExactlyOnceWith({ playing: false, ringtone: null });
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    const [audio] = AudioFixture.instances;
    frame(120);
    expect(audio.volume).toBeCloseTo(0.2);
    frame(240);
    audio.position = 10;
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(10);
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    expect(audio.currentTime).toBe(10);
    expect(audio.volume).toBeCloseTo(0.4);
    expect(frames.size).toBe(0);
    expect(listener).toHaveBeenLastCalledWith({ playing: true, ringtone: alarm.SystemAlarmRingtone.ALARM_1 });
    unsubscribe();
    const calls = listener.mock.calls.length;
    alarm.stopPreviewAlarmSound();
    expect(listener).toHaveBeenCalledTimes(calls);
    expect(audio).toMatchObject({ paused: true, currentTime: 0 });
  });
  it('ended previews become idle and stopped previews cancel their frame', async () => {
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_2);
    await flush();
    const [audio] = AudioFixture.instances;
    alarm.stopPreviewAlarmSound();
    expect(frames.size).toBe(0);
    audio.onended?.();
    const listener = vi.fn();
    alarm.subscribePreviewAlarmSoundState(listener);
    expect(listener).toHaveBeenLastCalledWith({ playing: false, ringtone: alarm.SystemAlarmRingtone.ALARM_2 });
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_2);
    await flush();
    audio.onended?.();
    expect(listener).toHaveBeenLastCalledWith({ playing: false, ringtone: alarm.SystemAlarmRingtone.ALARM_2 });
  });
  it.each([0, 100, 101])('restarts non-resumable preview position %s', async (position) => {
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    frame(240);
    const [audio] = AudioFixture.instances;
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    audio.position = position;
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    expect(audio.currentTime).toBe(0);
    frame(240);
    expect(audio.volume).toBeCloseTo(0.4);
  });
  it('replaces preview ringtones and starts a paused same preview again', async () => {
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    const [first] = AudioFixture.instances;
    first.paused = true;
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    expect(first.play).toHaveBeenCalledTimes(2);
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_3);
    await flush();
    expect(first.pause).toHaveBeenCalledOnce();
    expect(AudioFixture.instances[1].loop).toBe(false);
  });
  it('absorbs preview play/seek errors and notifies idle after rejected play', async () => {
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    const [audio] = AudioFixture.instances;
    alarm.stopPreviewAlarmSound();
    audio.seekThrows = true;
    audio.position = 0;
    audio.play.mockRejectedValueOnce(new Error('autoplay blocked'));
    const listener = vi.fn();
    alarm.subscribePreviewAlarmSoundState(listener);
    expect(() => alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1)).not.toThrow();
    await flush();
    expect(listener).toHaveBeenLastCalledWith({ playing: false, ringtone: alarm.SystemAlarmRingtone.ALARM_1 });
    audio.play.mockResolvedValueOnce(undefined);
    alarm.previewAlarmSound(alarm.SystemAlarmRingtone.ALARM_1);
    await flush();
    expect(() => alarm.stopPreviewAlarmSound()).not.toThrow();
  });
});
