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
 * @file musicSettings.test.ts
 * @description 音乐偏好读取、缺失与损坏配置回退及持久化失败测试。
 * @author 鸡哥
 */

import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMusicIpcHandlers } from '../music';
type Handler = (event: unknown, ...args: unknown[]) => unknown;
const io = vi.hoisted(() => ({ handlers: new Map<string, Handler>(), files: new Map<string, string>(), read: vi.fn<(file: string) => string>(), write: vi.fn<(file: string, content: string, encoding: string) => void>(), broadcast: vi.fn() }));
vi.mock('electron', () => ({ ipcMain: { handle: (channel: string, handler: Handler) => io.handlers.set(channel, handler) } }));
vi.mock('fs', () => ({ existsSync: (file: string) => io.files.has(file), readFileSync: io.read, writeFileSync: io.write }));
vi.mock('../../../utils/broadcast', () => ({ broadcastSettingChange: io.broadcast }));
const event = { sender: { id: 42 } };
/**
 * 调用真实注册函数创建的 IPC 处理器。
 * @param channel - IPC 通道名
 * @param args - 请求参数
 * @returns 真实处理器的结果
 */
function invoke(channel: string, ...args: unknown[]): unknown { return io.handlers.get(channel)!(event, ...args); }
beforeEach(() => {
  io.handlers.clear(); io.files.clear(); io.read.mockReset(); io.read.mockImplementation((file) => io.files.get(file) ?? ''); io.write.mockReset(); io.broadcast.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  registerMusicIpcHandlers({ storeDir: 'C:/store', whitelistStoreKey: 'whitelist', lyricsSourceStoreKey: 'source', providerModeStoreKey: 'provider', lyricsKaraokeStoreKey: 'karaoke', lyricsClockStoreKey: 'clock', lyricsCalibrateEnabledStoreKey: 'calibrate', lyricsCalibrateDelayStoreKey: 'delay', lyricsEnabledStoreKey: 'enabled', lyricsTranslationEnabledStoreKey: 'translation', smtcUnsubscribeStoreKey: 'unsubscribe', defaultLyricsKaraoke: false, defaultLyricsClock: true, defaultLyricsCalibrateEnabled: false, defaultLyricsCalibrateDelay: 20, getWhitelist: () => [], setWhitelist: () => {}, readLyricsSourceConfig: () => 'auto', getSmtcUnsubscribeMs: () => 2000, setSmtcUnsubscribeMs: () => {}, sanitizeSmtcUnsubscribeMs: () => 2000, detectAllSources: () => Promise.resolve([]) });
});
describe('Music provider mode persistence', () => {
  it.each([[undefined, 'guest'], ['"logged-in"', 'logged-in'], ['"guest"', 'guest'], ['"invalid"', 'guest'], ['null', 'guest'], ['{broken', 'guest']])('reads %s with safe mode %s', (stored, expected) => {
    if (stored !== undefined) io.files.set(join('C:/store', 'provider.json'), stored);
    expect(invoke('music:provider-mode:get')).toBe(expected);
  });
  it('returns guest when the provider configuration is unreadable', () => {
    io.files.set(join('C:/store', 'provider.json'), '"logged-in"'); io.read.mockImplementationOnce(() => { throw new Error('denied'); }); expect(invoke('music:provider-mode:get')).toBe('guest');
  });
  it.each([['logged-in', 'logged-in'], ['guest', 'guest'], ['invalid', 'guest']])('stores normalized mode %s', (mode, expected) => {
    expect(invoke('music:provider-mode:set', mode)).toBe(true); expect(io.write).toHaveBeenCalledWith(join('C:/store', 'provider.json'), JSON.stringify(expected, null, 2), 'utf-8');
  });
  it('reports a provider write failure', () => { io.write.mockImplementationOnce(() => { throw new Error('full'); }); expect(invoke('music:provider-mode:set', 'logged-in')).toBe(false); });
});
const flags = [{ channel: 'lyrics-calibrate-enabled', key: 'calibrate', fallback: false }, { channel: 'lyrics-enabled', key: 'enabled', fallback: true }, { channel: 'lyrics-translation-enabled', key: 'translation', fallback: true }];
describe.each(flags)('Music $channel preference', ({ channel, key, fallback }) => {
  it.each([undefined, 'true', 'false', '0', 'null', '{broken'])('reads %s with the configured default', (stored) => {
    if (stored !== undefined) io.files.set(join('C:/store', `${key  }.json`), stored);
    const expected = stored === 'true' || (stored !== 'false' && fallback);
    expect(invoke(`music:${  channel  }:get`)).toBe(expected);
  });
  it('uses the default after a read error', () => { io.files.set(join('C:/store', `${key  }.json`), 'true'); io.read.mockImplementationOnce(() => { throw new Error('denied'); }); expect(invoke(`music:${  channel  }:get`)).toBe(fallback); });
  it.each([true, false])('persists %s using the correct setting key', (value) => { expect(invoke(`music:${  channel  }:set`, value)).toBe(true); expect(io.write).toHaveBeenCalledWith(join('C:/store', `${key  }.json`), JSON.stringify(value, null, 2), 'utf-8'); });
  it('returns false after a persistence failure', () => { io.write.mockImplementationOnce(() => { throw new Error('full'); }); expect(invoke(`music:${  channel  }:set`, true)).toBe(false); });
});
describe('Music lyric calibration delay boundaries', () => {
  it.each([[undefined, 20], ['0', 0], ['12.5', 12.5], ['-1', 20], ['"5"', 20], ['null', 20], ['{broken', 20]])('reads %s as %s seconds', (stored, expected) => {
    if (stored !== undefined) io.files.set(join('C:/store', 'delay.json'), stored);
    expect(invoke('music:lyrics-calibrate-delay:get')).toBe(expected);
  });
  it('falls back when the delay configuration cannot be read', () => { io.files.set(join('C:/store', 'delay.json'), '1'); io.read.mockImplementationOnce(() => { throw new Error('denied'); }); expect(invoke('music:lyrics-calibrate-delay:get')).toBe(20); });
  it.each([[0, 0], [12.9, 12], [-1, 20], ['5', 20], [null, 20], [NaN, 20]])('sanitizes delay %s to %s', (input, expected) => { expect(invoke('music:lyrics-calibrate-delay:set', input)).toBe(true); expect(io.write).toHaveBeenCalledWith(join('C:/store', 'delay.json'), JSON.stringify(expected, null, 2), 'utf-8'); });
  it('reports a delay persistence failure', () => { io.write.mockImplementationOnce(() => { throw new Error('full'); }); expect(invoke('music:lyrics-calibrate-delay:set', 5)).toBe(false); });
});
