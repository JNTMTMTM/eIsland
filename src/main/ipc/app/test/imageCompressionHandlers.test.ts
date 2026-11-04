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
 * @file imageCompressionHandlers.test.ts
 * @description image compression IPC handlers 单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type SpawnScenario =
  | { type: 'close'; code: number; stderr?: string; outputPathToCreate?: string }
  | { type: 'throw'; message: string };

const {
  handleMock,
  appGetPathMock,
  fromWebContentsMock,
  getFocusedWindowMock,
  getAllWindowsMock,
  showOpenDialogMock,
} = vi.hoisted(() => ({
  handleMock: vi.fn(),
  appGetPathMock: vi.fn(),
  fromWebContentsMock: vi.fn(),
  getFocusedWindowMock: vi.fn(),
  getAllWindowsMock: vi.fn(),
  showOpenDialogMock: vi.fn(),
}));

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

const { existsSyncMock, mkdirSyncMock, readFileSyncMock, writeFileSyncMock, statSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
  statSyncMock: vi.fn(),
}));

const { getFfmpegBinaryMock } = vi.hoisted(() => ({
  getFfmpegBinaryMock: vi.fn(() => 'ffmpeg'),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
  app: {
    getPath: appGetPathMock,
  },
  BrowserWindow: {
    fromWebContents: fromWebContentsMock,
    getFocusedWindow: getFocusedWindowMock,
    getAllWindows: getAllWindowsMock,
  },
  dialog: {
    showOpenDialog: showOpenDialogMock,
  },
}));

vi.mock('child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
  statSync: statSyncMock,
}));

vi.mock('../../../utils/ffmpegPath', () => ({
  getFfmpegBinary: getFfmpegBinaryMock,
}));

