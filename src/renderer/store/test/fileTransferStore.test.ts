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
 * @file fileTransferStore.test.ts
 * @description 文件中转站列表解析、合并与串行比较快照持久化测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FILE_TRANSFER_STORE_KEY } from '../fileTransferStore';
import { FILE_TRANSFER_MAX_ITEMS, getFileNameFromPath, mergeFileTransferPaths, parseFileTransferItems } from '../utils/fileTransferUtils';

const api = {
  storeRead: vi.fn<(key: string, strict?: boolean) => Promise<unknown>>(),
  storeCompareAndSwap: vi.fn<(key: string, expected: unknown, data: unknown) => Promise<'updated' | 'conflict' | 'error'>>(),
};
/** 模拟共享存储中的当前值，比较快照时按引用判断是否被其他窗口改写 */
let stored: unknown = null;

/**
 * 读取模拟存储中的路径列表。
 * @returns 已保存的路径。
 */
function storedPaths(): string[] {
  return (stored as { path: string }[]).map((item) => item.path);
}

beforeEach(() => {
  vi.resetModules();
  stored = null;
  api.storeRead.mockReset().mockImplementation(() => Promise.resolve(stored));
  api.storeCompareAndSwap.mockReset().mockImplementation((...[, expected, data]) => {
    if (expected !== stored) return Promise.resolve('conflict');
    stored = data;
    return Promise.resolve('updated');
  });
  vi.stubGlobal('window', { api });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fileTransferUtils', () => {
  it('extracts file names from Windows and POSIX paths', () => {
    expect(getFileNameFromPath('C:\\Users\\me\\报告.pdf')).toBe('报告.pdf');
    expect(getFileNameFromPath('/home/me/folder/')).toBe('folder');
  });

  it('drops malformed persisted entries and fills missing names', () => {
    const parsed = parseFileTransferItems([{ path: 'C:\\a.txt', addedAt: 1 }, { path: '', addedAt: 2 }, { name: 'x' }, null, 'bad']);
    expect(parsed).toEqual([{ path: 'C:\\a.txt', name: 'a.txt', addedAt: 1 }]);
    expect(parseFileTransferItems({})).toEqual([]);
  });

  it('puts new and re-dropped paths first without duplicates and enforces the limit', () => {
    const items = [{ path: '/a', name: 'a', addedAt: 1 }, { path: '/b', name: 'b', addedAt: 1 }];
    expect(mergeFileTransferPaths(items, ['/b', '/c', '/c', ''], 9).map((item) => item.path)).toEqual(['/b', '/c', '/a']);
    const many = [...Array(FILE_TRANSFER_MAX_ITEMS + 5).keys()].map((index) => `/f${index}`);
    expect(mergeFileTransferPaths([], many, 0)).toHaveLength(FILE_TRANSFER_MAX_ITEMS);
  });
});

describe('fileTransferStore', () => {
  it('restores saved items and persists later changes in order', async () => {
    stored = [{ path: '/saved', name: 'saved', addedAt: 1 }];
    const store = await import('../fileTransferStore');
    await store.loadFileTransferItems();
    expect(api.storeRead).toHaveBeenCalledWith(FILE_TRANSFER_STORE_KEY, true);
    expect(api.storeCompareAndSwap).not.toHaveBeenCalled();

    store.addFileTransferPaths(['/new']);
    expect(store.useFileTransferStore.getState().items.map((item) => item.path)).toEqual(['/new', '/saved']);
    store.removeFileTransferItem('/saved');
    store.clearFileTransferItems();
    await store.loadFileTransferItems();
    expect(api.storeCompareAndSwap.mock.calls.map(([, , data]) => (data as { path: string }[]).map((item) => item.path))).toEqual([
      ['/new', '/saved'],
      ['/new'],
      [],
    ]);
    expect(store.useFileTransferStore.getState().items).toEqual([]);
  });

  it('applies additions and removals made before the first restore to the saved list', async () => {
    stored = [{ path: '/saved', name: 'saved', addedAt: 1 }, { path: '/old', name: 'old', addedAt: 1 }];
    const store = await import('../fileTransferStore');
    const loading = store.loadFileTransferItems();
    store.addFileTransferPaths(['/early']);
    store.removeFileTransferItem('/old');
    await loading;
    await store.loadFileTransferItems();
    expect(storedPaths()).toEqual(['/early', '/saved']);
    expect(store.useFileTransferStore.getState().items.map((item) => item.path)).toEqual(['/early', '/saved']);
  });

  it('merges with changes another window saved in between', async () => {
    const store = await import('../fileTransferStore');
    api.storeRead.mockImplementationOnce(() => {
      const snapshot = stored;
      // 读取后另一窗口抢先写入，本次比较快照失败并基于新列表重算。
      stored = [{ path: '/other', name: 'other', addedAt: 1 }];
      return Promise.resolve(snapshot);
    });
    store.addFileTransferPaths(['/mine']);
    await store.loadFileTransferItems();
    expect(api.storeCompareAndSwap).toHaveBeenCalledTimes(2);
    expect(storedPaths()).toEqual(['/mine', '/other']);
  });

  it('never writes after a failed read and reverts the view to the saved list', async () => {
    stored = [{ path: '/saved', name: 'saved', addedAt: 1 }];
    const store = await import('../fileTransferStore');
    await store.loadFileTransferItems();
    api.storeRead.mockRejectedValueOnce(new Error('io'));
    store.clearFileTransferItems();
    expect(store.useFileTransferStore.getState().items).toEqual([]);
    await store.loadFileTransferItems();
    expect(api.storeCompareAndSwap).not.toHaveBeenCalled();
    expect(storedPaths()).toEqual(['/saved']);
    expect(store.useFileTransferStore.getState().items.map((item) => item.path)).toEqual(['/saved']);
    expect(console.error).toHaveBeenCalled();
  });

  it('withdraws files whose write failed', async () => {
    const store = await import('../fileTransferStore');
    api.storeCompareAndSwap.mockResolvedValueOnce('error');
    store.addFileTransferPaths(['/lost']);
    await store.loadFileTransferItems();
    expect(stored).toBeNull();
    expect(store.useFileTransferStore.getState().items).toEqual([]);
  });
});
