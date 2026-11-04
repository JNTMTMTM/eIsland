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

/** @file build-bridge.mjs
 * @description 将现有 preload API 编译为不依赖 Node/Electron 的 Tauri 初始化脚本。
 * @author 鸡哥
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildSync } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
buildSync({
  absWorkingDir: root,
  entryPoints: ['src/preload/index.ts'],
  outfile: resolve(root, 'src-tauri/generated/bridge.js'),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  alias: {
    electron: resolve(root, 'src/tauri/bridge.ts'),
    '@electron-toolkit/preload': resolve(root, 'src/tauri/bridge.ts'),
  },
  define: { 'process.contextIsolated': 'true' },
});
