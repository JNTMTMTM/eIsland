/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file index.test.ts
 * @description 汽水受限音频代理注册与 Range 响应测试。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupQishuiAudioSources, handleQishuiAudioRequest, registerQishuiAudioSource } from '../index';

const decryptAudio = vi.hoisted(() => vi.fn((buffer: Buffer) => ({ buffer, contentType: 'audio/mp4' })));
vi.mock('../decrypt', () => ({ decryptQishuiAudio: decryptAudio }));

describe('qishui audio proxy', () => {
  afterEach(async () => {
    await cleanupQishuiAudioSources();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not expose source URL in renderer-facing playback URL', () => {
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/song.m4a');
    expect(playbackUrl).toMatch(/^eisland-qishui:\/\/audio\/[0-9a-f-]+$/);
    expect(playbackUrl).not.toContain('audio.example.com');
  });

  it('rejects non-HTTPS upstream sources', () => {
    expect(() => registerQishuiAudioSource('http://audio.example.com/song.m4a')).toThrow('QISHUI_AUDIO_URL_INVALID');
  });

  it('serves a byte range for an unencrypted source', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(Buffer.from('abcdef'), {
      status: 200,
      headers: { 'content-type': 'audio/mp4' },
    })));
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/song.m4a');
    const response = await handleQishuiAudioRequest(new Request(playbackUrl, {
      headers: { Range: 'bytes=1-3' },
    }));

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 1-3/6');
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('bcd');
  });

  it('returns the first unencrypted response before the complete audio has downloaded', async () => {
    const upstream = new Response(new ReadableStream({ start: () => {} }));
    const readAll = vi.spyOn(upstream, 'arrayBuffer');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstream));
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/large.mp3');
    const response = await handleQishuiAudioRequest(new Request(playbackUrl));

    expect(response.status).toBe(200);
    expect(readAll).not.toHaveBeenCalled();
    await response.body!.cancel();
  });

  it('shares a complete encrypted download and reuses decrypted disk data for seeks', async () => {
    const fetchAudio = vi.fn().mockResolvedValue(new Response('abcdef'));
    vi.stubGlobal('fetch', fetchAudio);
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/song.m4a', 'key');
    const [first, second] = await Promise.all([
      handleQishuiAudioRequest(new Request(playbackUrl, { headers: { Range: 'bytes=0-2' } })),
      handleQishuiAudioRequest(new Request(playbackUrl, { headers: { Range: 'bytes=3-5' } })),
    ]);

    expect(await first.text()).toBe('abc');
    expect(await second.text()).toBe('def');
    const suffix = await handleQishuiAudioRequest(new Request(playbackUrl, { headers: { Range: 'bytes=-2' } }));
    expect(suffix.headers.get('content-range')).toBe('bytes 4-5/6');
    expect(await suffix.text()).toBe('ef');
    expect(fetchAudio).toHaveBeenCalledTimes(1);
    expect(fetchAudio.mock.calls[0][1]).not.toHaveProperty('headers');
    expect(decryptAudio).toHaveBeenCalledTimes(1);
  });

  it('bounds registered sources and evicts expired tokens without another registration', async () => {
    vi.useFakeTimers();
    const oldest = registerQishuiAudioSource('https://audio.example.com/old.m4a');
    let newest = '';
    for (let index = 0; index < 32; index += 1) {
      newest = registerQishuiAudioSource(`https://audio.example.com/${index}.m4a`);
    }
    expect((await handleQishuiAudioRequest(new Request(oldest))).status).toBe(404);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect((await handleQishuiAudioRequest(new Request(newest))).status).toBe(404);
  });

  it('cancels an oversized encrypted response before buffering it', async () => {
    const cancel = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel }), {
      headers: { 'content-length': String(128 * 1024 * 1024 + 1) },
    })));
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/large.m4a', 'key');

    expect((await handleQishuiAudioRequest(new Request(playbackUrl))).status).toBe(502);
    expect(cancel).toHaveBeenCalled();
    expect(decryptAudio).not.toHaveBeenCalled();
  });

  it('also bounds encrypted audio with missing content-length', async () => {
    const cancel = vi.fn();
    const chunk = new Uint8Array(1024 * 1024);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({
      cancel, pull: (controller) => controller.enqueue(chunk),
    }))));
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/unbounded.m4a', 'key');

    expect((await handleQishuiAudioRequest(new Request(playbackUrl))).status).toBe(502);
    expect(cancel).toHaveBeenCalled();
    expect(decryptAudio).not.toHaveBeenCalled();
  });

  it('aborts a shared download only after all waiting requests have been cancelled', async () => {
    let upstreamSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
      expect(url).toBe('https://audio.example.com/song.m4a');
      upstreamSignal = options.signal as AbortSignal;
      // eslint-disable-next-line @typescript-eslint/naming-convention -- 挂起的下载仅通过取消失败，保留 Promise 参数占位。
      return new Promise((_resolve, reject) => {
        upstreamSignal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    }));
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/song.m4a', 'key');
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = handleQishuiAudioRequest(new Request(playbackUrl, { signal: firstController.signal }));
    const second = handleQishuiAudioRequest(new Request(playbackUrl, { signal: secondController.signal }));
    await Promise.resolve();
    firstController.abort();
    await first;
    expect(upstreamSignal!.aborted).toBe(false);
    secondController.abort();
    await second;
    expect(upstreamSignal!.aborted).toBe(true);
  });

  it('detaches the first request cancellation after an unencrypted fallback becomes shared', async () => {
    let source: ReadableStreamDefaultController<Uint8Array> | undefined;
    const fetchAudio = vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start: (controller) => { source = controller; },
    })));
    vi.stubGlobal('fetch', fetchAudio);
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/song.m4a');
    const controller = new AbortController();
    const first = handleQishuiAudioRequest(new Request(playbackUrl, {
      signal: controller.signal, headers: { Range: 'bytes=0-2' },
    }));
    await Promise.resolve();
    await Promise.resolve();
    const second = handleQishuiAudioRequest(new Request(playbackUrl, { headers: { Range: 'bytes=3-5' } }));
    controller.abort();
    expect((await first).status).toBe(502);
    expect(fetchAudio.mock.calls[0][1]!.signal!.aborted).toBe(false);

    source!.enqueue(new TextEncoder().encode('abcdef'));
    source!.close();
    const response = await second;
    expect(response.status).toBe(206);
    expect(await response.text()).toBe('def');
    expect(fetchAudio).toHaveBeenCalledTimes(1);
  });

  it('cancels an unencrypted fallback during cleanup and rejects work racing shutdown', async () => {
    const cancel = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel }))));
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/song.m4a');
    const pending = handleQishuiAudioRequest(new Request(playbackUrl, { headers: { Range: 'bytes=0-2' } }));
    await Promise.resolve();
    await Promise.resolve();
    const cleanup = cleanupQishuiAudioSources();

    expect(() => registerQishuiAudioSource('https://audio.example.com/next.m4a')).toThrow('QISHUI_AUDIO_SHUTTING_DOWN');
    expect((await handleQishuiAudioRequest(new Request(playbackUrl))).status).toBe(503);
    await cleanup;
    expect((await pending).status).toBe(502);
    expect(cancel).toHaveBeenCalled();
  });

  it('does not recreate cached audio when response headers arrive after cleanup', async () => {
    let releaseResponse: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      releaseResponse = resolve;
    })));
    const playbackUrl = registerQishuiAudioSource('https://audio.example.com/song.m4a');
    const pending = handleQishuiAudioRequest(new Request(playbackUrl, { headers: { Range: 'bytes=0-2' } }));
    await cleanupQishuiAudioSources();
    const cancel = vi.fn();
    releaseResponse!(new Response(new ReadableStream({ cancel })));

    expect((await pending).status).toBe(404);
    expect(cancel).toHaveBeenCalled();
  });
});
