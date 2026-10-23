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
 */

/**
 * @file agentWebSearchService.test.ts
 * @description 验证鉴权搜索、参数隔离、取消和失败传播，不允许旧搜索回退。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import executeAgentWebSearch from '../agentWebSearchService';

vi.mock('electron', () => ({ app: { getVersion: () => '27.0.0' } }));
const fetchMock = vi.fn<typeof fetch>();
const data = { query: '杭州天气', provider: 'searxng', count: 1, results: [{ title: '天气', url: 'https://example.com', snippet: '晴' }] };

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(Response.json({ data, success: true }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('authenticated SearXNG bridge', () => {
  it('only sends search arguments to the trusted backend with replay protection headers', async () => {
    const result = await executeAgentWebSearch(' user-token ', {
      q: ' 杭州天气 ', limit: 100, baseUrl: 'http://untrusted.test', apiKey: 'do-not-send',
    }, new AbortController().signal);
    expect(result).toMatchObject({ success: true, result: data, error: '' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [[url, options]] = fetchMock.mock.calls;
    expect(url).toMatch(/^https:\/\/(test\.)?server\.pyisland\.com\/api\/v1\/user\/ai\/agent\/search$/);
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(JSON.stringify({ query: '杭州天气', limit: 10 }));
    const headers = options?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer user-token');
    expect(headers['X-Client-Version']).toBe('27.0.0');
    expect(headers['X-Nonce']).toBeTruthy();
    expect(headers['X-Timestamp']).toBeTruthy();
  });
  it.each([undefined, ''])('requires login before making an HTTP request (%s)', async (token) => {
    expect(await executeAgentWebSearch(token, { query: 'test' }, new AbortController().signal)).toMatchObject({ success: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{}, { query: ' ' }, { query: 'x'.repeat(501) }])('validates the search query (%s)', async (args) => {
    expect(await executeAgentWebSearch('token', args, new AbortController().signal)).toMatchObject({ success: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 503])('reports HTTP %s without falling back to an external search page', async (status) => {
    fetchMock.mockResolvedValue(Response.json({ success: false, error: 'engine unavailable' }, { status }));
    expect(await executeAgentWebSearch('token', { query: 'test' }, new AbortController().signal)).toMatchObject({ success: false });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('preserves server engine errors instead of reporting empty success', async () => {
    fetchMock.mockResolvedValue(Response.json({ success: false, error: 'SearXNG engines unavailable: CAPTCHA' }, { status: 503 }));
    expect(await executeAgentWebSearch('token', { query: 'test' }, new AbortController().signal)).toMatchObject({ success: false, error: 'SearXNG engines unavailable: CAPTCHA' });
  });
  it('rejects invalid successful responses', async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: {} }));
    expect(await executeAgentWebSearch('token', { query: 'test' }, new AbortController().signal)).toMatchObject({ success: false, error: 'Invalid SearXNG search response' });
  });
  it('passes cancellation to fetch and returns a cancellation result', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((url, options) => {
      expect(url).toMatch(/\/agent\/search$/);
      controller.abort();
      expect(options?.signal?.aborted).toBe(true);
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    expect(await executeAgentWebSearch('token', { query: 'test' }, controller.signal)).toMatchObject({ success: false, error: 'web.search cancelled' });
  });
  it('normalizes network failures without exposing request details', async () => {
    fetchMock.mockRejectedValue(new Error('private address'));
    expect(await executeAgentWebSearch('token', { query: 'test' }, new AbortController().signal)).toMatchObject({ success: false, error: 'SearXNG search request failed or timed out' });
  });
});
