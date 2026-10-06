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
 * @file useStockMarketData.test.ts
 * @description 股票行情真实归一化、刷新请求竞争、搜索和自选持久化生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStockMarketData } from '../useStockMarketData';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../setting/hooks/test/settingsCoverageHarness';
import type { stocks } from 'stock-api/browser';

type Quote = Awaited<ReturnType<typeof stocks.auto.getStock>>;
type Klines = Awaited<ReturnType<typeof stocks.auto.getKlines>>;
const market = vi.hoisted(() => ({
  getStock: vi.fn<typeof stocks.auto.getStock>(),
  getKlines: vi.fn<typeof stocks.auto.getKlines>(),
  searchStocks: vi.fn<typeof stocks.auto.searchStocks>()
}));
vi.mock('stock-api/browser', () => ({ stocks: { auto: market } }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));

const storeRead = vi.fn<Window['api']['storeRead']>();
const storeWrite = vi.fn<Window['api']['storeWrite']>();
const onSettingsChanged = vi.fn<Window['api']['onSettingsChanged']>();
const unsubscribe = vi.fn<() => void>();
const getItem = vi.fn<Storage['getItem']>();
const setItem = vi.fn<Storage['setItem']>();
const stored = new Map<string, string>();
const quote: Quote = { code: 'SH600519', name: 'Market', now: 10, yesterday: 8, high: 11, low: 9, percent: 0.25, source: 'sina' };
const klines: Klines = [{ date: '2026-1-2', open: 8, close: 10, high: 11, low: 7, volume: 20 }];

/**
 * 执行真实股票 Hook，保留公开操作更新的状态。
 * @returns 当前行情和公开操作。
 */
function view() {
  return renderWithHooks(useStockMarketData);
}

/**
 * 处理真实行情、存储与搜索 Promise 回调。
 * @returns 队列处理完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * 提交真实依赖变化并完成行情初始化。
 * @returns 已提交状态。
 */
async function commit(): Promise<ReturnType<typeof view>> {
  view();
  runEffects();
  await settle();
  view();
  runEffects();
  return view();
}

