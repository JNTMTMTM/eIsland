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
 * @file useIdleRuntime.test.ts
 * @description 真实空闲状态、待办轮询、媒体暂停截止及光效设置清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createMediaSlice } from '../../../../../store/slices/mediaSlice';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../hooks/test/startupHookHarness';
import type { MediaSlice } from '../../../../../store/types';
import type { IdleContentProps } from '../../config/idleConfig';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const {
    createHookReactMock
  } = await import('../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
let hook: typeof import('../useIdle');
let store: ReturnType<ReturnType<typeof createStore<MediaSlice>>>;
let browser: EventTarget;
let todoJSON: string | null;
const read = vi.fn<(key: string) => Promise<unknown>>();
const props: IdleContentProps = {
  timeStr: '12:30',
  dayStr: 'Monday',
  weather: {
    temperature: 25,
    description: 'sunny'
  },
  timerState: 'idle',
  remainingSeconds: 3661,
  pomodoroRunning: false,
  pomodoroRemaining: 125
};
/** 执行真实空闲 Hook。
 * @param patch - 展示参数
 * @returns Hook 返回状态
 */
function run(patch: Partial<IdleContentProps> = {}) {
  return renderHook(hook.useIdle, {
    ...props,
    ...patch
  });
}
/** 执行完整挂载效果。
 * @returns 当前状态
 */
async function mount() {
  run();
  flushHookEffects();
  await settleHook();
  return run();
}
/** 模拟原生窗口事件携带的设置载荷。
 * @param detail - 设置值
 */
function emit(detail: unknown): void {
  const event = new Event('music-outer-glow-effect-changed');
  Object.defineProperty(event, 'detail', {
    value: detail
  });
  browser.dispatchEvent(event);
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  store = createStore<MediaSlice>()(createMediaSlice);
  browser = new EventTarget();
  todoJSON = '[]';
  read.mockResolvedValue(true);
  vi.stubGlobal('window', Object.assign(browser, {
    api: {
      storeRead: read
    }
  }));
  vi.stubGlobal('localStorage', {
    getItem: () => todoJSON
  });
  vi.doMock('../../../../../store/slices', () => ({
    default: () => store.getState()
  }));
  hook = await import('../useIdle');
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('useIdle true state and native lifecycle', () => {
  it.each(['idle', 'running', 'paused'] as const)('timer %s derives time, real formatting and media color', async (timerState) => {
    store.setState({
      dominantColor: [12, 34, 56],
      coverImage: 'cover',
      isMusicPlaying: true,
      isPlaying: true
    });
    run({
      timerState,
      pomodoroRunning: true
    });
    flushHookEffects();
    await settleHook();
    const state = run({
      timerState,
      pomodoroRunning: true
    });
    expect(state).toMatchObject({
      timeStr: '12:30',
      h: 1,
      m: 1,
      s: 1,
      pomodoroM: 2,
      pomodoroS: 5,
      r: 12,
      g: 34,
      b: 56,
      coverImage: 'cover',
      isPomodoroActive: true,
      isTimerActive: timerState !== 'idle'
    });
    expect(state.padZero(3)).toBe('03');
    expect(state.padZero(12)).toBe('12');
  });
  it('missing persisted todos default to empty actual array', async () => {
    todoJSON = null;
    expect((await mount()).p0Count).toBe(0);
  });
  it('polls real persisted priority counts every two seconds then cancels interval', async () => {
    todoJSON = JSON.stringify([{
      done: false,
      priority: 'P0'
    }, {
      done: true,
      priority: 'P0'
    }, {
      done: false,
      priority: 'P1'
    }]);
    expect((await mount()).p0Count).toBe(1);
    todoJSON = JSON.stringify([{
      done: false,
      priority: 'P0'
    }, {
      done: false,
      priority: 'P0'
    }]);
    await vi.advanceTimersByTimeAsync(1999);
    expect(run().p0Count).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run().p0Count).toBe(2);
    todoJSON = '{bad';
    await vi.advanceTimersByTimeAsync(2000);
    expect(run().p0Count).toBe(0);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([false, true, 'malformed'] as const)('native initial glow %s accepts only boolean and event values', async (value) => {
    read.mockResolvedValue(value);
    expect((await mount()).musicOuterGlowEffectEnabled).toBe(value !== false);
    emit(false);
    expect(run().musicOuterGlowEffectEnabled).toBe(false);
    emit('invalid');
    expect(run().musicOuterGlowEffectEnabled).toBe(false);
    emit(true);
    expect(run().musicOuterGlowEffectEnabled).toBe(true);
    unmountHook();
    emit(false);
    expect(run().musicOuterGlowEffectEnabled).toBe(true);
  });
  it('setting rejection preserves default and late read cannot update unmounted hook', async () => {
    read.mockRejectedValue(new Error('bridge'));
    expect((await mount()).musicOuterGlowEffectEnabled).toBe(true);
    unmountHook();
    resetHook();
    const pending = deferred<unknown>();
    read.mockReturnValue(pending.promise);
    run();
    flushHookEffects();
    unmountHook();
    pending.resolve(false);
    await settleHook();
    expect(run().musicOuterGlowEffectEnabled).toBe(true);
  });
  it('paused media reaches ten minute deadline through real store clearing action', async () => {
    store.setState({
      isMusicPlaying: true,
      isPlaying: false,
      coverImage: 'cover'
    });
    await mount();
    await vi.advanceTimersByTimeAsync(599999);
    expect(store.getState().isMusicPlaying).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(store.getState()).toMatchObject({
      isMusicPlaying: false,
      isPlaying: false,
      coverImage: null
    });
  });
  it('resume cancels pause deadline and later unmount removes both media timer and poll', async () => {
    store.setState({
      isMusicPlaying: true,
      isPlaying: false
    });
    await mount();
    await vi.advanceTimersByTimeAsync(1000);
    store.setState({
      isPlaying: true
    });
    run();
    flushHookEffects();
    await vi.advanceTimersByTimeAsync(600000);
    expect(store.getState().isMusicPlaying).toBe(true);
    store.setState({
      isPlaying: false
    });
    run();
    flushHookEffects();
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(600000);
    expect(store.getState().isMusicPlaying).toBe(true);
  });
});
