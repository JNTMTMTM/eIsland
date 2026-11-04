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
 * @file downloadHandlers.test.ts
 * @description download IPC handlers 单元测试。
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleMock,
  appGetPathMock,
  showSaveDialogMock,
  fromWebContentsMock,
  getFocusedWindowMock,
  getAllWindowsMock,
} = vi.hoisted(() => ({
  handleMock: vi.fn(),
  appGetPathMock: vi.fn(),
  showSaveDialogMock: vi.fn(),
  fromWebContentsMock: vi.fn(),
  getFocusedWindowMock: vi.fn(),
  getAllWindowsMock: vi.fn(),
}));

const { existsSyncMock, readFileSyncMock, mkdirSyncMock, writeFileSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
}));

const {
  startDownloadMock,
  cancelDownloadMock,
  pauseDownloadMock,
  resumeDownloadMock,
  removeTaskMock,
} = vi.hoisted(() => ({
  startDownloadMock: vi.fn(),
  cancelDownloadMock: vi.fn(),
  pauseDownloadMock: vi.fn(),
  resumeDownloadMock: vi.fn(),
  removeTaskMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
  app: {
    getPath: appGetPathMock,
  },
  dialog: {
    showSaveDialog: showSaveDialogMock,
  },
  BrowserWindow: {
    fromWebContents: fromWebContentsMock,
    getFocusedWindow: getFocusedWindowMock,
    getAllWindows: getAllWindowsMock,
  },
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  mkdirSync: mkdirSyncMock,
  writeFileSync: writeFileSyncMock,
}));

vi.mock('../../../core/downloadEngine', () => ({
  MultiThreadDownloadEngine: class {
    startDownload = startDownloadMock;

    cancelDownload = cancelDownloadMock;

    pauseDownload = pauseDownloadMock;

    resumeDownload = resumeDownloadMock;

    removeTask = removeTaskMock;
  },
}));

import { registerDownloadIpcHandlers } from '../download';

describe('app download ipc handlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handlers.clear();

    handleMock.mockReset();
    appGetPathMock.mockReset();
    showSaveDialogMock.mockReset();
    fromWebContentsMock.mockReset();
    getFocusedWindowMock.mockReset();
    getAllWindowsMock.mockReset();

    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    mkdirSyncMock.mockReset();
    writeFileSyncMock.mockReset();

    startDownloadMock.mockReset();
    cancelDownloadMock.mockReset();
    pauseDownloadMock.mockReset();
    resumeDownloadMock.mockReset();
    removeTaskMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });

    appGetPathMock.mockImplementation((name: string) => {
      if (name === 'userData') return 'C:/user-data';
      if (name === 'downloads') return 'C:/downloads-fallback';
      return '';
    });
    existsSyncMock.mockReturnValue(false);
    readFileSyncMock.mockReturnValue('');
    getAllWindowsMock.mockReturnValue([]);
  });

  it('handles start/control/query/pick handlers with expected branches', async () => {
    vi.useFakeTimers();
    try {
      registerDownloadIpcHandlers({
        getDownloadsPath: () => 'C:/downloads',
      });

      const start = handlers.get('download:start');
      const cancel = handlers.get('download:cancel');
      const pause = handlers.get('download:pause');
      const resume = handlers.get('download:resume');
      const remove = handlers.get('download:remove');
      const list = handlers.get('download:list');
      const get = handlers.get('download:get');
      const pickSavePath = handlers.get('download:pick-save-path');
      const getDefaultDir = handlers.get('download:get-default-dir');

      await expect(start?.({}, { url: '   ' })).resolves.toEqual({ ok: false, message: '下载地址不能为空' });

      const downloadingTask = {
        id: 'task-downloading',
        url: 'https://a.example.com/a.bin',
        savePath: 'C:/downloads/a.bin',
        fileName: 'a.bin',
        totalBytes: 100,
        downloadedBytes: 10,
        progress: 0.1,
        speedBytesPerSecond: 1,
        estimatedFinishAt: null,
        threads: 16,
        status: 'downloading',
        createdAt: 2,
        updatedAt: 2,
      } as const;
      startDownloadMock.mockResolvedValueOnce(downloadingTask);

      await expect(start?.({}, { url: ' https://a.example.com/a.bin ', threads: 99 })).resolves.toEqual({
        ok: true,
        task: downloadingTask,
      });
      expect(startDownloadMock).toHaveBeenCalledWith({
        url: 'https://a.example.com/a.bin',
        savePath: undefined,
        threads: 16,
        defaultDir: 'C:/downloads',
      });

      cancelDownloadMock.mockReturnValueOnce(true);
      expect(cancel?.({}, ' task-downloading ')).toBe(true);
      expect(cancelDownloadMock).toHaveBeenCalledWith('task-downloading');
      expect(cancel?.({}, '   ')).toBe(false);

      pauseDownloadMock.mockReturnValueOnce(true);
      expect(pause?.({}, 'task-downloading')).toBe(true);
      expect(pauseDownloadMock).toHaveBeenCalledWith('task-downloading');
      expect(pause?.({}, null)).toBe(false);

      const resumedTask = {
        ...downloadingTask,
        id: 'task-resume',
        status: 'downloading',
        updatedAt: 3,
      } as const;
      resumeDownloadMock.mockResolvedValueOnce(resumedTask);
      await expect(resume?.({}, 'task-resume')).resolves.toEqual({ ok: true, task: resumedTask });

      resumeDownloadMock.mockRejectedValueOnce(new Error('resume failed'));
      await expect(resume?.({}, 'task-resume-failed')).resolves.toEqual({ ok: false, message: 'resume failed' });
      await expect(resume?.({}, '')).resolves.toEqual({ ok: false, message: '任务标识不能为空' });

      removeTaskMock.mockReturnValueOnce(false);
      expect(remove?.({}, 'task-downloading')).toBe(false);

      const completedTask = {
        ...downloadingTask,
        id: 'task-completed',
        status: 'completed',
        createdAt: 4,
        updatedAt: 4,
      } as const;
      startDownloadMock.mockResolvedValueOnce(completedTask);
      await expect(start?.({}, { url: 'https://a.example.com/b.bin', threads: 8 })).resolves.toEqual({
        ok: true,
        task: completedTask,
      });

      removeTaskMock.mockReturnValueOnce(false);
      expect(remove?.({}, 'task-completed')).toBe(true);
      expect(remove?.({}, 'unknown-task')).toBe(false);

      expect(list?.({})).toEqual([downloadingTask, resumedTask]);
      expect(get?.({}, 'task-resume')).toEqual(resumedTask);
      expect(get?.({}, '')).toBeNull();

      const fakeWindow = { id: 1 };
      fromWebContentsMock.mockReturnValueOnce(null);
      getFocusedWindowMock.mockReturnValueOnce(fakeWindow);
      showSaveDialogMock.mockResolvedValueOnce({ canceled: false, filePath: 'C:/picked/file.bin' });
      await expect(pickSavePath?.({ sender: {} }, 'bad:/name?.txt')).resolves.toBe('C:/picked/file.bin');
      expect(showSaveDialogMock).toHaveBeenCalledWith(
        fakeWindow,
        expect.objectContaining({
          defaultPath: expect.stringContaining('bad__name_.txt'),
        }),
      );

      fromWebContentsMock.mockReturnValueOnce(null);
      getFocusedWindowMock.mockReturnValueOnce(null);
      await expect(pickSavePath?.({ sender: {} }, 'x.bin')).resolves.toBeNull();

      expect(getDefaultDir?.({})).toBe('C:/downloads');

      await vi.runOnlyPendingTimersAsync();
      expect(writeFileSyncMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
