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
 * @file formatFactoryHandlers.test.ts
 * @description format-factory IPC handlers 单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type SpawnScenario =
  | { type: 'close'; code: number; stderr?: string; stdout?: string; outputPathToCreate?: string }
  | { type: 'error'; message: string }
  | { type: 'throw'; message: string };

const {
  handleMock,
  fromWebContentsMock,
  getFocusedWindowMock,
  showOpenDialogMock,
  showSaveDialogMock,
} = vi.hoisted(() => ({
  handleMock: vi.fn(),
  fromWebContentsMock: vi.fn(),
  getFocusedWindowMock: vi.fn(),
  showOpenDialogMock: vi.fn(),
  showSaveDialogMock: vi.fn(),
}));

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

const { existsSyncMock, statSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  statSyncMock: vi.fn(),
}));

const { getFfmpegBinaryMock } = vi.hoisted(() => ({
  getFfmpegBinaryMock: vi.fn(() => 'ffmpeg'),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
  BrowserWindow: {
    fromWebContents: fromWebContentsMock,
    getFocusedWindow: getFocusedWindowMock,
  },
  dialog: {
    showOpenDialog: showOpenDialogMock,
    showSaveDialog: showSaveDialogMock,
  },
}));

vi.mock('child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  statSync: statSyncMock,
}));

vi.mock('../../../utils/ffmpegPath', () => ({
  getFfmpegBinary: getFfmpegBinaryMock,
}));

import { registerFormatFactoryIpcHandlers } from '../formatFactory';

