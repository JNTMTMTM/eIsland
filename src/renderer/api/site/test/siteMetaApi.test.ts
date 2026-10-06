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
 * @file siteMetaApi.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestWindow = {
  api?: {
    netFetch: ReturnType<typeof vi.fn>;
  };
};

const setTestWindow = (value: TestWindow): void => {
  Object.defineProperty(globalThis, 'window', {
    value,
    configurable: true,
    writable: true,
  });
};

const setTestLocalStorage = (value: Storage): void => {
  Object.defineProperty(globalThis, 'localStorage', {
    value,
    configurable: true,
    writable: true,
  });
};

describe('siteMetaApi', () => {
  beforeEach(() => {
    vi.resetModules();
    const store = new Map<string, string>();
    setTestLocalStorage({
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: () => null,
      length: 0,
    });
  });

  it('parses html title and favicon candidates', async () => {
    setTestWindow({
      api: {
        netFetch: vi.fn(),
      },
    });
    const { parseHtmlTitle, getWebsiteFaviconUrls } = await import('../siteMetaApi');

    expect(parseHtmlTitle('<html><title> A &amp; B </title></html>')).toBe('A & B');
    const urls = getWebsiteFaviconUrls('https://example.com/path');
    expect(urls[0]).toBe('https://example.com/favicon.ico');
    expect(urls.some((u) => u.includes('duckduckgo.com'))).toBe(true);
  });

  it('stores and reads authorization policy by hostname', async () => {
    setTestWindow({
      api: {
        netFetch: vi.fn(),
      },
    });
    const { setWebsiteAuthorizationPolicy, getWebsiteAuthorizationPolicy } = await import('../siteMetaApi');

    setWebsiteAuthorizationPolicy('https://EXAMPLE.com/a', 'allow');
    expect(getWebsiteAuthorizationPolicy('https://example.com/b')).toBe('allow');

    setWebsiteAuthorizationPolicy('https://example.com/b', 'ask');
    expect(getWebsiteAuthorizationPolicy('https://example.com/c')).toBe('ask');
  });

  it('fetches preferred favicon with HEAD fallback to GET', async () => {
    const netFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, body: '' })
      .mockResolvedValueOnce({ ok: true, status: 200, body: '' });

    setTestWindow({ api: { netFetch } });

    const { getWebsitePreferredFaviconUrl } = await import('../siteMetaApi');
    const url = await getWebsitePreferredFaviconUrl('https://example.com/page', 1000);

    expect(url).toBe('https://example.com/favicon.ico');
    expect(netFetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/favicon.ico',
      expect.objectContaining({ method: 'HEAD' }),
    );
    expect(netFetch).toHaveBeenNthCalledWith(
      2,
      'https://example.com/favicon.ico',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
