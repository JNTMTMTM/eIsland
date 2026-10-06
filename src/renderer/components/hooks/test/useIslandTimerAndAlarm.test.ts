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
 * @file useIslandTimerAndAlarm.test.ts
 * @description 全局计时器与闹钟真实调度、原生存储失败、重复去重和事件清理测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIslandTimerAndAlarm } from '../useIslandTimerAndAlarm';
import { ALARM_SOUND_STOP_EVENT } from '../../../utils/audio/alarmSound';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './startupHookHarness';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('./startupHookHarness');
  return createHookReactMock(actual);
});
const read = vi.fn();
const disable = vi.fn();
const notification = vi.fn();
const timerUpdate = vi.fn();
let options: Parameters<typeof useIslandTimerAndAlarm>[0];
let nativeWindow: EventTarget & { api?: { storeRead: typeof read; setAlarmEnabled: typeof disable }; requestAnimationFrame: (callback: FrameRequestCallback) => number; cancelAnimationFrame: () => void };
let frame: FrameRequestCallback | undefined;
class AudioLeaf {
  static instances: AudioLeaf[] = [];

  src: string;

  currentTime = 0;

  duration = 60;

  paused = true;

  preload = '';

  loop = false;

  volume = 1;

  onended: (() => void) | null = null;

  /** 记录原生音频创建以断言真实音源选择。
   * @param src - 生产播放函数交给原生 Audio 的资源
   */
  constructor(src: string) { this.src = src; AudioLeaf.instances.push(this); }

  /** 模拟原生播放。
   * @returns 已完成的播放 Promise
   */
  play = (): Promise<void> => { this.paused = false; return Promise.resolve(); };

  /** 模拟原生暂停。 */
  pause = (): void => { this.paused = true; };
}
/** 生成匹配当前测试时钟的原生存档数据。
 * @param extra - 用于边界场景的存档字段
 * @returns 外部存储返回的闹钟快照
 */
function alarm(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 1, hour: 8, minute: 0, second: 1, enabled: true, label: 'Wake', repeat: [], ringtone: 'alarm-1', loop: true, ...extra };
}
/** 提交真实 Hook 的订阅与调度。 */
function mount(): void { renderHook(useIslandTimerAndAlarm, options); flushHookEffects(); }
/** 前进一个真实调度周期并完成叶请求。 */
async function tick(): Promise<void> { await vi.advanceTimersByTimeAsync(1000); await settleHook(); }

