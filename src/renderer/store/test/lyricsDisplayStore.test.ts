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
 * @file lyricsDisplayStore.test.ts
 * @description 歌词功能开关共享状态的读取、跨窗口广播与本窗口事件同步测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LYRICS_ENABLED_CHANNEL, isSongTitleMode, subscribeLyricsEnabled, useLyricsDisplayStore } from '../lyricsDisplayStore';

let broadcast: ((channel: string, value: unknown) => void) | null = null;
const unsubscribe = vi.fn(() => { broadcast = null; });
const surface = new EventTarget();
const api = {
  musicLyricsEnabledGet: vi.fn(() => Promise.resolve(false)),
  onSettingsChanged: vi.fn((callback: (channel: string, value: unknown) => void) => { broadcast = callback; return unsubscribe; }),
};

beforeEach(() => {
  useLyricsDisplayStore.setState({ lyricsEnabled: true });
  vi.stubGlobal('window', Object.assign(surface, { api }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('lyricsDisplayStore', () => {
  it('loads the saved switch and follows broadcasts and local events until unsubscribed', async () => {
    const stop = subscribeLyricsEnabled();
    await Promise.resolve();
    await Promise.resolve();
    expect(isSongTitleMode()).toBe(true);

    broadcast?.(LYRICS_ENABLED_CHANNEL, true);
    expect(isSongTitleMode()).toBe(false);
    broadcast?.('music:lyrics-karaoke', false);
    broadcast?.(LYRICS_ENABLED_CHANNEL, 'bad');
    expect(isSongTitleMode()).toBe(false);

    surface.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: LYRICS_ENABLED_CHANNEL, value: false } }));
    expect(isSongTitleMode()).toBe(true);

    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
    surface.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: LYRICS_ENABLED_CHANNEL, value: true } }));
    expect(isSongTitleMode()).toBe(true);
  });

  it('keeps the default when the saved value cannot be read', async () => {
    api.musicLyricsEnabledGet.mockRejectedValueOnce(new Error('ipc'));
    subscribeLyricsEnabled()();
    await Promise.resolve();
    await Promise.resolve();
    expect(isSongTitleMode()).toBe(false);
  });
});
