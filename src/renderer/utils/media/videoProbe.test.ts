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
 * @file videoProbe.test.ts
 * @description 视频探测解码资源、超时与封面大小回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import probeVideo from './videoProbe';

let video: {
  src: string;
  videoWidth: number;
  videoHeight: number;
  duration: number;
  onloadedmetadata: (() => void) | null;
  onloadeddata: (() => void) | null;
  onerror: (() => void) | null;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  removeAttribute: ReturnType<typeof vi.fn>;
};
const drawImage = vi.fn();
const createElement = vi.fn();
let canvas: { width: number; height: number; getContext: ReturnType<typeof vi.fn>; toDataURL: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.useFakeTimers();
  video = {
    src: '', videoWidth: 3840, videoHeight: 2160, duration: 12,
    onloadedmetadata: null, onloadeddata: null, onerror: null,
    pause: vi.fn(), load: vi.fn(), removeAttribute: vi.fn(),
  };
  canvas = { width: 0, height: 0, getContext: vi.fn(() => ({ drawImage })), toDataURL: vi.fn(() => 'data:poster') };
  createElement.mockImplementation((tag: string) => tag === 'video' ? video : canvas);
  vi.stubGlobal('document', { createElement });
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('video probe resources', () => {
  it('releases the decoder and handlers once metadata is available', async () => {
    const result = probeVideo('eisland-media://album/video', new AbortController().signal);
    video.onloadedmetadata?.();
    expect(await result).toEqual({ width: 3840, height: 2160, durationSec: 12 });
    expect(video.pause).toHaveBeenCalledOnce();
    expect(video.removeAttribute).toHaveBeenCalledWith('src');
    expect(video.load).toHaveBeenCalledOnce();
    expect(video.onloadedmetadata).toBeNull();
    expect(video.onerror).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['abort', 'error', 'timeout'])('releases failed probes on %s', async (reason) => {
    const controller = new AbortController();
    const result = probeVideo('eisland-media://album/video', controller.signal);
    if (reason === 'abort') controller.abort();
    if (reason === 'error') video.onerror?.();
    if (reason === 'timeout') await vi.advanceTimersByTimeAsync(15000);
    expect(await result).toBeNull();
    expect(video.load).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not create a decoder when the caller has already left', async () => {
    const controller = new AbortController();
    controller.abort();
    expect(await probeVideo('url', controller.signal)).toBeNull();
    expect(createElement).not.toHaveBeenCalled();
  });

  it('downscales 4K posters and releases their canvas backing store', async () => {
    const result = probeVideo('url', new AbortController().signal, true);
    video.onloadeddata?.();
    expect((await result)?.poster).toBe('data:poster');
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 360);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(video.onloadeddata).toBeNull();
  });
});
