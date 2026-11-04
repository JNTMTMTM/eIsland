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
 * @file mainLog.test.ts
 * @description mainLog 模块单元测试
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  existsSyncMock,
  mkdirSyncMock,
  readdirSyncMock,
  statSyncMock,
  unlinkSyncMock,
  appendFileSyncMock,
  getPathMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  readdirSyncMock: vi.fn(),
  statSyncMock: vi.fn(),
  unlinkSyncMock: vi.fn(),
  appendFileSyncMock: vi.fn(),
  getPathMock: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    getPath: getPathMock,
  },
}));

vi.mock('path', () => ({
  join: (...segments: string[]) => segments.join('/'),
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
  readdirSync: readdirSyncMock,
  statSync: statSyncMock,
  unlinkSync: unlinkSyncMock,
  appendFileSync: appendFileSyncMock,
}));

import { ensureLogsDir, clearLogsCacheFiles, createSessionMainLogger } from '../mainLog';

const USER_DATA = 'C:/Users/test/AppData/Roaming/eIsland';
const LOG_DIR = `${USER_DATA}/logs`;

describe('ensureLogsDir', () => {
  beforeEach(() => {
    getPathMock.mockReturnValue(USER_DATA);
  });

  it('returns log directory path', () => {
    existsSyncMock.mockReturnValue(true);
    const result = ensureLogsDir();
    expect(result).toBe(LOG_DIR);
  });

  it('creates directory when it does not exist', () => {
    existsSyncMock.mockReturnValue(false);
    ensureLogsDir();
    expect(mkdirSyncMock).toHaveBeenCalledWith(LOG_DIR, { recursive: true });
  });

  it('skips directory creation when it already exists', () => {
    existsSyncMock.mockReturnValue(true);
    ensureLogsDir();
    expect(mkdirSyncMock).not.toHaveBeenCalled();
  });
});

describe('clearLogsCacheFiles', () => {
  beforeEach(() => {
    getPathMock.mockReturnValue(USER_DATA);
    existsSyncMock.mockReturnValue(true);
  });

  it('returns success with zero counts when directory is empty', () => {
    readdirSyncMock.mockReturnValue([]);
    const result = clearLogsCacheFiles();
    expect(result).toEqual({ success: true, freedBytes: 0, fileCount: 0 });
  });

  it('deletes files and reports freed bytes', () => {
    readdirSyncMock.mockReturnValue(['a.log', 'b.log']);
    statSyncMock.mockReturnValueOnce({ isFile: () => true, size: 100 });
    statSyncMock.mockReturnValueOnce({ isFile: () => true, size: 250 });

    const result = clearLogsCacheFiles();

    expect(unlinkSyncMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true, freedBytes: 350, fileCount: 2 });
  });

  it('skips directories and only deletes files', () => {
    readdirSyncMock.mockReturnValue(['subdir', 'file.log']);
    statSyncMock.mockReturnValueOnce({ isFile: () => false, size: 0 });
    statSyncMock.mockReturnValueOnce({ isFile: () => true, size: 50 });

    const result = clearLogsCacheFiles();

    expect(unlinkSyncMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, freedBytes: 50, fileCount: 1 });
  });

  it('handles per-file errors gracefully and continues', () => {
    readdirSyncMock.mockReturnValue(['locked.log', 'ok.log']);
    statSyncMock.mockImplementationOnce(() => {
      throw new Error('EACCES');
    });
    statSyncMock.mockReturnValueOnce({ isFile: () => true, size: 42 });

    const result = clearLogsCacheFiles();

    expect(unlinkSyncMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, freedBytes: 42, fileCount: 1 });
  });

  it('returns failure when ensureLogsDir throws', () => {
    existsSyncMock.mockReturnValue(false);
    mkdirSyncMock.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const result = clearLogsCacheFiles();

    expect(result).toEqual({ success: false, freedBytes: 0, fileCount: 0 });
  });

  it('returns failure when readdirSync throws', () => {
    readdirSyncMock.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const result = clearLogsCacheFiles();

    expect(result).toEqual({ success: false, freedBytes: 0, fileCount: 0 });
  });
});

describe('createSessionMainLogger', () => {
  beforeEach(() => {
    getPathMock.mockReturnValue(USER_DATA);
    existsSyncMock.mockReturnValue(true);
  });

  it('returns a write function', () => {
    const write = createSessionMainLogger();
    expect(typeof write).toBe('function');
  });

  it('appends formatted log line to session log file', () => {
    vi.useFakeTimers();

    const fixedDate = new Date('2026-03-05T14:30:45.123Z');
    vi.setSystemTime(fixedDate);

    const write = createSessionMainLogger();

    // Advance time for the log write call
    const logTime = new Date('2026-03-05T15:00:00.678Z');
    vi.setSystemTime(logTime);

    write('info', 'test message');

    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
    const [filePath, content, encoding] = appendFileSyncMock.mock.calls[0];

    // File path uses local time components + UTC timestamp
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const expectedLocalPrefix = `${fixedDate.getFullYear()}-${pad2(fixedDate.getMonth() + 1)}-${pad2(fixedDate.getDate())}_${pad2(fixedDate.getHours())}-${pad2(fixedDate.getMinutes())}-${pad2(fixedDate.getSeconds())}`;
    expect(filePath).toContain(expectedLocalPrefix);
    expect(filePath).toContain(String(fixedDate.getTime()));
    expect(filePath).toMatch(/\.log$/);

    // Content uses ISO (UTC) format
    expect(content).toBe('[2026-03-05 15:00:00.678] [INFO] test message\n');
    expect(encoding).toBe('utf-8');

    vi.useRealTimers();
  });

  it('uppercases the log level', () => {
    const write = createSessionMainLogger();

    write('warn', 'warning msg');
    const content = appendFileSyncMock.mock.calls[0][1] as string;
    expect(content).toContain('[WARN]');

    appendFileSyncMock.mockClear();
    write('error', 'error msg');
    const content2 = appendFileSyncMock.mock.calls[0][1] as string;
    expect(content2).toContain('[ERROR]');
  });

  it('handles appendFileSync errors silently', () => {
    appendFileSyncMock.mockImplementation(() => {
      throw new Error('Disk full');
    });

    const write = createSessionMainLogger();
    expect(() => write('info', 'msg')).not.toThrow();
  });
});
