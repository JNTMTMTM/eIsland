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
 * @file storeConfigPersistence.test.ts
 * @description 验证全部配置读取默认值、坏 JSON、非法值、规范化和持久化成功失败分支。
 * @author 鸡哥
 */

import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as config from '../storeConfig';
const mocks = vi.hoisted(() => ({ path: vi.fn<(name: string) => string>(), exists: vi.fn<(path: string) => boolean>(), read: vi.fn<(path: string, encoding: string) => string>(), write: vi.fn<(path: string, data: string, encoding: string) => void>(), mkdir: vi.fn<(path: string, options: { recursive: boolean }) => void>(), unlink: vi.fn<(path: string) => void>(), names: vi.fn<(names: string[]) => string[]>() }));
vi.mock('electron', () => ({ app: { getPath: mocks.path } }));
vi.mock('fs', () => ({ existsSync: mocks.exists, readFileSync: mocks.read, writeFileSync: mocks.write, mkdirSync: mocks.mkdir, unlinkSync: mocks.unlink }));
vi.mock('../../system/runningProcesses', () => ({ sanitizeProcessNameList: mocks.names }));
interface ReadCase { name: string; read: () => unknown; key: string; fallback: unknown; valid: unknown; expected?: unknown; invalidExpected?: unknown; }
const stringReads: ReadCase[] = [
  { name: 'hide hotkey', read: config.readHotkeyConfig, key: config.HOTKEY_STORE_KEY, fallback: config.DEFAULT_HIDE_HOTKEY, valid: 'Ctrl+H' },
  { name: 'quit hotkey', read: config.readQuitHotkeyConfig, key: config.QUIT_HOTKEY_STORE_KEY, fallback: config.DEFAULT_QUIT_HOTKEY, valid: 'Ctrl+Q' },
  { name: 'screenshot hotkey', read: config.readScreenshotHotkeyConfig, key: config.SCREENSHOT_HOTKEY_STORE_KEY, fallback: config.DEFAULT_SCREENSHOT_HOTKEY, valid: 'Ctrl+S' },
  { name: 'next song hotkey', read: config.readNextSongHotkeyConfig, key: config.NEXT_SONG_HOTKEY_STORE_KEY, fallback: config.DEFAULT_NEXT_SONG_HOTKEY, valid: 'Ctrl+N' },
  { name: 'play pause hotkey', read: config.readPlayPauseSongHotkeyConfig, key: config.PLAY_PAUSE_SONG_HOTKEY_STORE_KEY, fallback: config.DEFAULT_PLAY_PAUSE_SONG_HOTKEY, valid: 'Ctrl+P' },
  { name: 'reset position hotkey', read: config.readResetPositionHotkeyConfig, key: config.RESET_POSITION_HOTKEY_STORE_KEY, fallback: config.DEFAULT_RESET_POSITION_HOTKEY, valid: 'Ctrl+R' },
  { name: 'toggle tray hotkey', read: config.readToggleTrayHotkeyConfig, key: config.TOGGLE_TRAY_HOTKEY_STORE_KEY, fallback: config.DEFAULT_TOGGLE_TRAY_HOTKEY, valid: 'Ctrl+T' },
  { name: 'show settings hotkey', read: config.readShowSettingsWindowHotkeyConfig, key: config.SHOW_SETTINGS_WINDOW_HOTKEY_STORE_KEY, fallback: config.DEFAULT_SHOW_SETTINGS_WINDOW_HOTKEY, valid: 'Ctrl+O' },
  { name: 'clipboard history hotkey', read: config.readOpenClipboardHistoryHotkeyConfig, key: config.OPEN_CLIPBOARD_HISTORY_HOTKEY_STORE_KEY, fallback: config.DEFAULT_OPEN_CLIPBOARD_HISTORY_HOTKEY, valid: 'Ctrl+C' },
  { name: 'passthrough hotkey', read: config.readTogglePassthroughHotkeyConfig, key: config.TOGGLE_PASSTHROUGH_HOTKEY_STORE_KEY, fallback: config.DEFAULT_TOGGLE_PASSTHROUGH_HOTKEY, valid: 'Ctrl+F' },
  { name: 'UI lock hotkey', read: config.readToggleUiLockHotkeyConfig, key: config.TOGGLE_UI_LOCK_HOTKEY_STORE_KEY, fallback: config.DEFAULT_TOGGLE_UI_LOCK_HOTKEY, valid: 'Ctrl+L' },
  { name: 'voice input hotkey', read: config.readAgentVoiceInputHotkeyConfig, key: config.AGENT_VOICE_INPUT_HOTKEY_STORE_KEY, fallback: config.DEFAULT_AGENT_VOICE_INPUT_HOTKEY, valid: 'Ctrl+V' },
  { name: 'shape mode hotkey', read: config.readToggleShapeModeHotkeyConfig, key: config.TOGGLE_SHAPE_MODE_HOTKEY_STORE_KEY, fallback: config.DEFAULT_TOGGLE_SHAPE_MODE_HOTKEY, valid: 'Ctrl+M' },
  { name: 'lyrics source', read: config.readLyricsSourceConfig, key: config.LYRICS_SOURCE_STORE_KEY, fallback: 'auto', valid: 'netease' },
  { name: 'splash background', read: config.readSplashBgColorConfig, key: config.SPLASH_BG_COLOR_STORE_KEY, fallback: config.DEFAULT_SPLASH_BG_COLOR, valid: '#123456' },
];
const reads: ReadCase[] = [...stringReads,
  { name: 'whitelist', read: config.readWhitelistConfig, key: config.WHITELIST_STORE_KEY, fallback: config.DEFAULT_WHITELIST, valid: ['player.exe'] },
  { name: 'hidden processes', read: config.readHideProcessListConfig, key: config.HIDE_PROCESS_LIST_STORE_KEY, fallback: config.DEFAULT_HIDE_PROCESS_LIST, valid: [' player.exe ', 3, null, 'second.exe'], expected: ['normalized.exe'] },
  { name: 'SMTC unsubscribe interval', read: config.readSmtcUnsubscribeMsConfig, key: config.SMTC_UNSUBSCRIBE_MS_STORE_KEY, fallback: config.DEFAULT_SMTC_UNSUBSCRIBE_MS, valid: 2500.4, expected: 2500 },
  { name: 'island position', read: config.readIslandPositionOffsetConfig, key: config.ISLAND_POSITION_STORE_KEY, fallback: config.DEFAULT_ISLAND_POSITION_OFFSET, valid: { x: 9999, y: -9999 }, expected: { x: 2000, y: -1200 } },
  { name: 'display selection', read: config.readIslandDisplaySelectionConfig, key: config.ISLAND_DISPLAY_STORE_KEY, fallback: config.DEFAULT_ISLAND_DISPLAY_SELECTION, valid: 7, expected: '7' },
  { name: 'island shape', read: config.readIslandShapeModeConfig, key: config.ISLAND_SHAPE_MODE_STORE_KEY, fallback: config.DEFAULT_ISLAND_SHAPE_MODE, valid: 'pill' },
  { name: 'screenshot engine', read: config.readScreenshotEngineConfig, key: 'screenshot-engine', fallback: 'plugin', valid: 'js' },
  { name: 'fullscreen auto hide', read: config.readAutoHideFullscreenWindowsConfig, key: config.AUTO_HIDE_FULLSCREEN_WINDOWS_STORE_KEY, fallback: false, valid: true },
  { name: 'clipboard monitoring', read: config.readClipboardUrlMonitorEnabledConfig, key: config.CLIPBOARD_URL_MONITOR_ENABLED_STORE_KEY, fallback: config.DEFAULT_CLIPBOARD_URL_MONITOR_ENABLED, valid: false },
  { name: 'clipboard detect mode', read: config.readClipboardUrlDetectModeConfig, key: config.CLIPBOARD_URL_DETECT_MODE_STORE_KEY, fallback: config.DEFAULT_CLIPBOARD_URL_DETECT_MODE, valid: 'https-only' },
  { name: 'clipboard blacklist', read: config.readClipboardUrlBlacklistConfig, key: config.CLIPBOARD_URL_BLACKLIST_STORE_KEY, fallback: config.DEFAULT_CLIPBOARD_URL_BLACKLIST, valid: ['https://example.com/path', 'example.com', 'second.org'], expected: ['example.com', 'second.org'] },
  { name: 'auto update prompt', read: config.readUpdateAutoPromptConfig, key: config.UPDATE_AUTO_PROMPT_STORE_KEY, fallback: true, valid: false },
  { name: 'startup animation', read: config.readStartupAnimationEnabledConfig, key: config.STARTUP_ANIMATION_ENABLED_STORE_KEY, fallback: true, valid: false },
  { name: 'disable frame rate limit', read: config.readDisableFrameRateLimitConfig, key: config.DISABLE_FRAME_RATE_LIMIT_STORE_KEY, fallback: false, valid: true },
  { name: 'first launch marker', read: config.readFirstLaunchConfig, key: config.FIRST_LAUNCH_STORE_KEY, fallback: true, valid: false, invalidExpected: false },
];
const storeDir = join('C:/isolated-user-data', 'eIsland_store');
beforeEach(() => { vi.resetAllMocks(); mocks.path.mockReturnValue('C:/isolated-user-data'); mocks.exists.mockReturnValue(true); mocks.read.mockReturnValue('null'); mocks.names.mockReturnValue(['normalized.exe']); vi.spyOn(console, 'error').mockImplementation(() => undefined); });
describe.each(reads)('$name persistence reader', ({ read, key, valid, fallback, expected, invalidExpected }) => {
  it('reads valid JSON from the exact user-data configuration key', () => { mocks.read.mockReturnValue(JSON.stringify(valid)); expect(read()).toEqual(expected ?? valid); expect(mocks.path).toHaveBeenCalledWith('userData'); expect(mocks.read).toHaveBeenCalledWith(join(storeDir, `${key}.json`), 'utf-8'); expect(mocks.write).not.toHaveBeenCalled(); });
  it('uses default when the configuration file does not exist', () => { mocks.exists.mockReturnValue(false); expect(read()).toEqual(fallback); expect(mocks.read).not.toHaveBeenCalled(); });
  it('uses default for malformed JSON', () => { mocks.read.mockReturnValue('{broken'); expect(read()).toEqual(fallback); });
  it('handles JSON null through the public value-validation branch', () => { expect(read()).toEqual(invalidExpected ?? fallback); });
  it.each(['path', 'exists', 'read'] as const)('uses default on %s I/O failure', (phase) => { const failure = new Error('I/O denied'); mocks[phase].mockImplementation(() => { throw failure; }); expect(read()).toEqual(fallback); expect(console.error).not.toHaveBeenCalled(); });
});
describe('reader value boundaries', () => {
  it.each(stringReads)('preserves an intentionally unbound empty $name string', ({ read }) => { mocks.read.mockReturnValue('""'); expect(read()).toBe(''); });
  it('filters non-string hidden-process entries before invoking the normalizer', () => { mocks.read.mockReturnValue('["A.exe",42,null,"B.exe"]'); expect(config.readHideProcessListConfig()).toEqual(['normalized.exe']); expect(mocks.names).toHaveBeenCalledWith(['A.exe', 'B.exe']); });
  it.each(['notch', 'pill'])('recognizes shape %s and rejects unsupported strings', (shape) => { mocks.read.mockReturnValue(JSON.stringify(shape)); expect(config.readIslandShapeModeConfig()).toBe(shape); mocks.read.mockReturnValue('"rounded"'); expect(config.readIslandShapeModeConfig()).toBe(config.DEFAULT_ISLAND_SHAPE_MODE); });
  it.each(['https-only', 'http-https', 'domain-only'])('recognizes clipboard mode %s', (mode) => { mocks.read.mockReturnValue(JSON.stringify(mode)); expect(config.readClipboardUrlDetectModeConfig()).toBe(mode); });
  it.each([['false', false], ['0', false], ['null', false], ['{}', false], ['[]', false]])('marks readable JSON %s as previously launched', (stored, expected) => { mocks.read.mockReturnValue(stored); expect(config.readFirstLaunchConfig()).toBe(expected); });
  it.each([[0, 0], [-5, 0], [0.4, 0], [0.6, 1000], [1000.4, 1000], [1000.6, 1001], [2000000, 1800000], ['1000', 0], [null, 0]] as const)('normalizes persisted SMTC %s to %s', (value, expected) => { mocks.read.mockReturnValue(JSON.stringify(value)); expect(config.readSmtcUnsubscribeMsConfig()).toBe(expected); });
  it.each([{ value: { x: 1.6, y: -1.6 }, expected: { x: 2, y: -2 } }, { value: { x: '10', y: null }, expected: { x: 0, y: 0 } }, { value: {}, expected: { x: 0, y: 0 } }])('normalizes persisted position $value', ({ value, expected }) => { mocks.read.mockReturnValue(JSON.stringify(value)); expect(config.readIslandPositionOffsetConfig()).toEqual(expected); });
  it('returns an independent default position object on each missing read', () => { mocks.exists.mockReturnValue(false); const first = config.readIslandPositionOffsetConfig(); first.x = 99; expect(config.readIslandPositionOffsetConfig()).toEqual({ x: 0, y: 0 }); expect(config.DEFAULT_ISLAND_POSITION_OFFSET).toEqual({ x: 0, y: 0 }); });
  it.each([{ value: '  -42  ', expected: '-42' }, { value: 7.9, expected: '7' }, { value: '1.5', expected: 'primary' }, { value: 'primary', expected: 'primary' }])('normalizes persisted display $value', ({ value, expected }) => { mocks.read.mockReturnValue(JSON.stringify(value)); expect(config.readIslandDisplaySelectionConfig()).toBe(expected); });
});
interface WriteCase { name: string; write: () => boolean; key: string; value: unknown; prefix: string; }
const writes: WriteCase[] = [
  { name: 'position', write: () => config.writeIslandPositionOffsetConfig({ x: 1.5, y: -2 }), key: config.ISLAND_POSITION_STORE_KEY, value: { x: 1.5, y: -2 }, prefix: '[IslandPosition] persist error:' },
  { name: 'display', write: () => config.writeIslandDisplaySelectionConfig(' 42 '), key: config.ISLAND_DISPLAY_STORE_KEY, value: '42', prefix: '[IslandDisplay] persist error:' },
  { name: 'shape', write: () => config.writeIslandShapeModeConfig('pill'), key: config.ISLAND_SHAPE_MODE_STORE_KEY, value: 'pill', prefix: '[IslandShapeMode] persist error:' },
  { name: 'first launch marker', write: config.writeFirstLaunchConfig, key: config.FIRST_LAUNCH_STORE_KEY, value: false, prefix: '[FirstLaunch] persist error:' },
];
describe.each(writes)('$name persistence writer', ({ write, key, value, prefix }) => {
  it.each([true, false])('persists JSON with existing directory=%s', (exists) => { mocks.exists.mockReturnValue(exists); expect(write()).toBe(true); expect(mocks.exists).toHaveBeenCalledWith(storeDir); expect(mocks.write).toHaveBeenCalledWith(join(storeDir, `${key}.json`), JSON.stringify(value, null, 2), 'utf-8'); if (exists) expect(mocks.mkdir).not.toHaveBeenCalled(); else expect(mocks.mkdir).toHaveBeenCalledWith(storeDir, { recursive: true }); });
  it.each(['path', 'exists', 'mkdir', 'write'] as const)('returns false and reports %s failure', (phase) => { const failure = new Error('cannot persist'); mocks.exists.mockReturnValue(false); mocks[phase].mockImplementation(() => { throw failure; }); expect(write()).toBe(false); expect(console.error).toHaveBeenCalledWith(prefix, failure); if (phase !== 'write') expect(mocks.write).not.toHaveBeenCalled(); });
});
describe('writer normalization and first-launch deletion', () => {
  it.each([{ value: 'notch', expected: 'notch' }, { value: 'pill', expected: 'pill' }, { value: 'invalid', expected: 'notch' }])('persists normalized shape $value', ({ value, expected }) => { expect(config.writeIslandShapeModeConfig(value)).toBe(true); expect(mocks.write).toHaveBeenCalledWith(join(storeDir, `${config.ISLAND_SHAPE_MODE_STORE_KEY}.json`), JSON.stringify(expected, null, 2), 'utf-8'); });
  it.each([{ value: 'primary', expected: 'primary' }, { value: '-8', expected: '-8' }, { value: 'abc', expected: 'primary' }])('persists normalized display $value', ({ value, expected }) => { expect(config.writeIslandDisplaySelectionConfig(value)).toBe(true); expect(mocks.write).toHaveBeenCalledWith(join(storeDir, `${config.ISLAND_DISPLAY_STORE_KEY}.json`), JSON.stringify(expected, null, 2), 'utf-8'); });
  it.each([true, false])('deletes marker when it exists=%s without touching missing files', (exists) => { mocks.exists.mockReturnValue(exists); expect(config.deleteFirstLaunchConfig()).toBe(true); expect(mocks.exists).toHaveBeenCalledWith(join(storeDir, `${config.FIRST_LAUNCH_STORE_KEY}.json`)); if (exists) expect(mocks.unlink).toHaveBeenCalledWith(join(storeDir, `${config.FIRST_LAUNCH_STORE_KEY}.json`)); else expect(mocks.unlink).not.toHaveBeenCalled(); });
  it.each(['path', 'exists', 'unlink'] as const)('returns false on marker deletion %s failure', (phase) => { const failure = new Error('cannot delete'); mocks[phase].mockImplementation(() => { throw failure; }); expect(config.deleteFirstLaunchConfig()).toBe(false); expect(console.error).toHaveBeenCalledWith('[FirstLaunch] delete error:', failure); });
});

