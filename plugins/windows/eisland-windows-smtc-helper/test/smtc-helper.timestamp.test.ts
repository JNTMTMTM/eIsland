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
 * @file smtc-helper.timestamp.test.ts
 * @description getTimestamp 轻量级时间戳接口单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type { TimestampInfo } from '../index';

const smtc = require('../') as {
  getTimestamp(): TimestampInfo;
  getStatus(): { isAvailable: boolean; timeline: { position: number } | null };
};

describe('getTimestamp', () => {
  it('is exported as a function', () => {
    expect(typeof smtc.getTimestamp).toBe('function');
  });

  it('returns a well-shaped TimestampInfo object', () => {
    const ts = smtc.getTimestamp();

    expect(typeof ts).toBe('object');
    expect(typeof ts.isAvailable).toBe('boolean');
    expect(typeof ts.playbackStatus).toBe('string');

    const validStatuses = ['playing', 'paused', 'stopped', 'closed', 'opened', 'changing', 'unknown'];
    expect(validStatuses).toContain(ts.playbackStatus);

    if (ts.isAvailable) {
      expect(ts.timeline).not.toBeNull();
      if (ts.timeline) {
        expect(typeof ts.timeline.startTime).toBe('number');
        expect(typeof ts.timeline.endTime).toBe('number');
        expect(typeof ts.timeline.position).toBe('number');
        expect(typeof ts.timeline.minSeekTime).toBe('number');
        expect(typeof ts.timeline.maxSeekTime).toBe('number');

        expect(ts.timeline.endTime).toBeGreaterThanOrEqual(ts.timeline.startTime);
        expect(ts.timeline.position).toBeGreaterThanOrEqual(ts.timeline.startTime);
        expect(ts.timeline.position).toBeLessThanOrEqual(ts.timeline.endTime);
      }
    } else {
      expect(ts.timeline).toBeNull();
    }
  });

  it('never throws', () => {
    expect(() => smtc.getTimestamp()).not.toThrow();
  });

  it('returns consistent position with getStatus', () => {
    const ts = smtc.getTimestamp();
    const status = smtc.getStatus();

    if (ts.isAvailable && status.isAvailable && ts.timeline && status.timeline) {
      // 两次调用间隔极短，position 应基本一致（允许 0.5s 误差）
      const diff = Math.abs(ts.timeline.position - status.timeline.position);
      expect(diff).toBeLessThan(0.5);
    }
  });
});
