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
 * @file toolboxApi.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestWindow = {
  location?: { hostname: string };
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

describe('toolbox apis', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('fetchToolboxSoftwareList returns list when payload is valid', async () => {
    const netFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: JSON.stringify({
        code: 200,
        data: [{ id: 1, name: 'Steam', description: 'desc', url: 'u', iconUrl: 'i' }],
      }),
    }));

    setTestWindow({
      location: { hostname: 'localhost' },
      api: { netFetch },
    });

    const { fetchToolboxSoftwareList } = await import('../toolboxSoftwareApi');
    const list = await fetchToolboxSoftwareList();

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Steam');
  });

  it('fetchTranslate returns normalized error on non-200 payload', async () => {
    const netFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: JSON.stringify({ code: 500, message: 'failed' }),
    }));

    setTestWindow({
      location: { hostname: '127.0.0.1' },
      api: { netFetch },
    });

    const { fetchTranslate } = await import('../toolboxTranslateApi');
    const result = await fetchTranslate('token', 'hello', 'en', 'zh');

    expect(result.success).toBe(false);
    expect(result.message).toBe('failed');
    expect(netFetch).toHaveBeenCalledWith(
      'https://test.server.pyisland.com/api/v1/toolbox/translate',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchTranslate returns success data on code 200', async () => {
    const netFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: JSON.stringify({
        code: 200,
        data: {
          targetText: '你好',
          source: 'en',
          target: 'zh',
          requestId: 'r1',
        },
      }),
    }));

    setTestWindow({
      location: { hostname: 'localhost' },
      api: { netFetch },
    });

    const { fetchTranslate } = await import('../toolboxTranslateApi');
    const result = await fetchTranslate('token', 'hello', 'en', 'zh');

    expect(result.success).toBe(true);
    expect(result.data?.targetText).toBe('你好');
  });
});
