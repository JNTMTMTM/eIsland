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
 * @file formatFactorySupplement.test.ts
 * @description 格式工厂真实 IPC 的各编码格式、进程失败、窗口与对话框边界测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerFormatFactoryIpcHandlers } from '../formatFactory';

type HandlerFixture = (event: { sender: object }, options?: unknown) => Promise<unknown>;
interface ChildFixture extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
}
const boundary = vi.hoisted(() => ({
  handles: new Map<string, HandlerFixture>(),
  from: null as object | null,
  focused: null as object | null,
  exists: vi.fn<(path: string) => boolean>(),
  stat: vi.fn<(path: string) => { size: number }>(),
  open: vi.fn<() => Promise<{ canceled: boolean; filePaths: string[] }>>(),
  save: vi.fn<() => Promise<{ canceled: boolean; filePath?: string }>>(),
  spawn: vi.fn<(binary: string, args: string[], options: { windowsHide: boolean }) => ChildFixture>(),
}));
vi.mock('electron', () => ({
  ipcMain: { handle: (channel: string, handler: HandlerFixture) => boundary.handles.set(channel, handler) },
  BrowserWindow: { fromWebContents: () => boundary.from, getFocusedWindow: () => boundary.focused },
  dialog: { showOpenDialog: boundary.open, showSaveDialog: boundary.save },
}));
vi.mock('fs', () => ({ existsSync: boundary.exists, statSync: boundary.stat }));
vi.mock('child_process', () => ({ spawn: boundary.spawn }));
vi.mock('../../../utils/ffmpegPath', () => ({ getFfmpegBinary: () => 'fixture-ffmpeg' }));

/**
 * 调用真实提取处理器并传入可控进程完成事件。
 * @param format - 输出扩展名。
 * @param type - 音轨或视频轨。
 * @param code - 进程退出码。
 * @param stderr - 错误输出。
 * @returns 提取结果。
 */
async function extract(format = 'aac', type = 'audio', code: number | null = 0, stderr = ''): Promise<unknown> {
  const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
  boundary.spawn.mockReturnValue(child);
  const pending = boundary.handles.get('format-factory:extract-track')?.({ sender: {} }, {
    filePath: 'fixture-source.mp4', trackType: type, outputFormat: format,
  });
  await Promise.resolve();
  child.stdout.emit('data', Buffer.from('fixture stdout'));
  if (stderr) child.stderr.emit('data', Buffer.from(stderr));
  child.emit('close', code);
  return pending;
}

beforeEach(() => {
  vi.resetAllMocks();
  boundary.handles.clear();
  boundary.from = {};
  boundary.focused = null;
  boundary.exists.mockReturnValue(true);
  boundary.stat.mockReturnValue({ size: 42 });
  boundary.save.mockResolvedValue({ canceled: false, filePath: 'fixture-output' });
  registerFormatFactoryIpcHandlers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('格式工厂编解码与错误叶接口', () => {
  it.each([
    ['mp3', ['-vn', '-c:a', 'libmp3lame', '-q:a', '0']],
    ['aac', ['-vn', '-c:a', 'aac', '-b:a', '320k']],
    ['wav', ['-vn', '-c:a', 'pcm_s16le']],
    ['flac', ['-vn', '-c:a', 'flac']],
    ['ogg', ['-vn', '-c:a', 'libvorbis', '-q:a', '6']],
    ['m4a', ['-vn', '-c:a', 'copy']],
  ] as const)('音轨格式 %s 设置对应 ffmpeg 编码器', async (format, codec) => {
    await expect(extract(format)).resolves.toEqual({ success: true, outputPath: 'fixture-output', fileSize: 42 });
    expect(boundary.spawn).toHaveBeenCalledWith('fixture-ffmpeg', [
      '-y', '-hide_banner', '-i', 'fixture-source.mp4', ...codec, 'fixture-output',
    ], { windowsHide: true });
  });
  it.each(['mp4', 'mkv', 'avi', 'webm', 'mov'])('视频格式 %s 复制视频轨并去掉音轨', async (format) => {
    await expect(extract(format, 'video')).resolves.toMatchObject({ success: true });
    const args = boundary.spawn.mock.calls[0]?.[1];
    expect(args).toContain('-an');
    expect(args).toContain('-c:v');
    expect(args).toContain('copy');
    if (format === 'mp4') expect(args).toContain('+faststart');
    else expect(args).not.toContain('+faststart');
  });
  it('退出码 null 使用 -1 并选择最后一行非空 stderr', async () => {
    await expect(extract('aac', 'audio', null, 'first\n  \nlast\n')).resolves.toEqual({ success: false, error: 'last' });
  });
  it('退出失败没有 stderr 时返回默认错误', async () => {
    await expect(extract('aac', 'audio', 2)).resolves.toEqual({ success: false, error: 'ffmpeg exited with non-zero code' });
  });
  it('进程成功但输出不存在仍返回失败', async () => {
    boundary.exists.mockImplementation((path) => path === 'fixture-source.mp4');
    await expect(extract()).resolves.toMatchObject({ success: false });
  });
  it('输出 stat 失败不改变成功结果', async () => {
    boundary.stat.mockImplementation(() => { throw new Error('stat denied'); });
    await expect(extract()).resolves.toEqual({ success: true, outputPath: 'fixture-output', fileSize: undefined });
  });
  it.each([new Error('ENOENT fixture'), new Error('spawn denied'), 'spawn value failure'])('spawn 同步异常 %s 规范失败响应', async (error) => {
    boundary.spawn.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 原生调用的任意拒绝值边界用于验证现有 IPC String(error) 回退。
      throw error;
    });
    await expect(boundary.handles.get('format-factory:extract-track')?.({ sender: {} }, {
      filePath: 'fixture-source.mp4', trackType: 'audio', outputFormat: 'aac',
    })).resolves.toEqual({ success: false, error: error instanceof Error && error.message.includes('ENOENT')
      ? 'ffmpeg not found. Please install ffmpeg and add it to your PATH.'
      : String(error instanceof Error ? error.message : error) });
  });
  it('进程异步 error 传播到 IPC 失败结果', async () => {
    const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
    boundary.spawn.mockReturnValue(child);
    const pending = boundary.handles.get('format-factory:extract-track')?.({ sender: {} }, {
      filePath: 'fixture-source.mp4', trackType: 'audio', outputFormat: 'aac',
    });
    await Promise.resolve();
    child.emit('error', new Error('child failed'));
    await expect(pending).resolves.toEqual({ success: false, error: 'child failed' });
  });
});

