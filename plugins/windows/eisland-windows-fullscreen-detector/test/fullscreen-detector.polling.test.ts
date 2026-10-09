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
 * @file fullscreen-detector.polling.test.ts
 * @description 全屏检测器轮询单元测试
 * @description 使用 Vitest 对全屏检测原生模块进行多轮轮询验证
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';

const POLL_TIMES = 5;
const POLL_INTERVAL_MS = 200;

type FullscreenWindowRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type FullscreenWindowMonitor = FullscreenWindowRect & {
  isPrimary: boolean;
};

type FullscreenWindowInfo = {
  title: string;
  processId: number;
  isForeground: boolean;
  bounds: FullscreenWindowRect;
  monitor: FullscreenWindowMonitor;
};

type PollFrame = {
  any: boolean;
  foreground: FullscreenWindowInfo | null;
  windows: FullscreenWindowInfo[];
};

type MockDetector = {
  getReadCount: () => number;
  isAnyFullscreenWindow: () => boolean;
  getForegroundFullscreenWindow: () => FullscreenWindowInfo | null;
  getFullscreenWindows: () => FullscreenWindowInfo[];
};

type MockWaiter = {
  calls: number[];
  wait: (ms: number) => Promise<void>;
};

type DetectorSnapshot = {
  index: number;
  any: boolean;
  foregroundTitle: string | null;
  fullscreenWindowCount: number;
  foregroundWindowCount: number;
};

type PollOptions = {
  times: number;
  intervalMs: number;
  wait: (ms: number) => Promise<void>;
};

const fullscreenWindow: FullscreenWindowInfo = {
  title: 'Mock Fullscreen App',
  processId: 1001,
  isForeground: true,
  bounds: { left: 0, top: 0, right: 1920, bottom: 1080, width: 1920, height: 1080 },
  monitor: { left: 0, top: 0, right: 1920, bottom: 1080, width: 1920, height: 1080, isPrimary: true },
};

const mockFrames: PollFrame[] = [
  { any: false, foreground: null, windows: [] },
  { any: false, foreground: null, windows: [] },
  { any: true, foreground: fullscreenWindow, windows: [fullscreenWindow] },
  { any: true, foreground: fullscreenWindow, windows: [fullscreenWindow] },
  { any: false, foreground: null, windows: [] },
];

function createMockDetector(frames: PollFrame[]): MockDetector {
  let readIndex = 0;

  return {
    getReadCount: () => readIndex,
    isAnyFullscreenWindow: () => frames[Math.min(readIndex, frames.length - 1)].any,
    getForegroundFullscreenWindow: () => frames[Math.min(readIndex, frames.length - 1)].foreground,
    getFullscreenWindows: () => {
      const frame = frames[Math.min(readIndex, frames.length - 1)];
      readIndex += 1;
      return frame.windows;
    },
  };
}

function createMockWaiter(): MockWaiter {
  const calls: number[] = [];

  return {
    calls,
    wait: async (ms: number) => {
      calls.push(ms);
    },
  };
}

function takeSnapshot(detector: MockDetector, index: number): DetectorSnapshot {
  const any = detector.isAnyFullscreenWindow();
  const foreground = detector.getForegroundFullscreenWindow();
  const fullscreenWindows = detector.getFullscreenWindows();

  expect(typeof any).toBe('boolean');
  expect(foreground === null || typeof foreground === 'object').toBe(true);
  expect(Array.isArray(fullscreenWindows)).toBe(true);

  return {
    index,
    any,
    foregroundTitle: foreground?.title ?? null,
    fullscreenWindowCount: fullscreenWindows.length,
    foregroundWindowCount: fullscreenWindows.filter((item: FullscreenWindowInfo) => item.isForeground).length,
  };
}

async function pollDetector(detector: MockDetector, options: PollOptions): Promise<DetectorSnapshot[]> {
  const snapshots: DetectorSnapshot[] = [];

  for (let index = 0; index < options.times; index += 1) {
    snapshots.push(takeSnapshot(detector, index));
    if (index < options.times - 1) {
      await options.wait(options.intervalMs);
    }
  }

  return snapshots;
}

describe('windows-fullscreen-detector polling', () => {
  it('polls detector snapshots with mocked state sequence', async () => {
    const detector = createMockDetector(mockFrames);
    const waiter = createMockWaiter();

    const snapshots = await pollDetector(detector, {
      times: POLL_TIMES,
      intervalMs: POLL_INTERVAL_MS,
      wait: waiter.wait,
    });

    expect(detector.getReadCount()).toBe(POLL_TIMES);
    expect(snapshots).toHaveLength(POLL_TIMES);
    expect(waiter.calls).toEqual([POLL_INTERVAL_MS, POLL_INTERVAL_MS, POLL_INTERVAL_MS, POLL_INTERVAL_MS]);
    expect(snapshots.map((snapshot) => snapshot.any)).toEqual([false, false, true, true, false]);
    expect(snapshots.map((snapshot) => snapshot.fullscreenWindowCount)).toEqual([0, 0, 1, 1, 0]);
    expect(snapshots.map((snapshot) => snapshot.foregroundWindowCount)).toEqual([0, 0, 1, 1, 0]);
  });
});