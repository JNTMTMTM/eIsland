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
 * @file useStockMarketData.ts
 * @description MaxExpand 股票行情数据状态管理
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { stocks } from 'stock-api/browser';
import { DEFAULT_STOCK_SYMBOL, STOCK_AUTO_REFRESH_MS, STOCK_KLINE_COUNT, STOCK_FAVORITES_STORE_KEY, STOCK_SEARCH_RESULTS_LOCAL_STORAGE_KEY, STOCK_SYMBOL_PATTERN } from '../config/stockConfig';
import type { StockFavoriteInput, StockMarketPeriod, StockMarketState, StockSearchItem } from '../config/types';
import { createStockFavorite, persistStockFavorites, readStockFavorites, sanitizeStockFavorites } from '../utils/favoriteStorage';
import {
  normalizeStockKlines,
  normalizeStockQuote,
  normalizeStockSearchResults,
  normalizeStockSymbol,
} from '../utils/normalizers';

interface UseStockMarketDataResult extends StockMarketState {
  setPeriod: (period: StockMarketPeriod) => void;
  selectSymbol: (symbol: string) => void;
  addFavorite: (input: StockFavoriteInput) => void;
  removeFavorite: (symbol: string) => void;
  refresh: () => Promise<void>;
  search: (keyword: string) => Promise<StockSearchItem[]>;
  clearSearchResults: () => void;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'stockTab.error.default';
}

function persistSearchResults(results: StockSearchItem[]): void {
  try {
    localStorage.setItem(STOCK_SEARCH_RESULTS_LOCAL_STORAGE_KEY, JSON.stringify(results));
  } catch {
    // noop
  }
}

function readPersistedSearchResults(): StockSearchItem[] {
  try {
    const raw = localStorage.getItem(STOCK_SEARCH_RESULTS_LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StockSearchItem =>
      item !== null && item !== undefined && typeof item === 'object' && typeof (item as StockSearchItem).code === 'string'
    );
  } catch {
    return [];
  }
}

/**
 * 管理股票行情、K 线、搜索与自动刷新状态。
 * @returns 股票行情页面状态与操作入口。
 */
export function useStockMarketData(): UseStockMarketDataResult {
  const [state, setState] = useState<StockMarketState>({
    symbol: DEFAULT_STOCK_SYMBOL,
    period: 'day',
    quote: null,
    klines: [],
    searchResults: readPersistedSearchResults(),
    favorites: [],
    loading: false,
    searching: false,
    error: null,
    lastUpdatedAt: null,
  });
  const requestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);

  const fetchMarketData = useCallback(async (symbol: string, period: StockMarketPeriod): Promise<void> => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const normalizedSymbol = normalizeStockSymbol(symbol);
    setState((current) => ({ ...current, symbol: normalizedSymbol, period, loading: true, error: null }));

    try {
      const [quoteRaw, klineRows] = await Promise.all([
        stocks.auto.getStock(normalizedSymbol),
        stocks.auto.getKlines(normalizedSymbol, { period, count: STOCK_KLINE_COUNT }),
      ]);
      if (requestId !== requestIdRef.current) return;
      setState((current) => ({
        ...current,
        symbol: normalizedSymbol,
        period,
        quote: normalizeStockQuote(quoteRaw, normalizedSymbol),
        klines: normalizeStockKlines(klineRows),
        loading: false,
        error: null,
        lastUpdatedAt: Date.now(),
      }));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setState((current) => ({
        ...current,
        symbol: normalizedSymbol,
        period,
        loading: false,
        error: resolveErrorMessage(error),
      }));
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchMarketData(state.symbol, state.period);
  }, [fetchMarketData, state.period, state.symbol]);

  const setPeriod = useCallback((period: StockMarketPeriod): void => {
    setState((current) => ({ ...current, period }));
    void fetchMarketData(state.symbol, period);
  }, [fetchMarketData, state.symbol]);

  const selectSymbol = useCallback((symbol: string): void => {
    const normalizedSymbol = normalizeStockSymbol(symbol);
    setState((current) => ({ ...current, symbol: normalizedSymbol }));
    void fetchMarketData(normalizedSymbol, state.period);
  }, [fetchMarketData, state.period]);

  const addFavorite = useCallback((input: StockFavoriteInput): void => {
    setState((current) => {
      const code = normalizeStockSymbol(input.code);
      const previous = current.favorites.find((item) => item.code === code);
      const nextFavorite = createStockFavorite({ ...input, code }, previous);
      const nextFavorites = previous
        ? current.favorites.map((item) => (item.code === code ? nextFavorite : item))
        : [nextFavorite, ...current.favorites];
      persistStockFavorites(nextFavorites);
      return { ...current, favorites: nextFavorites };
    });
  }, []);

  const removeFavorite = useCallback((symbol: string): void => {
    const normalizedSymbol = normalizeStockSymbol(symbol);
    setState((current) => {
      const nextFavorites = current.favorites.filter((item) => item.code !== normalizedSymbol);
      persistStockFavorites(nextFavorites);
      return { ...current, favorites: nextFavorites };
    });
  }, []);

  const search = useCallback(async (keyword: string): Promise<StockSearchItem[]> => {
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      setState((current) => ({ ...current, searchResults: [], searching: false }));
      persistSearchResults([]);
      return [];
    }

    setState((current) => ({ ...current, searching: true }));
    try {
      const normalizedSymbol = normalizeStockSymbol(normalizedKeyword);
      if (STOCK_SYMBOL_PATTERN.test(normalizedSymbol)) {
        const quote = normalizeStockQuote(await stocks.auto.getStock(normalizedSymbol), normalizedSymbol);
        if (requestId !== searchRequestIdRef.current) return [];
        const results = [{
          code: quote.code,
          name: quote.name,
          price: quote.price,
          changePercent: quote.changePercent,
          source: quote.source,
        }];
        setState((current) => ({ ...current, searchResults: results, searching: false }));
        persistSearchResults(results);
        return results;
      }

      const rows = await stocks.auto.searchStocks(normalizedKeyword);
      if (requestId !== searchRequestIdRef.current) return [];
      const results = normalizeStockSearchResults(rows);
      setState((current) => ({ ...current, searchResults: results, searching: false }));
      persistSearchResults(results);
      return results;
    } catch {
      if (requestId !== searchRequestIdRef.current) return [];
      setState((current) => ({ ...current, searchResults: [], searching: false }));
      persistSearchResults([]);
      return [];
    }
  }, []);

  const clearSearchResults = useCallback((): void => {
    searchRequestIdRef.current += 1;
    setState((current) => ({ ...current, searchResults: [], searching: false }));
    persistSearchResults([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readStockFavorites().then((favorites) => {
      if (!cancelled) setState((current) => ({ ...current, favorites }));
    });

    const unsubscribe = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (channel !== `store:${STOCK_FAVORITES_STORE_KEY}`) return;
      const favorites = sanitizeStockFavorites(value);
      setState((current) => ({ ...current, favorites }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void fetchMarketData(DEFAULT_STOCK_SYMBOL, 'day');
  }, [fetchMarketData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchMarketData(state.symbol, state.period);
    }, STOCK_AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [fetchMarketData, state.period, state.symbol]);

  return {
    ...state,
    setPeriod,
    selectSymbol,
    addFavorite,
    removeFavorite,
    refresh,
    search,
    clearSearchResults,
  };
}
