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
 * @file siteMetaBoundaries.test.ts
 * @description 网站标题解析、域名授权存储、图标回退与网络异常边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWebsiteTitle, getWebsiteAuthorizationPolicy, getWebsiteFaviconUrl, getWebsiteFaviconUrls, getWebsiteHostname, getWebsitePreferredFaviconUrl, parseHtmlTitle, setWebsiteAuthorizationPolicy } from '../siteMetaApi';

const leaf = { net: vi.fn(), get: vi.fn(), set: vi.fn() };
beforeEach(() => {
  leaf.net.mockReset();
  leaf.get.mockReset().mockReturnValue(null);
  leaf.set.mockReset();
  vi.stubGlobal('window', { api: { netFetch: leaf.net } });
  vi.stubGlobal('localStorage', { getItem: leaf.get, setItem: leaf.set });
});
afterEach(() => vi.unstubAllGlobals());

describe('HTML and website identity', () => {
  it.each([{ html: '<p>body</p>', title: '' }, { html: '<title></title>', title: '' }, { html: '<TITLE class="x"> A &nbsp; &amp; &lt;B&gt; </TITLE>', title: 'A   & <B>' }])('parses title $html', ({ html, title }) => {
    expect(parseHtmlTitle(html)).toBe(title);
  });
  it('returns empty identities and candidates for invalid URLs', async () => {
    expect(getWebsiteHostname('invalid URL')).toBe('');
    expect(getWebsiteFaviconUrls('invalid URL')).toEqual([]);
    expect(getWebsiteFaviconUrl('invalid URL')).toBe('');
    expect(await getWebsitePreferredFaviconUrl('invalid URL')).toBe('');
    expect(leaf.net).not.toHaveBeenCalled();
    expect(getWebsiteHostname('https://EXAMPLE.com/path')).toBe('example.com');
  });
});

describe('website persisted authorization', () => {
  it.each([{ raw: null }, { raw: 'invalid json' }, { raw: 'null' }, { raw: '3' }, { raw: 'false' }])('falls back to ask for invalid configuration $raw', ({ raw }) => {
    leaf.get.mockReturnValueOnce(raw);
    expect(getWebsiteAuthorizationPolicy('https://example.com')).toBe('ask');
  });
  it('normalizes domain keys and keeps allow/deny while discarding empty keys', () => {
    leaf.get.mockReturnValue(JSON.stringify({ ' EXAMPLE.COM ': 'allow', 'blocked.com': 'deny', 'unknown.com': 'other', ' ': 'allow' }));
    expect(getWebsiteAuthorizationPolicy('https://example.com')).toBe('allow');
    expect(getWebsiteAuthorizationPolicy('https://blocked.com')).toBe('deny');
    expect(getWebsiteAuthorizationPolicy('https://unknown.com')).toBe('ask');
    setWebsiteAuthorizationPolicy('https://next.com/path', 'deny');
    expect(leaf.set).toHaveBeenLastCalledWith('eIsland_siteAuthorizationPolicies', '{"example.com":"allow","blocked.com":"deny","unknown.com":"ask","next.com":"deny"}');
    setWebsiteAuthorizationPolicy('https://example.com/path', 'ask');
    const stored = leaf.set.mock.calls.at(-1)?.[1] as string;
    expect(JSON.parse(stored)).not.toHaveProperty('example.com');
  });
  it('never reads or writes policies for a URL without hostname', () => {
    expect(getWebsiteAuthorizationPolicy('invalid URL')).toBe('ask');
    setWebsiteAuthorizationPolicy('invalid URL', 'allow');
    expect(leaf.get).not.toHaveBeenCalled();
    expect(leaf.set).not.toHaveBeenCalled();
  });
  it('contains storage read and write exceptions', () => {
    leaf.get.mockImplementation(() => { throw new Error('blocked'); });
    expect(getWebsiteAuthorizationPolicy('https://example.com')).toBe('ask');
    leaf.set.mockImplementation(() => { throw new Error('full'); });
    expect(() => setWebsiteAuthorizationPolicy('https://example.com', 'allow')).not.toThrow();
  });
});

describe('website network metadata fallback', () => {
  it('returns HEAD success immediately with the default timeout', async () => {
    leaf.net.mockResolvedValueOnce({ ok: true });
    expect(await getWebsitePreferredFaviconUrl('https://example.com/path')).toBe('https://example.com/favicon.ico');
    expect(leaf.net).toHaveBeenCalledExactlyOnceWith('https://example.com/favicon.ico', { method: 'HEAD', timeoutMs: 3000, headers: { Accept: 'image/*,*/*;q=0.8' } });
  });
  it('returns GET success after a rejected HEAD', async () => {
    leaf.net.mockRejectedValueOnce(new Error('HEAD unsupported')).mockResolvedValueOnce({ ok: true });
    expect(await getWebsitePreferredFaviconUrl('https://example.com/path', 1234)).toBe('https://example.com/favicon.ico');
    expect(leaf.net).toHaveBeenLastCalledWith('https://example.com/favicon.ico', { method: 'GET', timeoutMs: 1234, headers: { Accept: 'image/*,*/*;q=0.8', Range: 'bytes=0-0' } });
  });
  it.each([{ rejectGet: true }, { rejectGet: false }])('uses existing candidate after HEAD/GET failure rejectGet=$rejectGet', async ({ rejectGet }) => {
    leaf.net.mockResolvedValueOnce({ ok: false });
    if (rejectGet) {
      leaf.net.mockRejectedValueOnce(new Error('GET failed'));
    } else {
      leaf.net.mockResolvedValueOnce({ ok: false });
    }
    expect(await getWebsitePreferredFaviconUrl('https://example.com/path')).toBe(getWebsiteFaviconUrl('https://example.com/path'));
  });
  it.each([{ response: { ok: false, body: '<title>No</title>' }, expected: '' }, { response: { ok: true, body: '' }, expected: '' }, { response: { ok: true, body: '<title> Yes </title>' }, expected: 'Yes' }])('normalizes fetched title $response', async ({ response, expected }) => {
    leaf.net.mockResolvedValueOnce(response);
    expect(await fetchWebsiteTitle('https://example.com')).toBe(expected);
    expect(leaf.net).toHaveBeenCalledExactlyOnceWith('https://example.com', { method: 'GET', timeoutMs: 8000, headers: { Accept: 'text/html,application/xhtml+xml' } });
  });
  it('contains fetch rejection and honors an explicit timeout', async () => {
    leaf.net.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchWebsiteTitle('https://example.com', 1234)).toBe('');
    expect(leaf.net).toHaveBeenCalledWith('https://example.com', expect.objectContaining({ timeoutMs: 1234 }));
  });
});
