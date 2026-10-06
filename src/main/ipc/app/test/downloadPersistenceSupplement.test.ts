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
 * @file downloadPersistenceSupplement.test.ts
 * @description 下载 IPC 持久化完整字段验证、真实引擎控制、窗口广播与文件选择边界测试。
 * @author 鸡哥
 */

import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_PERSISTED_TASKS, PERSIST_DEBOUNCE_MS } from '../config/download';
import type { DownloadTaskSnapshot } from '../../../types/core/DownloadTaskSnapshot';

type HandlerFixture = (event: { sender: object }, payload?: unknown) => unknown;
interface WindowFixture {
  isDestroyed: () => boolean;
  webContents: { send: ReturnType<typeof vi.fn> };
}
const io = vi.hoisted(() => ({
  handles: new Map<string, HandlerFixture>(),
  exists: false,
  content: '',
  uuid: 0,
  getDir: vi.fn<() => string>(),
  read: vi.fn<() => string>(),
  write: vi.fn<(path: string, content: string, encoding: string) => void>(),
  mkdirSync: vi.fn<() => void>(),
  mkdir: vi.fn<() => Promise<void>>(),
  open: vi.fn<() => Promise<{ write: () => Promise<void>; close: () => Promise<void> }>>(),
  rename: vi.fn<() => Promise<void>>(),
  rm: vi.fn<() => Promise<void>>(),
  stat: vi.fn<() => Promise<{ size: number }>>(),
  unlink: vi.fn<() => Promise<void>>(),
  fetch: vi.fn<typeof fetch>(),
  windows: [] as WindowFixture[],
  from: null as WindowFixture | null,
  focused: null as WindowFixture | null,
  dialog: vi.fn<() => Promise<{ canceled: boolean; filePath?: string }>>(),
}));
vi.mock('crypto', () => ({ randomUUID: () => `fixture-${++io.uuid}` }));
vi.mock('electron', () => ({
  app: { getPath: (name: string) => name === 'userData' ? 'fixture-user-data' : 'fixture-download-fallback' },
  ipcMain: { handle: (channel: string, handler: HandlerFixture) => io.handles.set(channel, handler) },
  BrowserWindow: {
    getAllWindows: () => io.windows,
    fromWebContents: () => io.from,
    getFocusedWindow: () => io.focused,
  },
  dialog: { showSaveDialog: io.dialog },
}));
vi.mock('fs', () => ({
  existsSync: (path: string) => path.endsWith('download-tasks.json') && io.exists,
  readFileSync: io.read,
  writeFileSync: io.write,
  mkdirSync: io.mkdirSync,
  createReadStream: () => Readable.from([Buffer.from('part')]),
  createWriteStream: () => new Writable({ write(bytes, encoding, callback) { void bytes; void encoding; callback(); } }),
}));
vi.mock('fs/promises', () => ({ mkdir: io.mkdir, open: io.open, rename: io.rename, rm: io.rm, stat: io.stat, unlink: io.unlink }));

/**
 * 构造满足完整持久化契约的下载任务。
 * @param patch - 各用例关注的字段覆盖。
 * @returns 合法任务快照。
 */
function snapshot(patch: Partial<DownloadTaskSnapshot> = {}): DownloadTaskSnapshot {
  return {
    id: 'stored', url: 'https://fixture.test/file.bin', savePath: 'fixture-file.bin', fileName: 'file.bin',
    totalBytes: 10, downloadedBytes: 3, progress: 0.3, speedBytesPerSecond: 1, estimatedFinishAt: null,
    threads: 1, status: 'completed', createdAt: 1, updatedAt: 2, ...patch,
  };
}

/**
 * 重置模块级注册标记并只注册真实下载 IPC 与引擎。
 * @param stored - 持久化输入。
 * @returns 初始化完成信号。
 */
async function register(stored?: unknown): Promise<void> {
  if (stored !== undefined) {
    io.exists = true;
    io.content = JSON.stringify(stored);
  }
  const { registerDownloadIpcHandlers } = await import('../download');
  registerDownloadIpcHandlers({ getDownloadsPath: io.getDir });
}

/**
 * 经真实 IPC 回调执行请求。
 * @param channel - 处理器名称后缀。
 * @param payload - 外部传入参数。
 * @returns IPC 返回值。
 */
