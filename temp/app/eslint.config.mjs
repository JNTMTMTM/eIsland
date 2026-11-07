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
 * @file eslint.config.mjs
 * @description 复用仓库注释与 React 规则，显式隔离适配器的 Node 和浏览器运行环境。
 * @author 鸡哥
 */
import { fileURLToPath } from 'node:url';

import globals from 'globals';
import project from '../../scripts/lint/eslint.config.mjs';
export default [
  { ignores: ['out/**', 'dist/**', 'node_modules/**', 'native/**/target/**', 'test-results/**'] },
  ...project,
  { files: ['renderer/modules/**/components/*.tsx'], rules: { 'project/filename': 'off' } },
  // 有界流读取需在 while 循环中逐块 await；数组迭代改用 reduce 串行，仍遵守 §3.11 禁止 for…of。
  { files: ['main/services/**/*.ts', 'scripts/**/*.mjs', 'tests/**/*.{ts,mjs}'], rules: { 'no-await-in-loop': 'off' } },
  // 生命周期入口和同步 effect 不能直接 await，必须保留有拒绝处理的异步回调。
  { files: ['main/index.ts', 'renderer/modules/**/hooks/*.ts', 'renderer/locales/i18n.ts'], rules: { 'promise/prefer-await-to-then': 'off' } },
  // 测试替身需保持异步边界，返回已完成 Promise 与真实 I/O 契约一致。
  { files: ['tests/**/*.ts'], rules: { '@typescript-eslint/require-await': 'off' } },
  { files: ['**/*.{ts,tsx}'], languageOptions: { parserOptions: { project: fileURLToPath(new URL('./tsconfig.json', import.meta.url)), tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)) } } },
  { files: ['main/**/*.ts', 'preload/**/*.ts', 'scripts/**/*.mjs', 'tests/**/*.{ts,mjs}', '*.ts', '*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['renderer/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser } },
  { files: ['scripts/smoke.mjs'], languageOptions: { globals: globals.browser } },
];
