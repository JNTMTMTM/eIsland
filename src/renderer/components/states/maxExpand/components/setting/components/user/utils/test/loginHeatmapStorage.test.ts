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
 * @file loginHeatmapStorage.test.ts
 * @description 登录热力图真实本地存储读取、日期记录去重、非法 JSON 与存储失败边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGIN_HEATMAP_STORAGE_KEY, readLoginDays, recordLoginDay } from '../loginHeatmapStorage';

const getItem = vi.fn<Storage['getItem']>();
const setItem = vi.fn<Storage['setItem']>();
let saved: string | null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 2, 23, 59, 59));
  saved = null;
  getItem.mockReset().mockImplementation(() => saved);
  setItem.mockReset().mockImplementation((key, value) => {
    expect(key).toBe(LOGIN_HEATMAP_STORAGE_KEY);
    saved = value;
  });
  vi.stubGlobal('localStorage', { getItem, setItem });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Login days local persistence', () => {
  it.each([null, undefined, ''])('ignores absent username %s without reading or writing storage', (username) => {
    expect(readLoginDays(username)).toEqual(new Set());
    expect(recordLoginDay(username)).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('records a local calendar day once and preserves each user independently', () => {
    expect(recordLoginDay('reader')).toBe(true);
    expect(readLoginDays('reader')).toEqual(new Set(['2026-1-2']));
    expect(recordLoginDay('reader')).toBe(false);
    expect(setItem).toHaveBeenCalledOnce();
    expect(recordLoginDay('second')).toBe(true);
    expect(readLoginDays('second')).toEqual(new Set(['2026-1-2']));
    expect(readLoginDays('reader')).toEqual(new Set(['2026-1-2']));
    vi.setSystemTime(new Date(2026, 0, 3, 0, 0, 0));
    expect(recordLoginDay('reader')).toBe(true);
    expect(readLoginDays('reader')).toEqual(new Set(['2026-1-2', '2026-1-3']));
    expect(getItem).toHaveBeenCalledWith(LOGIN_HEATMAP_STORAGE_KEY);
  });

  it('deduplicates persisted days without rewriting read data and keeps unknown fields intact on write', () => {
    saved = JSON.stringify({ reader: ['2025-12-31', '2025-12-31'], other: ['2026-1-1'], metadata: 'preserved' });
    expect(readLoginDays('reader')).toEqual(new Set(['2025-12-31']));
    expect(setItem).not.toHaveBeenCalled();
    expect(recordLoginDay('reader')).toBe(true);
    expect(JSON.parse(saved ?? '{}')).toEqual({ reader: ['2025-12-31', '2025-12-31', '2026-1-2'], other: ['2026-1-1'], metadata: 'preserved' });
  });

  it.each([null, '', 'null', 'false', '42', '"invalid"', '[]', '{broken'])('treats invalid or missing outer storage %s as empty', (raw) => {
    saved = raw;
    expect(readLoginDays('reader')).toEqual(new Set());
    expect(recordLoginDay('reader')).toBe(true);
    expect(JSON.parse(saved ?? '{}')).toEqual({ reader: ['2026-1-2'] });
  });

  it.each([null, false, 42, '2026-1-1', {}])('recovers invalid individual user value %j while retaining other users', (days) => {
    saved = JSON.stringify({ reader: days, other: ['2026-1-1'] });
    expect(readLoginDays('reader')).toEqual(new Set());
    expect(recordLoginDay('reader')).toBe(true);
    expect(readLoginDays('reader')).toEqual(new Set(['2026-1-2']));
    expect(readLoginDays('other')).toEqual(new Set(['2026-1-1']));
  });

  it('handles denied storage reads and quota failures without throwing', () => {
    getItem.mockImplementation(() => { throw new Error('storage denied'); });
    setItem.mockImplementation(() => { throw new Error('quota exceeded'); });
    expect(readLoginDays('reader')).toEqual(new Set());
    expect(recordLoginDay('reader')).toBe(true);
    expect(setItem).toHaveBeenCalledWith(LOGIN_HEATMAP_STORAGE_KEY, JSON.stringify({ reader: ['2026-1-2'] }));
    expect(saved).toBeNull();
  });

  it('preserves literal nonempty username keys and uses unpadded month/day date keys', () => {
    expect(recordLoginDay(' Reader ')).toBe(true);
    expect(readLoginDays(' Reader ')).toEqual(new Set(['2026-1-2']));
    expect(readLoginDays('Reader')).toEqual(new Set());
    vi.setSystemTime(new Date(2024, 1, 29, 12, 0, 0));
    expect(recordLoginDay(' Reader ')).toBe(true);
    expect(readLoginDays(' Reader ')).toEqual(new Set(['2026-1-2', '2024-2-29']));
  });
});
