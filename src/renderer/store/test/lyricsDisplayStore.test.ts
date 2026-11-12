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
import { LYRICS_ENABLED_CHANNEL, isSongTitleMode, resolveLyricsEnabled, subscribeLyricsEnabled, useLyricsDisplayStore } from '../lyricsDisplayStore';

let broadcast: ((channel: string, value: unknown) => void) | null = null;
const unsubscribe = vi.fn(() => { broadcast = null; });
const surface = new EventTarget();
const api = {
  musicLyricsEnabledGet: vi.fn(() => Promise.resolve(false)),
  onSettingsChanged: vi.fn((callback: (channel: string, value: unknown) => void) => { broadcast = callback; return unsubscribe; }),
};

/**
 * 等待已排队的 Promise 回调执行完毕。
 * @returns 队列清空的 Promise。
 */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  useLyricsDisplayStore.setState({ lyricsEnabled: null });
  vi.stubGlobal('window', Object.assign(surface, { api }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('lyricsDisplayStore', () => {
  it('starts unknown, which is not title mode', () => {
    expect(useLyricsDisplayStore.getState().lyricsEnabled).toBeNull();
    expect(isSongTitleMode()).toBe(false);
  });

  it('loads the saved switch and follows broadcasts and local events until unsubscribed', async () => {
    const stop = subscribeLyricsEnabled();
    await flush();
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

  it('ignores a saved read that resolves after a newer settings event', async () => {
    let resolveRead: (value: boolean) => void = () => {};
    api.musicLyricsEnabledGet.mockReturnValueOnce(new Promise((resolve) => { resolveRead = resolve; }));
    subscribeLyricsEnabled();
    broadcast?.(LYRICS_ENABLED_CHANNEL, false);
    resolveRead(true);
    await flush();
    expect(useLyricsDisplayStore.getState().lyricsEnabled).toBe(false);
  });

  it('treats a failed read as disabled so no lyric requests start', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.musicLyricsEnabledGet.mockRejectedValueOnce(new Error('ipc'));
    await expect(resolveLyricsEnabled()).resolves.toBe(false);
    expect(isSongTitleMode()).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it('shares one native read between concurrent callers and skips reading once known', async () => {
    api.musicLyricsEnabledGet.mockResolvedValueOnce(true);
    await expect(Promise.all([resolveLyricsEnabled(), resolveLyricsEnabled()])).resolves.toEqual([true, true]);
    await resolveLyricsEnabled();
    expect(api.musicLyricsEnabledGet).toHaveBeenCalledOnce();
  });
});
