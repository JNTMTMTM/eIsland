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
 * @file updater.test.ts
 * @description updater 配置契约：任务容量、超时及持久化默认值。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_UPDATE_SOURCE, R2_UPDATE_URL, ESA_CDN_URL, GITHUB_OWNER, GITHUB_REPO } from '../updater';

describe('updater 配置契约', () => {
  it('固定公开配置，避免调用方容量和延迟约定漂移', () => {
    expect(DEFAULT_UPDATE_SOURCE).toBe('cloudflare-r2');
    expect(new URL(R2_UPDATE_URL).protocol).toBe('https:');
    expect(new URL(ESA_CDN_URL).pathname).toBe('/eisland-update');
    expect(GITHUB_OWNER).toBe('JNTMTMTM');
    expect(GITHUB_REPO).toBe('eIsland');
  });
});
