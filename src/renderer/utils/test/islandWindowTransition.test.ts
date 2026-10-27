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
 * @file islandWindowTransition.test.ts
 * @description 原生画布保护令牌的旧完成隔离、状态刷新、同帧反转和形态区分回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginIslandWindowTransition,
  completeIslandWindowTransition,
  getIslandWindowTransitionId,
  subscribeIslandWindowTransition,
} from '../islandWindowTransition';

const begin = vi.fn();
const complete = vi.fn();
beforeEach(() => {
  vi.stubGlobal('window', { api: { beginWindowTransition: begin, completeWindowTransition: complete } });
  completeIslandWindowTransition(getIslandWindowTransitionId());
  vi.clearAllMocks();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('island window transition acknowledgements', () => {
  it('ignores stale completion after a reverse transition and sends the current acknowledgement once', () => {
    const first = beginIslandWindowTransition('notification', 'idle');
    const current = beginIslandWindowTransition('idle', 'hover');
    expect(current).toBeGreaterThan(first);
    completeIslandWindowTransition(first);
    expect(complete).not.toHaveBeenCalled();
    expect(getIslandWindowTransitionId()).toBe(current);
    completeIslandWindowTransition(current);
    completeIslandWindowTransition(current);
    expect(complete).toHaveBeenCalledExactlyOnceWith(current);
    expect(getIslandWindowTransitionId()).toBe(0);
  });

  it('does not restart the native guard for repeated notification content updates', () => {
    const current = beginIslandWindowTransition('maxExpand', 'notification');
    expect(beginIslandWindowTransition('notification', 'notification')).toBe(current);
    expect(begin).toHaveBeenCalledExactlyOnceWith(current);
  });

  it('notifies state subscribers even when batched transitions return to the same state', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeIslandWindowTransition(listener);
    beginIslandWindowTransition('notification', 'idle');
    const current = beginIslandWindowTransition('idle', 'notification');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getIslandWindowTransitionId('state')).toBe(current);
    completeIslandWindowTransition(current);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    beginIslandWindowTransition('notification', 'hover');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('keeps shape movement completion separate from shell state completion', () => {
    const current = beginIslandWindowTransition('notch', 'pill', 'shape');
    expect(getIslandWindowTransitionId('state')).toBe(0);
    expect(getIslandWindowTransitionId('shape')).toBe(current);
    completeIslandWindowTransition(0);
    expect(complete).not.toHaveBeenCalled();
    completeIslandWindowTransition(current);
    expect(complete).toHaveBeenCalledExactlyOnceWith(current);
  });

  it.each(['width', 'clipPath', 'paddingInlineStart', 'paddingInlineEnd'])('waits for late CSS %s animations and a final frame, excluding infinite glow', async (property) => {
    let finish: () => void = () => {};
    const geometry = {
      playState: 'running',
      effect: { getComputedTiming: () => ({ endTime: 340 }), getKeyframes: () => [{ [property]: 'value' }] },
      finished: new Promise<void>((resolve) => { finish = resolve; }),
    };
    const glow = {
      playState: 'running',
      effect: { getComputedTiming: () => ({ endTime: Infinity }), getKeyframes: () => [{ transform: 'rotate(0)' }] },
      finished: new Promise<void>(() => {}),
    };
    vi.stubGlobal('document', { querySelector: () => ({ getAnimations: () => [geometry, glow] }) });
    const frame = vi.fn<(callback: FrameRequestCallback) => number>(() => 1);
    vi.stubGlobal('requestAnimationFrame', frame);
    const current = beginIslandWindowTransition('notification', 'idle');
    completeIslandWindowTransition(current);
    expect(complete).not.toHaveBeenCalled();
    geometry.playState = 'finished';
    finish();
    await Promise.resolve(); await Promise.resolve();
    expect(frame).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    frame.mock.calls[0][0](0);
    expect(complete).toHaveBeenCalledExactlyOnceWith(current);
  });

  it('ignores a CSS completion belonging to a superseded state', async () => {
    let finish: () => void = () => {};
    const animation = {
      playState: 'running',
      effect: { getComputedTiming: () => ({ endTime: 340 }), getKeyframes: () => [{ height: '42px' }] },
      finished: new Promise<void>((resolve) => { finish = resolve; }),
    };
    vi.stubGlobal('document', { querySelector: () => ({ getAnimations: () => [animation] }) });
    const frame = vi.fn<(callback: FrameRequestCallback) => number>(() => 1);
    vi.stubGlobal('requestAnimationFrame', frame);
    const previous = beginIslandWindowTransition('notification', 'idle');
    completeIslandWindowTransition(previous);
    beginIslandWindowTransition('idle', 'hover');
    finish();
    await Promise.resolve(); await Promise.resolve();
    expect(frame).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
});
