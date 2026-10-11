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
 * @file downloadEngineSupplement.test.ts
 * @description 下载引擎真实拆片、恢复、取消、流读取与文件清理边界测试。
 * @author 鸡哥
 */

import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiThreadDownloadEngine } from '../downloadEngine';
import { MIN_CHUNK_BYTES } from '../downloadEngine/config';
import type { DownloadTaskSnapshot } from '../../types/core/DownloadTaskSnapshot';

const io = vi.hoisted(() => ({
  uuid: 0,
  exists: vi.fn<() => boolean>(),
  mkdir: vi.fn<() => Promise<void>>(),
  open: vi.fn<() => Promise<{ write: (bytes: Uint8Array) => Promise<void>; close: () => Promise<void> }>>(),
  rename: vi.fn<() => Promise<void>>(),
  rm: vi.fn<() => Promise<void>>(),
  stat: vi.fn<() => Promise<{ size: number }>>(),
  unlink: vi.fn<() => Promise<void>>(),
  write: vi.fn<(bytes: Uint8Array) => Promise<void>>(),
  close: vi.fn<() => Promise<void>>(),
  fetch: vi.fn<typeof fetch>(),
}));
vi.mock('crypto', () => ({ randomUUID: () => `download-fixture-${++io.uuid}` }));
vi.mock('fs/promises', () => ({
  mkdir: io.mkdir, open: io.open, rename: io.rename, rm: io.rm, stat: io.stat, unlink: io.unlink,
}));
vi.mock('fs', () => ({
  existsSync: io.exists,
  createReadStream: () => Readable.from([Buffer.from('part')]),
  createWriteStream: () => new Writable({ write(bytes, encoding, callback) { void bytes; void encoding; callback(); } }),
}));

/**
 * 构造具备真实 Headers、ReadableStream 与状态一致性的 HTTP 响应。
 * @param size - HEAD 长度。
 * @param range - 是否声明支持分片。
 * @returns HEAD 响应。
 */
function head(size = 10, range = false): Response {
  return new Response(null, { headers: { 'content-length': String(size), 'accept-ranges': range ? 'bytes' : 'none' } });
}

/**
 * 等待下载内部异步任务与文件流结束。
 * @returns 等待完成的 Promise。
 */
async function settle(): Promise<void> {
  // eslint-disable-next-line no-await-in-loop -- 每次事件循环用于等待真实流结束及下一轮异步清理。
  for (let index = 0; index < 8; index++) await new Promise<void>((resolve) => setImmediate(resolve));
}

/**
 * 构造数据与结束事件可控制的真实下载流。
 * @param onPull - 读取结束前的外部任务操作。
 * @param bytes - 下载数据。
 * @returns 下载响应。
 */
function data(onPull?: () => void, bytes = new Uint8Array([1, 2, 3])): Response {
  let emitted = false;
  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!emitted) {
        emitted = true;
        controller.enqueue(bytes);
      } else {
        onPull?.();
        controller.close();
      }
    },
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  io.uuid = 0;
  io.exists.mockReturnValue(false);
  io.mkdir.mockResolvedValue();
  io.rename.mockResolvedValue();
  io.rm.mockResolvedValue();
  io.unlink.mockResolvedValue();
  io.stat.mockRejectedValue(new Error('ENOENT'));
  io.write.mockResolvedValue();
  io.close.mockResolvedValue();
  io.open.mockImplementation(() => Promise.resolve({ write: io.write, close: io.close }));
  vi.stubGlobal('fetch', io.fetch);
});
afterEach(() => vi.unstubAllGlobals());

