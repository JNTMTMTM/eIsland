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
 * @file storeConfig.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { describe, expect, it, vi } from 'vitest';
import {
  sanitizeIslandDisplaySelection,
  sanitizeIslandPositionOffset,
  sanitizeSmtcUnsubscribeMs,
  ISLAND_WIDTH,
  ISLAND_HEIGHT,
  EXPANDED_WIDTH,
  EXPANDED_HEIGHT,
  NOTIFICATION_WIDTH,
  NOTIFICATION_HEIGHT,
  LYRICS_WIDTH,
  LYRICS_HEIGHT,
  EXPANDED_FULL_WIDTH,
  EXPANDED_FULL_HEIGHT,
  SETTINGS_WIDTH,
  SETTINGS_HEIGHT,
  SMTC_UNSUBSCRIBE_NEVER,
  DEFAULT_SMTC_UNSUBSCRIBE_MS,
  MIN_SMTC_UNSUBSCRIBE_MS,
  MAX_SMTC_UNSUBSCRIBE_MS,
  SMTC_RUNTIME_CLEANUP_INTERVAL_MS,
  DEFAULT_WHITELIST,
  DEFAULT_HIDE_PROCESS_LIST,
  DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED,
  DEFAULT_CLIPBOARD_URL_DETECT_MODE,
  DEFAULT_CLIPBOARD_URL_BLACKLIST,
  DEFAULT_ISLAND_POSITION_OFFSET,
  DEFAULT_ISLAND_DISPLAY_SELECTION,
  DEFAULT_HIDE_HOTKEY,
  DEFAULT_QUIT_HOTKEY,
  DEFAULT_SCREENSHOT_HOTKEY,
} from '../storeConfig';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/eIsland-test') },
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));

vi.mock('../utils/clipboardUrl', () => ({
  normalizeClipboardUrlDetectMode: vi.fn(),
  sanitizeClipboardUrlBlacklist: vi.fn(),
}));

vi.mock('../../system/runningProcesses', () => ({
  sanitizeProcessNameList: vi.fn(),
}));

// ===== sanitizeIslandDisplaySelection =====

describe('sanitizeIslandDisplaySelection', () => {
  it('returns "primary" when given "primary"', () => {
    expect(sanitizeIslandDisplaySelection('primary')).toBe('primary');
  });

  it('returns numeric string from finite number', () => {
    expect(sanitizeIslandDisplaySelection(2)).toBe('2');
  });

  it('truncates decimal number to integer string', () => {
    expect(sanitizeIslandDisplaySelection(3.7)).toBe('3');
  });

  it('returns numeric string from valid digit string', () => {
    expect(sanitizeIslandDisplaySelection('42')).toBe('42');
  });

  it('trims whitespace from numeric string', () => {
    expect(sanitizeIslandDisplaySelection('  5  ')).toBe('5');
  });

  it('handles negative numeric string', () => {
    expect(sanitizeIslandDisplaySelection('-1')).toBe('-1');
  });

  it('returns default for null', () => {
    expect(sanitizeIslandDisplaySelection(null)).toBe(DEFAULT_ISLAND_DISPLAY_SELECTION);
  });

  it('returns default for undefined', () => {
    expect(sanitizeIslandDisplaySelection(undefined)).toBe(DEFAULT_ISLAND_DISPLAY_SELECTION);
  });

  it('returns default for non-numeric string', () => {
    expect(sanitizeIslandDisplaySelection('abc')).toBe(DEFAULT_ISLAND_DISPLAY_SELECTION);
  });

  it('returns default for object', () => {
    expect(sanitizeIslandDisplaySelection({})).toBe(DEFAULT_ISLAND_DISPLAY_SELECTION);
  });

  it('returns default for boolean', () => {
    expect(sanitizeIslandDisplaySelection(true)).toBe(DEFAULT_ISLAND_DISPLAY_SELECTION);
  });

  it('returns default for NaN', () => {
    expect(sanitizeIslandDisplaySelection(NaN)).toBe(DEFAULT_ISLAND_DISPLAY_SELECTION);
  });

  it('returns default for Infinity', () => {
    expect(sanitizeIslandDisplaySelection(Infinity)).toBe(DEFAULT_ISLAND_DISPLAY_SELECTION);
  });
});

// ===== sanitizeIslandPositionOffset =====

