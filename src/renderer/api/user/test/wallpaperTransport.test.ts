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
 * @file wallpaperTransport.test.ts
 * @description 壁纸 API 查询参数、元数据默认值、真实 FormData 上传、XHR 进度与错误解析测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyUserWallpaper, deleteUserWallpaper, getUserWallpaperDetail, listMyUserWallpapers, listUserWallpapers, normalizeWallpaperMarketListData, rateUserWallpaper, reportUserWallpaper, searchUserTags, updateUserWallpaperMetadata, uploadUserWallpaper } from '../userAccountApi.wallpaper';
import type { UploadWallpaperOptions, UploadWallpaperPayload } from '../userAccountApi.types';

const leaf = vi.hoisted(() => ({ request: vi.fn(), headers: vi.fn() }));
vi.mock('../userAccountApi.client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../userAccountApi.client')>();
  return { ...original, request: leaf.request, buildUploadHeaders: leaf.headers };
});

class XhrFixture {
  static instances: XhrFixture[] = [];

  status = 200;

  responseText = '{"code":200,"message":"created","data":{"id":5}}';

  onerror: (() => void) | null = null;

  onabort: (() => void) | null = null;

  onload: (() => void) | null = null;

  upload = { onprogress: null as ((event: Pick<ProgressEvent, 'lengthComputable' | 'loaded' | 'total'>) => void) | null };

  open = vi.fn();

  setRequestHeader = vi.fn();

  send = vi.fn();

  /** 记录真实上传模块创建的请求对象。 */
  constructor() {
    XhrFixture.instances.push(this);
  }
}

const originalFile = new File(['source'], 'wallpaper.jpg', { type: 'image/jpeg' });
const thumb = new File(['thumb'], 'thumb.png', { type: 'image/png' });
const payload: UploadWallpaperPayload = { title: 'Title', copyrightDeclared: false, original: originalFile, thumb320: thumb, thumb720: thumb, thumb1280: thumb };

/**
 * 启动真实上传，等待异步头部构建完成而不等待网络事件。
 * @param extra - 上传字段覆盖，用于有限值及可选元数据边界。
 * @param options - 可选的进度订阅。
 * @returns 待完成 Promise、真实发送的 FormData 和浏览器边界夹具。
 */
async function begin(extra: Partial<UploadWallpaperPayload> = {}, options?: UploadWallpaperOptions): Promise<{ result: ReturnType<typeof uploadUserWallpaper>; xhr: XhrFixture; form: FormData }> {
  const result = options === undefined ? uploadUserWallpaper('token', { ...payload, ...extra }) : uploadUserWallpaper('token', { ...payload, ...extra }, options);
  await new Promise<void>((resolve) => setImmediate(resolve));
  const [xhr] = XhrFixture.instances;
  const form = xhr.send.mock.calls[0][0] as FormData;
  return { result, xhr, form };
}

