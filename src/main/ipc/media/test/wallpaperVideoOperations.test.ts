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
 * @file wallpaperVideoOperations.test.ts
 * @description 壁纸视频探测、转码与复制降级、进度事件及缓存目录边界测试。
 * @author 鸡哥
 */

import { EventEmitter } from 'events';
import { basename, dirname, join, resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
const videoDir = resolve('C:/userData/wallpapers/video');
const coverDir = resolve('C:/userData/wallpapers/video-cover');
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
describe('Wallpaper workspace and cache cleanup', () => {
  it('creates only the resolved user-data workspace and registers all four handlers', () => {
    expect(io.mkdir.mock.calls.map(([dir]) => dir)).toEqual([resolve('C:/userData/wallpapers'), videoDir, coverDir]); expect(io.handlers.size).toBe(4); expect(io.spawn).not.toHaveBeenCalled();
  });
  it('sweeps only files older than 24 hours and tolerates per-file and directory errors', () => {
    io.mkdir.mockClear(); io.listing.set(videoDir, ['old.mp4', 'fresh.mp4', 'directory', 'broken.mp4']); io.listing.set(coverDir, ['old.jpg']);
    io.stat.mockImplementation((file) => { if (file.endsWith('broken.mp4')) throw new Error('missing'); return { mtimeMs: file.includes('fresh') ? stamp - 1000 : stamp - 86_400_001, isFile: () => !file.endsWith('directory') }; });
    io.unlink.mockImplementationOnce(() => { throw new Error('locked'); }); registerWallpaperVideoIpcHandlers();
    expect(io.mkdir).not.toHaveBeenCalled(); expect(io.unlink.mock.calls.map(([file]) => file)).toEqual([join(videoDir, 'old.mp4'), join(coverDir, 'old.jpg')]);
    io.readDir.mockImplementationOnce(() => { throw new Error('denied'); }); expect(() => registerWallpaperVideoIpcHandlers()).not.toThrow();
  });
  it('clears cached entries and tolerates missing directories, denied listings and locked files', async () => {
    io.listing.set(videoDir, ['a.mp4', 'b.mp4']); io.listing.set(coverDir, ['a.jpg']); io.unlink.mockImplementationOnce(() => { throw new Error('locked'); });
    await invoke('clear-cache'); expect(io.unlink).toHaveBeenCalledTimes(3);
    io.unlink.mockClear(); io.existing.delete(videoDir); io.readDir.mockImplementationOnce(() => { throw new Error('denied'); }); await invoke('clear-cache'); expect(io.unlink).not.toHaveBeenCalled();
  });
});
describe('Wallpaper metadata probing', () => {
  it.each(['', null, {}, 'C:/missing.mp4'])('rejects absent or invalid source %s without spawning', async (input) => { expect(await invoke('probe', input)).toBeNull(); expect(io.spawn).not.toHaveBeenCalled(); });
  it('normalizes codecs, dimensions, rational frame rate and duration', async () => {
    io.steps.push(probe()); expect(await invoke('probe', source)).toMatchObject({ width: 1920, height: 1080, durationMs: 10000, frameRate: 29.97, videoCodec: 'h264', audioCodec: 'aac', container: 'mov,mp4' }); expect(io.spawn).toHaveBeenCalledWith(process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe', expect.arrayContaining([source, '-show_streams', '-show_format']), { windowsHide: true });
  });
  it.each([[{ avg_frame_rate: '0/0', r_frame_rate: '24/1' }, '0', 24, 1], [{ avg_frame_rate: '25' }, 'bad', 25, 0], [{ avg_frame_rate: '1/0' }, '-1', null, 1], [{ avg_frame_rate: 'bad' }, '1.2345', null, 1235], [{ avg_frame_rate: '', r_frame_rate: '0/0' }, '10', null, 10000]])('handles metadata boundaries %s', async (video, duration, frameRate, durationMs) => {
    io.steps.push(probe(video, null, duration)); expect(await invoke('probe', source)).toMatchObject({ frameRate, durationMs, audioCodec: null });
  });
  it('accepts empty metadata with safe defaults', async () => { io.steps.push({ stdout: '{}' }); expect(await invoke('probe', source)).toMatchObject({ width: 0, height: 0, frameRate: null, durationMs: 1, videoCodec: null, audioCodec: null, container: null }); });
  it.each([{ code: 1, stdout: '{}' }, { code: null, stdout: '{}' }, { stdout: '' }, { stdout: '{broken' }, { error: new Error('ENOENT') }, { thrown: new Error('spawn failed') }])('returns null for a failed probe %s', async (step) => { io.steps.push(step); expect(await invoke('probe', source)).toBeNull(); });
});
describe('Wallpaper copy and encode operations', () => {
  it.each([null, 'invalid', {}, { sourcePath: 'C:/missing.mp4' }])('rejects invalid preparation %s', async (options) => { expect(await invoke('prepare', options)).toMatchObject({ ok: false, mode: 'copy', ffmpegAvailable: false }); expect(io.spawn).not.toHaveBeenCalled(); expect(io.copy).not.toHaveBeenCalled(); });
  it('copies the source after probe failure using safe user-data output paths and sends completion', async () => {
    io.steps.push({ error: new Error('ENOENT') }); const result = await invoke('prepare', { sourcePath: source, progressChannel: 'progress' });
    expect(result).toMatchObject({ ok: true, mode: 'copy', coverPath: null, ffmpegAvailable: false, width: 0 });
    const [[input, output]] = io.copy.mock.calls; expect(input).toBe(source); expect(dirname(output)).toBe(videoDir); expect(resolve(output)).toBe(output); expect(basename(output)).toBe(`_name-${  stamp  }.mp4`); expect(progress()).toEqual([{ stage: 'start', mode: 'copy' }, { stage: 'done', percent: 100 }]);
  });
  it.each([new Error('copy denied'), 'copy denied'])('reports a copy failure %s', async (error) => { io.steps.push({ error: new Error('ENOENT') }); io.copy.mockImplementationOnce(() => { const failure: unknown = error; throw failure; }); expect(await invoke('prepare', { sourcePath: source, progressChannel: 'progress' })).toMatchObject({ ok: false, ffmpegAvailable: false, message: error instanceof Error ? error.message : 'copy failed' }); expect(progress()).toContainEqual(expect.objectContaining({ stage: 'error' })); });
  it('remuxes a compatible stream, extracts the first frame and bounds progress at 100%', async () => {
    io.steps.push(probe(), { stderr: '  \rframe= 30 time=00:00:05.00 speed=2.0x\nframe=60 time=00:00:20.00 speed=3.0x\nignored\n' }, {});
    const result = await invoke('prepare', { sourcePath: source, progressChannel: 'progress' }); expect(result).toMatchObject({ ok: true, mode: 'remux', width: 1920, durationMs: 10000, coverPath: join(coverDir, `_name-${  stamp  }.jpg`) });
    expect(io.spawn.mock.calls[1][1]).toEqual(expect.arrayContaining(['-c', 'copy', '-movflags', '+faststart'])); expect(io.spawn.mock.calls[2][1]).toEqual(expect.arrayContaining(['-vframes', '1', '-q:v', '2'])); expect(progress()).toContainEqual({ stage: 'progress', percent: 50, frame: 30, speed: 2 }); expect(progress()).toContainEqual({ stage: 'progress', percent: 100, frame: 60, speed: 3 }); expect(progress().at(-1)).toEqual({ stage: 'done', percent: 100 });
  });
  it.each([{ codec_name: 'hevc' }, { audio: 'mp3' }, { preferRemux: false }])('transcodes incompatible or explicitly selected streams %s', async (variant) => {
    io.steps.push(probe('codec_name' in variant ? { codec_name: variant.codec_name } : {}, 'audio' in variant ? variant.audio : 'aac'), { stderr: 'speed=1.0x\n' }, {});
    expect(await invoke('prepare', { sourcePath: source, preferRemux: 'preferRemux' in variant ? variant.preferRemux : true, progressChannel: 'progress' })).toMatchObject({ ok: true, mode: 'transcode', width: 1920, durationMs: 10000 }); expect(io.spawn.mock.calls[1][1]).toEqual(expect.arrayContaining(['-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-c:a', 'aac'])); expect(progress()).toContainEqual({ stage: 'progress', percent: 0, frame: undefined, speed: 1 });
  });
  it('remuxes video without audio and tolerates a failed cover command', async () => { io.steps.push(probe({}, null), {}, { code: 1 }); expect(await invoke('prepare', { sourcePath: source })).toMatchObject({ ok: true, mode: 'remux', coverPath: null }); });
  it.each([{ code: 1 }, { createOutput: false }, { error: new Error('encode unavailable') }])('reports transcode failure %s', async (step) => { io.steps.push(probe({ codec_name: 'hevc' }), step); expect(await invoke('prepare', { sourcePath: source, progressChannel: 'progress' })).toMatchObject({ ok: false, mode: 'transcode', ffmpegAvailable: true }); expect(io.copy).not.toHaveBeenCalled(); });
  it('falls back from a failed remux to a failed transcode without reporting success', async () => { io.steps.push(probe(), { code: 1 }, { code: 1 }); expect(await invoke('prepare', { sourcePath: source, progressChannel: 'progress' })).toMatchObject({ ok: false, mode: 'transcode', message: 'transcode exited non-zero' }); });
  it.each([{ code: 1 }, { createOutput: false }])('finishes metadata, cover and completion after remux fallback %s succeeds', async (remux) => {
    io.steps.push(probe(), remux, {}, {});
    const result = await invoke('prepare', { sourcePath: source, progressChannel: 'progress' });
    expect(result).toMatchObject({ ok: true, mode: 'transcode', width: 1920, height: 1080, durationMs: 10000, frameRate: 29.97, videoCodec: 'h264', audioCodec: 'aac', container: 'mov,mp4', coverPath: join(coverDir, `_name-${stamp}.jpg`), ffmpegAvailable: true });
    expect(io.spawn).toHaveBeenCalledTimes(4);
    expect(io.spawn.mock.calls[2][1]).toEqual(expect.arrayContaining(['-c:v', 'libx264']));
    expect(io.spawn.mock.calls[3][1]).toEqual(expect.arrayContaining(['-vframes', '1']));
    expect(progress().filter((value) => typeof value === 'object' && value !== null && 'stage' in value && value.stage === 'done')).toEqual([{ stage: 'done', percent: 100 }]);
  });
  it('does not extract a cover or signal completion after the fallback transcode fails', async () => {
    io.steps.push(probe(), { code: 1 }, { code: 1 });
    expect(await invoke('prepare', { sourcePath: source, progressChannel: 'progress' })).toMatchObject({ ok: false, mode: 'transcode' });
    expect(io.spawn).toHaveBeenCalledTimes(3);
    expect(progress()).not.toContainEqual({ stage: 'done', percent: 100 });
  });
  it.each([new Error('remux unavailable'), 'remux unavailable'])('falls back to copy after a remux process rejection %s', async (error) => { io.steps.push(probe(), { thrown: error }); expect(await invoke('prepare', { sourcePath: source, progressChannel: 'progress' })).toMatchObject({ ok: true, mode: 'copy', width: 1920, ffmpegAvailable: true }); expect(io.copy).toHaveBeenCalledOnce(); });
  it('reports failure if both remux and the fallback copy are unavailable', async () => { io.steps.push(probe(), { error: new Error('process failed') }); io.copy.mockImplementationOnce(() => { throw new Error('copy failed'); }); expect(await invoke('prepare', { sourcePath: source })).toMatchObject({ ok: false, message: 'copy failed', ffmpegAvailable: true }); });
  it('tolerates progress sender disconnection', async () => { io.steps.push(probe(), { stderr: 'time=00:00:01.00' }, {}); send.mockImplementationOnce(() => { throw new Error('destroyed'); }); expect(await invoke('prepare', { sourcePath: source, progressChannel: 'progress' })).toMatchObject({ ok: true }); });
});
describe('Wallpaper individual cover extraction', () => {
  it.each(['', null, 'C:/missing.mp4'])('ignores invalid cover source %s', async (input) => { expect(await invoke('cover', input)).toBeNull(); expect(io.spawn).not.toHaveBeenCalled(); });
  it('returns the generated cover within the user-data cover directory', async () => { io.steps.push({}); const cover = await invoke('cover', source); expect(cover).toBe(join(coverDir, `_name-${  stamp  }.jpg`)); });
  it.each([{ code: 1 }, { createOutput: false }, { error: new Error('ffmpeg missing') }])('returns null after failed cover extraction %s', async (step) => { io.steps.push(step); expect(await invoke('cover', source)).toBeNull(); });
});
