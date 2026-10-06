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
 * @file pomodoroWidgetRuntime.test.tsx
 * @description 番茄钟真实 Zustand 状态、模块级计时、初始化与持久化失败边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { byClass, elements, find, invoke, text } from '../../../../../../test/tree';
import type { ReactElement } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import type { PomodoroSlice } from '../../../../../../../../store/types';
const leaves = vi.hoisted(() => ({
  store: null as StoreApi<PomodoroSlice> | null,
  read: vi.fn<(key: string) => Promise<unknown>>(),
  write: vi.fn<(key: string, data: unknown) => Promise<boolean>>(),
  notify: vi.fn<(data: {
    title: string;
    body: string;
    icon: string;
  }) => void>()
}));
/** 为每次模块导入提供独立的真实 Zustand slice，避免模块级订阅跨用例累积。
 * @returns 可订阅的组件边界
 */
async function storeMock() {
  const {
    createStore
  } = await import('zustand/vanilla');
  const {
    createPomodoroSlice
  } = await import('../../../../../../../../store/slices/pomodoroSlice');
  const store = createStore(createPomodoroSlice);
  leaves.store = store;
  const getState = () => ({
    ...store.getState(),
    setNotification: leaves.notify
  });
  return {
    default: Object.assign(getState, {
      getState,
      subscribe: store.subscribe
    })
  };
}
vi.mock('../../../../../../../../i18n', () => ({
  default: {
    t: (key: string) => key
  }
}));
let Component: typeof import('../PomodoroWidget').PomodoroWidget;
/** 读取真实 Zustand slice 的当前状态。
 * @returns 番茄钟状态
 */
function state(): PomodoroSlice {
  return leaves.store!.getState();
}
/** 调用真实组件及生命周期。
 * @returns 当前组件树
 */
function run(): ReactElement {
  return renderHook(Component);
}
/** 完成初始化读取。
 */
async function mount(): Promise<void> {
  run();
  flushHookEffects();
  await settleHook();
}
/** 根据真实可见按钮标题触发交互。
 * @param name - 翻译键末尾
 */