describe('格式工厂选择窗口与无效外部参数', () => {
  it.each([null, 1, {}, { filePath: 1 }, { filePath: '' }, { filePath: 'missing' }])('不完整选项 %s 在进程创建前拒绝', async (options) => {
    boundary.exists.mockReturnValue(false);
    await expect(boundary.handles.get('format-factory:extract-track')?.({ sender: {} }, options)).resolves.toMatchObject({ success: false });
    expect(boundary.spawn).not.toHaveBeenCalled();
  });
  it.each([
    { trackType: 'other', outputFormat: 'aac' },
    { trackType: 'audio', outputFormat: '' },
    { trackType: 'audio', outputFormat: 1 },
  ])('轨道与格式无效参数 %s 被拒绝', async (options) => {
    await expect(boundary.handles.get('format-factory:extract-track')?.({ sender: {} }, {
      filePath: 'fixture-source.mp4', ...options,
    })).resolves.toMatchObject({ success: false });
  });
  it('没有窗口无法提取或选择，聚焦窗口为调用窗口回退', async () => {
    boundary.from = null;
    await expect(boundary.handles.get('format-factory:pick-video')?.({ sender: {} })).resolves.toBeNull();
    await expect(boundary.handles.get('format-factory:extract-track')?.({ sender: {} }, {
      filePath: 'fixture-source.mp4', trackType: 'audio', outputFormat: 'aac',
    })).resolves.toEqual({ success: false, error: 'no window' });
    boundary.focused = {};
    boundary.open.mockResolvedValue({ canceled: false, filePaths: ['fixture-video'] });
    await expect(boundary.handles.get('format-factory:pick-video')?.({ sender: {} })).resolves.toEqual({ filePath: 'fixture-video', fileSize: 42 });
  });
  it.each([{ canceled: true, filePaths: ['fixture'] }, { canceled: false, filePaths: [] }, { canceled: false, filePaths: [''] }])('选择返回 %s 时拒绝空路径', async (result) => {
    boundary.open.mockResolvedValue(result);
    await expect(boundary.handles.get('format-factory:pick-video')?.({ sender: {} })).resolves.toBeNull();
  });
  it('选择文件 stat 失败保留路径，选择对话框失败返回 null', async () => {
    boundary.open.mockResolvedValueOnce({ canceled: false, filePaths: ['fixture-video'] }).mockRejectedValueOnce(new Error('dialog failure'));
    boundary.stat.mockImplementation(() => { throw new Error('stat failed'); });
    await expect(boundary.handles.get('format-factory:pick-video')?.({ sender: {} })).resolves.toEqual({ filePath: 'fixture-video', fileSize: null });
    await expect(boundary.handles.get('format-factory:pick-video')?.({ sender: {} })).resolves.toBeNull();
  });
  it.each([{ canceled: true, filePath: 'fixture-output' }, { canceled: false }])('保存返回 %s 时取消提取', async (result) => {
    boundary.save.mockResolvedValue(result);
    await expect(boundary.handles.get('format-factory:extract-track')?.({ sender: {} }, {
      filePath: 'fixture-source.mp4', trackType: 'audio', outputFormat: 'aac',
    })).resolves.toEqual({ success: false, error: 'canceled' });
    expect(boundary.spawn).not.toHaveBeenCalled();
  });
});
