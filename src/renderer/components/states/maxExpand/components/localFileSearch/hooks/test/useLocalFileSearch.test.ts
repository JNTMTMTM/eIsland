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
 * @file useLocalFileSearch.test.ts
 * @description 本地文件搜索真实参数解析、原生请求失败、目录持久化和图标缓存生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalFileSearch } from '../useLocalFileSearch';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import type { LocalFileSearchItem } from '../../types/localFileSearchTypes';

const translate = vi.hoisted(() => vi.fn<(key: string, options: { count: number }) => string>((key, options) => `${key}: ${options.count}`));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  storeWrite: vi.fn<Window['api']['storeWrite']>(),
  pickLocalSearchDirectory: vi.fn<Window['api']['pickLocalSearchDirectory']>(),
  searchLocalFiles: vi.fn<Window['api']['searchLocalFiles']>(),
  getFileIcon: vi.fn<Window['api']['getFileIcon']>()
};
const file: LocalFileSearchItem = { name: 'report.txt', path: 'C:/docs/report.txt', isDirectory: false };
const directory: LocalFileSearchItem = { name: 'nested', path: 'C:/docs/nested', isDirectory: true };

/**
 * 渲染真实 Hook 并保留公开操作生成的状态。
 * @returns 当前搜索状态和操作。
 */
function view() {
  return renderWithHooks(useLocalFileSearch);
}

/**
 * 消费原生 Promise 和 finally 回调。
 * @returns 回调队列处理完成。
 */
