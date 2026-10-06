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
 * @file boardPersistedBoundary.test.ts
 * @description 真实本地存档读取缺省移动记录时的棋盘恢复边界测试。
 * @author 鸡哥
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitial, getTileSeq } from '../board';
import { STORAGE_KEY } from '../../config/constants';
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('2048 real persisted board boundary', () => {
  it.each([{}, {
    moveTrace: null
  }, {
    moveTrace: ''
  }])('accepted legacy JSON restores a default empty trace: %j', (trace) => {
    const stored = {
      tiles: [{
        id: 4,
        value: 2,
        row: 0,
        col: 0
      }],
      score: 2,
      best: 10,
      moveCount: 1,
      startTime: 100,
      tileSeq: 5,
      randomState: 9,
      ...trace
    };
    const getItem = vi.fn<(key: string) => string | null>().mockReturnValue(JSON.stringify(stored));
    vi.stubGlobal('localStorage', {
      getItem
    });
    expect(createInitial()).toEqual({
      tiles: stored.tiles,
      score: 2,
      best: 10,
      moveCount: 1,
      startTime: 100,
      randomState: 9,
      moveTrace: ''
    });
    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(getTileSeq()).toBe(5);
  });
});
