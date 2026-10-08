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
 * @file fullscreen-detector.polling.smoke.ts
 * @description 全屏检测器轮询冒烟测试
 * @description 通过多次轮询验证原生模块的全屏检测功能是否正常工作
 * @author 鸡哥
 */

const detector = require('../');

const POLL_TIMES = Number.parseInt(process.env.FULLSCREEN_POLL_TIMES ?? '15', 10);
const POLL_INTERVAL_MS = Number.parseInt(process.env.FULLSCREEN_POLL_INTERVAL_MS ?? '500', 10);

type FullscreenWindowInfo = {
  title: string;
  processId: number;
  isForeground: boolean;
  bounds: unknown;
  monitor: unknown;
};

type DetectorSnapshot = ReturnType<typeof takeSnapshot>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function takeSnapshot(index: number) {
  const foreground = detector.getForegroundFullscreenWindow() as FullscreenWindowInfo | null;
  const fullscreenWindows = detector.getFullscreenWindows() as FullscreenWindowInfo[];

  return {
    index,
    any: detector.isAnyFullscreenWindow() as boolean,
    foregroundTitle: foreground?.title ?? null,
    foregroundProcessId: foreground?.processId ?? null,
    fullscreenWindowCount: fullscreenWindows.length,
    foregroundWindowCount: fullscreenWindows.filter((item) => item.isForeground).length,
    windows: fullscreenWindows.map((item) => ({
      title: item.title,
      processId: item.processId,
      isForeground: item.isForeground,
      bounds: item.bounds,
      monitor: item.monitor,
    })),
  };
}

async function main() {
  const snapshots: DetectorSnapshot[] = [];

  for (let index = 0; index < POLL_TIMES; index += 1) {
    const snapshot = takeSnapshot(index);
    snapshots.push(snapshot);
    console.log(snapshot);

    if (index < POLL_TIMES - 1) {
      await wait(POLL_INTERVAL_MS);
    }
  }

  console.log({
    pollTimes: POLL_TIMES,
    pollIntervalMs: POLL_INTERVAL_MS,
    snapshots: snapshots.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});