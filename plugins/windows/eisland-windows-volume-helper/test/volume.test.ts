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
 * @file volume.test.ts
 * @description Windows 默认播放设备主音量查询和设置测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import type * as volumeTypes from '../';

const volume = require('../') as typeof volumeTypes;

describe('@eisland/windows-volume-helper', () => {
  it('exports expected functions', () => {
    expect(typeof volume.getMute).toBe('function');
    expect(typeof volume.setMute).toBe('function');
    expect(typeof volume.getVolume).toBe('function');
    expect(typeof volume.setVolume).toBe('function');
  });

  it('reads and reapplies the current mute state', () => {
    const originalMuted = volume.getMute();
    if (originalMuted === null) return;

    expect(volume.setMute(originalMuted)).toBe(true);
    expect(volume.getMute()).toBe(originalMuted);
  });

  it('returns a valid volume level or null', () => {
    const level = volume.getVolume();
    if (level !== null) {
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(100);
    }
  });

  it('sets the current level without changing user volume', () => {
    const originalLevel = volume.getVolume();
    if (originalLevel === null) return;

    expect(volume.setVolume(originalLevel)).toBe(true);
    const updatedLevel = volume.getVolume();
    expect(updatedLevel).not.toBeNull();
    expect(Math.abs((updatedLevel ?? originalLevel) - originalLevel)).toBeLessThanOrEqual(1);
  });

  it('returns false for non-finite input without changing volume', () => {
    const originalLevel = volume.getVolume();
    expect(volume.setVolume(Number.NaN)).toBe(false);
    expect(volume.getVolume()).toBe(originalLevel);
  });
});