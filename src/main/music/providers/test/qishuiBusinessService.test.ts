/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file qishuiBusinessService.test.ts
 * @description 汽水公共目录搜索响应规范化测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { existsSyncMock } = vi.hoisted(() => ({ existsSyncMock: vi.fn() }));

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => 'C:/userData') },
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: vi.fn(),
}));

import { searchQishui } from '../qishuiBusinessService';

describe('qishui public catalog mapping', () => {
  beforeEach(() => {
    existsSyncMock.mockReset();
    existsSyncMock.mockReturnValue(false);
    vi.unstubAllGlobals();
  });

  it('maps item_id and author_info from public search results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        list: [{
          item_id: '7564609082470172682',
          title: '顽疾(Live)',
          author_info: { name: '薛之谦' },
          cover_url: 'https://example.com/cover.jpg',
          duration: 290,
          collection_name: '音乐缘计划',
        }],
      },
    }), { status: 200 })));

    const result = await searchQishui('顽疾', { limit: 18 });
    const songs = result.songs as Array<Record<string, unknown>>;

    expect(songs).toEqual([expect.objectContaining({
      id: '7564609082470172682',
      providerSongId: '7564609082470172682',
      name: '顽疾(Live)',
      artist: '薛之谦',
      artists: [{ name: '薛之谦' }],
      album: '音乐缘计划',
      duration: 290_000,
    })]);
  });
});