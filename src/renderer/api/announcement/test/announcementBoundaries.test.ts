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
 * @file announcementBoundaries.test.ts
 * @description 公告与广告接口的持久化失败、公开字段归一化、排序和网络边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const leaf = vi.hoisted(() => ({ net: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock('../../../i18n', () => ({ getLanguage: () => 'zh & CN' }));
beforeEach(() => {
  vi.resetModules();
  leaf.net.mockReset();
  leaf.read.mockReset();
  leaf.write.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('window', { location: { hostname: 'app.local' }, api: { netFetch: leaf.net, storeRead: leaf.read, storeWrite: leaf.write } });
});
afterEach(() => vi.unstubAllGlobals());

const responseFailures = [
  { response: undefined },
  { response: { ok: false, body: '{}' } },
  { response: { ok: true, body: 'not json' } },
  { response: { ok: true, body: 'null' } },
  { response: { ok: true, body: '{"code":500}' } },
  { response: { ok: true, body: '{"code":200,"data":null}' } },
  { response: { ok: true, body: '{"code":200,"data":"invalid"}' } },
];

describe('announcement persistence', () => {
  it.each(['always', 'version-update-only', 'invalid', null])('normalizes stored display preference %j', async (raw) => {
    leaf.read.mockResolvedValueOnce(raw);
    const api = await import('../announcementApi');
    expect(await api.readAnnouncementShowMode()).toBe(raw === 'always' ? 'always' : 'version-update-only');
  });
  it.each([{ raw: '1.2.3', expected: '1.2.3' }, { raw: 3, expected: '' }])('normalizes stored application version $raw', async ({ raw, expected }) => {
    leaf.read.mockResolvedValueOnce(raw);
    const api = await import('../announcementApi');
    expect(await api.readAnnouncementLastShownAppVersion()).toBe(expected);
  });
  it('contains store read and write failures and never persists an empty version', async () => {
    const api = await import('../announcementApi');
    leaf.read.mockRejectedValue(new Error('read failed'));
    expect(await api.readAnnouncementShowMode()).toBe('version-update-only');
    expect(await api.readAnnouncementLastShownAppVersion()).toBe('');
    await api.writeAnnouncementLastShownAppVersion('');
    expect(leaf.write).not.toHaveBeenCalled();
    await api.writeAnnouncementLastShownAppVersion('1.2.3');
    expect(leaf.write).toHaveBeenLastCalledWith(api.ANNOUNCEMENT_LAST_SHOWN_APP_VERSION_STORE_KEY, '1.2.3');
    leaf.write.mockRejectedValue(new Error('write failed'));
    await expect(api.writeAnnouncementLastShownAppVersion('2.0.0')).resolves.toBeUndefined();
    await expect(api.writeAnnouncementShowMode('always')).resolves.toBeUndefined();
  });
});

describe('announcement and ad response boundaries', () => {
  it.each(responseFailures)('contains unavailable JSON response $response across all public endpoints', async ({ response }) => {
    const api = await import('../announcementApi');
    leaf.net.mockResolvedValue(response);
    expect(await api.fetchCurrentAnnouncement()).toBeNull();
    expect(await api.fetchAnnouncements()).toEqual([]);
    expect(await api.fetchAdSlides()).toEqual([]);
    expect(await api.fetchAnnouncementSocialConfig()).toEqual({ githubUrl: '', bilibiliUrl: '', qqInviteUrl: '', qqQrImageUrl: '' });
  });
  it('contains bridge rejection across all public endpoints', async () => {
    const api = await import('../announcementApi');
    leaf.net.mockRejectedValue(new Error('offline'));
    expect(await api.fetchCurrentAnnouncement()).toBeNull();
    expect(await api.fetchAnnouncements()).toEqual([]);
    expect(await api.fetchAdSlides()).toEqual([]);
    expect(await api.fetchAnnouncementSocialConfig()).toEqual({ githubUrl: '', bilibiliUrl: '', qqInviteUrl: '', qqQrImageUrl: '' });
  });
  it.each([{ item: {} }, { item: 3 }, { item: { title: 3, content: null, contentHtml: false } }])('rejects current announcement without any renderable field $item', async ({ item }) => {
    leaf.net.mockResolvedValue({ ok: true, body: JSON.stringify({ code: 200, data: item }) });
    const api = await import('../announcementApi');
    expect(await api.fetchCurrentAnnouncement()).toBeNull();
  });
  it('preserves valid optional fields and discards damaged metadata on legacy content', async () => {
    const api = await import('../announcementApi');
    const data = { id: 2, sortOrder: 3, title: 'Title', content: 'Content', contentHtml: '<p>HTML</p>', contentFormat: 'html', startAt: 'start', endAt: 'end', updatedAt: 'updated', bvid: 'BV-explicit' };
    leaf.net.mockResolvedValueOnce({ ok: true, body: JSON.stringify({ data, code: 200 }) });
    expect(await api.fetchCurrentAnnouncement()).toEqual(data);
    expect(leaf.net).toHaveBeenLastCalledWith('https://server.pyisland.com/api/v1/announcement/current?lang=zh%20%26%20CN', { method: 'GET', timeoutMs: 8000 });
    leaf.net.mockResolvedValueOnce({ ok: true, body: JSON.stringify({ code: 200, data: { title: null, content: 3, contentHtml: '<p>HTML</p>', id: '2', sortOrder: '3', contentFormat: false, startAt: 0, endAt: null, updatedAt: 3, bvid: '' } }) });
    expect(await api.fetchCurrentAnnouncement()).toEqual({ title: '', content: '', contentHtml: '<p>HTML</p>', id: undefined, sortOrder: undefined, contentFormat: undefined, startAt: undefined, endAt: undefined, updatedAt: undefined, bvid: 'BV1QEE36eEWJ' });
  });
  it('filters invalid list entries while preserving explicit video and content', async () => {
    const api = await import('../announcementApi');
    leaf.net.mockResolvedValueOnce({ ok: true, body: JSON.stringify({ code: 200, data: [null, false, {}, { title: 'Title', bvid: 'BV-explicit' }, { content: 'Content', bvid: 'BV-second' }] }) });
    expect(await api.fetchAnnouncements()).toEqual([expect.objectContaining({ title: 'Title', bvid: 'BV-explicit' }), expect.objectContaining({ content: 'Content', bvid: 'BV-second' })]);
  });
  it('cleans social fields individually and preserves all valid URLs', async () => {
    const api = await import('../announcementApi');
    const data = { githubUrl: 'github', bilibiliUrl: 'bilibili', qqInviteUrl: 'qq', qqQrImageUrl: 'qr' };
    leaf.net.mockResolvedValueOnce({ ok: true, body: JSON.stringify({ data, code: 200 }) });
    expect(await api.fetchAnnouncementSocialConfig()).toEqual(data);
    leaf.net.mockResolvedValueOnce({ ok: true, body: JSON.stringify({ code: 200, data: { githubUrl: 1, bilibiliUrl: null, qqInviteUrl: false, qqQrImageUrl: {} } }) });
    expect(await api.fetchAnnouncementSocialConfig()).toEqual({ githubUrl: '', bilibiliUrl: '', qqInviteUrl: '', qqQrImageUrl: '' });
  });
  it('filters malformed slides, defaults optional fields and sorts order before ascending ID', async () => {
    const api = await import('../announcementApi');
    leaf.net.mockResolvedValueOnce({ ok: true, body: JSON.stringify({ code: 200, data: [null, false, {}, { imageUrl: '' }, { imageUrl: 3 }, { imageUrl: 'default.png' }, { id: 4, imageUrl: 'later.png', title: 'Later', linkUrl: 'url', sortOrder: 10 }, { id: 2, imageUrl: 'earlier.png', title: 3, linkUrl: null, sortOrder: 10 }] }) });
    expect(await api.fetchAdSlides()).toEqual([{ id: 2, imageUrl: 'earlier.png', title: '', linkUrl: '', sortOrder: 10 }, { id: 4, imageUrl: 'later.png', title: 'Later', linkUrl: 'url', sortOrder: 10 }, { id: 0, imageUrl: 'default.png', title: '', linkUrl: '', sortOrder: 0 }]);
  });
  it('selects the loopback development host', async () => {
    vi.stubGlobal('window', { location: { hostname: '127.0.0.1' }, api: { netFetch: leaf.net } });
    leaf.net.mockResolvedValueOnce({ ok: false });
    const api = await import('../announcementApi');
    await api.fetchAdSlides();
    expect(leaf.net).toHaveBeenCalledExactlyOnceWith('https://test.server.pyisland.com/api/v1/ad-slides/current', { method: 'GET', timeoutMs: 8000 });
  });
});