describe('sanitizeIslandPositionOffset', () => {
  it('returns default offset for null', () => {
    expect(sanitizeIslandPositionOffset(null)).toEqual({ x: 0, y: 0 });
  });

  it('returns default offset for undefined', () => {
    expect(sanitizeIslandPositionOffset(undefined)).toEqual({ x: 0, y: 0 });
  });

  it('returns default offset for non-object (string)', () => {
    expect(sanitizeIslandPositionOffset('bad')).toEqual({ x: 0, y: 0 });
  });

  it('returns default offset for non-object (number)', () => {
    expect(sanitizeIslandPositionOffset(42)).toEqual({ x: 0, y: 0 });
  });

  it('returns valid {x,y} unchanged when within range', () => {
    expect(sanitizeIslandPositionOffset({ x: 100, y: 50 })).toEqual({ x: 100, y: 50 });
  });

  it('rounds fractional values', () => {
    expect(sanitizeIslandPositionOffset({ x: 10.6, y: -3.2 })).toEqual({ x: 11, y: -3 });
  });

  it('defaults missing x to 0', () => {
    expect(sanitizeIslandPositionOffset({ y: 100 })).toEqual({ x: 0, y: 100 });
  });

  it('defaults missing y to 0', () => {
    expect(sanitizeIslandPositionOffset({ x: 100 })).toEqual({ x: 100, y: 0 });
  });

  it('defaults NaN fields to 0', () => {
    expect(sanitizeIslandPositionOffset({ x: NaN, y: NaN })).toEqual({ x: 0, y: 0 });
  });

  it('defaults Infinity fields to 0', () => {
    expect(sanitizeIslandPositionOffset({ x: Infinity, y: -Infinity })).toEqual({ x: 0, y: 0 });
  });

  it('defaults non-number field types to 0', () => {
    expect(sanitizeIslandPositionOffset({ x: 'hello', y: true })).toEqual({ x: 0, y: 0 });
  });

  it('clamps x to max 2000', () => {
    expect(sanitizeIslandPositionOffset({ x: 5000, y: 0 })).toEqual({ x: 2000, y: 0 });
  });

  it('clamps x to min -2000', () => {
    expect(sanitizeIslandPositionOffset({ x: -5000, y: 0 })).toEqual({ x: -2000, y: 0 });
  });

  it('clamps y to max 1200', () => {
    expect(sanitizeIslandPositionOffset({ x: 0, y: 5000 })).toEqual({ x: 0, y: 1200 });
  });

  it('clamps y to min -1200', () => {
    expect(sanitizeIslandPositionOffset({ x: 0, y: -5000 })).toEqual({ x: 0, y: -1200 });
  });

  it('handles boundary values exactly', () => {
    expect(sanitizeIslandPositionOffset({ x: 2000, y: -1200 })).toEqual({ x: 2000, y: -1200 });
  });
});

// ===== sanitizeSmtcUnsubscribeMs =====

describe('sanitizeSmtcUnsubscribeMs', () => {
  it('returns 0 (never) when given 0', () => {
    expect(sanitizeSmtcUnsubscribeMs(0)).toBe(0);
  });

  it('returns default for non-number (string)', () => {
    expect(sanitizeSmtcUnsubscribeMs('abc')).toBe(DEFAULT_SMTC_UNSUBSCRIBE_MS);
  });

  it('returns default for non-number (null)', () => {
    expect(sanitizeSmtcUnsubscribeMs(null)).toBe(DEFAULT_SMTC_UNSUBSCRIBE_MS);
  });

  it('returns default for non-number (undefined)', () => {
    expect(sanitizeSmtcUnsubscribeMs(undefined)).toBe(DEFAULT_SMTC_UNSUBSCRIBE_MS);
  });

  it('returns default for non-number (object)', () => {
    expect(sanitizeSmtcUnsubscribeMs({})).toBe(DEFAULT_SMTC_UNSUBSCRIBE_MS);
  });

  it('returns default for NaN', () => {
    expect(sanitizeSmtcUnsubscribeMs(NaN)).toBe(DEFAULT_SMTC_UNSUBSCRIBE_MS);
  });

  it('returns default for Infinity', () => {
    expect(sanitizeSmtcUnsubscribeMs(Infinity)).toBe(DEFAULT_SMTC_UNSUBSCRIBE_MS);
  });

  it('returns 0 (never) for negative values', () => {
    expect(sanitizeSmtcUnsubscribeMs(-100)).toBe(0);
  });

  it('clamps to minimum (1000) for small positive values', () => {
    expect(sanitizeSmtcUnsubscribeMs(500)).toBe(MIN_SMTC_UNSUBSCRIBE_MS);
  });

  it('clamps to minimum for value just below min', () => {
    expect(sanitizeSmtcUnsubscribeMs(999)).toBe(MIN_SMTC_UNSUBSCRIBE_MS);
  });

  it('returns value at exactly the minimum boundary', () => {
    expect(sanitizeSmtcUnsubscribeMs(1000)).toBe(1000);
  });

  it('returns valid value within range', () => {
    expect(sanitizeSmtcUnsubscribeMs(30000)).toBe(30000);
  });

  it('returns value at exactly the maximum boundary', () => {
    expect(sanitizeSmtcUnsubscribeMs(MAX_SMTC_UNSUBSCRIBE_MS)).toBe(MAX_SMTC_UNSUBSCRIBE_MS);
  });

  it('clamps to maximum for values beyond max', () => {
    expect(sanitizeSmtcUnsubscribeMs(999999999)).toBe(MAX_SMTC_UNSUBSCRIBE_MS);
  });

  it('rounds fractional values before clamping', () => {
    expect(sanitizeSmtcUnsubscribeMs(1500.6)).toBe(1501);
  });

  it('rounds fractional value that falls below min after rounding', () => {
    expect(sanitizeSmtcUnsubscribeMs(499.6)).toBe(MIN_SMTC_UNSUBSCRIBE_MS);
  });

  it('returns 0 (never) for -0', () => {
    expect(sanitizeSmtcUnsubscribeMs(-0)).toBe(0);
  });
});

