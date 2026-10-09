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
 * @file volume.monitor.test.ts
 * @description Windows 默认播放设备主音量监控测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import type * as volumeTypes from '../';

const volume = require('../') as typeof volumeTypes;

function waitForInitialVolume(monitor: volumeTypes.VolumeMonitor): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for initial volume event')), 5000);
    monitor.once('volume-changed', (level: number) => {
      clearTimeout(timeout);
      resolve(level);
    });
    monitor.once('error', (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

describe('VolumeMonitor', () => {
  it('exports VolumeMonitor as a constructor', () => {
    expect(typeof volume.VolumeMonitor).toBe('function');
  });

  it('creates an instance with expected methods', () => {
    const monitor = new volume.VolumeMonitor();
    expect(typeof monitor.start).toBe('function');
    expect(typeof monitor.stop).toBe('function');
    expect(typeof monitor.isRunning).toBe('function');
    expect(typeof monitor.on).toBe('function');
  });

  it('emits the current volume after start', async () => {
    const monitor = new volume.VolumeMonitor();
    const initialVolume = waitForInitialVolume(monitor);

    try {
      monitor.start();
      const level = await initialVolume;
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(100);
    } finally {
      monitor.stop();
    }
  });

  it('keeps start and stop idempotent', () => {
    const monitor = new volume.VolumeMonitor();
    monitor.on('error', () => undefined);

    expect(() => {
      monitor.start();
      monitor.start();
      monitor.stop();
      monitor.stop();
    }).not.toThrow();
    expect(monitor.isRunning()).toBe(false);
  });
});