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
 * @file vitest.config.ts
 * @description CLI 独立测试配置；根 vitest.config.mts 以项目路径引用本文件，两处共用同一份设置
 * @author 鸡哥
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: { label: 'cli', color: 'white' },
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
  },
});