function invoke(channel: string, payload?: unknown): unknown {
  return io.handles.get(`download:${channel}`)?.({ sender: {} }, payload);
}

/**
 * 等待真实流任务与嵌套文件清理完成。
 * @returns 等待完成信号。
 */
async function settle(): Promise<void> {
  // eslint-disable-next-line no-await-in-loop -- 每轮事件循环推进真实下载流与连续清理 Promise。
  for (let index = 0; index < 8; index++) await new Promise<void>((resolve) => setImmediate(resolve));
}

/**
 * 构造可发送下载事件的窗口边界。
 * @returns 窗口模拟对象。
 */
function windowFixture(): WindowFixture {
  return { isDestroyed: () => false, webContents: { send: vi.fn() } };
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  io.handles.clear();
  io.exists = false;
  io.content = '';
  io.uuid = 0;
  io.windows = [];
  io.from = null;
  io.focused = null;
  io.getDir.mockReturnValue('fixture-downloads');
  io.read.mockImplementation(() => io.content);
  io.mkdir.mockResolvedValue();
  io.rename.mockResolvedValue();
  io.rm.mockResolvedValue();
  io.unlink.mockResolvedValue();
  io.stat.mockRejectedValue(new Error('ENOENT'));
  io.open.mockImplementation(() => Promise.resolve({ write: () => Promise.resolve(), close: () => Promise.resolve() }));
  io.fetch.mockImplementation((url, options) => {
    void url;
    return Promise.resolve(options?.method === 'HEAD'
      ? new Response(null, { headers: { 'content-length': '3' } })
      : new Response(new Uint8Array([1, 2, 3])));
  });
  vi.stubGlobal('fetch', io.fetch);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('下载 IPC 持久化的完整验证', () => {
  it.each([null, 1, false, 'fixture', {}, [null, 1, false, 'fixture', {}]])('非法持久化根或行 %s 被过滤', async (stored) => {
    await register(stored);
    expect(invoke('list')).toEqual([]);
  });
  it.each([
    'id', 'url', 'savePath', 'fileName', 'totalBytes', 'downloadedBytes', 'progress',
    'speedBytesPerSecond', 'estimatedFinishAt', 'threads', 'status', 'createdAt', 'updatedAt',
  ])('持久化任务必填字段 %s 不满足类型时被过滤', async (field) => {
    await register([{ ...snapshot(), [field]: false }]);
    expect(invoke('list')).toEqual([]);
  });
  it('各状态、可选错误和完成时间保留，重复ID去重且下载中任务重启失效', async () => {
    await register([
      snapshot({ id: 'complete', estimatedFinishAt: 20, errorMessage: 'details' }),
      snapshot({ id: 'paused', status: 'paused', createdAt: 4 }),
      snapshot({ id: 'failed', status: 'failed' }),
      snapshot({ id: 'canceled', status: 'canceled' }),
      snapshot({ id: 'running', status: 'downloading', errorMessage: '' }),
      snapshot({ id: 'already-error', status: 'downloading', errorMessage: 'original' }),
      snapshot({ id: 'complete', errorMessage: 'duplicate' }),
    ]);
    expect(invoke('list')).toHaveLength(6);
    expect(invoke('get', 'complete')).toMatchObject({ estimatedFinishAt: 20, errorMessage: 'details' });
    expect(invoke('get', 'running')).toMatchObject({ status: 'failed', speedBytesPerSecond: 0, estimatedFinishAt: null, errorMessage: '应用重启后任务中断' });
    expect(invoke('get', 'already-error')).toMatchObject({ status: 'failed', errorMessage: 'original' });
    expect(invoke('list')).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'paused' })]));
  });
  it.each(['', '  ', '{invalid'])('空白或解析失败的磁盘内容 %s 回退空列表', async (content) => {
    io.exists = true;
    io.content = content;
    await register();
    expect(invoke('list')).toEqual([]);
  });
  it('读取文件失败回退空列表', async () => {
    io.exists = true;
    io.read.mockImplementationOnce(() => { throw new Error('read denied'); });
    await register();
    expect(invoke('list')).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
  it('超过最大任务数按创建时间截取并在新任务更新时再次裁剪', async () => {
    const rows = Array.from({ length: MAX_PERSISTED_TASKS + 2 }, (entry, index) => { void entry; return snapshot({ id: `stored-${index}`, createdAt: index }); });
    await register(rows);
    expect(invoke('list')).toHaveLength(MAX_PERSISTED_TASKS);
    expect(invoke('get', 'stored-0')).toBeNull();
    await expect(invoke('start', { url: 'https://fixture.test/new.bin' })).resolves.toMatchObject({ ok: true });
    await settle();
    expect(invoke('list')).toHaveLength(MAX_PERSISTED_TASKS);
    expect(invoke('get', 'stored-2')).toBeNull();
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS);
    expect(io.write).toHaveBeenCalledTimes(1);
    expect(io.write.mock.calls[0]?.[1]).toContain('fixture-1');
  });
  it('持久化磁盘写入失败仅记录错误，IPC仍返回成功', async () => {
    io.write.mockImplementationOnce(() => { throw new Error('disk full'); });
    await register([snapshot()]);
    expect(invoke('remove', 'stored')).toBe(true);
    await vi.advanceTimersByTimeAsync(PERSIST_DEBOUNCE_MS);
    expect(console.error).toHaveBeenCalledWith('[Download] save persisted tasks error:', expect.any(Error));
  });
});