describe('播放器白名单数组校验', () => {
  it('过滤数字、null、对象、数组和布尔值，仅保留原序字符串', () => {
    mocks.read.mockReturnValue(JSON.stringify([
      'QQMusic.exe',
      123,
      null,
      { name: 'invalid.exe' },
      ['nested.exe'],
      false,
      'cloudmusic.exe',
      true,
    ]));

    expect(config.readWhitelistConfig()).toEqual(['QQMusic.exe', 'cloudmusic.exe']);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it('保留空字符串、空白、重复项和字符串顺序', () => {
    const whitelist = ['QQMusic.exe', '', ' player.exe ', 'QQMusic.exe', ' '];
    mocks.read.mockReturnValue(JSON.stringify(whitelist));

    expect(config.readWhitelistConfig()).toEqual(whitelist);
    expect(mocks.names).not.toHaveBeenCalled();
  });

  it.each([
    { name: '空数组', value: [] },
    { name: '全部非字符串的数组', value: [0, 123, null, {}, ['nested.exe'], true, false] },
  ])('$name返回空白名单', ({ value }) => {
    mocks.read.mockReturnValue(JSON.stringify(value));

    expect(config.readWhitelistConfig()).toEqual([]);
    expect(config.readWhitelistConfig()).not.toEqual(config.DEFAULT_WHITELIST);
  });
});