/**
 * 构造外部库请求的可控完成句柄。
 * @returns Promise、成功和失败完成入口。
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  resetLifecycle();
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  vi.clearAllMocks();
  stored.clear();
  market.getStock.mockReset().mockImplementation((symbol) => Promise.resolve({ ...quote, code: symbol }));
  market.getKlines.mockReset().mockResolvedValue(klines);
  market.searchStocks.mockReset().mockResolvedValue([quote]);
  storeRead.mockReset().mockResolvedValue([]);
  storeWrite.mockReset().mockResolvedValue(true);
  onSettingsChanged.mockReset().mockReturnValue(unsubscribe);
  getItem.mockReset().mockImplementation((key) => stored.get(key) ?? null);
  setItem.mockReset().mockImplementation((key, value) => { stored.set(key, value); });
  vi.stubGlobal('localStorage', { getItem, setItem });
  vi.stubGlobal('window', {
    api: { storeRead, storeWrite, onSettingsChanged },
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval
  });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Stock state restoration and native favorites', () => {
  it.each([null, '', '{broken', 'null', '{}', '[]'])('restores empty search results from %s', (raw) => {
    if (raw !== null) stored.set('eIsland_stock_search_results', raw);
    expect(view().searchResults).toEqual([]);
  });

  it('filters damaged stored search entries through the real private parser and tolerates denied storage', () => {
    stored.set('eIsland_stock_search_results', JSON.stringify([null, 1, 'invalid', {}, { code: 1 }, { code: 'SH600519', name: 'stored' }]));
    expect(view().searchResults).toEqual([{ code: 'SH600519', name: 'stored' }]);
    resetLifecycle();
    getItem.mockImplementation(() => { throw new Error('storage unavailable'); });
    expect(view().searchResults).toEqual([]);
  });

  it('reads native favorites, applies live broadcasts, sanitizes duplicate and invalid records and unsubscribes', async () => {
    storeRead.mockResolvedValue([{ code: ' sh600519 ', name: ' Favorite ', price: 10 }]);
    await commit();
    expect(view().favorites[0]).toMatchObject({ code: 'SH600519', name: 'Favorite', price: 10 });
    const [[listener]] = onSettingsChanged.mock.calls;
    listener('unknown', []);
    expect(view().favorites).toHaveLength(1);
    listener('store:stock-favorites', [null, { code: ' sz000001 ', name: 'Live' }, { code: 'SZ000001' }]);
    expect(view().favorites).toHaveLength(1);
    expect(view().favorites[0]).toMatchObject({ code: 'SZ000001', name: 'Live' });
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('ignores native favorites resolving after unmount', async () => {
    const pending = deferred<unknown>();
    storeRead.mockReturnValue(pending.promise);
    view();
    runEffects();
    unmountHooks();
    pending.resolve([{ code: 'SH600519' }]);
    await settle();
    expect(view().favorites).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('adds, updates and removes favorites through real persistence helpers while retaining original creation dates', async () => {
    await commit();
    view().addFavorite({ code: ' sz000001 ', name: ' Bank ', price: 12 });
    expect(view().favorites[0]).toMatchObject({ code: 'SZ000001', name: 'Bank', price: 12, addedAt: 1000 });
    vi.setSystemTime(2000);
    view().addFavorite({ code: 'sh600519', name: 'Other' });
    view().addFavorite({ code: 'sz000001', name: 'Updated', price: 15 });
    expect(view().favorites.map((item) => item.code)).toEqual(['SH600519', 'SZ000001']);
    expect(view().favorites[1]).toMatchObject({ name: 'Updated', price: 15, addedAt: 1000 });
    expect(storeWrite).toHaveBeenLastCalledWith('stock-favorites', view().favorites);
    expect(JSON.parse(stored.get('eIsland_stock_favorites') ?? '[]')).toEqual(view().favorites);
    view().removeFavorite(' sz000001 ');
    expect(view().favorites.map((item) => item.code)).toEqual(['SH600519']);
    expect(storeWrite).toHaveBeenLastCalledWith('stock-favorites', view().favorites);
  });
});

describe('Stock market requests and races', () => {
  it('loads and normalizes real quotes and K-lines, refreshes and resets intervals on selection or period changes', async () => {
    expect(view().quote).toBeNull();
    await commit();
    expect(market.getStock).toHaveBeenCalledWith('SH600519');
    expect(market.getKlines).toHaveBeenCalledWith('SH600519', { period: 'day', count: 160 });
    expect(view().quote).toMatchObject({ code: 'SH600519', price: 10, previousClose: 8, change: 2 });
    expect(view().klines[0]).toMatchObject({ date: '2026-1-2', open: 8, close: 10 });
    expect(view().lastUpdatedAt).toBe(1000);
    view().selectSymbol(' sz000001 ');
    expect(view().loading).toBe(true);
    await commit();
    expect(view().symbol).toBe('SZ000001');
    view().setPeriod('week');
    await commit();
    expect(market.getKlines).toHaveBeenLastCalledWith('SZ000001', { period: 'week', count: 160 });
    expect(vi.getTimerCount()).toBe(1);
    await view().refresh();
    expect(view().period).toBe('week');
    const before = market.getStock.mock.calls.length;
    vi.advanceTimersByTime(30_000);
    await settle();
    expect(market.getStock).toHaveBeenCalledTimes(before + 1);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([new Error('market offline'), new Error('  '), 'unknown'])('reports active market failures %s', async (error) => {
    market.getStock.mockRejectedValue(error);
    await commit();
    expect(view().loading).toBe(false);
    expect(view().error).toBe(error instanceof Error && error.message.trim() ? error.message : 'stockTab.error.default');
    expect(view().quote).toBeNull();
  });

  it.each(['resolve', 'reject'])('does not overwrite newer market data when the older quote request later %s', async (outcome) => {
    await commit();
    const pending = deferred<Quote>();
    market.getStock.mockReturnValueOnce(pending.promise);
    const previous = view().refresh();
    view().selectSymbol('SZ000001');
    await settle();
    expect(view().quote?.code).toBe('SZ000001');
    if (outcome === 'resolve') pending.resolve({ ...quote, code: 'SH600519', now: 99 });
    else pending.reject(new Error('old request failed'));
    await previous;
    expect(view().quote?.code).toBe('SZ000001');
    expect(view().symbol).toBe('SZ000001');
    expect(view().error).toBeNull();
    expect(view().loading).toBe(false);
  });
});

describe('Stock search and local result persistence', () => {
  it('searches a normalized symbol directly and performs keyword search with real row normalization', async () => {
    await commit();
    const direct = await view().search(' sz000001 ');
    expect(direct).toEqual([{ code: 'SZ000001', name: 'Market', price: 10, changePercent: 0.25, source: 'sina' }]);
    expect(market.searchStocks).not.toHaveBeenCalled();
    market.searchStocks.mockResolvedValue([{ ...quote, code: 'SH600519', name: 'Found' }]);
    const keyword = await view().search(' company ');
    expect(market.searchStocks).toHaveBeenCalledWith('company');
    expect(keyword[0]).toMatchObject({ code: 'SH600519', name: 'Found' });
    expect(view().searchResults).toEqual(keyword);
    expect(view().searching).toBe(false);
    expect(JSON.parse(stored.get('eIsland_stock_search_results') ?? '[]')).toEqual(keyword);
    view().clearSearchResults();
    expect(view().searchResults).toEqual([]);
    expect(stored.get('eIsland_stock_search_results')).toBe('[]');
  });

  it('sets searching while the leaf request is pending and clears empty keyword results without a request', async () => {
    const pending = deferred<Quote[]>();
    market.searchStocks.mockReturnValue(pending.promise);
    const search = view().search('company');
    expect(view().searching).toBe(true);
    pending.resolve([quote]);
    await search;
    expect(view().searching).toBe(false);
    const before = market.getStock.mock.calls.length;
    await expect(view().search('  ')).resolves.toEqual([]);
    expect(view().searchResults).toEqual([]);
    expect(market.getStock).toHaveBeenCalledTimes(before);
    expect(stored.get('eIsland_stock_search_results')).toBe('[]');
  });

  it.each(['symbol', 'keyword'])('clears %s search results after a network rejection despite failed local writes', async (type) => {
    market.getStock.mockRejectedValue(new Error('offline'));
    market.searchStocks.mockRejectedValue(new Error('offline'));
    setItem.mockImplementation(() => { throw new Error('quota exceeded'); });
    await expect(view().search(type === 'symbol' ? 'SH600519' : 'company')).resolves.toEqual([]);
    expect(view().searchResults).toEqual([]);
    expect(view().searching).toBe(false);
    expect(setItem).toHaveBeenCalledWith('eIsland_stock_search_results', '[]');
  });
});

describe('Stock search newest-request regression', () => {
  it.each(['symbol', 'keyword'])('keeps newer results and persistence when an older %s search succeeds', async (type) => {
    const olderQuote = deferred<Quote>();
    const olderRows = deferred<Quote[]>();
    if (type === 'symbol') market.getStock.mockReturnValueOnce(olderQuote.promise);
    else market.searchStocks.mockReturnValueOnce(olderRows.promise);
    const older = view().search(type === 'symbol' ? 'SH600519' : 'older company');
    market.searchStocks.mockResolvedValueOnce([{ ...quote, code: 'SZ000001', name: 'Newest' }]);
    const newest = await view().search('newer company');
    const writes = setItem.mock.calls.length;
    if (type === 'symbol') olderQuote.resolve({ ...quote, name: 'Obsolete' });
    else olderRows.resolve([{ ...quote, name: 'Obsolete' }]);
    await expect(older).resolves.toEqual([]);
    expect(view().searchResults).toEqual(newest);
    expect(view().searching).toBe(false);
    expect(setItem).toHaveBeenCalledTimes(writes);
    expect(JSON.parse(stored.get('eIsland_stock_search_results') ?? '[]')).toEqual(newest);
  });

  it.each(['symbol', 'keyword'])('does not clear newer results when the obsolete %s search rejects', async (type) => {
    const olderQuote = deferred<Quote>();
    const olderRows = deferred<Quote[]>();
    if (type === 'symbol') market.getStock.mockReturnValueOnce(olderQuote.promise);
    else market.searchStocks.mockReturnValueOnce(olderRows.promise);
    const older = view().search(type === 'symbol' ? 'SH600519' : 'older company');
    const newest = await view().search('newer company');
    const writes = setItem.mock.calls.length;
    if (type === 'symbol') olderQuote.reject(new Error('obsolete request failed'));
    else olderRows.reject(new Error('obsolete request failed'));
    await expect(older).resolves.toEqual([]);
    expect(view().searchResults).toEqual(newest);
    expect(view().searching).toBe(false);
    expect(setItem).toHaveBeenCalledTimes(writes);
    expect(JSON.parse(stored.get('eIsland_stock_search_results') ?? '[]')).toEqual(newest);
  });

  it.each([
    { action: 'clear', outcome: 'resolve' },
    { action: 'clear', outcome: 'reject' },
    { action: 'empty keyword', outcome: 'resolve' },
    { action: 'empty keyword', outcome: 'reject' }
  ])('invalidates pending search after $action and obsolete $outcome', async ({ action, outcome }) => {
    const pending = deferred<Quote[]>();
    market.searchStocks.mockReturnValueOnce(pending.promise);
    const search = view().search('company');
    expect(view().searching).toBe(true);
    if (action === 'clear') view().clearSearchResults();
    else await view().search('   ');
    expect(view().searching).toBe(false);
    expect(view().searchResults).toEqual([]);
    const writes = setItem.mock.calls.length;
    if (outcome === 'resolve') pending.resolve([quote]);
    else pending.reject(new Error('obsolete request failed'));
    await expect(search).resolves.toEqual([]);
    expect(view().searchResults).toEqual([]);
    expect(setItem).toHaveBeenCalledTimes(writes);
    expect(stored.get('eIsland_stock_search_results')).toBe('[]');
  });

  it('keeps the newest pending search busy when an older request finishes first', async () => {
    const olderRows = deferred<Quote[]>();
    const newerRows = deferred<Quote[]>();
    market.searchStocks.mockReturnValueOnce(olderRows.promise).mockReturnValueOnce(newerRows.promise);
    const older = view().search('older company');
    const newer = view().search('newer company');
    olderRows.resolve([quote]);
    await expect(older).resolves.toEqual([]);
    expect(view().searching).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
    newerRows.resolve([{ ...quote, name: 'Newest' }]);
    await newer;
    expect(view().searching).toBe(false);
    expect(view().searchResults[0].name).toBe('Newest');
  });
});

it('retains the newest failure instead of restoring an older successful search', async () => {
  const pending = deferred<Quote[]>();
  market.searchStocks.mockReturnValueOnce(pending.promise).mockRejectedValueOnce(new Error('latest request failed'));
  const older = view().search('older company');
  await expect(view().search('newer company')).resolves.toEqual([]);
  expect(view().searchResults).toEqual([]);
  const writes = setItem.mock.calls.length;
  pending.resolve([quote]);
  await expect(older).resolves.toEqual([]);
  expect(view().searchResults).toEqual([]);
  expect(view().searching).toBe(false);
  expect(setItem).toHaveBeenCalledTimes(writes);
  expect(stored.get('eIsland_stock_search_results')).toBe('[]');
});