describe('app image-compression ipc handlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const existingPaths = new Set<string>();
  const spawnScenarios: SpawnScenario[] = [];
  let registerImageCompressionIpcHandlers: () => void;
  const normalizePath = (path: string): string => path.replace(/\\/g, '/');

  beforeEach(async () => {
    handlers.clear();
    existingPaths.clear();
    spawnScenarios.length = 0;

    handleMock.mockReset();
    appGetPathMock.mockReset();
    fromWebContentsMock.mockReset();
    getFocusedWindowMock.mockReset();
    getAllWindowsMock.mockReset();
    showOpenDialogMock.mockReset();

    spawnMock.mockReset();

    existsSyncMock.mockReset();
    mkdirSyncMock.mockReset();
    readFileSyncMock.mockReset();
    writeFileSyncMock.mockReset();
    statSyncMock.mockReset();
    getFfmpegBinaryMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });

    appGetPathMock.mockImplementation((name: string) => (name === 'userData' ? 'C:/user-data' : ''));

    existsSyncMock.mockImplementation((path: string) => existingPaths.has(normalizePath(path)));
    mkdirSyncMock.mockImplementation(() => undefined);
    readFileSyncMock.mockReturnValue('');
    statSyncMock.mockImplementation((path: string) => {
      const normalizedPath = normalizePath(path);
      if (normalizedPath === 'C:/in/a.jpg') return { size: 1000 };
      if (normalizedPath === 'C:/in/b.txt') return { size: 500 };
      if (normalizedPath === 'C:/out/a_compressed.jpg') return { size: 400 };
      throw new Error('not found');
    });

    const sendMock = vi.fn();
    getAllWindowsMock.mockReturnValue([
      {
        isDestroyed: () => false,
        webContents: { send: sendMock },
      },
    ]);

    spawnMock.mockImplementation(() => {
      const scenario = spawnScenarios.shift() ?? { type: 'close', code: 0 };
      if (scenario.type === 'throw') {
        throw new Error(scenario.message);
      }

      const stderrListeners = new Map<string, (chunk: Buffer) => void>();
      const listeners = new Map<string, (...args: unknown[]) => void>();

      const child = {
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
        if (scenario.stderr) {
          stderrListeners.get('data')?.(Buffer.from(scenario.stderr));
        }
        if (scenario.outputPathToCreate) {
          existingPaths.add(normalizePath(scenario.outputPathToCreate));
        }
        listeners.get('close')?.(scenario.code);
      });

      return child;
    });

    getFfmpegBinaryMock.mockReturnValue('ffmpeg');

    vi.resetModules();
    ({ registerImageCompressionIpcHandlers } = await import('../imageCompression'));
  });

  it('handles pick-images and pick-output-dir branches', async () => {
    registerImageCompressionIpcHandlers();

    const pickImages = handlers.get('image-compression:pick-images');
    const pickOutputDir = handlers.get('image-compression:pick-output-dir');

    fromWebContentsMock.mockReturnValueOnce(null);
    getFocusedWindowMock.mockReturnValueOnce(null);
    await expect(pickImages?.({ sender: {} })).resolves.toEqual([]);

    const fakeWindow = { id: 1 };
    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showOpenDialogMock.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    await expect(pickImages?.({ sender: {} })).resolves.toEqual([]);

    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showOpenDialogMock.mockResolvedValueOnce({ canceled: false, filePaths: ['C:/in/a.jpg', 'C:/in/b.png'] });
    await expect(pickImages?.({ sender: {} })).resolves.toEqual(['C:/in/a.jpg', 'C:/in/b.png']);

    fromWebContentsMock.mockReturnValueOnce(null);
    getFocusedWindowMock.mockReturnValueOnce(null);
    await expect(pickOutputDir?.({ sender: {} })).resolves.toBeNull();

    fromWebContentsMock.mockReturnValueOnce(fakeWindow);
    showOpenDialogMock.mockResolvedValueOnce({ canceled: false, filePaths: ['C:/out'] });
    await expect(pickOutputDir?.({ sender: {} })).resolves.toBe('C:/out');
  });

  it('handles start/list/remove branches and persistence scheduling', async () => {
    vi.useFakeTimers();
    try {
      registerImageCompressionIpcHandlers();

      const start = handlers.get('image-compression:start');
      const list = handlers.get('image-compression:list');
      const remove = handlers.get('image-compression:remove');

      await expect(start?.({}, { inputPaths: [] })).resolves.toEqual({
        ok: false,
        message: '请选择至少一张图片',
      });

      mkdirSyncMock.mockImplementationOnce(() => {
        throw new Error('mkdir failed');
      });
      await expect(start?.({}, { inputPaths: ['C:/in/a.jpg'], outputDir: 'C:/out', quality: 80 })).resolves.toEqual({
        ok: false,
        message: 'mkdir failed',
      });

      existingPaths.add(normalizePath('C:/in/a.jpg'));
      existingPaths.add(normalizePath('C:/in/b.txt'));
      spawnScenarios.push({ type: 'close', code: 0, outputPathToCreate: 'C:/out/a_compressed.jpg' });

      const startResult = await start?.({}, {
        inputPaths: ['C:/in/a.jpg', 'C:/in/b.txt', 'C:/in/missing.jpg', 'C:/in/a.jpg'],
        outputDir: 'C:/out',
        quality: 100,
      }) as { ok: boolean; results?: Array<{ status: string; success: boolean; error?: string }> };

      expect(startResult.ok).toBe(true);
      expect(startResult.results).toHaveLength(3);
      expect(startResult.results?.map((x) => x.status)).toEqual(['completed', 'failed', 'failed']);
      expect(startResult.results?.[1]?.error).toBe('unsupported image format');
      expect(startResult.results?.[2]?.error).toBe('source file not found');
      expect(spawnMock).toHaveBeenCalledWith('ffmpeg', expect.arrayContaining(['-q:v', '2']), { windowsHide: true });

      const listed = list?.({}) as Array<{ id: string }>;
      expect(listed.length).toBe(3);

      expect(remove?.({}, '')).toBe(false);
      expect(remove?.({}, 'unknown')).toBe(false);
      expect(remove?.({}, listed[0]?.id)).toBe(true);
      expect((list?.({}) as Array<unknown>).length).toBe(2);

      await vi.runOnlyPendingTimersAsync();
      expect(writeFileSyncMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
