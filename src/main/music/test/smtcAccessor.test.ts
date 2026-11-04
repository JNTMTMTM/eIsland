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
 * @file smtcAccessor.test.ts
 * @description smtcAccessor 单元测试
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Module-level state in smtcAccessor cannot be reset, so each test
// re-imports a fresh copy via vi.resetModules().
beforeEach(() => {
  vi.resetModules();
});

describe('smtcAccessor', () => {
  describe('getSmtcNowPlaying without setSmtcAccessor', () => {
    it('returns null when no accessor has been set', async () => {
      const { getSmtcNowPlaying } = await import('../smtcAccessor');
      expect(getSmtcNowPlaying()).toBeNull();
    });
  });

  describe('setSmtcAccessor / getSmtcNowPlaying', () => {
    it('returns playing info after setting accessor with matching device', async () => {
      const { setSmtcAccessor, getSmtcNowPlaying } = await import('../smtcAccessor');

      const payload = {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration_ms: 180000,
        position_ms: 42000,
        isPlaying: true,
        thumbnail: 'data:image/png;base64,abc',
        deviceId: 'dev-1',
      };
      const runtime = new Map([
        ['dev-1', { payload, hasTitle: true }],
      ]);

      setSmtcAccessor(() => runtime, () => 'dev-1');

      const result = getSmtcNowPlaying();
      expect(result).toEqual({
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration_ms: 180000,
        position_ms: 42000,
        isPlaying: true,
        deviceId: 'dev-1',
      });
      // thumbnail should be omitted
      expect(result).not.toHaveProperty('thumbnail');
    });

    it('returns null when runtime returns null', async () => {
      const { setSmtcAccessor, getSmtcNowPlaying } = await import('../smtcAccessor');

      setSmtcAccessor(() => null, () => 'dev-1');
      expect(getSmtcNowPlaying()).toBeNull();
    });

    it('returns null when deviceId is empty string', async () => {
      const { setSmtcAccessor, getSmtcNowPlaying } = await import('../smtcAccessor');

      const runtime = new Map([
        ['dev-1', { payload: {}, hasTitle: true }],
      ]);
      setSmtcAccessor(() => runtime, () => '');
      expect(getSmtcNowPlaying()).toBeNull();
    });

    it('returns null when entry has no title', async () => {
      const { setSmtcAccessor, getSmtcNowPlaying } = await import('../smtcAccessor');

      const runtime = new Map([
        ['dev-1', { payload: { title: 'Song' }, hasTitle: false }],
      ]);
      setSmtcAccessor(() => runtime, () => 'dev-1');
      expect(getSmtcNowPlaying()).toBeNull();
    });

    it('returns null when deviceId not found in runtime map', async () => {
      const { setSmtcAccessor, getSmtcNowPlaying } = await import('../smtcAccessor');

      const runtime = new Map([
        ['dev-2', { payload: {}, hasTitle: true }],
      ]);
      setSmtcAccessor(() => runtime, () => 'dev-1');
      expect(getSmtcNowPlaying()).toBeNull();
    });

    it('uses empty string / 0 / false for missing payload fields', async () => {
      const { setSmtcAccessor, getSmtcNowPlaying } = await import('../smtcAccessor');

      const runtime = new Map([
        ['dev-1', { payload: {}, hasTitle: true }],
      ]);
      setSmtcAccessor(() => runtime, () => 'dev-1');

      const result = getSmtcNowPlaying();
      expect(result).toEqual({
        title: '',
        artist: '',
        album: '',
        duration_ms: 0,
        position_ms: 0,
        isPlaying: false,
        deviceId: '',
      });
    });
  });

  describe('multiple calls to setSmtcAccessor', () => {
    it('replaces the previous accessor with the new one', async () => {
      const { setSmtcAccessor, getSmtcNowPlaying } = await import('../smtcAccessor');

      const runtimeA = new Map([
        ['dev-a', { payload: { title: 'Song A', artist: 'A', album: 'Album A', duration_ms: 100, position_ms: 10, isPlaying: true, deviceId: 'dev-a' }, hasTitle: true }],
      ]);
      const runtimeB = new Map([
        ['dev-b', { payload: { title: 'Song B', artist: 'B', album: 'Album B', duration_ms: 200, position_ms: 20, isPlaying: false, deviceId: 'dev-b' }, hasTitle: true }],
      ]);

      // Set first accessor
      setSmtcAccessor(() => runtimeA, () => 'dev-a');
      expect(getSmtcNowPlaying()?.title).toBe('Song A');

      // Replace with second accessor
      setSmtcAccessor(() => runtimeB, () => 'dev-b');
      expect(getSmtcNowPlaying()?.title).toBe('Song B');
      expect(getSmtcNowPlaying()?.isPlaying).toBe(false);
    });
  });
});
