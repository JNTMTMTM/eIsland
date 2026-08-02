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
 * @file announcementApi.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../i18n', () => ({
  getLanguage: () => 'zh-CN',
}));

type TestWindow = {
  location?: { hostname: string };
  api?: {
    storeRead: ReturnType<typeof vi.fn>;
    storeWrite: ReturnType<typeof vi.fn>;
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

describe('announcementApi', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('reads and writes announcement show mode via store', async () => {
    const storeRead = vi.fn(async () => 'always');
    const storeWrite = vi.fn(async () => {});
    setTestWindow({
      location: { hostname: 'localhost' },
      api: { storeRead, storeWrite, netFetch: vi.fn() },
    });

    const { readAnnouncementShowMode, writeAnnouncementShowMode } = await import('../announcement/announcementApi');

    await expect(readAnnouncementShowMode()).resolves.toBe('always');
    await writeAnnouncementShowMode('version-update-only');
    expect(storeWrite).toHaveBeenCalledWith('announcement-show-mode', 'version-update-only');
  });

  it('fetches current announcement and normalizes nullable fields', async () => {
    const netFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: JSON.stringify({ code: 200, data: { title: 't', content: 'c', updatedAt: '2026' } }),
    }));

    setTestWindow({
      location: { hostname: 'localhost' },
      api: {
        storeRead: vi.fn(),
        storeWrite: vi.fn(),
        netFetch,
      },
    });

    const { fetchCurrentAnnouncement } = await import('../announcement/announcementApi');
    const data = await fetchCurrentAnnouncement();

    expect(netFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/announcement/current?lang=zh-CN'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(data?.title).toBe('t');
    expect(data?.content).toBe('c');
  });
});