function click(name: string): void {
  invoke(find(run(), (node) => node.type === 'button' && node.props.title === `overview.pomodoro.${  name}`), 'onClick');
}
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  leaves.read.mockResolvedValue(null);
  leaves.write.mockResolvedValue(true);
  vi.stubGlobal('window', {
    api: {
      storeRead: leaves.read,
      storeWrite: leaves.write
    }
  });
  vi.doMock('../../../../../../../../store/slices', storeMock);
  Component = (await import('../PomodoroWidget')).PomodoroWidget;
});
afterEach(() => {
  state().setPomodoroRunning(false);
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('PomodoroWidget module runtime', () => {
  it('loads persisted fields with their real setters once across component remount', async () => {
    leaves.read.mockResolvedValue({
      phase: 'longBreak',
      remaining: 5,
      completedCount: 4,
      running: true
    });
    await mount();
    expect(state()).toMatchObject({
      pomodoroPhase: 'longBreak',
      pomodoroRemaining: 5,
      pomodoroCompletedCount: 4,
      pomodoroRunning: false
    });
    expect(byClass(run(), 'ov-dash-pomodoro-phase').props.style).toMatchObject({
      color: '#339af0'
    });
    expect(text(run())).toContain('00:05');
    unmountHook();
    resetHook();
    await mount();
    expect(leaves.read).toHaveBeenCalledTimes(1);
  });
  it.each([{}, {
    phase: '',
    remaining: '5',
    completedCount: null
  }, null])('ignores absent or invalid persisted fields %j', async (saved) => {
    leaves.read.mockResolvedValue(saved);
    await mount();
    expect(state()).toMatchObject({
      pomodoroPhase: 'work',
      pomodoroRemaining: 1500,
      pomodoroCompletedCount: 0
    });
    expect(elements(run()).some((node) => node.props.className === 'ov-dash-pomodoro-count-reset')).toBe(false);
  });
  it('read and write rejections are contained during real reset and phase transition', async () => {
    leaves.read.mockRejectedValue(new Error('read'));
    leaves.write.mockRejectedValue(new Error('write'));
    await mount();
    click('reset');
    click('skip');
    await settleHook();
    expect(state()).toMatchObject({
      pomodoroPhase: 'shortBreak',
      pomodoroRemaining: 300,
      pomodoroCompletedCount: 1
    });
    expect(leaves.write).toHaveBeenLastCalledWith('pomodoro-state', {
      phase: 'shortBreak',
      remaining: 300,
      running: false,
      completedCount: 1
    });
  });
  it('real timer decreases time, survives widget unmount, ignores unchanged running and clears on pause', async () => {
    await mount();
    click('start');
    expect(vi.getTimerCount()).toBe(1);
    state().setPomodoroRunning(true);
    state().setPomodoroCompletedCount(2);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(state().pomodoroRemaining).toBe(1499);
    unmountHook();
    await vi.advanceTimersByTimeAsync(1000);
    expect(state().pomodoroRemaining).toBe(1498);
    resetHook();
    click('pause');
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(2000);
    expect(state().pomodoroRemaining).toBe(1498);
  });
  it.each([['work', 0, 'shortBreak', 1, 300, 'workFinished'], ['work', 3, 'longBreak', 4, 900, 'workFinished'], ['shortBreak', 1, 'work', 1, 1500, 'breakFinished'], ['longBreak', 4, 'work', 4, 1500, 'breakFinished']] as const)('expires %s phase and persists %s completed count', async (phase, count, nextPhase, nextCount, remaining, message) => {
    await mount();
    state().setPomodoroPhase(phase);
    state().setPomodoroCompletedCount(count);
    state().setPomodoroRemaining(1);
    click('start');
    await vi.advanceTimersByTimeAsync(1000);
    expect(state()).toMatchObject({
      pomodoroRunning: false,
      pomodoroPhase: nextPhase,
      pomodoroRemaining: remaining,
      pomodoroCompletedCount: nextCount
    });
    expect(leaves.notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'notification.pomodoro.title',
      body: `notification.pomodoro.${  message}`
    }));
    expect(leaves.write).toHaveBeenCalledWith('pomodoro-state', {
      remaining,
      phase: nextPhase,
      running: false,
      completedCount: nextCount
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reset keeps completed count and reset-count resets it while stopping the active interval', async () => {
    await mount();
    state().setPomodoroPhase('shortBreak');
    state().setPomodoroCompletedCount(2);
    click('start');
    click('reset');
    expect(state()).toMatchObject({
      pomodoroPhase: 'work',
      pomodoroRemaining: 1500,
      pomodoroCompletedCount: 2,
      pomodoroRunning: false
    });
    expect(leaves.write).toHaveBeenCalledWith('pomodoro-state', {
      phase: 'work',
      remaining: 1500,
      running: false,
      completedCount: 2
    });
    invoke(byClass(run(), 'ov-dash-pomodoro-count-reset'), 'onClick');
    expect(state().pomodoroCompletedCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('skip cycles work/short/long break with real timeline and ring state', async () => {
    await mount();
    state().setPomodoroCompletedCount(3);
    click('skip');
    expect(state().pomodoroPhase).toBe('longBreak');
    click('skip');
    expect(state().pomodoroPhase).toBe('work');
    expect(text(byClass(run(), 'ov-dash-pomodoro-timeline'))).toContain('overview.pomodoro.phases.longBreak');
    click('skip');
    expect(state().pomodoroPhase).toBe('shortBreak');
    expect(byClass(run(), 'ov-dash-pomodoro-phase').props.style).toMatchObject({
      color: '#51cf66'
    });
    state().setPomodoroRemaining(150);
    expect(byClass(run(), 'ov-dash-pomodoro-ring-progress').props.style).toMatchObject({
      strokeDashoffset: 2 * Math.PI * 38 / 2
    });
  });
});
