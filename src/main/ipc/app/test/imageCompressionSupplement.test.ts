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
 * @file imageCompressionSupplement.test.ts
 * @description 图片压缩真实 IPC 的持久化契约、输入规范化、编解码、失败、广播与对话框测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_PERSISTED_TASKS, PERSIST_DEBOUNCE_MS } from '../config/imageCompression';
import type { ImageCompressionTaskResult } from '../types';

type HandlerFixture = (event: { sender: object }, payload?: unknown) => unknown;
interface ChildFixture extends EventEmitter { stderr: EventEmitter }
interface WindowFixture { isDestroyed: () => boolean; webContents: { send: ReturnType<typeof vi.fn> } }
const io = vi.hoisted(() => ({
  handlers: new Map<string, HandlerFixture>(),
  stored: false,
  content: '',
  outputs: new Set<string>(),
  from: null as WindowFixture | null,
  focused: null as WindowFixture | null,
  windows: [] as WindowFixture[],
  read: vi.fn<() => string>(),
  write: vi.fn<(path: string, data: string, encoding: string) => void>(),
  mkdir: vi.fn<(path: string) => void>(),
  stat: vi.fn<(path: string) => { size: number }>(),
  spawn: vi.fn<(binary: string, args: string[], options: { windowsHide: boolean }) => ChildFixture>(),
  dialog: vi.fn<() => Promise<{ canceled: boolean; filePaths: string[] }>>(),
}));
vi.mock('electron', () => ({
  app: { getPath: () => 'fixture-user-data' },
  BrowserWindow: { fromWebContents: () => io.from, getFocusedWindow: () => io.focused, getAllWindows: () => io.windows },
  dialog: { showOpenDialog: io.dialog },
  ipcMain: { handle: (channel: string, handler: HandlerFixture) => io.handlers.set(channel, handler) },
}));
vi.mock('fs', () => ({
  existsSync: (path: string) => path.endsWith('image-compression-tasks.json') ? io.stored : io.outputs.has(path),
  readFileSync: io.read, writeFileSync: io.write, mkdirSync: io.mkdir, statSync: io.stat,
}));
vi.mock('child_process', () => ({ spawn: io.spawn }));
vi.mock('../../../utils/ffmpegPath', () => ({ getFfmpegBinary: () => 'fixture-ffmpeg' }));

/**
 * 构造完整压缩持久化结果。
 * @param patch - 字段覆盖。
 * @returns 合法结果。
 */
function task(patch: Partial<ImageCompressionTaskResult> = {}): ImageCompressionTaskResult {
  return { id: 'stored', fileName: 'fixture.jpg', inputPath: 'fixture.jpg', outputPath: 'fixture-output.jpg',
    quality: 80, status: 'completed', success: true, originalBytes: 100, compressedBytes: 50, ratio: 0.5,
    createdAt: 1, updatedAt: 2, ...patch };
}
/**
 * 注册真实图片压缩 IPC 并加载可控磁盘输入。
 * @param stored - 持久化对象。
 * @returns 注册完成。
 */
async function register(stored?: unknown): Promise<void> {
  if (stored !== undefined) { io.stored = true; io.content = JSON.stringify(stored); }
  const { registerImageCompressionIpcHandlers } = await import('../imageCompression');
  registerImageCompressionIpcHandlers();
}
/**
 * 执行真实 IPC。
 * @param channel - 处理器后缀。
 * @param payload - 参数。
 * @returns 返回值。
 */
function invoke(channel: string, payload?: unknown): unknown {
  return io.handlers.get(`image-compression:${channel}`)?.({ sender: {} }, payload);
}
/**
 * 构造窗口发送边界。
 * @returns 窗口对象。
 */
