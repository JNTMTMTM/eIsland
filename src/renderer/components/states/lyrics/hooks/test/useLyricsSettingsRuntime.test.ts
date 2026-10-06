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
 * @file useLyricsSettingsRuntime.test.ts
 * @description 歌词配置 Hook 真实初始化、原生事件校验、读取失败和卸载清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { useLyricsSettings } from '../useLyricsSettings';
import { MUSIC_OUTER_GLOW_EFFECT_STORE_KEY } from '../../config/lyricsConstants';
const enabled = vi.fn<() => Promise<boolean>>();
const karaoke = vi.fn<() => Promise<boolean>>();
const clock = vi.fn<() => Promise<boolean>>();
const calibrate = vi.fn<() => Promise<boolean>>();
const delay = vi.fn<() => Promise<number>>();
const read = vi.fn<(key: string) => Promise<unknown>>();
let events: EventTarget;
let add: ReturnType<typeof vi.fn<(type: string, listener: EventListener) => void>>;
let remove: ReturnType<typeof vi.fn<(type: string, listener: EventListener) => void>>;
/** 发送原生配置事件。
 * @param type - 原生事件名称
 * @param detail - 外部事件数据
 */
function emit(type: string, detail: unknown): void {
  events.dispatchEvent(new CustomEvent(type, {
    detail
  }));
}
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  events = new EventTarget();
  add = vi.fn<(type: string, listener: EventListener) => void>((type, listener) => {
    events.addEventListener(type, listener);
  });
  remove = vi.fn<(type: string, listener: EventListener) => void>((type, listener) => {
    events.removeEventListener(type, listener);
  });
  enabled.mockResolvedValue(false);
  karaoke.mockResolvedValue(true);
  clock.mockResolvedValue(false);
  calibrate.mockResolvedValue(false);
  delay.mockResolvedValue(12);
  read.mockResolvedValue(false);
  vi.stubGlobal('window', {
    addEventListener: add,
    removeEventListener: remove,
    api: {
      musicLyricsEnabledGet: enabled,
      musicLyricsKaraokeGet: karaoke,
      musicLyricsClockGet: clock,
      musicLyricsCalibrateEnabledGet: calibrate,
      musicLyricsCalibrateDelayGet: delay,
      storeRead: read
    }
  });
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('useLyricsSettings runtime', () => {
  it('loads all independent real configuration states and forwards store key', async () => {
    expect(renderHook(useLyricsSettings)).toEqual({
      lyricsEnabled: true,
      karaokeEnabled: false,
      clockEnabled: true,
      musicOuterGlowEffectEnabled: true,
      calibrateEnabled: true,
      calibrateDelaySec: 20
    });
    flushHookEffects();
    await settleHook();
    expect(renderHook(useLyricsSettings)).toEqual({
      lyricsEnabled: false,
      karaokeEnabled: true,
      clockEnabled: false,
      musicOuterGlowEffectEnabled: false,
      calibrateEnabled: false,
      calibrateDelaySec: 12
    });
    expect(read).toHaveBeenCalledWith(MUSIC_OUTER_GLOW_EFFECT_STORE_KEY);
  });
  it('failed native reads all preserve defaults, nonboolean store result is ignored', async () => {
    [enabled, karaoke, clock, calibrate, delay].forEach((fn) => fn.mockRejectedValue(new Error('read')));
    read.mockResolvedValue('invalid');
    renderHook(useLyricsSettings);
    flushHookEffects();
    await settleHook();
    expect(renderHook(useLyricsSettings)).toEqual({
      lyricsEnabled: true,
      karaokeEnabled: false,
      clockEnabled: true,
      musicOuterGlowEffectEnabled: true,
      calibrateEnabled: true,
      calibrateDelaySec: 20
    });
  });
  it('outer-glow read rejection is contained', async () => {
    read.mockRejectedValue(new Error('store'));
    renderHook(useLyricsSettings);
    flushHookEffects();
    await settleHook();
    expect(renderHook(useLyricsSettings).musicOuterGlowEffectEnabled).toBe(true);
  });
  it.each([null, {}, {
    channel: 'other',
    value: true
  }, {
    channel: 'music:lyrics-enabled',
    value: 'true'
  }, {
    channel: 'music:lyrics-karaoke',
    value: 1
  }])('setting detail %j cannot change unrelated or invalid fields', async (detail) => {
    renderHook(useLyricsSettings);
    flushHookEffects();
    await settleHook();
    emit('island:setting-changed', detail);
    expect(renderHook(useLyricsSettings)).toMatchObject({
      lyricsEnabled: false,
      karaokeEnabled: true
    });
  });
  it('only boolean targeted setting and glow events update values, cleanup removes exact handlers', async () => {
    renderHook(useLyricsSettings);
    flushHookEffects();
    await settleHook();
    emit('island:setting-changed', {
      channel: 'music:lyrics-enabled',
      value: true
    });
    emit('island:setting-changed', {
      channel: 'music:lyrics-karaoke',
      value: false
    });
    emit('music-outer-glow-effect-changed', 'invalid');
    expect(renderHook(useLyricsSettings).musicOuterGlowEffectEnabled).toBe(false);
    emit('music-outer-glow-effect-changed', true);
    expect(renderHook(useLyricsSettings)).toMatchObject({
      lyricsEnabled: true,
      karaokeEnabled: false,
      musicOuterGlowEffectEnabled: true
    });
    const registrations = add.mock.calls.slice();
    unmountHook();
    expect(remove.mock.calls).toEqual(registrations);
    emit('music-outer-glow-effect-changed', false);
    expect(renderHook(useLyricsSettings).musicOuterGlowEffectEnabled).toBe(true);
  });
  it('late store and already queued glow callback are cancelled after unmount', async () => {
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    renderHook(useLyricsSettings);
    flushHookEffects();
    const registration = add.mock.calls.find(([type]) => type === 'music-outer-glow-effect-changed');
    expect(registration).toBeDefined();
    unmountHook();
    pending.resolve(false);
    await settleHook();
    const [, listener] = registration!;
    listener(new CustomEvent('music-outer-glow-effect-changed', {
      detail: false
    }));
    expect(renderHook(useLyricsSettings).musicOuterGlowEffectEnabled).toBe(true);
  });
});
