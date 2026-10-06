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
 * @file wallpaperVideoSupplement.test.ts
 * @description 壁纸视频无回调进度、无效时长与非 Error 文件/进程失败边界测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerWallpaperVideoIpcHandlers } from '../wallpaperVideo';
type Handler = (event: unknown, ...args: unknown[]) => unknown;
interface Step { code?: number | null; stdout?: string; stderr?: string; error?: Error; thrown?: unknown; createOutput?: boolean; }
interface MockChild extends EventEmitter { stdout: EventEmitter; stderr: EventEmitter; }
interface FileInfo { mtimeMs: number; isFile: () => boolean; }
const io = vi.hoisted(() => ({ handlers: new Map<string, Handler>(), existing: new Set<string>(), listing: new Map<string, string[]>(), steps: [] as Step[], spawn: vi.fn<(command: string, args: string[], options: { windowsHide: boolean }) => MockChild>(), mkdir: vi.fn<(directory: string, options: { recursive: boolean }) => void>(), copy: vi.fn<(source: string, target: string) => void>(), unlink: vi.fn<(file: string) => void>(), stat: vi.fn<(file: string) => FileInfo>(), readDir: vi.fn<(directory: string) => string[]>() }));
vi.mock('electron', () => ({ app: { getPath: () => 'C:/userData' }, ipcMain: { handle: (channel: string, handler: Handler) => io.handlers.set(channel, handler) } }));
vi.mock('fs', () => ({ existsSync: (file: string) => io.existing.has(file), mkdirSync: io.mkdir, copyFileSync: io.copy, unlinkSync: io.unlink, statSync: io.stat, readdirSync: io.readDir }));
vi.mock('child_process', () => ({ spawn: io.spawn }));
vi.mock('../../../utils/ffmpegPath', () => ({ getFfmpegBinary: () => 'C:/mock/ffmpeg.exe' }));
const source = 'C:/source/大片 name.mp4';
const stamp = 1_780_000_000_000;
const send = vi.fn<(channel: string, value: unknown) => void>();
const event = { sender: { send } };
/**
 * 调用真实的视频 IPC 处理器。
 * @param channel - 视频请求通道
 * @param value - 请求参数
 * @returns IPC 处理器结果
 */
function invoke(channel: string, value?: unknown): unknown { return io.handlers.get(`wallpaper:video:${  channel}`)!(event, value); }
/**
 * 构造虚拟 ffprobe 元数据。
 * @param video - 视频流字段覆盖
 * @param audio - 音频编码；null 表示静音视频
 * @param duration - 容器时长
 * @returns 内存命令响应
 */
function probe(video: Record<string, unknown> = {}, audio: string | null = 'aac', duration = '10'): Step {
  const streams = [{ codec_type: 'video', codec_name: 'H264', width: 1920, height: 1080, avg_frame_rate: '30000/1001', ...video }];
  if (audio) streams.push({ codec_type: 'audio', codec_name: audio } as typeof streams[number]);
  return { stdout: JSON.stringify({ streams, format: { duration, format_name: 'MOV,MP4' } }) };
}
/**
 * 从发送记录提取进度阶段，确认事件顺序。
 * @returns 进度载荷
 */
function progress(): unknown[] { return send.mock.calls.map(([, payload]) => payload); }
beforeEach(() => {
  io.handlers.clear(); io.existing.clear(); io.existing.add(source); io.listing.clear(); io.steps = [];
  io.mkdir.mockReset(); io.mkdir.mockImplementation((dir) => { io.existing.add(dir); }); io.copy.mockReset(); io.unlink.mockReset(); io.stat.mockReset(); io.readDir.mockReset(); io.readDir.mockImplementation((dir) => io.listing.get(dir) ?? []); send.mockReset();
  vi.spyOn(Date, 'now').mockReturnValue(stamp);
  io.spawn.mockReset(); io.spawn.mockImplementation((command, args) => {
    const step = io.steps.shift() ?? { error: new Error('unexpected process') };

    if ('thrown' in step) throw step.thrown;
    const child: MockChild = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
    queueMicrotask(() => {
      if (step.error) { child.emit('error', step.error); return; }
      if (step.stdout) child.stdout.emit('data', Buffer.from(step.stdout));
      if (step.stderr) child.stderr.emit('data', Buffer.from(step.stderr));
      const code = step.code === undefined ? 0 : step.code;
      if (command === 'C:/mock/ffmpeg.exe' && code === 0 && step.createOutput !== false) io.existing.add(args.at(-1)!);
      child.emit('close', code);
    });
    return child;
  });
  registerWallpaperVideoIpcHandlers();
});