beforeEach(() => {
  resetHook();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date(2026, 9, 5, 8, 0, 0));
  read.mockReset().mockImplementation((key: string) => Promise.resolve(key === 'alarms' ? [] : true));
  disable.mockReset().mockResolvedValue(true);
  notification.mockReset(); timerUpdate.mockReset();
  options = { language: 'zh-CN', timerData: { state: 'idle', remainingSeconds: 0, inputHours: '00', inputMinutes: '00', inputSeconds: '00' }, setTimerData: timerUpdate, setNotificationRef: { current: notification }, t: (key) => key };
  nativeWindow = Object.assign(new EventTarget(), {
    api: { storeRead: read, setAlarmEnabled: disable },
    requestAnimationFrame: (callback: FrameRequestCallback) => { frame = callback; return 1; },
    cancelAnimationFrame: () => { frame = undefined; },
  });
  vi.stubGlobal('window', nativeWindow);
  vi.stubGlobal('Audio', AudioLeaf);
});
afterEach(async () => {
  await settleHook();
  unmountHook();
  frame?.(performance.now() + 10000);
  frame = undefined;
  vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('countdown scheduling', () => {
  it.each([1, 2])('ticks remaining=%s and sends completion at zero', async (remainingSeconds) => {
    options.timerData = { remainingSeconds, state: 'running', inputHours: '00', inputMinutes: '00', inputSeconds: '00' };
    mount(); await tick();
    expect(timerUpdate).toHaveBeenCalledWith(remainingSeconds === 1 ? { state: 'idle', remainingSeconds: 0, inputHours: '00', inputMinutes: '00', inputSeconds: '00' } : { remainingSeconds: 1 });
    expect(notification).toHaveBeenCalledTimes(remainingSeconds === 1 ? 1 : 0);
    options.timerData = { ...options.timerData, state: 'paused' };
    mount(); await tick();
    expect(timerUpdate).toHaveBeenCalledTimes(1);
  });
  it('contains an absent timer snapshot', async () => {
    options.timerData = undefined as unknown as typeof options.timerData;
    mount(); await tick();
    expect(timerUpdate).not.toHaveBeenCalled();
  });
});

it('contains a timer snapshot whose remaining count disappears before the tick', async () => {
  options.timerData = { ...options.timerData, state: 'running', remainingSeconds: 1 };
  mount();
  options.timerData.remainingSeconds = undefined as unknown as number;
  await tick();
  expect(timerUpdate).toHaveBeenCalledWith({ state: 'idle', remainingSeconds: 0, inputHours: '00', inputMinutes: '00', inputSeconds: '00' });
  expect(notification).toHaveBeenCalledOnce();
});

describe('alarm polling', () => {
  it.each([null, {}, []])('ignores unusable alarm lists %j', async (list) => {
    read.mockResolvedValue(list); mount(); await tick();
    expect(notification).not.toHaveBeenCalled(); expect(disable).not.toHaveBeenCalled();
  });
  it.each([
    null, alarm({ enabled: false }), alarm({ hour: 7 }), alarm({ minute: 1 }), alarm({ second: 2 }), alarm({ repeat: [2] }),
  ])('skips unmatched or disabled item %j', async (item) => {
    read.mockImplementation((key: string) => Promise.resolve(key === 'alarms' ? [item] : false));
    mount(); await tick(); expect(notification).not.toHaveBeenCalled(); expect(disable).not.toHaveBeenCalled();
  });
  it.each([
    { sound: false, notice: true, repeat: null, label: '', loop: false },
    { sound: true, notice: false, repeat: [1], label: 'Wake', loop: true },
    { sound: true, notice: true, repeat: [], label: 'Wake', loop: true },
  ])('honors sound=$sound notification=$notice repeat=$repeat', async ({ sound, notice, repeat, label, loop }) => {
    read.mockImplementation((key: string) => {
      if (key === 'alarms') return Promise.resolve([alarm({ repeat, label, loop })]);
      return Promise.resolve(key === 'alarm-sound-enabled' ? sound : notice);
    });
    mount(); await tick();
    expect(notification).toHaveBeenCalledTimes(notice ? 1 : 0);
    expect(disable).toHaveBeenCalledTimes(Array.isArray(repeat) && repeat.length ? 0 : 1);
    if (sound) { expect(AudioLeaf.instances.at(-1)?.paused).toBe(false); expect(AudioLeaf.instances.at(-1)?.loop).toBe(loop); }
    nativeWindow.dispatchEvent(new Event(ALARM_SOUND_STOP_EVENT));
    frame?.(performance.now() + 10000);
    if (sound) expect(AudioLeaf.instances.at(-1)?.paused).toBe(true);
  });
  it('contains storage and per-alarm disable failures', async () => {
    read.mockImplementation((key: string) => key === 'alarms' ? Promise.resolve([alarm()]) : Promise.reject(new Error('flags unavailable')));
    disable.mockRejectedValue(new Error('disable unavailable'));
    mount(); await tick();
    expect(notification).toHaveBeenCalledOnce(); expect(disable).toHaveBeenCalledWith(1, false);
  });
  it('contains alarm-list rejection and an absent native bridge', async () => {
    read.mockRejectedValue(new Error('storage unavailable')); mount(); await tick();
    expect(notification).not.toHaveBeenCalled();
    nativeWindow.api = undefined; await tick();
    expect(notification).not.toHaveBeenCalled();
  });
  it('de-duplicates identical matching snapshots in the same second', async () => {
    read.mockImplementation((key: string) => Promise.resolve(key === 'alarms' ? [alarm({ repeat: [1] }), alarm({ repeat: [1] })] : key !== 'alarm-sound-enabled'));
    mount(); await tick(); expect(notification).toHaveBeenCalledOnce();
  });
  it('clears the bounded duplicate cache after a large batch of unique alarms', async () => {
    read.mockImplementation((key: string) => Promise.resolve(key === 'alarms' ? [...Array.from({ length: 201 }).keys()].map((id) => alarm({ id, repeat: [1] })) : key !== 'alarm-sound-enabled'));
    mount(); await tick(); expect(notification).toHaveBeenCalledTimes(201);
  });
});

it('allows the same repeating alarm to ring again on the next day', async () => {
  read.mockImplementation((key: string) => Promise.resolve(key === 'alarms' ? [alarm({ repeat: [1, 2] })] : key !== 'alarm-sound-enabled'));
  mount(); await tick(); expect(notification).toHaveBeenCalledOnce();
  vi.setSystemTime(new Date(2026, 9, 6, 8, 0, 0));
  await tick(); expect(notification).toHaveBeenCalledTimes(2);
});