function windowFixture(): WindowFixture { return { isDestroyed: () => false, webContents: { send: vi.fn() } }; }

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  io.handlers.clear();
  io.outputs.clear();
  io.stored = false;
  io.content = '';
  io.from = null;
  io.focused = null;
  io.windows = [];
  io.read.mockImplementation(() => io.content);
  io.stat.mockImplementation((path) => ({ size: path.includes('_compressed') ? 50 : 100 }));
  io.spawn.mockImplementation((binary, args, options) => {
    void binary; void options;
    const child = Object.assign(new EventEmitter(), { stderr: new EventEmitter() });
    const path = args.at(-1);
    if (path) io.outputs.add(path);
    queueMicrotask(() => child.emit('close', 0));
    return child;
  });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('图片压缩持久化类型与边界', () => {
  it.each([null, 1, false, 'fixture', {}, [null, 1, false, 'fixture', {}]])('非法持久化输入 %s 被过滤', async (stored) => {
    await register(stored);
    expect(invoke('list')).toEqual([]);
  });
  it.each(['id', 'fileName', 'inputPath', 'outputPath', 'quality', 'status', 'success', 'originalBytes', 'compressedBytes', 'ratio', 'createdAt', 'updatedAt'])('非法字段 %s 被过滤', async (field) => {
    await register([{ ...task(), [field]: null }]);
    expect(invoke('list')).toEqual([]);
  });
  it('完成与失败任务、可选错误和时间排序保留', async () => {
    await register([task(), task({ id: 'failed', status: 'failed', success: false, error: 'details', createdAt: 3 })]);
    expect(invoke('list')).toEqual([task({ id: 'failed', status: 'failed', success: false, error: 'details', createdAt: 3 }), task()]);
  });
  it.each(['', '  ', '{invalid'])('磁盘文本 %s 为空或损坏时回退空列表', async (content) => {
    io.stored = true; io.content = content;
    await register();
    expect(invoke('list')).toEqual([]);
  });
  it('读取与写入失败仅记录错误，删除合法历史任务返回 true', async () => {
    io.stored = true;
    io.read.mockImplementationOnce(() => { throw new Error('read failure'); });
    await register();
    expect(invoke('list')).toEqual([]);
    vi.resetModules();
    await register([task()]);
    io.write.mockImplementationOnce(() => { throw new Error('write failure'); });
    expect(invoke('remove', ' stored ')).toBe(true);
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS);
    expect(console.error).toHaveBeenCalledWith('[ImageCompression] save persisted tasks error:', expect.any(Error));
  });
  it('历史加载及新增任务均按创建时间裁剪到最大数量', async () => {
    const rows = Array.from({ length: MAX_PERSISTED_TASKS + 2 }, (entry, index) => { void entry; return task({ id: `stored-${index}`, createdAt: index }); });
    await register(rows);
    expect(invoke('list')).toHaveLength(MAX_PERSISTED_TASKS);
    await expect(invoke('start', { inputPaths: ['fixture.jpg'] })).resolves.toMatchObject({ ok: true });
    expect(invoke('list')).toHaveLength(MAX_PERSISTED_TASKS);
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS);
    expect(io.write).toHaveBeenCalledTimes(1);
  });
  it.each([null, 1, '', '  ', 'missing'])('删除非法或未知ID %s 返回 false', async (id) => {
    await register([task()]);
    expect(invoke('remove', id)).toBe(false);
  });
});

