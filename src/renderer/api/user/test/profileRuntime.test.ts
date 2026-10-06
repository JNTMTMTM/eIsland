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
 * @file profileRuntime.test.ts
 * @description 用户资料接口真实 TOTP 计算、种子失败与头像 FormData/响应边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateUserPassword, updateUserProfile, uploadUserAvatar } from '../userAccountApi.profile';

const leaf = vi.hoisted(() => ({ request: vi.fn(), headers: vi.fn(), fetch: vi.fn() }));
vi.mock('../userAccountApi.client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../userAccountApi.client')>();
  return { ...original, request: leaf.request, buildUploadHeaders: leaf.headers };
});
const file = new File(['avatar-content'], 'avatar.png', { type: 'image/png' });
const captcha = { ticket: 'ticket', randstr: 'random', sign: 'signature' };

beforeEach(() => {
  leaf.request.mockReset();
  leaf.headers.mockReset().mockResolvedValue({ Authorization: 'Bearer token' });
  leaf.fetch.mockReset();
  vi.stubGlobal('fetch', leaf.fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('real profile password seed flow', () => {
  it('calculates the six-digit RFC vector from the real seed and posts credentials', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(59000);
    leaf.request.mockResolvedValueOnce({ ok: true, code: 200, data: { seed: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' } }).mockResolvedValueOnce({ ok: true, code: 200 });
    expect(await updateUserPassword('token', { password: 'new-password', emailCode: '001234' })).toEqual({ ok: true, code: 200 });
    expect(leaf.request).toHaveBeenNthCalledWith(2, '/v1/user/profile/password', { method: 'POST', auth: 'token', body: { password: 'new-password', emailCode: '001234', totpCode: '287082' } });
  });
  it.each([
    { response: { ok: false, code: 0, message: '' }, code: 500, message: 'TOTP Seed 获取失败' },
    { response: { ok: true, code: 200, message: 'missing' }, code: 200, message: 'missing' },
    { response: { ok: true, code: 200, data: { seed: '' } }, code: 200, message: 'TOTP Seed 获取失败' },
  ])('rejects missing seed with the documented fallback $message', async ({ response, code, message }) => {
    leaf.request.mockResolvedValueOnce(response);
    expect(await updateUserPassword('token', { password: 'p', emailCode: 'c' })).toEqual({ code, message, ok: false });
    expect(leaf.request).toHaveBeenCalledTimes(1);
  });
  it.each(['invalid seed!', '   '])('contains the real TOTP decoder rejection for %s', async (seed) => {
    leaf.request.mockResolvedValueOnce({ ok: true, code: 200, data: { seed } });
    expect(await updateUserPassword('token', { password: 'p', emailCode: 'c' })).toEqual({ ok: false, code: 500, message: 'TOTP 生成失败' });
    expect(leaf.request).toHaveBeenCalledTimes(1);
  });
  it('contains seed request failure before cryptography starts', async () => {
    leaf.request.mockRejectedValueOnce(new Error('network failed'));
    expect(await updateUserPassword('token', { password: 'p', emailCode: 'c' })).toEqual({ ok: false, code: 500, message: 'TOTP 生成失败' });
  });
  it('preserves explicit empty/null profile fields and omits absent gender', async () => {
    await updateUserProfile('token', { avatar: null, genderCustom: '', birthday: null });
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/profile', { method: 'PUT', auth: 'token', body: { avatar: null, genderCustom: '', birthday: null } });
    await updateUserProfile('token', {});
    expect(leaf.request).toHaveBeenLastCalledWith('/v1/user/profile', { method: 'PUT', auth: 'token', body: {} });
  });
});

describe('avatar binary transport', () => {
  it.each(['', '   '])('rejects token %j before transport', async (token) => {
    await expect(uploadUserAvatar(file, token, captcha)).rejects.toThrow('未登录');
    expect(leaf.headers).not.toHaveBeenCalled();
    expect(leaf.fetch).not.toHaveBeenCalled();
  });
  it('sends actual file contents and all captcha fields', async () => {
    leaf.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ code: 200, data: 'https://cdn/avatar.png' }), { status: 200 }));
    expect(await uploadUserAvatar(file, 'token', captcha)).toBe('https://cdn/avatar.png');
    const [url, options] = leaf.fetch.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/v1/upload/user-avatar')).toBe(true);
    expect(options.headers).toEqual({ Authorization: 'Bearer token' });
    expect(options.method).toBe('POST');
    const form = options.body as FormData;
    expect([...form.keys()]).toEqual(['file', 'captchaTicket', 'captchaRandstr', 'captchaSign']);
    expect(await (form.get('file') as File).text()).toBe('avatar-content');
    expect(form.get('captchaTicket')).toBe('ticket');
    expect(form.get('captchaRandstr')).toBe('random');
    expect(form.get('captchaSign')).toBe('signature');
  });
  it.each([
    { status: 403, body: '{"code":403,"message":"denied"}', message: 'denied' },
    { status: 500, body: 'invalid json', message: '上传失败：HTTP 500' },
    { status: 200, body: 'invalid json', message: '上传失败' },
    { status: 200, body: 'null', message: '上传失败' },
    { status: 200, body: '{"code":400,"message":"invalid"}', message: 'invalid' },
    { status: 200, body: '{"code":200,"data":7}', message: '上传失败' },
    { status: 200, body: '{"code":200,"data":""}', message: '上传失败' },
  ])('rejects response status $status body $body', async ({ status, body, message }) => {
    leaf.fetch.mockResolvedValueOnce(new Response(body, { status }));
    await expect(uploadUserAvatar(file, 'token', captcha)).rejects.toThrow(message);
  });
  it('propagates header and fetch failures without sending invalid requests', async () => {
    const error = new Error('transport unavailable');
    leaf.headers.mockRejectedValueOnce(error);
    await expect(uploadUserAvatar(file, 'token', captcha)).rejects.toBe(error);
    expect(leaf.fetch).not.toHaveBeenCalled();
    leaf.fetch.mockRejectedValueOnce(error);
    await expect(uploadUserAvatar(file, 'token', captcha)).rejects.toBe(error);
  });
});
