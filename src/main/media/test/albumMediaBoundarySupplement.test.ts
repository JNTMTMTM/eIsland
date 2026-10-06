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
 * @file albumMediaBoundarySupplement.test.ts
 * @description 相册媒体异常数据、目录状态、协议与流预缓冲边界测试。
 * @author 鸡哥
 */

import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAlbumMediaInfo, handleAlbumMediaRequest } from '../albumMedia';
const io = vi.hoisted(() => ({
  read: vi.fn<() => Promise<string>>(), isFile: vi.fn<() => boolean>(),
  stat: vi.fn<() => Promise<{ isFile: () => boolean; size: number }>>(),
  close: vi.fn<() => Promise<void>>(), open: vi.fn(),
  stream: vi.fn<() => Readable>(), size: 10,
}));
vi.mock('electron', () => ({ app: { getPath: () => 'C:/fixture-user' } }));
vi.mock('node:fs/promises', () => ({
  readFile: io.read, stat: io.stat,
  open: io.open,
}));
const file = resolve('C:/fixture-album.mp4');
const url = `eisland-media://album/${  encodeURIComponent(file)}`;
beforeEach(() => {
  vi.resetAllMocks(); io.size = 10; io.isFile.mockReturnValue(true);
  io.read.mockResolvedValue(JSON.stringify([{ path: file }]));
  io.close.mockResolvedValue(undefined);
  io.stat.mockImplementation(() => Promise.resolve({ isFile: io.isFile, size: io.size }));
  io.stream.mockImplementation(() => Readable.from([Buffer.from('0123456789')], { objectMode: false }));
  io.open.mockImplementation(() => Promise.resolve({ stat: io.stat, close: io.close, createReadStream: io.stream }));
});
describe('相册媒体校验和缓冲边界', () => {
  it.each(['{}', '[null,2,{},{"path":3}]'])('非法相册记录 %s 拒绝元数据请求', async (records) => {
    io.read.mockResolvedValue(records);
    await expect(getAlbumMediaInfo(file)).resolves.toBeNull(); expect(io.stat).not.toHaveBeenCalled();
  });
  it('目录元数据不作为视频返回', async () => {
    io.isFile.mockReturnValue(false);
    await expect(getAlbumMediaInfo(file)).resolves.toBeNull();
    const response = await handleAlbumMediaRequest(new Request(url));
    expect(response.status).toBe(404); expect(io.close).toHaveBeenCalledOnce(); expect(io.stream).not.toHaveBeenCalled();
  });
  it('元数据文件读取失败返回 null', async () => {
    io.read.mockRejectedValue(new Error('store unavailable'));
    await expect(getAlbumMediaInfo(file)).resolves.toBeNull();
  });
  it('错误协议不访问相册文件', async () => {
    expect((await handleAlbumMediaRequest(new Request('https://invalid.test/album'))).status).toBe(400);
    expect(io.read).not.toHaveBeenCalled();
  });
  it('零字节文件无响应流并关闭描述符', async () => {
    io.size = 0;
    const response = await handleAlbumMediaRequest(new Request(url));
    expect(response.status).toBe(200); expect(response.headers.get('content-length')).toBe('0');
    expect(response.body).toBeNull(); expect(io.close).toHaveBeenCalledOnce();
  });
  it('取消的请求在打开描述符前退出', async () => {
    const controller = new AbortController(); controller.abort();
    const response = await handleAlbumMediaRequest(new Request(url, { signal: controller.signal }));
    expect(response.status).toBe(404); expect(io.open).not.toHaveBeenCalled();
  });
  it.each(['bytes=9007199254740992-', 'bytes=0-9007199254740999'])('超出安全整数的 Range %s 不创建流', async (range) => {
    io.size = Number.MAX_SAFE_INTEGER + 100;
    const response = await handleAlbumMediaRequest(new Request(url, { headers: { range } }));
    expect(response.status).toBe(416); expect(io.stream).not.toHaveBeenCalled(); expect(io.close).toHaveBeenCalledOnce();
  });
  it('消费者延后读取时真实流策略缓存字节，再完整提供响应', async () => {
    const response = await handleAlbumMediaRequest(new Request(url));
    await setImmediate();
    expect(await response.text()).toBe('0123456789');
    expect(io.stream).toHaveBeenCalledOnce(); expect(io.close).not.toHaveBeenCalled();
  });
});