beforeEach(() => {
  XhrFixture.instances = [];
  leaf.request.mockReset().mockResolvedValue({ ok: true, code: 200 });
  leaf.headers.mockReset().mockResolvedValue({ Authorization: 'Bearer token', 'X-App-Name': 'eisland' });
  vi.stubGlobal('XMLHttpRequest', XhrFixture);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('wallpaper API queries and metadata contracts', () => {
  it('normalizes invalid items/total fields', () => {
    expect(normalizeWallpaperMarketListData({ items: [], total: '2' } as unknown as Parameters<typeof normalizeWallpaperMarketListData>[0])).toEqual({ items: [], total: null });
    expect(normalizeWallpaperMarketListData({ items: null } as unknown as Parameters<typeof normalizeWallpaperMarketListData>[0])).toEqual({ items: [], total: null });
    expect(normalizeWallpaperMarketListData({ items: [], total: 0 })).toEqual({ items: [], total: 0 });
  });
  it.each([{ mine: false }, { mine: true }])('queries lists mine=$mine with empty and full parameters', async ({ mine }) => {
    const list = mine ? listMyUserWallpapers : listUserWallpapers;
    const base = mine ? '/v1/user/wallpapers/mine' : '/v1/user/wallpapers/list';
    await list('token');
    expect(leaf.request).toHaveBeenLastCalledWith(base, { method: 'GET', auth: 'token' });
    await list('token', { keyword: 'a & b', type: 'video', sort: 'rating', page: 2, pageSize: 8 });
    expect(leaf.request).toHaveBeenLastCalledWith(`${base}?keyword=a+%26+b&type=video&sort=rating&page=2&pageSize=8`, { method: 'GET', auth: 'token' });
  });
  it('searches tags with default/explicit limits and resolves wallpaper identity operations', async () => {
    await searchUserTags('token', '');
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/tags/search?limit=15', { method: 'GET', auth: 'token' });
    await searchUserTags('token', 'a & b', 5);
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/tags/search?keyword=a+%26+b&limit=5', { method: 'GET', auth: 'token' });
    await getUserWallpaperDetail('token', 42);
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/wallpapers/detail?id=42', { method: 'GET', auth: 'token' });
    await deleteUserWallpaper('token', 42);
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/wallpapers/delete?id=42', { method: 'DELETE', auth: 'token' });
    await applyUserWallpaper('token', 42);
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/wallpapers/apply', { method: 'POST', auth: 'token', body: { id: 42 } });
    await rateUserWallpaper('token', 42, 5);
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/wallpapers/rate', { method: 'POST', auth: 'token', body: { id: 42, score: 5 } });
  });
  it('fills optional metadata/report fields and preserves explicit values', async () => {
    await updateUserWallpaperMetadata('token', { id: 1, title: 'Title' });
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/wallpapers/metadata', { method: 'PUT', auth: 'token', body: { id: 1, title: 'Title', description: '', type: 'image', tags: '', copyrightInfo: '' } });
    const data = { id: 1, title: 'Video', description: 'Description', type: 'video' as const, tags: 'tag', copyrightInfo: 'mine' };
    await updateUserWallpaperMetadata('token', data);
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/wallpapers/metadata', { method: 'PUT', auth: 'token', body: data });
    await reportUserWallpaper('token', { id: 1, reasonType: 'spam' });
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/wallpapers/report', { method: 'POST', auth: 'token', body: { id: 1, reasonType: 'spam', reasonDetail: '' } });
    await reportUserWallpaper('token', { id: 1, reasonType: 'other', reasonDetail: 'details' });
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/wallpapers/report', { method: 'POST', auth: 'token', body: { id: 1, reasonType: 'other', reasonDetail: 'details' } });
  });
});

describe('wallpaper multipart uploading', () => {
  it('writes defaults and actual binary files without optional metadata', async () => {
    const { result, xhr, form } = await begin();
    expect([...form.keys()]).toEqual(['title', 'type', 'copyrightDeclared', 'original', 'thumb320', 'thumb720', 'thumb1280']);
    expect(form.get('type')).toBe('image');
    expect(form.get('copyrightDeclared')).toBe('false');
    expect(await (form.get('original') as File).text()).toBe('source');
    expect((form.get('original') as File).name).toBe('wallpaper.jpg');
    expect(xhr.open).toHaveBeenCalledExactlyOnceWith('POST', expect.stringContaining('/v1/user/wallpapers/upload'), true);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer token');
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
    xhr.onload?.();
    expect(await result).toEqual({ ok: true, code: 200, message: 'created', data: { id: 5 } });
  });
  it('sends explicit metadata, rounds dimensions/duration and reports only computable progress', async () => {
    const progress = vi.fn();
    const { result, xhr, form } = await begin({ description: 'Description', tags: 'tag', type: 'video', copyrightDeclared: true, copyrightInfo: 'mine', width: 100.6, height: 200.4, durationMs: 1000.6, frameRate: 29.97 }, { onUploadProgress: progress });
    expect(form.get('width')).toBe('101');
    expect(form.get('height')).toBe('200');
    expect(form.get('durationMs')).toBe('1001');
    expect(form.get('frameRate')).toBe('29.97');
    expect(form.get('description')).toBe('Description');
    expect(form.get('tags')).toBe('tag');
    expect(form.get('type')).toBe('video');
    expect(form.get('copyrightDeclared')).toBe('true');
    expect(form.get('copyrightInfo')).toBe('mine');
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 50, total: 100 });
    expect(progress).not.toHaveBeenCalled();
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 0, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 101 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 200, total: 100 });
    expect(progress.mock.calls).toEqual([[0], [50], [100]]);
    xhr.onload?.();
    await result;
  });
  it.each([{ width: NaN, height: Infinity, durationMs: NaN, frameRate: Infinity }, { width: undefined, height: undefined, durationMs: 0, frameRate: 0 }])('omits invalid or nonpositive video measurements %j', async (extra) => {
    const { result, xhr, form } = await begin(extra);
    expect(form.has('width')).toBe(false);
    expect(form.has('height')).toBe(false);
    expect(form.has('durationMs')).toBe(false);
    expect(form.has('frameRate')).toBe(false);
    xhr.onload?.();
    await result;
  });
  it.each(['error', 'abort'] as const)('resolves failed transport %s', async (event) => {
    const { result, xhr } = await begin();
    if (event === 'error') {
      xhr.onerror?.();
    } else {
      xhr.onabort?.();
    }
    expect(await result).toEqual({ ok: false, code: -1, message: '网络请求失败' });
  });
  it.each([{ status: 199, body: '{}', code: 199, message: 'HTTP 199' }, { status: 300, body: '{}', code: 300, message: 'HTTP 300' }, { status: 403, body: '{"code":403,"message":"denied"}', code: 403, message: 'denied' }, { status: 200, body: 'not json', code: -1, message: '响应解析失败' }])('parses transport status $status and payload $body', async ({ status, body, code, message }) => {
    const { result, xhr } = await begin();
    xhr.status = status;
    xhr.responseText = body;
    xhr.onload?.();
    expect(await result).toMatchObject({ code, message, ok: false });
  });
});
