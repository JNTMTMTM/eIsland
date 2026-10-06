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
 * @file smtcEntryRuntime.test.ts
 * @description SMTC 真实入口的播放控制命令、原生失败文案和快照标准化契约测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
const file = fileURLToPath(new URL('../index.js', import.meta.url));
const json = vi.fn<(name: string) => unknown>(); const error = vi.fn<() => string>();
const commands = new Map<string, ReturnType<typeof vi.fn<(...args: unknown[]) => number>>>();
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
let fixture: NativeRuntimeFixture; let api: Record<string, (...args: unknown[]) => unknown>;
const routes = [
  ['play', 'smtc_play', 'Play failed.', []], ['pause', 'smtc_pause', 'Pause failed.', []],
  ['next', 'smtc_next', 'Next failed.', []], ['previous', 'smtc_previous', 'Previous failed.', []],
  ['seek', 'smtc_seek', 'Seek failed.', [42.5]], ['stop', 'smtc_stop', 'Stop failed.', []],
  ['setShuffle', 'smtc_set_shuffle', 'Set shuffle failed.', [true]], ['setRepeatMode', 'smtc_set_repeat_mode', 'Set repeat mode failed.', [2]],
  ['setPlaybackRate', 'smtc_set_playback_rate', 'Set playback rate failed.', [1.25]]
] as const;
beforeEach(() => { vi.resetAllMocks(); commands.clear(); Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  routes.forEach(([, nativeName]) => commands.set(nativeName, vi.fn<(...args: unknown[]) => number>(() => 0)));
  const smtc = Object.fromEntries(commands); fixture = createNativeRuntimeFixture(file, new Map<string, unknown>([['./ffi-loader', { smtc, callJson: json, getLastError: error }]])); api = fixture.read<typeof api>();
});
afterEach(() => { fixture.dispose(); vi.restoreAllMocks(); if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform); });
describe('SMTC 播放命令和快照标准化', () => {
  it.each(routes)('%s 的成功、原生失败消息和空错误默认文案', (method, nativeName, fallback, args) => {
    expect(api[method]?.(...args)).toEqual({ success: true, error: null });
    expect(commands.get(nativeName)).toHaveBeenCalledWith(...(method === 'setShuffle' ? [1] : args));
    commands.get(nativeName)?.mockReturnValue(1); error.mockReturnValue('native rejected');
    expect(api[method]?.(...args)).toEqual({ success: false, error: 'native rejected' });
    error.mockReturnValue(''); expect(api[method]?.(...args)).toEqual({ success: false, error: fallback });
  });
  it('shuffle false 传递零，非 Windows 初始化拒绝加载', () => {
    api.setShuffle?.(false); expect(commands.get('smtc_set_shuffle')).toHaveBeenCalledWith(0);
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' }); expect(fixture.read).toThrow('only supports Windows');
  });
  it.each([null, {}, { isAvailable: 'true' }, { isAvailable: false }, { isAvailable: true, title: 'fixture', playbackStatus: 'playing' }])('状态原生载荷 %j 仅接受可用合法快照', (raw) => {
    json.mockReturnValue(raw); const result = api.getStatus?.();
    if (raw && raw.isAvailable === true) expect(result).toBe(raw);
    else { expect(result).toMatchObject({ isAvailable: false, title: null, playbackStatus: 'unknown', timeline: null }); expect(Object.isFrozen(result)).toBe(true); }
    expect(json).toHaveBeenCalledWith('smtc_get_status');
  });
  it.each([null, {}, { isAvailable: 'true' }, { isAvailable: false }, { isAvailable: true, playbackStatus: 'playing', timeline: { position: 1 } }])('时间戳原生载荷 %j 仅接受可用合法快照', (raw) => {
    json.mockReturnValue(raw); const result = api.getTimestamp?.();
    if (raw && raw.isAvailable === true) expect(result).toBe(raw);
    else { expect(result).toEqual({ isAvailable: false, playbackStatus: 'unknown', timeline: null }); expect(Object.isFrozen(result)).toBe(true); }
    expect(json).toHaveBeenCalledWith('smtc_get_timestamp');
  });
});