describe('下载引擎真实工具链补充分支', () => {
  it('完成一千次下载后只保留两百个轻量历史快照', async () => {
    io.fetch.mockImplementation((_url, options) => Promise.resolve(options?.method === 'HEAD' ? head() : data()));
    const engine = new MultiThreadDownloadEngine();
    for (let index = 0; index < 1000; index += 1) {
      await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 1 });
      await settle();
    }
    expect(engine.listTasks()).toHaveLength(200);
    expect(engine.getTask('download-fixture-1')).toBeNull();
    expect(engine.getTask('download-fixture-1000')).toMatchObject({ status: 'completed' });
    expect(engine.listTasks().some((task) => 'abortControllers' in task || 'run' in task)).toBe(false);
  });
  it('一处分片失败会取消同组读取并在句柄关闭后清理文件', async () => {
    const signals: AbortSignal[] = [];
    let fail: (() => void) | undefined;
    io.fetch.mockImplementation((_url, options) => {
      if (options?.method === 'HEAD') return Promise.resolve(head(MIN_CHUNK_BYTES * 2, true));
      const signal = options!.signal!;
      signals.push(signal);
      if (signals.length === 1) return new Promise((_resolve, reject) => { fail = () => reject(new Error('broken chunk')); });
      return Promise.resolve(new Response(new ReadableStream({
        start(controller) { signal.addEventListener('abort', () => controller.error(signal.reason)); },
      }), { status: 206 }));
    });
    const engine = new MultiThreadDownloadEngine();
    const task = await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 2 });
    await settle();
    fail?.();
    await settle();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(engine.getTask(task.id)?.status).toBe('failed');
    expect(io.close).toHaveBeenCalledOnce();
    expect(io.close.mock.invocationCallOrder[0]).toBeLessThan(io.rm.mock.invocationCallOrder[0]);
  });
  it('多个下载共享八个连接槽位并释放取消的排队请求', async () => {
    let active = 0;
    let peak = 0;
    io.fetch.mockImplementation((_url, options) => {
      if (options?.method === 'HEAD') return Promise.resolve(head(MIN_CHUNK_BYTES * 16, true));
      active += 1;
      peak = Math.max(peak, active);
      return new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => {
        active -= 1;
        reject(options.signal?.reason);
      }));
    });
    const engine = new MultiThreadDownloadEngine();
    const tasks = await Promise.all(Array.from({ length: 3 }, () => engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 16 })));
    await settle();
    expect(peak).toBe(8);
    tasks.forEach((task) => engine.cancelDownload(task.id));
    await settle();
    expect(active).toBe(0);
    expect(engine.listTasks().every((task) => task.status === 'canceled')).toBe(true);
  });
  it('无扩展名文件使用临时扩展且忽略替换旧文件失败', async () => {
    io.exists.mockReturnValue(true);
    io.unlink.mockRejectedValue(new Error('locked'));
    io.fetch.mockResolvedValueOnce(head()).mockResolvedValueOnce(data());
    const engine = new MultiThreadDownloadEngine();
    const task = await engine.startDownload({ url: 'https://fixture.test/download', defaultDir: 'fixture-downloads', threads: 1 });
    await settle();
    expect(engine.getTask(task.id)?.status).toBe('completed');
    expect(io.rename).toHaveBeenCalledWith(expect.stringContaining('target.tmp'), task.savePath);
    expect(io.unlink).toHaveBeenCalledWith(task.savePath);
  });

  it.each([0, 10, 15])('完整或空临时文件大小 %s 不作为续传偏移', async (size) => {
    io.stat.mockResolvedValue({ size });
    io.fetch.mockResolvedValueOnce(head(10, true)).mockResolvedValueOnce(data());
    const engine = new MultiThreadDownloadEngine();
    const task = await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 1 });
    await settle();
    expect(engine.getTask(task.id)?.status).toBe('completed');
    expect(io.fetch.mock.calls[1]?.[1]?.headers).toEqual({});
  });

  it('服务器忽略单线程 Range 时重新写入文件', async () => {
    io.stat.mockResolvedValue({ size: 2 });
    io.fetch.mockResolvedValueOnce(head(10, true)).mockResolvedValueOnce(data());
    const engine = new MultiThreadDownloadEngine();
    const task = await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 1 });
    await settle();
    expect(io.fetch.mock.calls[1]?.[1]?.headers).toEqual({ Range: 'bytes=2-' });
    expect(io.open).toHaveBeenCalledWith(expect.any(String), 'w');
    expect(engine.getTask(task.id)?.downloadedBytes).toBe(10);
  });

  it('分片预扫描失败后真实工具拆片并清理拒绝的文件操作', async () => {
    io.rm.mockRejectedValue(new Error('locked'));
    io.fetch.mockResolvedValueOnce(head(MIN_CHUNK_BYTES * 2, true)).mockImplementation(() => Promise.resolve(data()));
    const engine = new MultiThreadDownloadEngine();
    const task = await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 2 });
    await settle();
    expect(engine.getTask(task.id)?.status).toBe('completed');
    expect(io.rm).toHaveBeenCalledWith(expect.stringContaining('chunk-0.part'), { force: true });
    expect(io.rm).toHaveBeenCalledWith(expect.stringContaining('chunk-1.part'), { force: true });
    expect(io.rm).toHaveBeenCalledWith(expect.stringContaining('.eisland-download-'), { recursive: true, force: true });
  });

  it('分片局部文件续传以追加方式写入', async () => {
    io.stat.mockResolvedValue({ size: 2 });
    io.fetch.mockResolvedValueOnce(head(MIN_CHUNK_BYTES * 2, true)).mockImplementation(() => Promise.resolve(data()));
    const engine = new MultiThreadDownloadEngine();
    const task = await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 2 });
    await settle();
    expect(engine.getTask(task.id)?.status).toBe('completed');
    expect(io.open).toHaveBeenCalledWith(expect.stringContaining('chunk-0.part'), 'a');
    expect(io.fetch.mock.calls.slice(1).map(([, options]) => options?.headers)).toEqual([
      { Range: `bytes=2-${MIN_CHUNK_BYTES - 1}` },
      { Range: `bytes=${MIN_CHUNK_BYTES + 2}-${MIN_CHUNK_BYTES * 2 - 1}` },
    ]);
  });

  it.each([1, 2])('线程数 %s 的读取结束期间取消会清理而不提交结果', async (threads) => {
    const engine = new MultiThreadDownloadEngine();
    let id = '';
    io.fetch.mockResolvedValueOnce(head(MIN_CHUNK_BYTES * 2, true)).mockImplementation(() => Promise.resolve(data(() => { engine.cancelDownload(id); })));
    const task = await engine.startDownload({ threads, url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads' });
    ({ id } = task);
    await settle();
    expect(engine.getTask(id)?.status).toBe('canceled');
    expect(io.rename).not.toHaveBeenCalled();
    expect(io.rm).toHaveBeenCalledWith(expect.any(String), { force: true });
  });

  it.each([1, 2])('线程数 %s 的零字节块不会写入或增加进度', async (threads) => {
    io.fetch.mockResolvedValueOnce(head(MIN_CHUNK_BYTES * 2, true)).mockImplementation(() => Promise.resolve(data(undefined, new Uint8Array())));
    const engine = new MultiThreadDownloadEngine();
    const task = await engine.startDownload({ threads, url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads' });
    await settle();
    expect(io.write).not.toHaveBeenCalled();
    expect(engine.getTask(task.id)?.status).toBe('completed');
  });

  it('恢复下载的第二次执行失败经统一错误路径处理', async () => {
    const engine = new MultiThreadDownloadEngine();
    io.fetch.mockResolvedValueOnce(head(10, true)).mockImplementationOnce((url, options) => new Promise<Response>((resolve, reject) => {
      void url;
      void resolve;
      options?.signal?.addEventListener('abort', () => reject(new DOMException('paused', 'AbortError')), { once: true });
    }));
    const task = await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 1 });
    await settle();
    engine.pauseDownload(task.id);
    await settle();
    expect(engine.getTask(task.id)?.status).toBe('paused');
    io.fetch.mockResolvedValueOnce(head(10, true)).mockRejectedValueOnce(new Error('resume unavailable'));
    await engine.resumeDownload(task.id);
    await settle();
    expect(engine.getTask(task.id)).toMatchObject({ status: 'failed', errorMessage: 'resume unavailable' });
  });

  it('外部叶依赖以非 Error 拒绝时保留错误文本并忽略清理失败', async () => {
    io.rm.mockRejectedValue(new Error('locked'));
    io.fetch.mockResolvedValueOnce(head()).mockRejectedValueOnce('download transport failure');
    const engine = new MultiThreadDownloadEngine();
    const task = await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 1 });
    await settle();
    expect(engine.getTask(task.id)).toMatchObject({ status: 'failed', errorMessage: 'download transport failure' });
    expect(io.rm).toHaveBeenCalledWith(expect.stringContaining('target.bin'), { force: true });
  });

  it('回调获得不共享内部任务的公开快照', async () => {
    const snapshots: DownloadTaskSnapshot[] = [];
    io.fetch.mockResolvedValueOnce(head()).mockResolvedValueOnce(data());
    const engine = new MultiThreadDownloadEngine({ onTaskUpdated: (snapshot) => snapshots.push(snapshot) });
    const task = await engine.startDownload({ url: 'https://fixture.test/file.bin', defaultDir: 'fixture-downloads', threads: 1 });
    await settle();
    expect(snapshots[0]?.status).toBe('downloading');
    expect(snapshots.at(-1)?.status).toBe('completed');
    expect(snapshots.at(-1)).toEqual(engine.getTask(task.id));
  });
});
