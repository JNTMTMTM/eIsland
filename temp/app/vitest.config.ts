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
 * @description 使用隔离文件与本地 HTTP fixture 验证迁移边界，不启动真实安装程序。
 * @author 鸡哥
 */
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['tests/**/*.test.{ts,mjs}'], environment: 'node', restoreMocks: true,
  coverage: { provider: 'v8', include: ['main/**/*.ts', 'preload/**/*.ts', 'shared/**/*.ts', 'renderer/**/*.{ts,tsx}', 'scripts/**/*.mjs'], exclude: ['**/*.d.ts'], reporter: ['text', 'json-summary', 'html'] },
} });
