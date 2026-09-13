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
 * @file ipcHandlers.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock, onMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  onMock: vi.fn(),
}));

const {
  existsSyncMock,
  readFileSyncMock,
  writeFileSyncMock,
  broadcastSettingChangeMock,
} = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
  broadcastSettingChangeMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
    on: onMock,
  },
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
}));

vi.mock('../../../utils/broadcast', () => ({
  broadcastSettingChange: broadcastSettingChangeMock,
}));

import { registerStoreIpcHandlers } from '../store';
import { registerLogIpcHandlers } from '../log';

describe('app ipc handlers', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const onHandlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handleHandlers.clear();
    onHandlers.clear();
    handleMock.mockReset();
    onMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    writeFileSyncMock.mockReset();
    broadcastSettingChangeMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });
    onMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      onHandlers.set(channel, handler);
    });
  });

  it('registers and handles store read/write', () => {
    registerStoreIpcHandlers({ storeDir: 'C:/store' });

    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(JSON.stringify({ a: 1 }));

    const read = handleHandlers.get('store:read');
    const write = handleHandlers.get('store:write');
    expect(read?.({}, 'config')).toEqual({ a: 1 });

    const result = write?.({ sender: { id: 9 } }, 'config', { b: 2 });
    expect(result).toBe(true);
    expect(writeFileSyncMock).toHaveBeenCalled();
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(9, 'store:config', { b: 2 });
  });

  it('updates only the target alarm and broadcasts the saved state to every window', () => {
    registerStoreIpcHandlers({ storeDir: 'C:/store' });
    existsSyncMock.mockReturnValue(true);
    const alarms = [
      { id: 1, enabled: true, label: 'Morning', hour: 8, repeat: [1, 2] },
      { id: 2, enabled: false, label: 'Evening', hour: 21, repeat: [] },
    ];
    readFileSyncMock.mockReturnValue(JSON.stringify(alarms));
    const update = handleHandlers.get('alarm:set-enabled');

    expect(update?.({ sender: { id: 9 } }, 1, false)).toBe(true);
    const expected = [{ ...alarms[0], enabled: false }, alarms[1]];
    expect(JSON.parse(writeFileSyncMock.mock.calls[0][1])).toEqual(expected);
    expect(broadcastSettingChangeMock).toHaveBeenCalledWith(-1, 'store:alarms', expected);

    // 下一次操作从最新存储读取，保留另一窗口已经编辑的备注与开关。
    const latest = [{ ...expected[0], label: 'Updated' }, expected[1]];
    readFileSyncMock.mockReturnValue(JSON.stringify(latest));
    expect(update?.({ sender: { id: 10 } }, 2, true)).toBe(true);
    expect(JSON.parse(writeFileSyncMock.mock.calls[1][1])).toEqual([
      latest[0], { ...latest[1], enabled: true },
    ]);
  });

  it('rejects invalid requests and missing alarms without writing or broadcasting', () => {
    registerStoreIpcHandlers({ storeDir: 'C:/store' });
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(JSON.stringify([{ id: 1, enabled: true }]));
    const update = handleHandlers.get('alarm:set-enabled');
    [[-1, true], [1.5, false], [1, 'false'], [2, false]].forEach(([id, enabled]) => {
      expect(update?.({}, id, enabled)).toBe(false);
    });
    readFileSyncMock.mockReturnValue('{}');
    expect(update?.({}, 1, false)).toBe(false);
    existsSyncMock.mockReturnValue(false);
    expect(update?.({}, 1, false)).toBe(false);
    expect(writeFileSyncMock).not.toHaveBeenCalled();
    expect(broadcastSettingChangeMock).not.toHaveBeenCalled();
  });

  it('does not broadcast a state that failed to save', () => {
    registerStoreIpcHandlers({ storeDir: 'C:/store' });
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(JSON.stringify([{ id: 1, enabled: true }]));
    writeFileSyncMock.mockImplementation(() => { throw new Error('disk full'); });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(handleHandlers.get('alarm:set-enabled')?.({}, 1, false)).toBe(false);
      expect(broadcastSettingChangeMock).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('registers and normalizes log write levels', () => {
    const writeMainLog = vi.fn();
    registerLogIpcHandlers({ writeMainLog });

    const handler = onHandlers.get('log:write');
    handler?.({}, 'warn', 'w');
    handler?.({}, 'error', 'e');
    handler?.({}, 'other', 'i');

    expect(writeMainLog).toHaveBeenNthCalledWith(1, 'warn', 'w');
    expect(writeMainLog).toHaveBeenNthCalledWith(2, 'error', 'e');
    expect(writeMainLog).toHaveBeenNthCalledWith(3, 'info', 'i');
  });
});
