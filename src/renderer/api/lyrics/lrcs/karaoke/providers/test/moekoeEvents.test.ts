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
 * @file moekoeEvents.test.ts
 * @description MoeKoe 逐字歌词真实解析与 WebSocket 消息、超时及连接失败边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchKaraokeFromMoeKoe } from '../moeKoe';
import createSocketFixture from '../../../test/socketFixture';

const lyricsData = 'a3JjMTjbGsglTcDm0Lewo2dTL8XNxu/m37P6xsxxW6PDWgtlpqKFdF7XM03S';
let sockets: ReturnType<typeof createSocketFixture>;
beforeEach(() => { vi.useFakeTimers(); sockets = createSocketFixture(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('real MoeKoe karaoke events', () => {
  it('parses a real server lyric packet and releases the receive timeout', async () => {
    const promise = fetchKaraokeFromMoeKoe('Song', 'Artist');
    expect(sockets[0].url).toBe('ws://127.0.0.1:6520');
    sockets[0].emit('open');
    sockets[0].emit('message', JSON.stringify({ type: 'lyrics', data: { lyricsData } }));
    expect((await promise)?.[0]).toMatchObject({ time_ms: 1000, text: 'Hello' });
    expect(vi.getTimerCount()).toBe(0);
    expect(sockets[0].readyState).toBe(3);
  });

  it.each(['', 'not json', JSON.stringify({ type: 'heartbeat' }), JSON.stringify({ type: 'lyrics' }), JSON.stringify({ type: 'lyrics', data: {} }), JSON.stringify({ type: 'lyrics', data: { lyricsData: '' } }), new Blob(['binary'])])('ignores unsupported message %s then accepts the next valid message', async (message) => {
    const promise = fetchKaraokeFromMoeKoe('Song', 'Artist');
    sockets[0].emit('message', message);
    expect(sockets[0].readyState).toBe(1);
    sockets[0].emit('message', JSON.stringify({ type: 'lyrics', data: { lyricsData } }));
    expect((await promise)?.[0].text).toBe('Hello');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['error', 'close'] as const)('returns null and cancels the timeout when the connection emits %s', async (type) => {
    const promise = fetchKaraokeFromMoeKoe('Song', 'Artist');
    sockets[0].emit(type);
    expect(await promise).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the resolved lyric result if closing the connection subsequently fails', async () => {
    const promise = fetchKaraokeFromMoeKoe('Song', 'Artist');
    sockets[0].closingError = true;
    sockets[0].emit('message', JSON.stringify({ type: 'lyrics', data: { lyricsData } }));
    expect((await promise)?.[0].text).toBe('Hello');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('times out without a lyric message and closes the client connection', async () => {
    const promise = fetchKaraokeFromMoeKoe('Song', 'Artist');
    await vi.advanceTimersByTimeAsync(2000);
    expect(await promise).toBeNull();
    expect(sockets[0].readyState).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a real encrypted single-syllable KRC packet', async () => {
    const promise = fetchKaraokeFromMoeKoe('Song', 'Artist');
    sockets[0].emit('message', JSON.stringify({ type: 'lyrics', data: { lyricsData: 'a3JjMTjbGsglTcDm0Lewo2dTL8VN37NG7sE8ipj/Ni1PTWY2' } }));
    expect((await promise)?.[0]).toMatchObject({ time_ms: 1000, text: 'Hello', syllables: [{ start_offset_ms: 0, duration_ms: 500, text: 'Hello' }] });
  });

  it('returns null when the received lyric cannot produce a timed line', async () => {
    const promise = fetchKaraokeFromMoeKoe('Song', 'Artist');
    sockets[0].emit('message', JSON.stringify({ type: 'lyrics', data: { lyricsData: 'a3JjMTjbGsglTR0ZGFBfR0SQJwMFTmE2rDUx' } }));
    expect(await promise).toBeNull();
  });

  it('catches malformed server lyric data at the public boundary', async () => {
    const promise = fetchKaraokeFromMoeKoe('Song', 'Artist');
    sockets[0].emit('message', JSON.stringify({ type: 'lyrics', data: { lyricsData: 42 } }));
    expect(await promise).toBeNull();
  });
});