// ===== Exported constants =====

describe('exported constants', () => {
  it('island size constants have expected values', () => {
    expect(ISLAND_WIDTH).toBe(260);
    expect(ISLAND_HEIGHT).toBe(42);
  });

  it('expanded size constants have expected values', () => {
    expect(EXPANDED_WIDTH).toBe(500);
    expect(EXPANDED_HEIGHT).toBe(60);
  });

  it('notification size constants have expected values', () => {
    expect(NOTIFICATION_WIDTH).toBe(500);
    expect(NOTIFICATION_HEIGHT).toBe(88);
  });

  it('lyrics size constants have expected values', () => {
    expect(LYRICS_WIDTH).toBe(500);
    expect(LYRICS_HEIGHT).toBe(42);
  });

  it('expanded full size constants have expected values', () => {
    expect(EXPANDED_FULL_WIDTH).toBe(860);
    expect(EXPANDED_FULL_HEIGHT).toBe(150);
  });

  it('settings size constants have expected values', () => {
    expect(SETTINGS_WIDTH).toBe(860);
    expect(SETTINGS_HEIGHT).toBe(400);
  });

  it('SMTC unsubscribe constants have expected values', () => {
    expect(SMTC_UNSUBSCRIBE_NEVER).toBe(0);
    expect(DEFAULT_SMTC_UNSUBSCRIBE_MS).toBe(SMTC_UNSUBSCRIBE_NEVER);
    expect(MIN_SMTC_UNSUBSCRIBE_MS).toBe(1000);
    expect(MAX_SMTC_UNSUBSCRIBE_MS).toBe(30 * 60 * 1000);
    expect(SMTC_RUNTIME_CLEANUP_INTERVAL_MS).toBe(30 * 1000);
  });

  it('DEFAULT_WHITELIST is a non-empty string array', () => {
    expect(Array.isArray(DEFAULT_WHITELIST)).toBe(true);
    expect(DEFAULT_WHITELIST.length).toBeGreaterThan(0);
    DEFAULT_WHITELIST.forEach((item) => expect(typeof item).toBe('string'));
  });

  it('DEFAULT_HIDE_PROCESS_LIST is an empty array', () => {
    expect(Array.isArray(DEFAULT_HIDE_PROCESS_LIST)).toBe(true);
    expect(DEFAULT_HIDE_PROCESS_LIST).toHaveLength(0);
  });

  it('DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED is true', () => {
    expect(DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED).toBe(true);
  });

  it('DEFAULT_CLIPBOARD_URL_DETECT_MODE is a valid detect mode', () => {
    expect(['https-only', 'http-https', 'domain-only']).toContain(DEFAULT_CLIPBOARD_URL_DETECT_MODE);
  });

  it('DEFAULT_CLIPBOARD_URL_BLACKLIST is an empty array', () => {
    expect(Array.isArray(DEFAULT_CLIPBOARD_URL_BLACKLIST)).toBe(true);
    expect(DEFAULT_CLIPBOARD_URL_BLACKLIST).toHaveLength(0);
  });

  it('DEFAULT_ISLAND_POSITION_OFFSET is {x:0, y:0}', () => {
    expect(DEFAULT_ISLAND_POSITION_OFFSET).toEqual({ x: 0, y: 0 });
  });

  it('DEFAULT_ISLAND_DISPLAY_SELECTION is "primary"', () => {
    expect(DEFAULT_ISLAND_DISPLAY_SELECTION).toBe('primary');
  });

  it('hotkey defaults have expected values', () => {
    expect(DEFAULT_HIDE_HOTKEY).toBe('Alt+X');
    expect(DEFAULT_QUIT_HOTKEY).toBe('Alt+C');
    expect(DEFAULT_SCREENSHOT_HOTKEY).toBe('Alt+A');
  });
});
