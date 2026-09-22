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
 * @file albumMedia.test.ts
 * @description 相册视频流式读取与路径边界回归测试。
 * @author 鸡哥
 */

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAlbumMediaInfo, handleAlbumMediaRequest } from './albumMedia';
import type { ReadStream } from 'node:fs';

const { readFile, stat, streams } = vi.hoisted(() => ({ readFile: vi.fn(), stat: vi.fn(), streams: [] as ReadStream[] }));
vi.mock('electron', () => ({ app: { getPath: () => '/user-data' } }));
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  const overrides = { readFile, stat };
  return {
    ...original, ...overrides,
    open: async (...args: Parameters<typeof original.open>) => {
      const file = await original.open(...args);
      const createReadStream = file.createReadStream.bind(file);
      vi.spyOn(file, 'createReadStream').mockImplementation((options) => {
        const stream = createReadStream(options);
        streams.push(stream);
        return stream;
      });
      return file;
    },
  };
});
let testDirectory: string;
let videoPath: string;
let videoUrl: string;

beforeAll(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), 'eisland-album-test-'));
  videoPath = join(testDirectory, '相册 #1.mp4');
  videoUrl = `eisland-media://album/${encodeURIComponent(videoPath)}`;
  await writeFile(videoPath, Buffer.from('0123456789'));
});
afterAll(async () => {
  if (testDirectory.startsWith(join(tmpdir(), 'eisland-album-test-'))) {
    await rm(testDirectory, { recursive: true, force: true });
  }
});
beforeEach(() => {
  streams.length = 0;
  readFile.mockResolvedValue(JSON.stringify([{ path: videoPath, mediaType: 'video' }]));
  stat.mockResolvedValue({ isFile: () => true, size: 4 * 1024 ** 3 });
});
afterEach(() => vi.unstubAllEnvs());

describe('album media streaming', () => {
  it('returns metadata for a multi-gigabyte video without reading its contents', async () => {
    expect(await getAlbumMediaInfo(videoPath)).toEqual({ url: videoUrl, sizeBytes: 4 * 1024 ** 3 });
    expect(readFile).toHaveBeenCalledOnce();
    expect(readFile.mock.calls[0][0]).toMatch(/photo-album-items\.json$/);
    expect(stat).toHaveBeenCalledWith(videoPath);
  });

  it.each([
    ['bytes=2-5', '2345', 'bytes 2-5/10'],
    ['bytes=7-', '789', 'bytes 7-9/10'],
    ['bytes=-2', '89', 'bytes 8-9/10'],
  ])('streams only the requested range %s', async (range, expected, contentRange) => {
    const response = await handleAlbumMediaRequest(new Request(videoUrl, { headers: { Range: range } }));
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe(contentRange);
    expect(response.headers.get('content-length')).toBe(String(expected.length));
    expect(await response.text()).toBe(expected);
  });

  it('supports HEAD without opening a response stream', async () => {
    const response = await handleAlbumMediaRequest(new Request(videoUrl, { method: 'HEAD' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('10');
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.body).toBeNull();
  });

  it('streams a full file without buffering it in the handler', async () => {
    const response = await handleAlbumMediaRequest(new Request(videoUrl));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('0123456789');
  });

  it.each(['null', 'http://localhost:5173'])('permits canvas posters from the renderer origin %s', async (origin) => {
    vi.stubEnv('ELECTRON_RENDERER_URL', 'http://localhost:5173');
    const response = await handleAlbumMediaRequest(new Request(videoUrl, { method: 'HEAD', headers: { Origin: origin } }));
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
  });

  it('does not grant canvas access to an unrelated website', async () => {
    const response = await handleAlbumMediaRequest(new Request(videoUrl, {
      method: 'HEAD', headers: { Origin: 'https://unrelated.example' },
    }));
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it.each(['bytes=20-30', 'bytes=-0', 'bytes=-', 'bytes=7-3', 'invalid'])('rejects invalid ranges %s', async (range) => {
    const response = await handleAlbumMediaRequest(new Request(videoUrl, { headers: { Range: range } }));
    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe('bytes */10');
    expect(response.body).toBeNull();
  });

  it('closes the underlying descriptor when Chromium cancels a response body', async () => {
    const response = await handleAlbumMediaRequest(new Request(videoUrl));
    expect(streams).toHaveLength(1);
    const closed = new Promise<void>((resolveClose) => { streams[0].once('close', resolveClose); });
    await response.body?.cancel();
    await closed;
    expect(streams[0].destroyed).toBe(true);
    expect(streams[0].closed).toBe(true);
  });

  it('rejects files removed from the album even if their URL was issued earlier', async () => {
    expect(await getAlbumMediaInfo(videoPath)).not.toBeNull();
    readFile.mockResolvedValue('[]');
    expect((await handleAlbumMediaRequest(new Request(videoUrl))).status).toBe(403);
  });

  it.each(['../outside.mp4', resolve('outside.mp4'), resolve('secret.txt')])('rejects unapproved paths %s', async (path) => {
    expect(await getAlbumMediaInfo(path)).toBeNull();
    expect(stat).not.toHaveBeenCalled();
  });

  it('rejects invalid methods and malformed URLs', async () => {
    expect((await handleAlbumMediaRequest(new Request(videoUrl, { method: 'POST' }))).status).toBe(405);
    expect((await handleAlbumMediaRequest(new Request('eisland-media://album/%zz'))).status).toBe(404);
  });
});
