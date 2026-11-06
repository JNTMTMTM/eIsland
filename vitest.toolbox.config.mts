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
 * @file vitest.toolbox.config.mts
 * @description 对全部工具箱界面与专用 API 执行独立覆盖率统计，包括未被测试加载的生产模块。
 * @author 鸡哥
 */
import { defineConfig } from 'vitest/config';

export const toolboxSourceRoots = [
  'src/renderer/components/states/maxExpand/components/toolbox',
  'src/renderer/components/states/maxExpand/components/tools',
  'src/renderer/api/tools',
];

export default defineConfig({
  test: {
    name: 'toolbox',
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    maxWorkers: 1,
    fileParallelism: false,
    include: toolboxSourceRoots.map((root) => `${root}/**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}`),
    coverage: {
      provider: 'v8',
      include: toolboxSourceRoots.map((root) => `${root}/**/*.{ts,tsx,js,jsx,mts,cts}`),
      exclude: ['**/test/**', '**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}', '**/*.d.{ts,mts,cts}'],
      reportsDirectory: process.env.EISLAND_TOOLBOX_COVERAGE_DIR || 'coverage/toolbox/renderer',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportOnFailure: true,
      clean: true,
      skipFull: false,
      processingConcurrency: 1,
      thresholds: {
        lines: 99,
        statements: 99,
        functions: 99,
        branches: 99,
      },
    },
  },
});
