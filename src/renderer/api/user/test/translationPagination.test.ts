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
 * @file translationPagination.test.ts
 * @description 图片翻译与 OCR 真实接口分页归一化、编码和删除契约测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteImageTranslationHistory, deleteOcrHistory, fetchImageTranslationHistory, fetchOcrHistory } from '../userAccountApi.translation';

const request = vi.hoisted(() => vi.fn());
vi.mock('../userAccountApi.client', () => ({ request }));
beforeEach(() => request.mockReset().mockResolvedValue({ ok: true, code: 200, data: { items: [] } }));

describe('translation history pagination', () => {
  it.each([
    { fetch: fetchImageTranslationHistory, endpoint: 'image-translations' },
    { fetch: fetchOcrHistory, endpoint: 'ocr' },
  ])('handles defaults, flooring, invalid values and limits for $endpoint', async ({ fetch, endpoint }) => {
    await fetch('token');
    expect(request).toHaveBeenLastCalledWith(`/v1/toolbox/${  endpoint  }/history?page=1&pageSize=5`, { method: 'GET', auth: 'token' });
    const cases = [
      { page: 3.9, size: 7.9, expected: 'page=3&pageSize=7' },
      { page: NaN, size: NaN, expected: 'page=1&pageSize=5' },
      { page: 0, size: 0, expected: 'page=1&pageSize=5' },
      { page: -1, size: -1, expected: 'page=1&pageSize=1' },
      { page: 9, size: 101, expected: 'page=9&pageSize=100' },
    ];
    await cases.reduce(async (previous, { page, size, expected }) => {
      await previous;
      await fetch('token', page, size);
      expect(request).toHaveBeenLastCalledWith(`/v1/toolbox/${  endpoint  }/history?${  expected}`, { method: 'GET', auth: 'token' });
    }, Promise.resolve());
  });
  it('URL encodes translation task identity and OCR record numbers', async () => {
    await deleteImageTranslationHistory('token', '中 &/?=');
    expect(request).toHaveBeenLastCalledWith('/v1/toolbox/image-translations/%E4%B8%AD%20%26%2F%3F%3D', { method: 'DELETE', auth: 'token' });
    await deleteOcrHistory('token', 42);
    expect(request).toHaveBeenLastCalledWith('/v1/toolbox/ocr/history/42', { method: 'DELETE', auth: 'token' });
  });
  it('returns failed responses and propagates leaf rejection', async () => {
    const failure = { ok: false, code: 403, message: 'denied' };
    request.mockResolvedValueOnce(failure);
    expect(await fetchImageTranslationHistory('token')).toBe(failure);
    const error = new Error('transport failed');
    request.mockRejectedValueOnce(error);
    await expect(deleteImageTranslationHistory('token', 'task')).rejects.toBe(error);
  });
});