afterEach(() => vi.restoreAllMocks());
describe('壁纸视频剩余进度与失败边界', () => {
  it.each(['linux', 'darwin'])('%s 初始化使用无扩展名 ffprobe 并解析真实探测结果', async (platform) => {
    const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
    if (!descriptor) throw new Error('platform descriptor missing');
    try {
      vi.resetModules();
      Object.defineProperty(process, 'platform', { ...descriptor, value: platform });
      const target = await import('../wallpaperVideo');
      target.registerWallpaperVideoIpcHandlers();
      io.steps.push(probe());
      await expect(invoke('probe', source)).resolves.toMatchObject({ width: 1920, height: 1080 });
      expect(io.spawn.mock.calls[0]?.[0]).toBe('ffprobe');
    } finally {
      Object.defineProperty(process, 'platform', descriptor);
      vi.resetModules();
    }
  });
  it('ffprobe stderr 没有进度回调时仍读取元数据', async () => {
    io.steps.push({ ...probe(), stderr: 'probe notice\n' });
    await expect(invoke('probe', source)).resolves.toMatchObject({ width: 1920 });
    expect(send).not.toHaveBeenCalled();
  });
  it('无 progressChannel 时仍完成 remux 且不发送进度', async () => {
    io.steps.push(probe(), { stderr: 'frame=1 time=00:00:00.00 speed=1.0x\n' }, {});
    await expect(invoke('prepare', { sourcePath: source })).resolves.toMatchObject({ ok: true, mode: 'remux' });
    expect(send).not.toHaveBeenCalled();
  });
  it('无有效时长时进度比例为零且零秒时间可解析', async () => {
    io.steps.push(probe({}, 'aac', 'invalid'), { stderr: 'frame=1 time=00:00:00.00 speed=1.0x\n' }, {});
    await expect(invoke('prepare', { sourcePath: source, progressChannel: 'progress' })).resolves.toMatchObject({ ok: true, durationMs: 0 });
    expect(progress()).toContainEqual({ stage: 'progress', percent: 0, frame: 1, speed: 1 });
  });
  it('命令异常后的复制以非 Error 值失败返回既有 copy failed', async () => {
    io.steps.push(probe(), { error: new Error('remux failed') });
    io.copy.mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- 文件系统叶接口任意异常值的既有文案回退。
      throw 'copy value';
    });
    await expect(invoke('prepare', { sourcePath: source })).resolves.toMatchObject({ ok: false, message: 'copy failed' });
  });
  it('无进度频道时转码退出失败也返回失败结果', async () => {
    io.steps.push(probe({ codec_name: 'hevc' }), { code: 1 });
    await expect(invoke('prepare', { sourcePath: source })).resolves.toMatchObject({ ok: false, mode: 'transcode', message: 'transcode exited non-zero' });
    expect(send).not.toHaveBeenCalled();
  });
  it('转码进程以非 Error 值拒绝时保留失败任务', async () => {
    io.steps.push(probe({ codec_name: 'hevc' }), { thrown: 'transcode value' });
    await expect(invoke('prepare', { sourcePath: source })).resolves.toMatchObject({ ok: false, mode: 'transcode', message: 'transcode failed' });
  });
});
