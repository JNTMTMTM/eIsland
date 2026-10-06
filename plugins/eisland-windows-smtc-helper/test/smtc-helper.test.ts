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
 * @file smtc-helper.test.ts
 * @description @eisland/windows-smtc-helper 单元测试
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import type { MediaStatus, CommandResult } from '../index';

const smtc = require('../') as {
  play(): CommandResult;
  pause(): CommandResult;
  next(): CommandResult;
  previous(): CommandResult;
  getStatus(): MediaStatus;
};

describe('@eisland/windows-smtc-helper', () => {
  it('exports all expected functions', () => {
    expect(typeof smtc.play).toBe('function');
    expect(typeof smtc.pause).toBe('function');
    expect(typeof smtc.next).toBe('function');
    expect(typeof smtc.previous).toBe('function');
    expect(typeof smtc.getStatus).toBe('function');
  });

  describe('getStatus', () => {
    it('returns a well-shaped MediaStatus object', () => {
      const status = smtc.getStatus();

      expect(typeof status).toBe('object');
      expect(typeof status.isAvailable).toBe('boolean');

      if (status.isAvailable) {
        // Media info
        if (status.title !== null) expect(typeof status.title).toBe('string');
        if (status.artist !== null) expect(typeof status.artist).toBe('string');
        if (status.albumTitle !== null) expect(typeof status.albumTitle).toBe('string');
        if (status.albumArtist !== null) expect(typeof status.albumArtist).toBe('string');
        if (status.trackNumber !== null) expect(typeof status.trackNumber).toBe('number');
        if (status.genres !== null) {
          expect(Array.isArray(status.genres)).toBe(true);
          for (const genre of status.genres) expect(typeof genre).toBe('string');
        }

        // Playback state
        expect(typeof status.playbackStatus).toBe('string');
        expect(['playing', 'paused', 'stopped', 'closed', 'opened', 'changing', 'unknown']).toContain(status.playbackStatus);
        if (status.isShuffleActive !== null) expect(typeof status.isShuffleActive).toBe('boolean');
        if (status.repeatMode !== null) expect(typeof status.repeatMode).toBe('number');
        if (status.playbackRate !== null) expect(typeof status.playbackRate).toBe('number');

        // Source
        if (status.sourceAppUserModelId !== null) expect(typeof status.sourceAppUserModelId).toBe('string');

        // Thumbnail (data URI or null)
        if (status.thumbnail !== null) {
          expect(typeof status.thumbnail).toBe('string');
          expect(status.thumbnail).toMatch(/^data:image\/.+;base64,/);
        }

        // Timeline
        expect(status.timeline).not.toBeNull();
        if (status.timeline) {
          expect(typeof status.timeline.startTime).toBe('number');
          expect(typeof status.timeline.endTime).toBe('number');
          expect(typeof status.timeline.position).toBe('number');
          expect(typeof status.timeline.minSeekTime).toBe('number');
          expect(typeof status.timeline.maxSeekTime).toBe('number');
          expect(status.timeline.endTime).toBeGreaterThanOrEqual(status.timeline.startTime);
          expect(status.timeline.position).toBeGreaterThanOrEqual(status.timeline.startTime);
          expect(status.timeline.position).toBeLessThanOrEqual(status.timeline.endTime);
        }

        // Controls
        expect(status.controls).not.toBeNull();
        if (status.controls) {
          expect(typeof status.controls.isPlayEnabled).toBe('boolean');
          expect(typeof status.controls.isPauseEnabled).toBe('boolean');
          expect(typeof status.controls.isNextEnabled).toBe('boolean');
          expect(typeof status.controls.isPreviousEnabled).toBe('boolean');
          expect(typeof status.controls.isStopEnabled).toBe('boolean');
          expect(typeof status.controls.isRecordEnabled).toBe('boolean');
          expect(typeof status.controls.isFastForwardEnabled).toBe('boolean');
          expect(typeof status.controls.isRewindEnabled).toBe('boolean');
          expect(typeof status.controls.isChannelUpEnabled).toBe('boolean');
          expect(typeof status.controls.isChannelDownEnabled).toBe('boolean');
        }
      }
    });

    it('never throws', () => {
      expect(() => smtc.getStatus()).not.toThrow();
    });
  });

  describe('command functions', () => {
    const commands = ['play', 'pause', 'next', 'previous'] as const;

    for (const cmd of commands) {
      describe(cmd, () => {
        it('returns a CommandResult object', () => {
          const result = smtc[cmd]();

          expect(typeof result).toBe('object');
          expect(typeof result.success).toBe('boolean');

          if (!result.success) {
            expect(typeof result.error).toBe('string');
          } else {
            expect(result.error).toBeNull();
          }
        });

        it('never throws', () => {
          expect(() => smtc[cmd]()).not.toThrow();
        });
      });
    }
  });
});
