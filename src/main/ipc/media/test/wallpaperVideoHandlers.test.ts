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
 * @file wallpaperVideoHandlers.test.ts
 * @description wallpaper video IPC handlers 单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type EventCallback = (...args: unknown[]) => void;

const { handleMock, appGetPathMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  appGetPathMock: vi.fn(),
}));

const {
  existsSyncMock,
  mkdirSyncMock,
  readdirSyncMock,
  statSyncMock,
  unlinkSyncMock,
  copyFileSyncMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  readdirSyncMock: vi.fn(),
  statSyncMock: vi.fn(),
  unlinkSyncMock: vi.fn(),
  copyFileSyncMock: vi.fn(),
}));

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

const { getFfmpegBinaryMock } = vi.hoisted(() => ({
  getFfmpegBinaryMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
  app: {
    getPath: appGetPathMock,
  },
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
  readdirSync: readdirSyncMock,
  statSync: statSyncMock,
  unlinkSync: unlinkSyncMock,
  copyFileSync: copyFileSyncMock,
}));

vi.mock('child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('../../../utils/ffmpegPath', () => ({
  getFfmpegBinary: getFfmpegBinaryMock,
}));

import { registerWallpaperVideoIpcHandlers } from '../wallpaperVideo';

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

function createSpawnProcess(exitCode = 0): {
  stdout: { on: (event: string, cb: EventCallback) => void };
  stderr: { on: (event: string, cb: EventCallback) => void };
  on: (event: string, cb: EventCallback) => void;
} {
  const events = new Map<string, EventCallback>();
  return {
    stdout: {
      on: (event, cb) => {
        events.set(`stdout:${event}`, cb);
      },
    },
    stderr: {
      on: (event, cb) => {
        events.set(`stderr:${event}`, cb);
      },
    },
    on: (event, cb) => {
      events.set(event, cb);
      if (event === 'close') {
        queueMicrotask(() => cb(exitCode));
      }
    },
  };
}

describe('wallpaper video ipc handlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const existingPaths = new Set<string>();

  beforeEach(() => {
    handlers.clear();
    existingPaths.clear();

    handleMock.mockReset();
    appGetPathMock.mockReset();
    existsSyncMock.mockReset();
    mkdirSyncMock.mockReset();
    readdirSyncMock.mockReset();
    statSyncMock.mockReset();
    unlinkSyncMock.mockReset();
    copyFileSyncMock.mockReset();
    spawnMock.mockReset();
    getFfmpegBinaryMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });

    appGetPathMock.mockReturnValue('C:/user-data');
    existsSyncMock.mockImplementation((targetPath: string) => existingPaths.has(normalizePath(targetPath)));
    mkdirSyncMock.mockImplementation(() => undefined);
    readdirSyncMock.mockReturnValue([]);
    statSyncMock.mockImplementation(() => ({ isFile: () => false, mtimeMs: Date.now() }));
    unlinkSyncMock.mockImplementation(() => undefined);
    spawnMock.mockImplementation(() => createSpawnProcess(0));
    getFfmpegBinaryMock.mockReturnValue('ffmpeg.exe');

    registerWallpaperVideoIpcHandlers();
  });

  it('returns null when probe source path is invalid or not found', async () => {
    const probeHandler = handlers.get('wallpaper:video:probe');

    await expect(probeHandler?.({}, '')).resolves.toBeNull();
    await expect(probeHandler?.({}, 'C:/in/not-found.mp4')).resolves.toBeNull();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('extracts cover and returns output path when ffmpeg succeeds', async () => {
    const coverHandler = handlers.get('wallpaper:video:cover');
    const sourcePath = 'C:/in/video demo.mp4';
    existingPaths.add(normalizePath(sourcePath));

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123456);
    const expectedCoverPath = normalizePath('C:/user-data/wallpapers/video-cover/video_demo-123456.jpg');
    existingPaths.add(expectedCoverPath);

    await expect(coverHandler?.({}, sourcePath)).resolves.toEqual(expect.stringContaining('video_demo-123456.jpg'));

    expect(spawnMock).toHaveBeenCalledWith(
      'ffmpeg.exe',
      expect.arrayContaining(['-i', sourcePath]),
      expect.objectContaining({ windowsHide: true }),
    );

    nowSpy.mockRestore();
  });

  it('clears cache directories and ignores unlink errors', async () => {
    const clearHandler = handlers.get('wallpaper:video:clear-cache');
    const videoDir = 'C:/user-data/wallpapers/video';
    const coverDir = 'C:/user-data/wallpapers/video-cover';

    existingPaths.add(videoDir);
    existingPaths.add(coverDir);

    readdirSyncMock.mockImplementation((dirPath: string) => {
      const normalized = normalizePath(dirPath);
      if (normalized === videoDir) return ['a.mp4'];
      if (normalized === coverDir) return ['a.jpg'];
      return [];
    });

    unlinkSyncMock
      .mockImplementationOnce(() => {
        throw new Error('locked');
      })
      .mockImplementationOnce(() => undefined);

    await expect(clearHandler?.({})).resolves.toBeUndefined();
    expect(unlinkSyncMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to copy mode in prepare when ffprobe is unavailable', async () => {
    const prepareHandler = handlers.get('wallpaper:video:prepare');
    const sourcePath = 'C:/in/video.mp4';
    existingPaths.add(normalizePath(sourcePath));

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(777);
    const expectedPlaybackPath = 'C:/user-data/wallpapers/video/video-777.mp4';

    const result = await prepareHandler?.({}, { sourcePath });
    expect(normalizePath(String((result as { playbackPath?: unknown }).playbackPath ?? ''))).toBe(expectedPlaybackPath);
    expect(result).toEqual({
      ok: true,
      playbackPath: expect.any(String),
      coverPath: null,
      width: 0,
      height: 0,
      durationMs: 0,
      frameRate: null,
      videoCodec: null,
      audioCodec: null,
      container: null,
      mode: 'copy',
      ffmpegAvailable: false,
      message: 'ffmpeg/ffprobe not available, source copied without transcoding',
    });

    expect(copyFileSyncMock).toHaveBeenCalledTimes(1);
    const copyDestPath = String(copyFileSyncMock.mock.calls[0]?.[1] ?? '');
    expect(normalizePath(copyDestPath)).toBe(expectedPlaybackPath);
    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringContaining('ffprobe'),
      expect.arrayContaining(['-show_streams', '-show_format', sourcePath]),
      expect.objectContaining({ windowsHide: true }),
    );
    nowSpy.mockRestore();
  });

  it('returns failed prepare result when fallback copy throws', async () => {
    const prepareHandler = handlers.get('wallpaper:video:prepare');
    const sourcePath = 'C:/in/video.mp4';
    existingPaths.add(normalizePath(sourcePath));

    vi.spyOn(Date, 'now').mockReturnValue(888);
    copyFileSyncMock.mockImplementationOnce(() => {
      throw new Error('copy failed');
    });

    await expect(prepareHandler?.({}, { sourcePath })).resolves.toEqual({
      ok: false,
      playbackPath: null,
      coverPath: null,
      width: 0, 
      height: 0,
      durationMs: 0,
      frameRate: null,
      videoCodec: null,
      audioCodec: null,
      container: null,
      mode: 'copy',
      ffmpegAvailable: false,
      message: 'copy failed',
    });
  });
});
