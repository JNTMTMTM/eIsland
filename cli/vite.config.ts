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
 * @file vite.config.ts
 * @description 以 SSR 模式将 CLI 打包为单个 Node ESM 入口，运行时依赖保持外部引用
 * @author 鸡哥
 */

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/index.ts',
    outDir: 'dist',
    target: 'node24',
    emptyOutDir: true,
    rollupOptions: {
      // npm 在 Windows 上生成 .cmd 包装器，类 Unix 平台直接依赖 shebang 执行。
      output: { entryFileNames: 'index.js', banner: '#!/usr/bin/env node' },
    },
  },
});
