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
 * @file calendarScrollDamping.test.ts
 * @description 验证滚轮缓动的定位、反向响应、虚拟列表补偿和动画清理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachCalendarScrollDamping } from '../calendarScrollDamping';

describe('calendar scroll damping', () => {
  let element: HTMLElement;
  let media: MediaQueryList;
  let frames: Map<number, FrameRequestCallback>;
  let now: number;
  let cleanup: () => void;
  let monthStarts: number[];

  beforeEach(() => {
    monthStarts = [];
    element = Object.assign(new EventTarget(), { scrollTop: 1000, clientHeight: 300 }) as HTMLElement;
    media = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
    frames = new Map();
    now = 0;
    let sequence = 0;
    vi.stubGlobal('window', { matchMedia: () => media });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++sequence, callback);
      return sequence;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    cleanup = attachCalendarScrollDamping(element, () => monthStarts);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /**
   * 派发设备滚轮输入，同时保留浏览器的可取消语义。
   * @param deltaY - 滚轮纵向变化量
   * @param deltaMode - 设备滚动单位
   * @param ctrlKey - 是否按下 Ctrl
   * @returns 派发后的可取消事件
   */
  const wheel = (deltaY: number, deltaMode = 0, ctrlKey = false): Event => {
    const event = Object.assign(new Event('wheel', { cancelable: true }), {
      deltaY,
      deltaMode,
      ctrlKey,
      deltaX: 0,
      shiftKey: false
    });
    element.dispatchEvent(event);
    return event;
  };

  /**
   * 推进动画帧，让测试不依赖实际时间和显示器刷新率。
   * @param elapsed - 推进的毫秒数
   */
  const advance = (elapsed = 16): void => {
    now += elapsed;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
  };

  /** 在有限帧内等待缓动停止，检测无法收敛的动画。 */
  const settle = (): void => {
    for (let index = 0; index < 120 && frames.size > 0; index++) advance();
    expect(frames.size).toBe(0);
  };

  it('slows a wheel tick and settles without overshooting its destination', () => {
    expect(wheel(120).defaultPrevented).toBe(true);
    expect(element.scrollTop).toBe(1000);
    advance();
    expect(element.scrollTop).toBeGreaterThan(1000);
    expect(element.scrollTop).toBeLessThan(1066);
    settle();
    expect(element.scrollTop).toBeCloseTo(1066);
  });

  it('reverses immediately and bounds accumulated travel', () => {
    for (let index = 0; index < 30; index++) wheel(120);
    advance();
    const beforeReverse = element.scrollTop;
    wheel(-40);
    advance();
    expect(element.scrollTop).toBeLessThan(beforeReverse);
    settle();
    expect(element.scrollTop).toBeCloseTo(beforeReverse - 22);
    expect(beforeReverse).toBeLessThan(1240);
  });

  it('preserves prepended-month compensation while motion continues', () => {
    wheel(120);
    advance();
    element.scrollTop += 3600;
    settle();
    expect(element.scrollTop).toBeCloseTo(4666);
  });

  it('normalizes line and page units and leaves zoom gestures untouched', () => {
    wheel(3, 1);
    settle();
    expect(element.scrollTop).toBeCloseTo(1026.4);
    wheel(1, 2);
    settle();
    expect(element.scrollTop).toBeCloseTo(1158.4);
    expect(wheel(120, 0, true).defaultPrevented).toBe(false);
    expect(frames.size).toBe(0);
  });

  it('cancels residual motion for pointer, keyboard and unmount', () => {
    ['pointerdown', 'keydown'].forEach((type) => {
      wheel(120);
      element.dispatchEvent(new Event(type));
      advance();
      expect(element.scrollTop).toBe(1000);
      expect(frames.size).toBe(0);
    });
    wheel(120);
    cleanup();
    advance();
    expect(element.scrollTop).toBe(1000);
    expect(wheel(120).defaultPrevented).toBe(false);
  });

  it('respects reduced motion with an immediate smaller scroll', () => {
    Object.assign(media, { matches: true });
    wheel(120);
    expect(element.scrollTop).toBe(1066);
    expect(frames.size).toBe(0);
  });

  it('decelerates to a nearby month in one continuous animation without restarting', () => {
    monthStarts = [1000, 1100, 1404];
    wheel(120);
    let previousStep = Infinity;
    for (let index = 0; index < 120 && frames.size > 0; index++) {
      const before = element.scrollTop;
      advance();
      const step = element.scrollTop - before;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThanOrEqual(previousStep + .25);
      previousStep = step;
    }
    expect(frames.size).toBe(0);
    expect(element.scrollTop).toBeCloseTo(1100);
  });

  it('does not pull back to the departure month or snap across a distant gap', () => {
    monthStarts = [1000, 1304];
    wheel(120);
    settle();
    expect(element.scrollTop).toBeCloseTo(1066);
  });

  it('snaps upward and uses updated month positions after range expansion', () => {
    monthStarts = [900];
    wheel(-120);
    advance();
    element.scrollTop += 3600;
    monthStarts = [4500];
    settle();
    expect(element.scrollTop).toBeCloseTo(4500);
  });

  it('lets new wheel input interrupt an active snap immediately', () => {
    monthStarts = [1100];
    wheel(120);
    advance();
    const before = element.scrollTop;
    wheel(-40);
    settle();
    expect(element.scrollTop).toBeCloseTo(before - 22);
  });

  it('cancels a running snap on click, keyboard input and cleanup', () => {
    monthStarts = [1100];
    ['pointerdown', 'keydown', 'cleanup'].forEach((type) => {
      element.scrollTop = 1000;
      wheel(120);
      advance();
      const before = element.scrollTop;
      if (type === 'cleanup') cleanup();
      else element.dispatchEvent(new Event(type));
      settle();
      expect(element.scrollTop).toBeCloseTo(before);
    });
  });

  it('carries fractional pixels instead of jumping at the end of snapping', () => {
    let position = 1000;
    Object.defineProperty(element, 'scrollTop', {
      get: () => position,
      set: (value: number) => { position = Math.round(value); },
    });
    monthStarts = [1100];
    wheel(120);
    let before = position;
    for (let index = 0; index < 120 && frames.size > 0; index++) {
      before = position;
      advance();
    }
    expect(position).toBe(1100);
    expect(position - before).toBeLessThanOrEqual(1);
    expect(frames.size).toBe(0);
  });

  it('ignores zero movement and a hidden viewport without consuming the wheel', () => {
    expect(wheel(0).defaultPrevented).toBe(false);
    Object.assign(element, { clientHeight: 0 });
    expect(wheel(120).defaultPrevented).toBe(false);
    expect(element.scrollTop).toBe(1000);
    expect(frames.size).toBe(0);
  });

  it('finishes subpixel input in one frame without losing the requested distance', () => {
    wheel(.01);
    advance();
    expect(element.scrollTop).toBeCloseTo(1000.0055, 6);
    expect(frames.size).toBe(0);
  });

  it('stops at native scroll boundaries instead of scheduling frames indefinitely', () => {
    let position = 1000;
    Object.defineProperty(element, 'scrollTop', {
      get: () => position,
      set: (value: number) => { position = Math.max(0, Math.min(1000, value)); },
    });
    wheel(120);
    advance();
    expect(position).toBe(1000);
    expect(frames.size).toBe(0);
    wheel(-120);
    settle();
    expect(position).toBeCloseTo(934);
  });

  it('chooses the nearest forward anchor from the current callback result', () => {
    monthStarts = [1120, 1100, 1400];
    wheel(120);
    settle();
    expect(element.scrollTop).toBeCloseTo(1100);
  });

  it('finishes existing motion when its snap anchor disappears during virtualization', () => {
    monthStarts = [1100];
    wheel(120);
    advance();
    monthStarts = [];
    settle();
    expect(element.scrollTop).toBeCloseTo(1100);
    expect(frames.size).toBe(0);
  });
});