describe('图片压缩参数、格式、进程与广播', () => {
  it.each([null, {}, { inputPaths: false }, { inputPaths: [1, '', ' '] }])('无合法图片参数 %s 不启动进程', async (payload) => {
    await register();
    await expect(invoke('start', payload)).resolves.toEqual({ ok: false, message: '请选择至少一张图片' });
    expect(io.spawn).not.toHaveBeenCalled();
  });
  it('输入路径去空白、忽略非字符串及空项，并按大小写去重', async () => {
    await register();
    await expect(invoke('start', { inputPaths: [' fixture.jpg ', 'FIXTURE.jpg', '', ' ', 1, 'next.jpg'] })).resolves.toMatchObject({ ok: true, results: [{ inputPath: 'fixture.jpg' }, { inputPath: 'next.jpg' }] });
    expect(io.spawn).toHaveBeenCalledTimes(2);
  });
  it.each([undefined, NaN, Infinity, 5, 105, 70.9])('质量参数 %s 默认或限幅，空输出目录回退源目录', async (quality) => {
    await register();
    const expected = typeof quality === 'number' && Number.isFinite(quality) ? Math.max(10, Math.min(100, Math.floor(quality))) : 80;
    await expect(invoke('start', { quality, inputPaths: ['fixture.jpg'], outputDir: '  ' })).resolves.toMatchObject({ ok: true, results: [{ quality: expected }] });
    expect(io.mkdir).toHaveBeenCalledWith('.', { recursive: true });
  });
  it.each(['jpg', 'jpeg', 'png', 'webp', 'bmp'])('格式 %s 使用正确压缩参数并处理输出命名冲突', async (ext) => {
    await register();
    io.outputs.add(join('fixture-output', `source_compressed.${ext}`));
    await expect(invoke('start', { inputPaths: [`source.${ext}`], outputDir: ' fixture-output ', quality: 80 })).resolves.toMatchObject({
      ok: true, results: [{ outputPath: join('fixture-output', `source_compressed_1.${ext}`), ratio: 0.5, success: true }],
    });
    const args = io.spawn.mock.calls[0]?.[1];
    if (ext === 'jpg' || ext === 'jpeg') expect(args).toEqual(expect.arrayContaining(['-q:v', '8']));
    else if (ext === 'png') expect(args).toEqual(expect.arrayContaining(['-compression_level', '2']));
    else if (ext === 'webp') expect(args).toEqual(expect.arrayContaining(['-quality', '80']));
    else expect(args).not.toContain('-quality');
  });
  it('源文件 stat 失败和不支持扩展名均返回逐文件失败任务', async () => {
    await register();
    io.stat.mockImplementation((path) => { if (path === 'missing.jpg') throw new Error('missing'); return { size: 100 }; });
    await expect(invoke('start', { inputPaths: ['missing.jpg', 'source.gif'] })).resolves.toMatchObject({
      ok: true, results: [{ error: 'source file not found', status: 'failed' }, { error: 'unsupported image format', originalBytes: 100 }],
    });
    expect(io.spawn).not.toHaveBeenCalled();
  });
  it.each([new Error('directory failure'), 'mkdir value'])('输出目录失败 %s 返回可读错误', async (error) => {
    await register();
    io.mkdir.mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 验证外部文件系统边界错误值的现有 String(error) 处理。
      throw error;
    });
    await expect(invoke('start', { inputPaths: ['source.jpg'] })).resolves.toEqual({ ok: false, message: error instanceof Error ? error.message : error });
  });
  it.each([new Error('ENOENT binary'), new Error('spawn failed'), 'spawn value', new Error('')])('启动进程异常 %s 产生失败任务', async (error) => {
    await register();
    io.spawn.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 覆盖进程叶接口异常文本回退，未执行真实命令。
      throw error;
    });
    await expect(invoke('start', { inputPaths: ['source.jpg'] })).resolves.toMatchObject({ ok: true, results: [{ success: false, status: 'failed' }] });
  });
  it.each(['stderr', 'empty', 'error', 'missing-output'])('进程 %s 失败或缺少输出时返回失败任务', async (mode) => {
    await register();
    io.spawn.mockImplementation(() => {
      const child = Object.assign(new EventEmitter(), { stderr: new EventEmitter() });
      queueMicrotask(() => {
        if (mode === 'error') child.emit('error', new Error('process failed'));
        else {
          if (mode === 'stderr') child.stderr.emit('data', Buffer.from('first\n \nlast\n'));
          child.emit('close', mode === 'missing-output' ? 0 : null);
        }
      });
      return child;
    });
    await expect(invoke('start', { inputPaths: ['source.jpg'] })).resolves.toMatchObject({ ok: true, results: [{ success: false }] });
  });
  it('压缩输出 stat 失败产生失败任务，原图零字节成功时比率为零', async () => {
    await register();
    io.stat.mockImplementation((path) => { if (path.includes('_compressed')) throw new Error('stat output'); return { size: 100 }; });
    await expect(invoke('start', { inputPaths: ['source.jpg'] })).resolves.toMatchObject({ results: [{ error: 'output file not found' }] });
    io.stat.mockReturnValue({ size: 0 });
    await expect(invoke('start', { inputPaths: ['zero.jpg'] })).resolves.toMatchObject({ results: [{ ratio: 0, success: true }] });
  });
  it('广播跳过销毁窗口、隔离发送错误并对正常窗口送达', async () => {
    await register();
    const normal = windowFixture();
    const destroyed = windowFixture();
    destroyed.isDestroyed = () => true;
    const throwing = windowFixture();
    throwing.webContents.send.mockImplementation(() => { throw new Error('closed'); });
    io.windows = [normal, destroyed, throwing];
    await invoke('start', { inputPaths: ['source.jpg', 'next.jpg'] });
    expect(normal.webContents.send).toHaveBeenCalledTimes(2);
    expect(destroyed.webContents.send).not.toHaveBeenCalled();
    expect(throwing.webContents.send).toHaveBeenCalledTimes(2);
  });
  it('重复注册不重新安装处理器', async () => {
    await register();
    const count = io.handlers.size;
    const { registerImageCompressionIpcHandlers } = await import('../imageCompression');
    registerImageCompressionIpcHandlers();
    expect(io.handlers.size).toBe(count);
  });
});

describe('图片与输出目录选择', () => {
  it.each(['pick-images', 'pick-output-dir'])('%s 无窗口与对话框失败使用空结果', async (channel) => {
    await register();
    await expect(invoke(channel)).resolves.toEqual(channel === 'pick-images' ? [] : null);
    io.from = windowFixture();
    io.dialog.mockRejectedValue(new Error('dialog failure'));
    await expect(invoke(channel)).resolves.toEqual(channel === 'pick-images' ? [] : null);
  });
  it('聚焦窗口回退，图片选择与取消分别返回路径和空列表', async () => {
    await register();
    io.focused = windowFixture();
    io.dialog.mockResolvedValueOnce({ canceled: false, filePaths: ['fixture.jpg'] }).mockResolvedValueOnce({ canceled: true, filePaths: [] });
    await expect(invoke('pick-images')).resolves.toEqual(['fixture.jpg']);
    await expect(invoke('pick-images')).resolves.toEqual([]);
  });
  it.each([{ canceled: true, filePaths: ['fixture'] }, { canceled: false, filePaths: [] }, { canceled: false, filePaths: ['fixture'] }])('输出目录选择 %s 返回合法路径或 null', async (result) => {
    await register();
    io.from = windowFixture();
    io.dialog.mockResolvedValue(result);
    await expect(invoke('pick-output-dir')).resolves.toBe(result.canceled || !result.filePaths.length ? null : 'fixture');
  });
});
