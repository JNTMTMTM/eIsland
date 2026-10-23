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
 * @file appSearchTools.test.ts
 * @description 防止 web.search 回退到无鉴权的客户端页面抓取。
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanupHarness, resetHarness, tool } from './appHarness';

beforeEach(resetHarness);
afterEach(cleanupHarness);

it('does not execute web.search through the local OS tool IPC', async () => {
  const fetchBoundary = vi.fn();
  vi.stubGlobal('fetch', fetchBoundary);
  expect(await tool('web.search', { query: 'fixture' })).toMatchObject({ success: false });
  expect(fetchBoundary).not.toHaveBeenCalled();
});
