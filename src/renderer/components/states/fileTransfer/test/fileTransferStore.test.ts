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
 * @description 文件中转站列表解析、合并与持久化恢复测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FILE_TRANSFER_MAX_ITEMS, FILE_TRANSFER_STORE_KEY } from '../config/fileTransferConfig';
import { getFileNameFromPath, mergeFileTransferPaths, parseFileTransferItems } from '../utils/fileTransferUtils';

const api = { storeRead: vi.fn<(key: string) => Promise<unknown>>(), storeWrite: vi.fn<(key: string, data: unknown) => Promise<boolean>>() };

beforeEach(() => {
  vi.resetModules();
  api.storeRead.mockReset();
  api.storeWrite.mockReset().mockResolvedValue(true);
  vi.stubGlobal('window', { api });
});
afterEach(() => { vi.unstubAllGlobals(); });

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
  it('restores saved items once and persists later changes', async () => {
    api.storeRead.mockResolvedValue([{ path: '/saved', name: 'saved', addedAt: 1 }]);
    const store = await import('../store/fileTransferStore');
    await Promise.all([store.loadFileTransferItems(), store.loadFileTransferItems()]);
    expect(api.storeRead).toHaveBeenCalledOnce();
    expect(api.storeWrite).not.toHaveBeenCalled();

    store.addFileTransferPaths(['/new']);
    expect(store.useFileTransferStore.getState().items.map((item) => item.path)).toEqual(['/new', '/saved']);
    store.removeFileTransferItem('/saved');
    store.clearFileTransferItems();
    expect(api.storeWrite.mock.calls.map(([key, data]) => [key, (data as { path: string }[]).map((item) => item.path)])).toEqual([
      [FILE_TRANSFER_STORE_KEY, ['/new', '/saved']],
      [FILE_TRANSFER_STORE_KEY, ['/new']],
      [FILE_TRANSFER_STORE_KEY, []],
    ]);
  });

  it('keeps files dropped before restore completes without overwriting the saved list', async () => {
    let resolveRead: (value: unknown) => void = () => {};
    api.storeRead.mockReturnValue(new Promise((resolve) => { resolveRead = resolve; }));
    const store = await import('../store/fileTransferStore');
    const loading = store.loadFileTransferItems();
    store.addFileTransferPaths(['/early']);
    expect(api.storeWrite).not.toHaveBeenCalled();

    resolveRead([{ path: '/saved', name: 'saved', addedAt: 1 }]);
    await loading;
    expect(store.useFileTransferStore.getState().items.map((item) => item.path)).toEqual(['/early', '/saved']);
    expect(api.storeWrite).toHaveBeenCalledOnce();
  });

  it('starts empty when the saved list cannot be read', async () => {
    api.storeRead.mockRejectedValue(new Error('io'));
    const store = await import('../store/fileTransferStore');
    await store.loadFileTransferItems();
    expect(store.useFileTransferStore.getState()).toMatchObject({ items: [], loaded: true });
  });
});
