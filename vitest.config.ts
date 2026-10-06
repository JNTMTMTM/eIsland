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
 * @description Vitest 测试配置文件
 * @author 鸡哥
 */

import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      // 保留覆盖率目录中的源码哈希与不可达审计；每轮报告仍由报告器覆盖。
      clean: false,
      include: ['src/**/*.{ts,tsx,js}', 'plugins/*/*.js'],
      exclude: [...coverageConfigDefaults.exclude, '**/test/**'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: { label: 'node', color: 'yellow' },
          include: [
            'src/**/*.test.{ts,tsx}',
            'plugins/**/test/ffiLoader.test.ts',
            'plugins/**/test/*Runtime.test.{ts,tsx,js,mjs}',
          ],
          exclude: ['src/renderer/**'],
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'renderer', color: 'magenta' },
          include: ['src/renderer/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
