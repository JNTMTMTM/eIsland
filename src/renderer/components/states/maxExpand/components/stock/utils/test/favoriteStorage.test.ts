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
 * @file favoriteStorage.test.ts
 * @description 股票自选真实存储的过滤去重、兼容旧缓存、合成回退与持久化失败测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStockFavorite, persistStockFavorites, readStockFavorites, sanitizeStockFavorites } from '../favoriteStorage';
const read = vi.fn<Window['api']['storeRead']>();
const write = vi.fn<Window['api']['storeWrite']>();
const getItem = vi.fn<(key: string) => string | null>();
const setItem = vi.fn<(key: string, value: string) => void>();
beforeEach(() => {
  vi.clearAllMocks();
  read.mockResolvedValue([]);
  write.mockResolvedValue(true);
  getItem.mockReturnValue(null);
  setItem.mockImplementation(() => undefined);
  vi.stubGlobal('localStorage', { getItem, setItem });
  vi.stubGlobal('window', { api: { storeRead: read, storeWrite: write } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('自选股票真实持久化', () => {
  it('过滤非数组、非法项、空代码和重复项，并保留第一项的字段语义', () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    expect(sanitizeStockFavorites({})).toEqual([]);
    expect(sanitizeStockFavorites([null, 1, 'bad', {}, { code: ' sh1 ', name: 'name', price: 1, changePercent: 0, source: 'source', addedAt: 0 }, { code: 'SH1', name: 'duplicate' }, { code: 'SZ2', name: 2, price: Infinity, changePercent: '2', source: '', addedAt: NaN }])).toEqual([
      { code: 'SH1', name: 'name', price: 1, changePercent: 0, source: 'source', addedAt: 0 },
      { code: 'SZ2', name: 'SZ2', price: null, changePercent: null, source: 'auto', addedAt: 1000 },
    ]);
  });
  it('新增使用明确字段，更新空输入回退原项，首次缺失回退代码和空数值', () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    const previous = { code: 'SH1', name: 'old', price: 10, changePercent: 0.2, source: 'old-source', addedAt: 5 };
    expect(createStockFavorite({ code: ' sh1 ', name: ' new ', price: 0, changePercent: 0, source: ' new-source ' }, previous)).toEqual({ code: 'SH1', name: 'new', price: 0, changePercent: 0, source: 'new-source', addedAt: 5 });
    expect(createStockFavorite({ code: 'SH1', name: ' ', price: null, source: '' }, previous)).toEqual(previous);
    expect(createStockFavorite({ code: 'sz2' })).toEqual({ code: 'SZ2', name: 'SZ2', price: null, changePercent: null, source: 'auto', addedAt: 1000 });
  });
  it('原生 store 优先，旧本地数据不参与覆盖', async () => {
    read.mockResolvedValue([{ code: 'SH1' }]);
    expect(await readStockFavorites()).toEqual([expect.objectContaining({ code: 'SH1' })]);
    expect(getItem).not.toHaveBeenCalled();
  });
  it.each([false, true])('原生读取失败=%s 或空列表时迁移合法旧缓存', async (reject) => {
    if (reject) read.mockRejectedValue(new Error('store read'));
    getItem.mockReturnValue(JSON.stringify([{ code: 'SH1', name: 'old' }]));
    const result = await readStockFavorites();
    expect(result).toEqual([expect.objectContaining({ code: 'SH1', name: 'old' })]);
    expect(write).toHaveBeenCalledWith('stock-favorites', result);
    expect(setItem).toHaveBeenCalledWith('eIsland_stock_favorites', JSON.stringify(result));
  });
  it.each([null, '[]', '{}', '{'])('无缓存或无效旧数据 %s 不持久化', async (cached) => {
    getItem.mockReturnValue(cached);
    expect(await readStockFavorites()).toEqual([]);
    expect(write).not.toHaveBeenCalled();
  });
  it('本地读取失败回退空列表，双写各自失败不会产生未处理拒绝', async () => {
    getItem.mockImplementation(() => { throw new Error('storage unavailable'); });
    expect(await readStockFavorites()).toEqual([]);
    setItem.mockImplementation(() => { throw new Error('quota'); });
    write.mockRejectedValue(new Error('store write'));
    persistStockFavorites([]);
    await Promise.resolve(); await Promise.resolve();
    expect(write).toHaveBeenCalledWith('stock-favorites', []);
  });
});
