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
 * @file mailUtils.test.ts
 * @description 邮件正文转义、账户迁移、配置兜底、真实超时竞态、内存缓存及事件隔离测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMailSrcDoc, clearInboxMemoryCache, escapeHtml, fetchInbox, formatMailDate, getInboxMemoryCache, getStoredFetchLimit, isAccountConfigured, isHtmlContent, normalizeLegacyAccount, readMailAccountState, readStoredFetchLimit, stopEventPropagation, updateInboxMemoryCache } from '../mailUtils';
import type { SyntheticEvent } from 'react';
import type { MailAccountConfig, MailInboxItem } from '../../types/mailTypes';

const account: MailAccountConfig = { id: 'one', label: 'Main', emailAddress: 'person@example.test', imapHost: 'imap.example.test', imapPort: '993', imapSecure: true, authUser: 'person', authSecret: 'secret' };
const item: MailInboxItem = { uid: '1', subject: 'hello', from: 'from', to: 'to', date: '2026-01-02T03:04:05Z', size: 3, preview: 'hi', body: 'hi' };
const read = vi.fn<(key: string) => Promise<unknown>>();
const inbox = vi.fn();

beforeEach(() => {
  read.mockReset();
  inbox.mockReset();
  vi.stubGlobal('window', { api: { storeRead: read, mailInboxList: inbox } });
  clearInboxMemoryCache();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('mail HTML documents', () => {
  it.each([['<P>hello</P>', true], ['< a href="x">link</a>', true], ['plain <x> text', false]])('HTML recognition %s', (text, expected) => {
    expect(isHtmlContent(text)).toBe(expected);
  });
  it('escapes text special characters and wraps text content in a preformatted document', () => {
    expect(escapeHtml('& < >')).toBe('&amp; &lt; &gt;');
    const document = buildMailSrcDoc('ordinary & text\nnext');
    expect(document).toContain('<pre ');
    expect(document).toContain('ordinary &amp; text\nnext</pre>');
    expect(document).toMatch(/<html[\s>]/i);
    expect(document).toContain('</body></html>');
  });
  it('preserves HTML fragments and injects a head into full HTML documents', () => {
    expect(buildMailSrcDoc('<p>mail</p>')).toContain('<p>mail</p></body></html>');
    const withHead = buildMailSrcDoc('<HTML><HEAD lang="en"><title>mail</title></HEAD><body>x</body></HTML>');
    expect(withHead).toContain('<HEAD lang="en"><base');
    expect(withHead).toContain('<title>mail</title>');
    const withoutHead = buildMailSrcDoc('<html lang="en"><body>x</body></html>');
    expect(withoutHead).toContain('<html lang="en"><head><base');
    expect(withoutHead).toContain('</head><body>x</body>');
  });
});

describe('mail account validation and stored settings', () => {
  it.each([
    { imapHost: '', authUser: 'user', authSecret: 'secret' },
    { imapHost: ' host ', authUser: ' ', authSecret: 'secret' },
    { imapHost: 'host', authUser: 'user', authSecret: '' },
    {},
  ])('rejects incomplete accounts %j', (partial) => {
    expect(isAccountConfigured(partial as MailAccountConfig)).toBe(false);
  });
  it('accepts trimmed configured credentials', () => {
    expect(isAccountConfigured(account)).toBe(true);
  });
  it.each([{ raw: null }, { raw: undefined }, { raw: false }, { raw: 1 }, { raw: 'wrong' }, { raw: [] }, { raw: {} }, { raw: { imapHost: 4 } }, { raw: { imapHost: ' ' } }, { raw: { imapHost: 'host', authUser: 1 } }, { raw: { imapHost: 'host', authUser: ' ' } }, { raw: { imapHost: 'host', authUser: 'user', authSecret: 4 } }, { raw: { imapHost: 'host', authUser: 'user', authSecret: '' } }])('rejects invalid legacy config $raw', ({ raw }) => {
    expect(normalizeLegacyAccount(raw)).toBeNull();
  });
  it('fills optional legacy fields and preserves explicit values', () => {
    expect(normalizeLegacyAccount({ imapHost: 'host', authUser: 'user', authSecret: 'secret' })).toEqual({ id: 'legacy', label: '', emailAddress: '', imapHost: 'host', imapPort: '993', imapSecure: true, authUser: 'user', authSecret: 'secret' });
    expect(normalizeLegacyAccount({ ...account, imapPort: '143', imapSecure: false })).toEqual({ ...account, id: 'legacy', label: account.emailAddress, imapPort: '143', imapSecure: false });
  });
  it.each([[undefined, 10], ['4', 10], [NaN, 10], [Infinity, 10], [0, 10], [31, 10], [1, 1], [30, 30], [15, 15]])('fetch limit %s -> %s', (value, expected) => {
    expect(getStoredFetchLimit(value)).toBe(expected);
  });
  it('reads the configured limit and defaults a failed storage read', async () => {
    read.mockResolvedValueOnce(5).mockRejectedValueOnce(new Error('offline'));
    expect(await readStoredFetchLimit()).toBe(5);
    expect(await readStoredFetchLimit()).toBe(10);
    expect(read).toHaveBeenCalledWith('mail-fetch-limit');
  });
  it('prioritizes multiple accounts and chooses the first configured one', async () => {
    const partial = { ...account, id: 'partial', imapHost: '' };
    read.mockResolvedValueOnce([partial, account]);
    expect(await readMailAccountState()).toEqual({ configured: true, accounts: [partial, account], activeAccount: account });
    expect(read).toHaveBeenCalledExactlyOnceWith('mail-accounts-config');
  });
  it('retains unconfigured multi-account lists', async () => {
    const partial = { ...account, imapHost: '' };
    read.mockResolvedValueOnce([partial]);
    expect(await readMailAccountState()).toEqual({ configured: false, accounts: [partial], activeAccount: null });
  });
  it.each([{ accounts: [] }, { accounts: null }, { accounts: {} }])('falls back to legacy storage for $accounts', async ({ accounts }) => {
    read.mockResolvedValueOnce(accounts).mockResolvedValueOnce(account);
    expect(await readMailAccountState()).toEqual({ configured: true, accounts: [{ ...account, id: 'legacy', label: account.emailAddress }], activeAccount: { ...account, id: 'legacy', label: account.emailAddress } });
    expect(read).toHaveBeenLastCalledWith('mail-account-config');
  });
  it('returns an empty state for invalid legacy data or failed reads', async () => {
    read.mockResolvedValueOnce([]).mockResolvedValueOnce({});
    expect(await readMailAccountState()).toEqual({ configured: false, accounts: [], activeAccount: null });
    read.mockRejectedValueOnce(new Error('offline'));
    expect(await readMailAccountState()).toEqual({ configured: false, accounts: [], activeAccount: null });
  });
});

describe('mail inbox timeouts, cache and event isolation', () => {
  it.each([{ response: { ok: true, items: [item] }, expected: [item] }, { response: { ok: true }, expected: [] }, { response: { ok: false }, expected: null }])('handles inbox result $response', async ({ response, expected }) => {
    vi.useFakeTimers();
    inbox.mockResolvedValue(response);
    expect(await fetchInbox(account, 5, 'timeout')).toEqual(expected);
    expect(inbox).toHaveBeenCalledExactlyOnceWith({ emailAddress: account.emailAddress, imapHost: account.imapHost, imapPort: account.imapPort, imapSecure: account.imapSecure, authUser: account.authUser, authSecret: account.authSecret }, 5);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects network failures while clearing the pending timer', async () => {
    vi.useFakeTimers();
    inbox.mockRejectedValue(new Error('network error'));
    await expect(fetchInbox(account, 10, 'timeout')).rejects.toThrow('network error');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects a stalled request at 20 seconds and clears the timer', async () => {
    vi.useFakeTimers();
    inbox.mockReturnValue(new Promise(() => {}));
    const request = fetchInbox(account, 10, 'timed out');
    const rejection = expect(request).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(19999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('updates/resets inbox cache and formats localized dates', () => {
    expect(getInboxMemoryCache()).toEqual([]);
    updateInboxMemoryCache([item]);
    expect(getInboxMemoryCache()).toEqual([item]);
    clearInboxMemoryCache();
    expect(getInboxMemoryCache()).toEqual([]);
    expect(formatMailDate(item.date)).toBe(new Date(item.date).toLocaleString());
  });
  it('isolates container events', () => {
    const stopPropagation = vi.fn();
    stopEventPropagation({ stopPropagation } as unknown as SyntheticEvent);
    expect(stopPropagation).toHaveBeenCalledOnce();
  });
});
