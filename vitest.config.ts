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
 * @description 按主进程、预加载、共享模块、原生插件与渲染进程划分 Vitest 测试项目。
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
      include: ['src/**/*.{ts,tsx,js}', 'plugins/*/*/*.js'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/test/**',
        ...(process.platform !== 'darwin' ? ['plugins/macos/**'] : []),
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: { label: 'main', color: 'yellow' },
          include: ['src/main/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'preload', color: 'cyan' },
          include: ['src/preload/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'shared', color: 'green' },
          include: ['src/shared/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'plugins', color: 'blue' },
          include: [
            'plugins/**/test/ffiLoader.test.ts',
            'plugins/**/test/*Runtime.test.{ts,tsx,js,mjs}',
          ],
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
