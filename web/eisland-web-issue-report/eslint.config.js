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
 * @file eslint.config.js
 * @description 复用工具 workspace 的共享规则和 React 插件，避免依赖子项目安装状态。
 * @author 鸡哥
 */
import { fileURLToPath } from 'node:url'

import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'
import projectConfig, { reactHooksPlugin, reactRefreshPlugin } from '../../scripts/lint/eslint.config.mjs'

export default defineConfig([
  // ESLint 10 从被检查文件查找配置；以仓库根目录解析共享规则的 glob。
  {
    basePath: fileURLToPath(new URL('../../', import.meta.url)),
    extends: projectConfig,
  },
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooksPlugin.configs.flat.recommended,
      reactRefreshPlugin.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