describe('app format-factory ipc handlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const existingPaths = new Set<string>();
  const spawnScenarios: SpawnScenario[] = [];

  beforeEach(() => {
    handlers.clear();
    existingPaths.clear();
    spawnScenarios.length = 0;

    handleMock.mockReset();
    fromWebContentsMock.mockReset();
    getFocusedWindowMock.mockReset();
    showOpenDialogMock.mockReset();
    showSaveDialogMock.mockReset();
    spawnMock.mockReset();
    existsSyncMock.mockReset();
    statSyncMock.mockReset();
    getFfmpegBinaryMock.mockReset();

    getFfmpegBinaryMock.mockReturnValue('ffmpeg');

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });

    existsSyncMock.mockImplementation((filePath: string) => existingPaths.has(filePath));
    statSyncMock.mockImplementation((filePath: string) => ({
      size: filePath.includes('output') ? 512 : 1024,
    }));

    spawnMock.mockImplementation(() => {
      const scenario = spawnScenarios.shift() ?? { type: 'close', code: 0 };
      if (scenario.type === 'throw') {
        throw new Error(scenario.message);
      }

      const stdoutListeners = new Map<string, (chunk: Buffer) => void>();
      const stderrListeners = new Map<string, (chunk: Buffer) => void>();
      const listeners = new Map<string, (...args: unknown[]) => void>();

      const child = {
        stdout: {
          on: (event: string, listener: (chunk: Buffer) => void) => {
            stdoutListeners.set(event, listener);
          },
        },
        stderr: {
          on: (event: string, listener: (chunk: Buffer) => void) => {
            stderrListeners.set(event, listener);
          },
        },
        on: (event: string, listener: (...args: unknown[]) => void) => {
          listeners.set(event, listener);
        },
      };

      Promise.resolve().then(() => {
        if (scenario.type === 'error') {
          listeners.get('error')?.(new Error(scenario.message));
          return;
        }

        if (scenario.stdout) {
          stdoutListeners.get('data')?.(Buffer.from(scenario.stdout));
        }
        if (scenario.stderr) {
          stderrListeners.get('data')?.(Buffer.from(scenario.stderr));
        }
        if (scenario.outputPathToCreate) {
          existingPaths.add(scenario.outputPathToCreate);
        }
        listeners.get('close')?.(scenario.code);
      });

      return child;
    });

    registerFormatFactoryIpcHandlers();
  });

  it('handles pick-video branches', async () => {
    const pickVideo = handlers.get('format-factory:pick-video');

    fromWebContentsMock.mockReturnValueOnce(null);
    getFocusedWindowMock.mockReturnValueOnce(null);
    await expect(pickVideo?.({ sender: {} })).resolves.toBeNull();

    const fakeWindow = { id: 1 };
    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showOpenDialogMock.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    await expect(pickVideo?.({ sender: {} })).resolves.toBeNull();

    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showOpenDialogMock.mockResolvedValueOnce({ canceled: false, filePaths: ['C:/video/input.mp4'] });
    await expect(pickVideo?.({ sender: {} })).resolves.toEqual({
      filePath: 'C:/video/input.mp4',
      fileSize: 1024,
    });
  });

  it('handles extract-track validation and success/error branches', async () => {
    const extractTrack = handlers.get('format-factory:extract-track');

    await expect(extractTrack?.({ sender: {} }, null)).resolves.toEqual({ success: false, error: 'invalid options' });

    await expect(extractTrack?.({ sender: {} }, {
      filePath: 'C:/missing/input.mp4',
      trackType: 'audio',
      outputFormat: 'mp3',
    })).resolves.toEqual({ success: false, error: 'source file not found' });

    existingPaths.add('C:/video/input.mp4');

    await expect(extractTrack?.({ sender: {} }, {
      filePath: 'C:/video/input.mp4',
      trackType: 'invalid',
      outputFormat: 'mp3',
    })).resolves.toEqual({ success: false, error: 'invalid track type' });

    await expect(extractTrack?.({ sender: {} }, {
      filePath: 'C:/video/input.mp4',
      trackType: 'audio',
      outputFormat: '',
    })).resolves.toEqual({ success: false, error: 'invalid output format' });

    fromWebContentsMock.mockReturnValueOnce(null);
    getFocusedWindowMock.mockReturnValueOnce(null);
    await expect(extractTrack?.({ sender: {} }, {
      filePath: 'C:/video/input.mp4',
      trackType: 'audio',
      outputFormat: 'mp3',
    })).resolves.toEqual({ success: false, error: 'no window' });

    const fakeWindow = { id: 2 };
    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showSaveDialogMock.mockResolvedValueOnce({ canceled: true });
    await expect(extractTrack?.({ sender: {} }, {
      filePath: 'C:/video/input.mp4',
      trackType: 'audio',
      outputFormat: 'mp3',
    })).resolves.toEqual({ success: false, error: 'canceled' });

    const outputPath = 'C:/video/output-audio.mp3';
    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showSaveDialogMock.mockResolvedValueOnce({ canceled: false, filePath: outputPath });
    spawnScenarios.push({ type: 'close', code: 0, outputPathToCreate: outputPath });

    await expect(extractTrack?.({ sender: {} }, {
      filePath: 'C:/video/input.mp4',
      trackType: 'audio',
      outputFormat: 'mp3',
    })).resolves.toEqual({
      success: true,
      outputPath,
      fileSize: 512,
    });

    expect(spawnMock).toHaveBeenCalledWith('ffmpeg', expect.arrayContaining(['-vn', '-c:a', 'libmp3lame']), { windowsHide: true });

    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showSaveDialogMock.mockResolvedValueOnce({ canceled: false, filePath: 'C:/video/output-video.mp4' });
    spawnScenarios.push({ type: 'close', code: 1, stderr: 'line 1\nline 2\nextract failed\n' });

    await expect(extractTrack?.({ sender: {} }, {
      filePath: 'C:/video/input.mp4',
      trackType: 'video',
      outputFormat: 'mp4',
    })).resolves.toEqual({ success: false, error: 'extract failed' });

    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showSaveDialogMock.mockResolvedValueOnce({ canceled: false, filePath: 'C:/video/output-audio2.mp3' });
    spawnScenarios.push({ type: 'throw', message: 'spawn ENOENT' });

    await expect(extractTrack?.({ sender: {} }, {
      filePath: 'C:/video/input.mp4',
      trackType: 'audio',
      outputFormat: 'mp3',
    })).resolves.toEqual({
      success: false,
      error: 'ffmpeg not found. Please install ffmpeg and add it to your PATH.',
    });
  });
});
