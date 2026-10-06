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
 * @file versionApi.test.ts
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

describe('versionApi', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns version info when remote payload is valid', async () => {
    const netFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: JSON.stringify({
        code: 200,
        data: {
          appName: 'eisland',
          version: '1.2.3',
          description: 'desc',
          downloadUrl: 'https://example.com',
          id: 1,
          updatedAt: '2026-01-01',
        },
      }),
    }));

    setTestWindow({
      location: { hostname: 'localhost' },
      api: { netFetch },
    });

    const { fetchVersion } = await import('../versionApi');
    const result = await fetchVersion();

    expect(result?.version).toBe('1.2.3');
    expect(netFetch).toHaveBeenCalledWith(
      'https://test.server.pyisland.com/api/v1/version?appName=eisland',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('reports update download count with trimmed version', async () => {
    const netFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: JSON.stringify({ code: 200 }),
    }));

    setTestWindow({
      location: { hostname: 'localhost' },
      api: { netFetch },
    });

    const { reportUpdateDownloadCount } = await import('../versionApi');
    const success = await reportUpdateDownloadCount(' 1.2.3 ');

    expect(success).toBe(true);
    expect(netFetch).toHaveBeenCalledWith(
      'https://test.server.pyisland.com/api/v1/version/update-count',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ appName: 'eisland', version: '1.2.3' }),
      }),
    );
  });

  it('returns false when reporting with empty version', async () => {
    const netFetch = vi.fn();
    setTestWindow({
      location: { hostname: 'localhost' },
      api: { netFetch },
    });

    const { reportUpdateDownloadCount } = await import('../versionApi');
    const success = await reportUpdateDownloadCount('   ');

    expect(success).toBe(false);
    expect(netFetch).not.toHaveBeenCalled();
  });
});