describe('下载 IPC 真实引擎、窗口与参数', () => {
  it.each([null, {}, { url: 1 }, { url: '' }])('非法启动参数 %s 直接拒绝', async (payload) => {
    await register();
    await expect(invoke('start', payload)).resolves.toEqual({ ok: false, message: '下载地址不能为空' });
    expect(io.fetch).not.toHaveBeenCalled();
  });
  it.each([null, false, '', '  '])('非法任务标识 %s 在各控制及查询入口拒绝', async (id) => {
    await register();
    expect(invoke('cancel', id)).toBe(false);
    expect(invoke('pause', id)).toBe(false);
    expect(invoke('remove', id)).toBe(false);
    expect(invoke('get', id)).toBeNull();
    await expect(invoke('resume', id)).resolves.toEqual({ ok: false, message: '任务标识不能为空' });
  });
  it.each([NaN, Infinity, -2, 20, 2.9])('线程参数 %s 使用默认或限幅整数', async (threads) => {
    await register();
    await expect(invoke('start', { threads, url: 'https://fixture.test/file.bin', savePath: '  fixture-save.bin  ' })).resolves.toMatchObject({
      ok: true, task: { savePath: 'fixture-save.bin', threads: Number.isFinite(threads) ? Math.max(1, Math.min(16, Math.floor(threads))) : 8 },
    });
    await settle();
  });
  it('事件广播跳过销毁窗口，发送失败忽略且正常窗口收到完成任务', async () => {
    const normal = windowFixture();
    const destroyed = windowFixture();
    destroyed.isDestroyed = () => true;
    const throwing = windowFixture();
    throwing.webContents.send.mockImplementation(() => { throw new Error('gone'); });
    io.windows = [normal, destroyed, throwing];
    await register();
    await expect(invoke('start', { url: 'https://fixture.test/file.bin' })).resolves.toMatchObject({ ok: true });
    await settle();
    expect(normal.webContents.send).toHaveBeenCalledWith('download:task-updated', expect.objectContaining({ status: 'completed' }));
    expect(destroyed.webContents.send).not.toHaveBeenCalled();
    expect(throwing.webContents.send).toHaveBeenCalled();
    expect(invoke('remove', ' fixture-1 ')).toBe(true);
    expect(invoke('get', 'fixture-1')).toBeNull();
  });
  it('删除真实正在下载任务被拒绝，暂停恢复与取消均走真实引擎', async () => {
    await register();
    io.fetch.mockImplementation((url, options) => {
      void url;
      if (options?.method === 'HEAD') return Promise.resolve(new Response(null, { headers: { 'content-length': '3' } }));
      return new Promise<Response>((resolve, reject) => {
        void resolve;
        options?.signal?.addEventListener('abort', () => reject(new DOMException('cancel', 'AbortError')), { once: true });
      });
    });
    await expect(invoke('start', { url: 'https://fixture.test/file.bin' })).resolves.toMatchObject({ ok: true });
    expect(invoke('remove', 'fixture-1')).toBe(false);
    expect(invoke('pause', 'fixture-1')).toBe(true);
    await settle();
    await expect(invoke('resume', ' fixture-1 ')).resolves.toMatchObject({ ok: true });
    expect(invoke('cancel', ' fixture-1 ')).toBe(true);
    await settle();
    expect(invoke('remove', 'fixture-1')).toBe(true);
    expect(invoke('remove', 'missing')).toBe(false);
  });
  it('启动目录叶依赖非 Error 拒绝保留文本，HTTP URL 校验 Error 也返回文本', async () => {
    await register();
    io.mkdir.mockRejectedValueOnce('mkdir failure');
    await expect(invoke('start', { url: 'https://fixture.test/file.bin' })).resolves.toEqual({ ok: false, message: 'mkdir failure' });
    await expect(invoke('start', { url: 'ftp://fixture.test/file.bin' })).resolves.toMatchObject({ ok: false, message: '仅支持 HTTP/HTTPS 下载地址' });
  });
  it('恢复不存在任务与恢复目录的非 Error 拒绝均返回错误', async () => {
    await register();
    await expect(invoke('resume', 'missing')).resolves.toEqual({ ok: false, message: '下载任务不存在' });
    io.fetch.mockImplementation((url, options) => {
      void url;
      return options?.method === 'HEAD'
        ? Promise.resolve(new Response(null))
        : new Promise<Response>((resolve, reject) => {
          void resolve;
          options?.signal?.addEventListener('abort', () => reject(new DOMException('pause', 'AbortError')), { once: true });
        });
    });
    await invoke('start', { url: 'https://fixture.test/file.bin' });
    invoke('pause', 'fixture-1');
    await settle();
    io.mkdir.mockRejectedValueOnce('resume mkdir failure');
    await expect(invoke('resume', 'fixture-1')).resolves.toEqual({ ok: false, message: 'resume mkdir failure' });
  });
  it('持久化完成任务不在引擎中也能删除，默认路径为空时回退系统下载目录', async () => {
    io.getDir.mockReturnValue('');
    await register([snapshot()]);
    expect(invoke('remove', 'stored')).toBe(true);
    expect(invoke('get-default-dir')).toBe('fixture-download-fallback');
    io.getDir.mockReturnValue('fixture-downloads');
    expect(invoke('get-default-dir')).toBe('fixture-downloads');
  });
  it('重复注册忽略后一次配置', async () => {
    await register();
    const count = io.handles.size;
    const { registerDownloadIpcHandlers } = await import('../download');
    registerDownloadIpcHandlers({ getDownloadsPath: () => 'other' });
    expect(io.handles.size).toBe(count);
    expect(invoke('get-default-dir')).toBe('fixture-downloads');
  });
});

