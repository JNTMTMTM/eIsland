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
import { handleQishuiAudioRequest, registerQishuiAudioSource } from '../index';

describe('qishui audio proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});