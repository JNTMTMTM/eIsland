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
 * @file userAccountApi.translation.test.ts
 * @description 用户图片翻译与 OCR 历史接口单元测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

const mockRequest = vi.hoisted(() => vi.fn());

vi.mock('../userAccountApi.client', () => ({
  request: mockRequest,
}));

import { fetchOcrHistory } from '../userAccountApi.translation';

describe('userAccountApi.translation', () => {
  const okResult = { ok: true, code: 200, message: 'success', data: undefined };

  describe('fetchOcrHistory', () => {
    it('requests the first page with five items by default', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchOcrHistory('my-token');

      expect(mockRequest).toHaveBeenCalledWith('/v1/toolbox/ocr/history?page=1&pageSize=5', {
        method: 'GET',
        auth: 'my-token',
      });
    });

    it('uses the requested page and page size', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchOcrHistory('my-token', 3, 10);

      expect(mockRequest).toHaveBeenCalledWith('/v1/toolbox/ocr/history?page=3&pageSize=10', {
        method: 'GET',
        auth: 'my-token',
      });
    });

    it('normalizes invalid pagination values', async () => {
      mockRequest.mockResolvedValueOnce(okResult);

      await fetchOcrHistory('my-token', 0, 1000);

      expect(mockRequest).toHaveBeenCalledWith('/v1/toolbox/ocr/history?page=1&pageSize=100', {
        method: 'GET',
        auth: 'my-token',
      });
    });
  });
});