describe('下载路径选择对话框', () => {
  it.each([null, '', '  ', ' a<>.bin '])('建议文件名 %s 使用安全名称或默认名', async (name) => {
    await register();
    io.focused = windowFixture();
    io.dialog.mockResolvedValue({ canceled: false, filePath: 'fixture-selected.bin' });
    await expect(invoke('pick-save-path', name)).resolves.toBe('fixture-selected.bin');
    expect(io.dialog).toHaveBeenCalledWith(io.focused, expect.objectContaining({ title: '选择保存位置' }));
  });
  it('调用者窗口优先，取消/缺少路径回退 null', async () => {
    await register();
    io.from = windowFixture();
    io.focused = windowFixture();
    io.dialog.mockResolvedValueOnce({ canceled: true }).mockResolvedValueOnce({ canceled: false });
    await expect(invoke('pick-save-path', 'file')).resolves.toBeNull();
    await expect(invoke('pick-save-path', 'file')).resolves.toBeNull();
    expect(io.dialog).toHaveBeenCalledWith(io.from, expect.any(Object));
  });
  it('不存在窗口和对话框失败都返回 null', async () => {
    await register();
    await expect(invoke('pick-save-path', 'file')).resolves.toBeNull();
    expect(io.dialog).not.toHaveBeenCalled();
    io.from = windowFixture();
    io.dialog.mockRejectedValue(new Error('dialog failure'));
    await expect(invoke('pick-save-path', 'file')).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith('[Download] pick save path error:', expect.any(Error));
  });
});