async function settle(): Promise<void> {
  await Array.from({ length: 12 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
}

/**
 * 执行初始化和实际依赖变化 effect。
 * @returns 当前公开状态。
 */
async function commit(): Promise<ReturnType<typeof view>> {
  view();
  runEffects();
  await settle();
  return view();
}

/**
 * 创建真实原生异步请求的完成入口。
 * @returns 请求 Promise、成功和失败操作。
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

/**
 * 通过公开输入和搜索操作执行真实请求。
 * @param items - 原生结果。
 * @returns 请求完成后的公开状态。
 */
async function search(items: LocalFileSearchItem[]): Promise<ReturnType<typeof view>> {
  api.searchLocalFiles.mockResolvedValueOnce(items);
  view().setRootDir(' C:/docs ');
  view().setKeyword(' report ');
  view().handleSearch();
  await settle();
  return view();
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  api.storeRead.mockResolvedValue('');
  api.storeWrite.mockResolvedValue(true);
  api.pickLocalSearchDirectory.mockResolvedValue(null);
  api.searchLocalFiles.mockResolvedValue([]);
  api.getFileIcon.mockResolvedValue(null);
  vi.stubGlobal('window', { api });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

describe('useLocalFileSearch real native lifecycle', () => {
  it.each(['  C:/docs  ', '', '   ', null, 23])('loads only a nonblank stored root %s', async (stored) => {
    api.storeRead.mockResolvedValue(stored);
    const current = await commit();
    expect(current.rootDir).toBe(stored === '  C:/docs  ' ? 'C:/docs' : '');
    expect(api.storeRead).toHaveBeenCalledWith('local-file-search-root');
    expect(current.countText).toBe('maxExpand.localFileSearch.count: 0');
  });

  it('contains native root loading failures', async () => {
    api.storeRead.mockRejectedValueOnce(new Error('store unavailable'));
    expect((await commit()).rootDir).toBe('');
  });

  it('persists a chosen directory and keeps it when writing fails', async () => {
    api.pickLocalSearchDirectory.mockResolvedValueOnce('D:/picked');
    api.storeWrite.mockRejectedValueOnce(new Error('readonly'));
    view().handlePickRootDir();
    await settle();
    expect(view().rootDir).toBe('D:/picked');
    expect(api.storeWrite).toHaveBeenCalledWith('local-file-search-root', 'D:/picked');
  });

  it('preserves the root when directory selection is cancelled or rejects', async () => {
    view().setRootDir('C:/keep');
    view().handlePickRootDir();
    await settle();
    api.pickLocalSearchDirectory.mockRejectedValueOnce(new Error('dialog failed'));
    view().handlePickRootDir();
    await settle();
    expect(view().rootDir).toBe('C:/keep');
    expect(api.storeWrite).not.toHaveBeenCalled();
  });

  it('clears existing results for missing root and missing keyword', async () => {
    await search([file]);
    view().setRootDir(' ');
    view().handleSearch();
    expect(view().results).toEqual([]);
    view().setRootDir('C:/docs');
    view().setKeyword(' ');
    view().handleSearch();
    expect(view().results).toEqual([]);
    expect(api.searchLocalFiles).toHaveBeenCalledTimes(1);
  });

  it('passes every public setting with real CSV parsing and trimmed query', async () => {
    await commit();
    const current = view();
    current.setRootDir(' C:/docs ');
    current.setKeyword(' report ');
    current.setShowConfig(true);
    current.setResultLimit(9);
    current.setMaxDepth(2);
    current.setCaseSensitive(true);
    current.setMatchMode('exact');
    current.setMatchScope('path');
    current.setIncludeFiles(false);
    current.setIncludeHidden(true);
    current.setIncludeDirectories(false);
    current.setExtensionsInput(' .txt, , .md, .txt ');
    current.setExcludeDirsInput(' node_modules, ,build ');
    const pending = deferred<LocalFileSearchItem[]>();
    api.searchLocalFiles.mockReturnValueOnce(pending.promise);
    view().handleSearch();
    expect(view().loading).toBe(true);
    expect(view().showConfig).toBe(true);
    expect(api.searchLocalFiles).toHaveBeenCalledWith('C:/docs', 'report', {
      limit: 9, maxDepth: 2, includeDirectories: false, includeFiles: false,
      includeHidden: true, caseSensitive: true, matchMode: 'exact', matchScope: 'path',
      extensions: ['.txt', '.md', '.txt'], excludeDirs: ['node_modules', 'build']
    });
    pending.resolve([file, directory]);
    await settle();
    expect(view().results).toEqual([file, directory]);
    expect(view().loading).toBe(false);
    expect(view().countText).toBe('maxExpand.localFileSearch.count: 2');
  });

  it('contains malformed native results and request rejection', async () => {
    await search([file]);
    api.searchLocalFiles.mockResolvedValueOnce(null as unknown as LocalFileSearchItem[]);
    view().handleSearch();
    await settle();
    expect(view().results).toEqual([]);
    api.searchLocalFiles.mockRejectedValueOnce(new Error('offline'));
    view().handleSearch();
    await settle();
    expect(view().results).toEqual([]);
    expect(view().loading).toBe(false);
  });

  it('loads only uncached file icons and removes obsolete cache entries', async () => {
    api.getFileIcon.mockResolvedValueOnce('data:first');
    await search([file, directory]);
    await commit();
    expect(view().iconMap).toEqual({ [file.path]: 'data:first' });
    expect(api.getFileIcon).toHaveBeenCalledTimes(1);
    await commit();
    expect(api.getFileIcon).toHaveBeenCalledTimes(1);
    await search([directory]);
    await commit();
    expect(view().iconMap).toEqual({});
    expect(view().results).toEqual([directory]);
  });

  it('does not duplicate a pending icon request when results change', async () => {
    const icon = deferred<string | null>();
    api.getFileIcon.mockReturnValueOnce(icon.promise);
    await search([file]);
    await commit();
    await search([file, directory]);
    await commit();
    expect(api.getFileIcon).toHaveBeenCalledTimes(1);
    icon.resolve('data:resolved');
    await settle();
    expect(view().iconMap[file.path]).toBe('data:resolved');
  });

  it('releases failed icon requests and permits a later retry', async () => {
    api.getFileIcon.mockRejectedValueOnce(new Error('icon failed'));
    await search([file]);
    await commit();
    expect(view().iconMap).toEqual({});
    api.getFileIcon.mockResolvedValueOnce('data:retry');
    await search([file, directory]);
    await commit();
    expect(view().iconMap[file.path]).toBe('data:retry');
    expect(api.getFileIcon).toHaveBeenCalledTimes(2);
  });

  it('accepts absent icons without caching and preserves the first icon for duplicate native paths', async () => {
    await search([file]);
    await commit();
    expect(view().iconMap).toEqual({});
    const first = deferred<string | null>();
    const second = deferred<string | null>();
    api.getFileIcon.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await search([file, { ...file, name: 'duplicate' }]);
    view();
    runEffects();
    expect(api.getFileIcon).toHaveBeenCalledTimes(3);
    first.resolve('data:original');
    await settle();
    second.resolve('data:duplicate');
    await settle();
    expect(view().iconMap).toEqual({ [file.path]: 'data:original' });
  });
});

describe('useLocalFileSearch latest request ownership', () => {
  it.each(['success', 'failure'])('keeps newest results when an older request ends in %s', async (completion) => {
    const older = deferred<LocalFileSearchItem[]>();
    const newer = deferred<LocalFileSearchItem[]>();
    view().setRootDir('C:/docs');
    view().setKeyword('old');
    api.searchLocalFiles.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    view().handleSearch();
    view().setKeyword('new');
    view().handleSearch();
    newer.resolve([directory]);
    await settle();
    if (completion === 'success') older.resolve([file]);
    else older.reject(new Error('older failed'));
    await settle();
    expect(view().results).toEqual([directory]);
    expect(view().loading).toBe(false);
  });

  it.each(['success', 'failure'])('keeps newest request loading when the older request ends in %s', async (completion) => {
    const older = deferred<LocalFileSearchItem[]>();
    const newer = deferred<LocalFileSearchItem[]>();
    view().setRootDir('C:/docs');
    view().setKeyword('old');
    api.searchLocalFiles.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    view().handleSearch();
    view().setKeyword('new');
    view().handleSearch();
    if (completion === 'success') older.resolve([file]);
    else older.reject(new Error('older failed'));
    await settle();
    expect(view().results).toEqual([]);
    expect(view().loading).toBe(true);
    newer.resolve([directory]);
    await settle();
    expect(view().results).toEqual([directory]);
    expect(view().loading).toBe(false);
  });

  it.each(['root', 'keyword'])('invalidates pending results and ends loading when clearing %s', async (field) => {
    const pending = deferred<LocalFileSearchItem[]>();
    view().setRootDir('C:/docs');
    view().setKeyword('old');
    api.searchLocalFiles.mockReturnValueOnce(pending.promise);
    view().handleSearch();
    if (field === 'root') view().setRootDir(' ');
    else view().setKeyword(' ');
    view().handleSearch();
    expect(view().results).toEqual([]);
    expect(view().loading).toBe(false);
    pending.resolve([file]);
    await settle();
    expect(view().results).toEqual([]);
    expect(view().loading).toBe(false);
    expect(api.searchLocalFiles).toHaveBeenCalledTimes(1);
  });

  it('contains an old rejection after clearing and lets a new search own its pending state', async () => {
    const older = deferred<LocalFileSearchItem[]>();
    const newer = deferred<LocalFileSearchItem[]>();
    view().setRootDir('C:/docs');
    view().setKeyword('old');
    api.searchLocalFiles.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    view().handleSearch();
    view().setKeyword('');
    view().handleSearch();
    expect(view().loading).toBe(false);
    view().setKeyword('new');
    view().handleSearch();
    older.reject(new Error('abandoned failed'));
    await settle();
    expect(view().loading).toBe(true);
    newer.resolve([directory]);
    await settle();
    expect(view().results).toEqual([directory]);
    expect(view().loading).toBe(false);
  });
});
